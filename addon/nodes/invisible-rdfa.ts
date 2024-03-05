import { getRdfaAttrs, PNode, rdfaAttrSpec } from '@lblod/ember-rdfa-editor';
import { tagName } from '@lblod/ember-rdfa-editor/utils/_private/dom-helpers';
import type SayNodeSpec from '../core/say-node-spec';
import {
  classicRdfaAttrSpec,
  type RdfaAttrs,
  renderInvisibleRdfa,
  renderRdfaAttrs,
  getClassicRdfaAttrs,
} from '../core/schema';

type Options = {
  rdfaAware?: boolean;
};

export const invisible_rdfa: (options?: Options) => SayNodeSpec = ({
  rdfaAware = false,
} = {}) => {
  return {
    inline: true,
    group: 'inline',
    atom: true,
    defining: true,
    isolating: true,
    get attrs() {
      if (rdfaAware) {
        return {
          ...rdfaAttrSpec,
          __tag: { default: 'span' },
        };
      } else {
        return {
          ...classicRdfaAttrSpec,
          __tag: { default: 'span' },
        };
      }
    },
    parseDOM: [
      {
        tag: 'span, link',
        getAttrs(node: string | HTMLElement) {
          if (typeof node === 'string') {
            return false;
          }
          if (!node.hasChildNodes()) {
            const attrs = rdfaAware
              ? getRdfaAttrs(node)
              : getClassicRdfaAttrs(node);
            if (attrs) {
              return {
                ...attrs,
                __tag: tagName(node),
              };
            }
          }
          return false;
        },
      },
    ],
    toDOM(node: PNode) {
      const { __tag, ...attrs } = node.attrs;
      if (rdfaAware) {
        return [
          __tag,
          renderRdfaAttrs(attrs as RdfaAttrs),
          renderInvisibleRdfa(node, 'span'),
        ];
      } else {
        return [__tag, attrs];
      }
    },
  };
};
