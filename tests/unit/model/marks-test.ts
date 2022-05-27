import { module, test } from 'qunit';
import {
  domStripped,
  vdom,
} from '@lblod/ember-rdfa-editor/model/util/xml-utils';
import HtmlReader from '@lblod/ember-rdfa-editor/model/readers/html-reader';
import Model from '@lblod/ember-rdfa-editor/model/model';
import sinon from 'sinon';
import { highlightMarkSpec, Mark } from '@lblod/ember-rdfa-editor/model/mark';
import ModelNode from '@lblod/ember-rdfa-editor/model/model-node';
import { AssertionError } from '@lblod/ember-rdfa-editor/utils/errors';
import ModelText from '@lblod/ember-rdfa-editor/model/model-text';
import HtmlWriter from '@lblod/ember-rdfa-editor/model/writers/html-writer';
import {
  isElement,
  isTextNode,
  tagName,
} from '@lblod/ember-rdfa-editor/utils/dom-helpers';
import HashSet from '@lblod/ember-rdfa-editor/model/util/hash-set';
import ModelTestContext from 'dummy/tests/utilities/model-test-context';
import { boldMarkSpec } from '@lblod/ember-rdfa-editor/plugins/basic-styles/marks/bold';
import { italicMarkSpec } from '@lblod/ember-rdfa-editor/plugins/basic-styles/marks/italic';
import ModelPosition from '@lblod/ember-rdfa-editor/model/model-position';
import ModelRange from '@lblod/ember-rdfa-editor/model/model-range';
import MarkOperation from '@lblod/ember-rdfa-editor/model/operations/mark-operation';
import { underlineMarkSpec } from '@lblod/ember-rdfa-editor/plugins/basic-styles/marks/underline';
import { strikethroughMarkSpec } from '@lblod/ember-rdfa-editor/plugins/basic-styles/marks/strikethrough';
import {
  stateFromDom,
  testState,
  testView,
  vdomToDom,
} from 'dummy/tests/test-utils';

function testMarkToggling(assert: Assert, start: number, end: number) {
  const {
    root: initial,
    textNodes: { text },
  } = vdom`
      <modelRoot>
        <text __id="text" __marks="italic">abcdefghi</text>
      </modelRoot>`;

  const rangeBeginning = new ModelRange(
    ModelPosition.fromInTextNode(text, start),
    ModelPosition.fromInTextNode(text, end)
  );
  const op1 = new MarkOperation(
    undefined,
    rangeBeginning,
    boldMarkSpec,
    {},
    'add'
  );
  const op2 = new MarkOperation(
    undefined,
    rangeBeginning,
    boldMarkSpec,
    {},
    'remove'
  );
  let result;
  op1.execute();
  result = vdomToDom(initial);
  op2.execute();
  result = vdomToDom(initial);
  op1.execute();
  result = vdomToDom(initial);
  op2.execute();
  result = vdomToDom(initial);

  assert.strictEqual(result.childNodes.length, 1);
  const emNode = result.childNodes[0];
  assert.strictEqual(tagName(emNode), 'em');
  assert.strictEqual(emNode.childNodes.length, 1);
  assert.true(emNode.childNodes[0] instanceof Text);
  assert.strictEqual(emNode.textContent, 'abcdefghi');
}

module('Unit | model | marks-test', function () {
  test('reading works', function (assert) {
    const html = domStripped`
    <div>
      <strong>abc</strong>
    </div>
    `.body.children[0];

    const { root: expected } = vdom`
        <div>
          <text __marks="bold">abc</text>
        </div>`;

    const result = stateFromDom(html);
    assert.true(result.document.sameAs(expected));
  });

  test('writing works', function (assert) {
    const { root: initial } = vdom`
      <modelRoot>
        <text __marks="bold">abc</text>
      </modelRoot>`;

    const result = vdomToDom(initial).childNodes[0];
    assert.true(isElement(result));
    assert.strictEqual(tagName(result), 'strong');
    assert.strictEqual(result.childNodes.length, 1);
    assert.strictEqual((result.firstChild as Text).textContent, 'abc');
  });
  test('writing works with multiple marks', function (assert) {
    const { root: initial } = vdom`
      <modelRoot>
        <text __marks="bold,italic">abc</text>
      </modelRoot>`;
    const result = vdomToDom(initial).childNodes[0];

    assert.true(isElement(result));
    assert.strictEqual(tagName(result), 'em');
    assert.strictEqual(result.childNodes.length, 1);

    const fc = result.firstChild!;

    assert.true(isElement(fc));
    assert.strictEqual(tagName(fc), 'strong');
    assert.strictEqual(fc.childNodes.length, 1);
    assert.true(isTextNode(fc.firstChild!));
    assert.strictEqual(fc.firstChild!.textContent, 'abc');
  });
  test('marks are correctly merged and nested: simple case', function (assert) {
    const {
      root: initial,
      textNodes: { text },
    } = vdom`
      <modelRoot>
        <text __id="text" __marks="bold,italic">abcdefghi</text>
      </modelRoot>`;

    const range = new ModelRange(
      ModelPosition.fromInTextNode(text, 3),
      ModelPosition.fromInTextNode(text, 6)
    );

    const op = new MarkOperation(undefined, range, boldMarkSpec, {}, 'add');
    op.execute();
    const result = vdomToDom(initial);
    assert.strictEqual(result.childNodes.length, 1);
    const emNode = result.childNodes[0];
    assert.strictEqual(tagName(emNode), 'em');
    assert.strictEqual(emNode.childNodes.length, 3);
    assert.strictEqual(tagName(emNode.childNodes[1]), 'strong');
  });
  test('adjacent marks are merged', function (assert) {
    const {
      root: initial,
      textNodes: { text },
    } = vdom`
      <modelRoot>
        <text __id="text" __marks="bold,italic">abcdefghi</text>
      </modelRoot>`;

    const range1 = new ModelRange(
      ModelPosition.fromInTextNode(text, 3),
      ModelPosition.fromInTextNode(text, 6)
    );
    const range2 = new ModelRange(
      ModelPosition.fromInTextNode(text, 6),
      ModelPosition.fromInTextNode(text, 9)
    );

    const op1 = new MarkOperation(undefined, range1, boldMarkSpec, {}, 'add');
    const op2 = new MarkOperation(undefined, range2, boldMarkSpec, {}, 'add');
    op1.execute();
    op2.execute();
    const result = vdomToDom(initial);
    assert.strictEqual(result.childNodes.length, 2);
    const boldNode = result.childNodes[1];
    assert.strictEqual(tagName(boldNode), 'strong');
    assert.strictEqual(boldNode.childNodes.length, 1);
    assert.strictEqual(boldNode.childNodes[0].textContent, 'defghi');
  });
  test('mark toggling on beginning of text works with different nested marks', function (assert) {
    assert.expect(5);
    testMarkToggling(assert, 0, 3);
  });
  test('mark toggling on middle of text works with different nested marks', function (assert) {
    assert.expect(5);
    testMarkToggling(assert, 3, 6);
  });
  test('mark toggling on end of text works with different nested marks', function (assert) {
    assert.expect(5);
    testMarkToggling(assert, 6, 9);
  });

  test('marks are rendered in the correct order following priority in the DOM', function (assert) {
    const { root: initial } = vdom`
      <modelRoot>
        <text __id="text" __marks="bold,italic,underline,strikethrough">abcdefghi</text>
      </modelRoot>`;
    assert.expect(8);
    const markSpecs = [
      italicMarkSpec,
      boldMarkSpec,
      underlineMarkSpec,
      strikethroughMarkSpec,
    ];

    markSpecs.sort((m1, m2) => m2.priority - m1.priority);

    const writer = new HtmlWriter();

    let node = writer.parseSubTree(initial);

    for (const markSpec of markSpecs) {
      assert.strictEqual(node.childNodes.length, 1);
      node = node.childNodes[0];
      assert.true(
        !!markSpec.matchers.find((matcher) => matcher.tag === tagName(node))
      );
    }
  });
  test('reading highlights works', function (assert) {
    const html = domStripped`
      <div>
        <span data-editor-highlight>abc</span>
      </div>
    `.body.children[0];
    const { root: expected } = vdom`
        <div>
          <text __marks="highlighted">abc</text>
        </div>`;

    const result = stateFromDom(html);
    assert.true(result.document.sameAs(expected));
  });
  test("reading non-highlight spans doesn't read highlight marks", function (assert) {
    const html = domStripped`
      <span>abc</span>
    `.body.children[0];

    const result = stateFromDom(html);

    const { root: expected } = vdom`
        <div>
          <span>
            <text>abc</text>
          </span>
        </div>`;
    assert.true(result.document.sameAs(expected));
  });
  test('hashset', function (assert) {
    const set = new HashSet({
      hashFunc: (item) => item.name,
      init: [{ name: 'test1' }, { name: 'test2' }],
    });

    set.deleteHash('test2');
    assert.strictEqual(set.size, 1);
  });
});
