import { Command, EditorState, Plugin, Transaction } from 'prosemirror-state';
import { EditorView, NodeViewConstructor } from 'prosemirror-view';
import {
  DOMParser as ProseParser,
  DOMSerializer,
  MarkType,
  Schema,
} from 'prosemirror-model';
import { baseKeymap, selectAll } from 'prosemirror-commands';
import {
  getPathFromRoot,
  isElement,
  tagName,
} from '@lblod/ember-rdfa-editor/utils/dom-helpers';

import { gapCursor } from 'prosemirror-gapcursor';
import { keymap } from 'prosemirror-keymap';
import { history } from 'prosemirror-history';
import { defaultKeymap } from '@lblod/ember-rdfa-editor/core/keymap';
import { tracked } from '@glimmer/tracking';
import { dropCursor } from 'prosemirror-dropcursor';
import MapUtils from '../utils/map-utils';
import { createLogger, Logger } from '../utils/logging-utils';
import { ProseStore } from '@lblod/ember-rdfa-editor/utils/datastore/prose-store';
import { ReferenceManager } from '@lblod/ember-rdfa-editor/utils/reference-manager';
import {
  datastore,
  datastoreKey,
  isElementPNode,
  ResolvedPNode,
} from '@lblod/ember-rdfa-editor/plugins/datastore';
import { unwrap } from '@lblod/ember-rdfa-editor/utils/option';
import {
  rangeHasMarkEverywhere,
  toggleMarkAddFirst,
} from '@lblod/ember-rdfa-editor/commands/toggle-mark-add-first';

export type WidgetLocation =
  | 'toolbarMiddle'
  | 'toolbarRight'
  | 'sidebar'
  | 'insertSidebar';

export interface WidgetSpec {
  componentName: string;
  desiredLocation: WidgetLocation;
  widgetArgs?: unknown;
}

export type InternalWidgetSpec = WidgetSpec & {
  controller: ProseController;
};

interface ProsemirrorArgs {
  target: Element;
  schema: Schema;
  baseIRI: string;
  plugins?: Plugin[];
  widgets?: WidgetSpec[];
  nodeViews?: (
    controller: ProseController
  ) => Record<string, NodeViewConstructor>;
  devtools?: boolean;
}

export default class Prosemirror {
  view: EditorView;
  @tracked _state: EditorState;
  @tracked widgets: Map<WidgetLocation, InternalWidgetSpec[]> = new Map();
  root: Element;
  baseIRI: string;
  pathFromRoot: Node[];
  schema: Schema;

  private logger: Logger;

  constructor({
    target,
    schema,
    baseIRI,
    plugins = [],
    widgets = [],
    nodeViews = () => {
      return {};
    },
  }: ProsemirrorArgs) {
    this.logger = createLogger(this.constructor.name);
    this.root = target;
    this.pathFromRoot = getPathFromRoot(this.root, false);
    this.baseIRI = baseIRI;
    this.schema = schema;
    this._state = EditorState.create({
      doc: ProseParser.fromSchema(this.schema).parse(target),
      plugins: [
        datastore({ pathFromRoot: this.pathFromRoot, baseIRI }),
        ...plugins,

        dropCursor(),
        gapCursor(),

        keymap(defaultKeymap(schema)),
        keymap(baseKeymap),
        history(),
      ],
    });
    this.view = new EditorView(target, {
      state: this._state,
      attributes: { class: 'say-editor__inner say-content' },
      nodeViews: nodeViews(new ProseController(this)),
      dispatchTransaction: this.dispatch,
    });
    this.initializeEditorWidgets(widgets);
  }

  initializeEditorWidgets(widgets: WidgetSpec[]) {
    const widgetMap: Map<WidgetLocation, InternalWidgetSpec[]> = new Map();
    widgets.forEach((widgetSpec) => {
      MapUtils.setOrPush(widgetMap, widgetSpec.desiredLocation, {
        ...widgetSpec,
        controller: new ProseController(this),
      });
    });
    this.widgets = widgetMap;
  }

  get editable() {
    return this.view.editable;
  }

  get state() {
    return this._state;
  }

  focus() {
    this.view.focus();
  }

  dispatch = (tr: Transaction) => {
    const newState = this.state.apply(tr);
    this._state = newState;
    this.view.updateState(newState);
  };
}

export class ProseController {
  @tracked
  private pm: Prosemirror;

  constructor(pm: Prosemirror) {
    this.pm = pm;
  }

  clone() {
    return new ProseController(this.pm);
  }

  toggleMark(name: string) {
    this.focus();
    this.doCommand(toggleMarkAddFirst(this.schema.marks[name]));
  }

  focus() {
    this.pm.focus();
  }

  setHtmlContent(content: string) {
    this.focus();
    this.doCommand(selectAll);
    const tr = this.pm.state.tr;
    const domParser = new DOMParser();
    tr.deleteSelection().insert(
      0,
      ProseParser.fromSchema(this.schema).parse(
        domParser.parseFromString(content, 'text/html')
      )
    );
    this.pm.dispatch(tr);
  }

  doCommand(command: Command): boolean {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    return command(this.pm.state, this.pm.view.dispatch, this.pm.view);
  }

  checkCommand(command: Command): boolean {
    return command(this.pm.state);
  }

  checkAndDoCommand(command: Command): boolean {
    if (command(this.pm.state)) {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      return command(this.pm.state, this.pm.view.dispatch, this.pm.view);
    }
    return false;
  }

  isMarkActive(markType: MarkType) {
    const { from, $from, to, empty } = this.state.selection;
    if (empty) {
      return !!markType.isInSet(this.state.storedMarks || $from.marks());
    } else {
      return rangeHasMarkEverywhere(this.state.doc, from, to, markType);
    }
  }

  withTransaction(callback: (tr: Transaction) => Transaction | null) {
    const tr = this.state.tr;
    const result = callback(tr);
    if (result) {
      this.pm.view.dispatch(result);
    }
  }

  get datastore(): ProseStore {
    return unwrap(datastoreKey.getState(this.pm.state))();
  }

  get widgets() {
    return this.pm.widgets;
  }

  get schema(): Schema {
    return this.pm.state.schema;
  }

  get state(): EditorState {
    return this.pm.state;
  }

  get view(): EditorView {
    return this.pm.view;
  }

  get htmlContent(): string {
    const fragment = DOMSerializer.fromSchema(this.schema).serializeFragment(
      this.pm.state.doc.content,
      {
        document,
      }
    );
    const div = document.createElement('div');
    div.appendChild(fragment);
    return div.innerHTML;
  }
}

export class ProseReferenceManager extends ReferenceManager<
  ResolvedPNode,
  ResolvedPNode
> {
  constructor() {
    super(
      (node: ResolvedPNode) => node,
      (bundle: ResolvedPNode) => {
        if (isElementPNode(bundle)) {
          const { from, to, node } = bundle;
          const name = node?.type.name || '';
          const attrs = JSON.stringify(node?.attrs);
          return `${from} - ${to} - ${name} - ${attrs}`;
        } else {
          const { from, to, domNode } = bundle;
          let domNodeTag = '';
          let domNodeAttrs = '';
          if (domNode) {
            domNodeTag = tagName(domNode);
            domNodeAttrs = isElement(domNode)
              ? JSON.stringify(domNode.attributes)
              : '';
          }
          return `${from} - ${to} - ${domNodeTag} - ${domNodeAttrs}`;
        }
      }
    );
  }
}
