import HashSet from '@lblod/ember-rdfa-editor/model/util/hash-set';
import { isElement } from '@lblod/ember-rdfa-editor/utils/dom-helpers';
import ModelText from '@lblod/ember-rdfa-editor/model/model-text';
import { CORE_OWNER } from '@lblod/ember-rdfa-editor/model/util/constants';
import renderFromSpec, {
  AttributeSpec,
  renderFromSpecMultipleChildren,
  RenderSpec,
  Serializable,
  SLOT,
} from './util/render-spec';

export type TagMatch = keyof HTMLElementTagNameMap | '*';

export interface MarkSpec<A extends AttributeSpec = AttributeSpec> {
  name: string;

  priority: number;

  matchers: DomNodeMatcher<A>[];

  renderSpec(mark: Renderable<A>): RenderSpec;
}

export class Mark<A extends AttributeSpec = AttributeSpec> {
  private readonly _spec: MarkSpec<A>;
  private readonly _attributes: A;
  private readonly _node?: ModelText;

  constructor(spec: MarkSpec<A>, attributes: A, node?: ModelText) {
    this._spec = spec;
    this._attributes = attributes;
    this._node = node;
  }

  get attributes(): A {
    return this._attributes;
  }

  get name(): string {
    return this._spec.name;
  }

  get node(): ModelText | undefined {
    return this._node;
  }

  get priority(): number {
    return this._spec.priority;
  }

  get spec(): MarkSpec {
    return this._spec;
  }

  write(block: Node): Node | null {
    const rendered = renderFromSpec(this._spec.renderSpec(this), block);
    if (rendered) {
      if (isElement(rendered)) {
        rendered.dataset['__setBy'] = this.attributes.setBy || CORE_OWNER;
      }
      return rendered;
    }
    return null;
  }

  writeMultiple(nodes: Iterable<Node>) {
    const rendered = renderFromSpecMultipleChildren(
      this._spec.renderSpec(this),
      nodes
    );
    if (rendered && isElement(rendered)) {
      rendered.dataset['__setBy'] = this.attributes.setBy || CORE_OWNER;
    }
    return rendered;
  }

  clone(): Mark<A> {
    return new Mark<A>(this._spec, this.attributes, this.node);
  }
}

export const highlightMarkSpec: MarkSpec = {
  matchers: [
    {
      tag: 'span',
      attributeBuilder: (node: Node) => {
        if (
          isElement(node) &&
          Object.prototype.hasOwnProperty.call(
            node.dataset,
            'editorHighlight'
          ) &&
          node.dataset.editorHighlight !== 'false'
        ) {
          return {};
        }
        return null;
      },
    },
  ],
  priority: 1000,
  name: 'highlighted',

  renderSpec(): RenderSpec {
    return {
      tag: 'span',
      attributes: { 'data-editor-highlight': true },
      children: [SLOT],
    };
  },
};

export interface DomNodeMatcher<
  A extends Record<string, Serializable> | void = void
> {
  tag: TagMatch;
  attributeBuilder?: (node: Node) => A | null;
}

// export interface Serializable {
//   toString(): string;
// }

export interface Renderable<A extends Record<string, Serializable> | void> {
  name: string;
  attributes: A;
}

export class MarkSet extends HashSet<Mark> {
  constructor(init?: Iterable<Mark>) {
    super({
      hashFunc: (mark: Mark) =>
        `${mark.name}-${mark.attributes.setBy || CORE_OWNER}`,
      init,
    });
  }

  hasMarkName(markName: string): boolean {
    for (const mark of this.items.values()) {
      if (mark.name === markName) {
        return true;
      }
    }
    return false;
  }

  clone(): this {
    return new MarkSet(this.values()) as this;
  }
}
