import { NodeSpec } from 'prosemirror-model';
import { getRdfaAttrs } from '@lblod/ember-rdfa-editor';
import { NON_BLOCK_NODES } from '@lblod/ember-rdfa-editor/utils/_private/constants';
import { optionMapOr } from '../utils/_private/option';
import { DEFAULT_ALIGNMENT, getAlignment } from '../plugins/alignment';

export type ParagraphDataAttributes = {
  'data-indentation-level': number;
  'data-sub-type'?: string;
};

export type ParagraphNodeSpec = NodeSpec & { subType: string };

let BLOCK_SELECTOR = '';
NON_BLOCK_NODES.forEach(
  (tag) => (BLOCK_SELECTOR = `${BLOCK_SELECTOR}${tag}, `),
);
// Also include br tag as while it's normally handled as a block by the editor, it's also used for
// 'soft breaks' (when adding a newline with shift-enter), so we need to include it here.
BLOCK_SELECTOR = `:not(${BLOCK_SELECTOR} br)`;

const BASE_PARAGRAPH_TYPE = 'paragraph';
const matchingSubType = (node: HTMLElement, subType: string) => {
  // basic paragraph has no subtype in its dataset and an empty subType
  const isBasicParagraph = node.dataset.subType === undefined && subType === '';
  return isBasicParagraph || node.dataset.subType === subType;
};

export interface ParagraphConfig {
  content?: string;
  marks?: string;
  group?: string;
  /* A mandatory subType name to separate different kinds of paragraphs in toDom functions.
  For the basic paragraph this is the empty string and will not be added to dataset */
  subType: string;
}

export const paragraphWithConfig: (
  config: ParagraphConfig,
) => ParagraphNodeSpec = (config) => {
  const name = config.subType !== '' ? config.subType : BASE_PARAGRAPH_TYPE;
  return {
    name: name,
    content: config?.content || 'inline*',
    group: config?.group || 'block paragraphGroup',
    subType: config.subType,
    attrs: {
      alignment: {
        default: DEFAULT_ALIGNMENT,
      },
      indentationLevel: {
        default: 0,
      },
    },
    parseDOM: [
      {
        tag: 'p',
        getAttrs(node: HTMLElement) {
          const nonBlockNode = node.querySelector(BLOCK_SELECTOR);
          if (nonBlockNode && matchingSubType(node, config.subType)) {
            // NOTE This parse rule is used to avoid parsing `<p>` tags which contain block tags,
            // hence the `skip: true` option. It's therefore not necessary to actually return
            // anything but an empty object.
            // It's unclear whether skipping these is still relevant - Rich
            return {};
          }
          return false;
        },
        // If this rule matches (a paragraph with block node content),
        // the paragraph itself is skipped (but it's content is still parsed).
        // Paragraphs with block content are not allowed in the HTML spec.
        skip: true,
      },
      {
        tag: 'p',
        getAttrs(node: HTMLElement) {
          const myAttrs = getRdfaAttrs(node);
          if (myAttrs) {
            return false;
          }

          if (!matchingSubType(node, config.subType)) return false;

          return {
            indentationLevel: optionMapOr(
              0,
              parseInt,
              node.dataset.indentationLevel,
            ),
            alignment: getAlignment(node),
          };
        },
        consuming: false,
      },
    ],
    toDOM(node) {
      const { alignment, indentationLevel } = node.attrs;
      let style = '';
      if (alignment && alignment !== DEFAULT_ALIGNMENT) {
        style += `text-align: ${alignment}`;
      }
      const attrs: ParagraphDataAttributes = {
        'data-indentation-level': indentationLevel as number,
      };
      const subType = (node.type.spec as ParagraphNodeSpec).subType;
      if (subType) {
        attrs['data-sub-type'] = subType;
      }
      return ['p', { ...attrs, style }, 0];
    },
  };
};
