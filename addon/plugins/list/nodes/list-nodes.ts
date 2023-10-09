import { Node as PNode, NodeSpec } from 'prosemirror-model';
import {
  getRdfaAttrs,
  rdfaAttrs,
  renderAttrs,
  renderProps,
} from '@lblod/ember-rdfa-editor/core/schema';
import { optionMapOr } from '@lblod/ember-rdfa-editor/utils/_private/option';

export type OrderListStyle = 'decimal' | 'upper-roman' | 'lower-alpha';

type OrderedListAttrs = typeof rdfaAttrs & {
  order: number;
  style?: OrderListStyle;
};

export const ordered_list: NodeSpec = {
  attrs: { order: { default: 1 }, style: { default: null }, ...rdfaAttrs },
  content: 'list_item+',
  group: 'block list',
  parseDOM: [
    {
      tag: 'ol',
      getAttrs(dom: HTMLElement) {
        const start = dom.getAttribute('start');
        return {
          order: optionMapOr(1, (val) => Number(val), start),
          style: dom.dataset.listStyle,
        };
      },
      consuming: false,
    },
  ],
  toDOM(node) {
    const { style, order, ...attrs } = node.attrs as OrderedListAttrs;
    return [
      'ol',
      {
        ...renderAttrs(node),
        ...(order !== 1 && { start: order }),
        ...(style && { 'data-list-style': style }),
        ...attrs,
      },
      0,
    ];
  },
};
export const bullet_list: NodeSpec = {
  content: 'list_item+',
  group: 'block list',
  attrs: { ...rdfaAttrs },
  parseDOM: [
    {
      tag: 'ul',
      getAttrs(node: HTMLElement) {
        return {
          ...getRdfaAttrs(node),
        };
      },
      consuming: false,
    },
  ],
  toDOM(node: PNode) {
    return ['ul', { ...node.attrs }, 0];
  },
};

export const list_item: NodeSpec = {
  content: 'paragraphGroup+ block*',
  defining: true,
  attrs: { ...rdfaAttrs },
  parseDOM: [
    {
      tag: 'li',
    },
  ],
  toDOM(node: PNode) {
    return [
      'li',
      { ...renderAttrs(node), ...node.attrs },
      renderProps(node, 'div'),
      ['div', {}, 0],
    ];
  },
};
