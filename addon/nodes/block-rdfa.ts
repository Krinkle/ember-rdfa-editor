import { Node as PNode, NodeSpec } from 'prosemirror-model';
import { tagName } from '@lblod/ember-rdfa-editor/utils/_private/dom-helpers';
import { renderAttrs, renderProps } from '@lblod/ember-rdfa-editor/core/schema';

export const block_rdfa: NodeSpec = {
  content: 'block+',
  group: 'block editable',
  attrs: {
    properties: { default: {} },
    backlinks: { default: {} },
    resource: { default: null },
    __rdfaId: { default: null },
    __tag: { default: 'div' },
  },
  defining: true,
  parseDOM: [
    {
      tag: `p, div, address, article, aside, blockquote, details, dialog, dd, dt, fieldset, figcaption, figure, footer, form, header, hgroup, hr, main, nav, pre, section`,
      getAttrs(node: HTMLElement) {
        return { __tag: tagName(node) };
      },
    },
  ],
  toDOM(node: PNode) {
    return [
      node.attrs.__tag,
      { ...node.attrs, ...renderAttrs(node), class: 'say-editable' },
      renderProps(node),
      ['span', {}, 0],
    ];
  },
};
