import { getOwner } from '@ember/application';
import Controller from '@ember/controller';
import { action } from '@ember/object';
import { inputRules, type PluginConfig } from '@lblod/ember-rdfa-editor';
import SayController from '@lblod/ember-rdfa-editor/core/say-controller';
import { inline_rdfa } from '@lblod/ember-rdfa-editor/marks';
import {
  block_rdfa,
  doc,
  hard_break,
  horizontal_rule,
  invisible_rdfa,
  paragraph,
  repaired_block,
  text,
} from '@lblod/ember-rdfa-editor/nodes';
import { blockquote } from '@lblod/ember-rdfa-editor/plugins/blockquote';
import { chromeHacksPlugin } from '@lblod/ember-rdfa-editor/plugins/chrome-hacks-plugin';
import { code_block } from '@lblod/ember-rdfa-editor/plugins/code';
import { code } from '@lblod/ember-rdfa-editor/plugins/code/marks/code';
import { color } from '@lblod/ember-rdfa-editor/plugins/color/marks/color';
import { emberApplication } from '@lblod/ember-rdfa-editor/plugins/ember-application';
import { firefoxCursorFix } from '@lblod/ember-rdfa-editor/plugins/firefox-cursor-fix';
import { heading } from '@lblod/ember-rdfa-editor/plugins/heading';
import { highlight } from '@lblod/ember-rdfa-editor/plugins/highlight/marks/highlight';
import { image, imageView } from '@lblod/ember-rdfa-editor/plugins/image';
import {
  createInvisiblesPlugin,
  hardBreak,
  heading as headingInvisible,
  paragraph as paragraphInvisible,
} from '@lblod/ember-rdfa-editor/plugins/invisibles';
import {
  link,
  linkPasteHandler,
  linkView,
} from '@lblod/ember-rdfa-editor/plugins/link';
import {
  bullet_list,
  list_item,
  ordered_list,
} from '@lblod/ember-rdfa-editor/plugins/list';
import {
  bullet_list_input_rule,
  ordered_list_input_rule,
} from '@lblod/ember-rdfa-editor/plugins/list/input_rules';
import { placeholder } from '@lblod/ember-rdfa-editor/plugins/placeholder';
import {
  tableKeymap,
  tableNodes,
  tablePlugins,
} from '@lblod/ember-rdfa-editor/plugins/table';
import {
  em,
  strikethrough,
  strong,
  subscript,
  superscript,
  underline,
} from '@lblod/ember-rdfa-editor/plugins/text-style';
import type { SayNodeViewConstructor } from '@lblod/ember-rdfa-editor/utils/ember-node';
import { highlightPlugin } from 'dummy/dummy-plugins/highlight-plugin';
import applyDevTools from 'prosemirror-dev-tools';
import { Schema } from 'prosemirror-model';
import { tracked } from 'tracked-built-ins';
import {
  card,
  cardView,
  counter,
  counterView,
  dropdown,
  dropdownView,
} from '../dummy-nodes';

export default class IndexController extends Controller {
  @tracked rdfaEditor?: SayController;
  schema = new Schema({
    nodes: {
      doc: doc({
        defaultLanguage: 'nl-BE',
      }),
      paragraph,

      repaired_block: repaired_block(),

      list_item: list_item(),
      ordered_list: ordered_list(),
      bullet_list: bullet_list(),
      placeholder,
      ...tableNodes({
        tableGroup: 'block',
        cellContent: 'block+',
        inlineBorderStyle: { width: '0.5px', color: '#CCD1D9' },
      }),
      heading: heading(),
      blockquote,

      horizontal_rule,
      code_block,

      text,

      image,

      hard_break,
      invisible_rdfa: invisible_rdfa(),
      block_rdfa: block_rdfa(),
      card,
      counter,
      dropdown,
      link: link(this.linkOptions),
    },
    marks: {
      inline_rdfa,
      code,
      em,
      strong,
      underline,
      strikethrough,
      subscript,
      superscript,
      highlight,
      color,
    },
  });

  get linkOptions() {
    return {
      interactive: true,
    };
  }

  @tracked nodeViews: (
    proseController: SayController,
  ) => Record<string, SayNodeViewConstructor> = (proseController) => {
    return {
      card: cardView(proseController),
      counter: counterView(proseController),
      dropdown: dropdownView(proseController),
      link: linkView(this.linkOptions)(proseController),
      image: imageView(proseController),
    };
  };
  @tracked plugins: PluginConfig = [
    firefoxCursorFix(),
    chromeHacksPlugin(),
    highlightPlugin({ testKey: 'yeet' }),
    ...tablePlugins,
    tableKeymap,
    linkPasteHandler(this.schema.nodes.link),
    createInvisiblesPlugin([hardBreak, paragraphInvisible, headingInvisible], {
      shouldShowInvisibles: false,
    }),
    inputRules({
      rules: [
        bullet_list_input_rule(this.schema.nodes.bullet_list),
        ordered_list_input_rule(this.schema.nodes.ordered_list),
      ],
    }),
    emberApplication({ application: getOwner(this) }),
  ];

  @action
  rdfaEditorInit(rdfaEditor: SayController) {
    const presetContent = localStorage.getItem('EDITOR_CONTENT') ?? '';
    this.rdfaEditor = rdfaEditor;
    this.rdfaEditor.initialize(presetContent);
    applyDevTools(rdfaEditor.mainEditorView);
    const editorDone = new CustomEvent('editor-done');
    window.dispatchEvent(editorDone);
  }

  @action
  togglePlugin() {
    console.warn('Live toggling plugins is currently not supported');
  }
}
