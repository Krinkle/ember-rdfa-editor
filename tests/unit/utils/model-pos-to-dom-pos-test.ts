import ModelElement from '@lblod/ember-rdfa-editor/core/model/nodes/model-element';
import ModelPosition from '@lblod/ember-rdfa-editor/core/model/model-position';
import { domStripped, vdom } from '@lblod/ember-rdfa-editor/utils/xml-utils';
import { modelPosToDomPos } from '@lblod/ember-rdfa-editor/utils/dom-helpers';
import { testState } from 'dummy/tests/test-utils';
import { module, test } from 'qunit';

module('Unit | model | model-pos-to-dom-pos', function () {
  test('converts position in empty root', function (assert) {
    const dom = domStripped`
      <div />`.body.children[0] as HTMLElement;

    const { root } = vdom`
      <modelRoot></modelRoot>`;
    const state = testState({ document: root });
    const resultPos = modelPosToDomPos(
      state,
      dom,
      ModelPosition.fromPath(root as ModelElement, [])
    );
    const container = dom;
    const expectedPos = { container, offset: undefined };
    assert.strictEqual(resultPos.container, expectedPos.container);
    assert.strictEqual(resultPos.offset, expectedPos.offset);
  });
  test('converts simple positions correctly 1', function (assert) {
    const dom = domStripped`
      <div>
        abcd
      </div>`.body.children[0];

    const {
      root,
      textNodes: { text1 },
    } = vdom`
      <modelRoot>
        <text __id="text1">abcd</text>
      </modelRoot>`;
    const state = testState({ document: root });
    const container = dom.childNodes[0];
    const expectedPos = { container, offset: 0 };
    const resultPos = modelPosToDomPos(
      state,
      dom,
      ModelPosition.fromInTextNode(root as ModelElement, text1, 0)
    );
    assert.strictEqual(resultPos.container, expectedPos.container);
    assert.strictEqual(resultPos.offset, expectedPos.offset);
  });
  test('converts into simple positions correctly 2', function (assert) {
    const dom = domStripped`
      <div>
        abcd
      </div>`.body.children[0];

    const {
      root,
      textNodes: { text1 },
    } = vdom`
      <modelRoot>
        <text __id="text1">abcd</text>
      </modelRoot>`;
    const state = testState({ document: root });
    const container = dom.childNodes[0];
    const expectedPos = { container, offset: 2 };
    const resultPos = modelPosToDomPos(
      state,
      dom,
      ModelPosition.fromInTextNode(root as ModelElement, text1, 2)
    );
    assert.strictEqual(resultPos.container, expectedPos.container);
    assert.strictEqual(resultPos.offset, expectedPos.offset);
  });
  test('converts nested position', function (assert) {
    const dom = domStripped`
      <div>
        <span>
          abcd
        </span>
      </div>`.body.children[0];

    const {
      root,
      textNodes: { text1 },
    } = vdom`
      <modelRoot>
        <span>
          <text __id="text1">abcd</text>
        </span>
      </modelRoot>`;
    const state = testState({ document: root });
    const container = dom.childNodes[0].childNodes[0];
    const expectedPos = { container, offset: 2 };
    const resultPos = modelPosToDomPos(
      state,
      dom,
      ModelPosition.fromInTextNode(root as ModelElement, text1, 2)
    );
    assert.strictEqual(resultPos.container, expectedPos.container);
    assert.strictEqual(resultPos.offset, expectedPos.offset);
  });
  test('converts position between elements', function (assert) {
    const dom = domStripped`
      <div>
        <span>
          abcd
        </span>
        <span>
          abcd
        </span>
      </div>`.body.children[0];

    const {
      root,
      elements: { span },
    } = vdom`
      <modelRoot>
        <span __id="span">
          <text __id="text1">abcd</text>
        </span>
        <span>
          <text __id="text1">abcd</text>
        </span>
      </modelRoot>`;
    const state = testState({ document: root });
    const container = dom;
    const expectedPos = { container, offset: 1 };
    const resultPos = modelPosToDomPos(
      state,
      dom,
      ModelPosition.fromAfterNode(root as ModelElement, span)
    );
    assert.strictEqual(resultPos.container, expectedPos.container);
    assert.strictEqual(resultPos.offset, expectedPos.offset);
  });
  test('converts position where offset differs', function (assert) {
    const dom = domStripped`
      <div>
        <span>
          abcd
          <span>
            abcd
          </span>
          abcd
        </span>
      </div>`.body.children[0];

    const {
      root,
      elements: { span },
    } = vdom`
      <modelRoot>
        <span>
          <text>abcd</text>
          <span __id="span">
            <text>abcd</text>
          </span>
          <text>abcd</text>
        </span>
      </modelRoot>`;
    const state = testState({ document: root });
    // note: container = the top span and offset = 2 would also be correct
    // since they are the same visual position
    const container = dom.childNodes[0].childNodes[2];
    const expectedPos = { container, offset: 0 };
    const resultPos = modelPosToDomPos(
      state,
      dom,
      ModelPosition.fromAfterNode(root as ModelElement, span)
    );
    assert.strictEqual(resultPos.container, expectedPos.container);
    assert.strictEqual(resultPos.offset, expectedPos.offset);
  });
  test('correctly converts positions in marks', function (assert) {
    const dom = domStripped`
      <div>
        <strong>abcd</strong>
      </div>`.body.children[0];

    const {
      root,
      textNodes: { text },
    } = vdom`
      <modelRoot>
        <text __marks="bold" __id="text">abcd</text>
      </modelRoot>`;
    const state = testState({ document: root });
    const container = dom.firstChild?.firstChild;
    const expectedPos = { container, offset: 1 };
    const resultPos = modelPosToDomPos(
      state,
      dom,
      ModelPosition.fromInNode(root as ModelElement, text, 1)
    );
    assert.strictEqual(resultPos.container, expectedPos.container);
    assert.strictEqual(resultPos.offset, expectedPos.offset);
  });
  test('correctly converts positions in marks 2', function (assert) {
    const dom = domStripped`
      <div>
        <em>
          <strong>abcd</strong>
        </em>
      </div>`.body.children[0];

    const {
      root,
      textNodes: { text },
    } = vdom`
      <modelRoot>
        <text __marks="bold" __id="text">abcd</text>
      </modelRoot>`;
    const state = testState({ document: root });
    const container = dom.firstChild?.firstChild?.firstChild;
    const expectedPos = { container, offset: 1 };
    const resultPos = modelPosToDomPos(
      state,
      dom,
      ModelPosition.fromInNode(root as ModelElement, text, 1)
    );
    assert.strictEqual(resultPos.container, expectedPos.container);
    assert.strictEqual(resultPos.offset, expectedPos.offset);
  });
  test('converts correctly in merged marks', function (assert) {
    const dom = domStripped`
      <div>
        <em>
          abc
          <strong>def</strong>
          ghi
        </em>
      </div>`.body.children[0];

    const {
      root,
      textNodes: { text },
    } = vdom`
      <modelRoot>
        <text __marks="italic">abc</text>
        <text __marks="italic,bold" __id="text">def</text>
        <text __marks="italic">ghi</text>
      </modelRoot>`;
    const state = testState({ document: root });
    const container = dom.firstChild?.childNodes[1].firstChild;
    if (!container) {
      throw new TypeError();
    }
    const expectedPos = { container, offset: 1 };
    const resultPos = modelPosToDomPos(
      state,
      dom,
      ModelPosition.fromInNode(root as ModelElement, text, 1)
    );
    assert.strictEqual(resultPos.container, expectedPos.container);
    assert.strictEqual(resultPos.offset, expectedPos.offset);
  });
});
