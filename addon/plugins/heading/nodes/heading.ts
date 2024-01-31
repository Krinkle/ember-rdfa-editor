import { Node as PNode } from 'prosemirror-model';
import {
  getRdfaAttrs,
  renderRdfaAware,
  sharedRdfaNodeSpec,
} from '@lblod/ember-rdfa-editor/core/schema';
import { rdfaAttrSpec } from '@lblod/ember-rdfa-editor';
import { optionMapOr } from '@lblod/ember-rdfa-editor/utils/_private/option';
import type SayNodeSpec from '@lblod/ember-rdfa-editor/core/say-node-spec';
import NumberEditor from '@lblod/ember-rdfa-editor/components/_private/number-editor';
import type { ComponentLike } from '@glint/template';
import { DEFAULT_ALIGNMENT, getAlignment } from '../../alignment';

export const heading: SayNodeSpec = {
  attrs: {
    level: {
      default: 1,
      editable: true,
      editor: NumberEditor as unknown as ComponentLike,
    },
    indentationLevel: {
      default: 0,
      editable: true,
      editor: NumberEditor as unknown as ComponentLike,
    },
    alignment: { default: DEFAULT_ALIGNMENT },
    ...rdfaAttrSpec,
  },
  content: 'inline*',
  group: 'block',
  editable: true,
  defining: true,
  ...sharedRdfaNodeSpec,
  parseDOM: [
    {
      tag: 'h1',
      getAttrs(node: string | HTMLElement) {
        if (typeof node === 'string') {
          return false;
        }
        return {
          level: 1,
          indentationLevel: optionMapOr(
            0,
            parseInt,
            node.dataset['indentationLevel'],
          ),
          ...getRdfaAttrs(node),
          alignment: getAlignment(node),
        };
      },
    },
    {
      tag: 'h2',
      getAttrs(node: HTMLElement) {
        return {
          level: 2,
          indentationLevel: optionMapOr(
            0,
            parseInt,
            node.dataset['indentationLevel'],
          ),
          ...getRdfaAttrs(node),
          alignment: getAlignment(node),
        };
      },
    },
    {
      tag: 'h3',
      getAttrs(node: HTMLElement) {
        return {
          level: 3,
          indentationLevel: optionMapOr(
            0,
            parseInt,
            node.dataset['indentationLevel'],
          ),
          ...getRdfaAttrs(node),
          alignment: getAlignment(node),
        };
      },
    },
    {
      tag: 'h4',
      getAttrs(node: HTMLElement) {
        return {
          level: 4,
          indentationLevel: optionMapOr(
            0,
            parseInt,
            node.dataset['indentationLevel'],
          ),
          ...getRdfaAttrs(node),
          alignment: getAlignment(node),
        };
      },
    },
    {
      tag: 'h5',
      getAttrs(node: HTMLElement) {
        return {
          level: 5,
          indentationLevel: optionMapOr(
            0,
            parseInt,
            node.dataset['indentationLevel'],
          ),
          ...getRdfaAttrs(node),
          alignment: getAlignment(node),
        };
      },
    },
    {
      tag: 'h6',
      getAttrs(node: HTMLElement) {
        return {
          level: 6,
          indentationLevel: optionMapOr(
            0,
            parseInt,
            node.dataset['indentationLevel'],
          ),
          ...getRdfaAttrs(node),
          alignment: getAlignment(node),
        };
      },
    },
  ],
  toDOM(node: PNode) {
    const { level, indentationLevel, resource, alignment } = node.attrs;
    let style = '';
    if (alignment && alignment !== DEFAULT_ALIGNMENT) {
      style += `text-align: ${alignment}`;
    }
    return renderRdfaAware({
      tag: `h${(level as number).toString()}`,
      renderable: node,
      attrs: {
        'data-indentation-level': indentationLevel as number,
        class: 'say-editable',
        resource: resource as string,
        style,
      },
      rdfaContainerTag: 'span',
      contentContainerTag: 'span',
      content: 0,
    });
  },
};
