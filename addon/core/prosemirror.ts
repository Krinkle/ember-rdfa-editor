import {
  Command,
  EditorState,
  Plugin,
  Selection,
  Transaction,
} from 'prosemirror-state';
import {
  DirectEditorProps,
  EditorView,
  NodeViewConstructor,
} from 'prosemirror-view';
import {
  DOMParser as ProseParser,
  DOMSerializer,
  MarkType,
  Schema,
} from 'prosemirror-model';
import {
  getPathFromRoot,
  isElement,
  tagName,
} from '@lblod/ember-rdfa-editor/utils/dom-helpers';

import { v4 as uuidv4 } from 'uuid';
import { gapCursor } from 'prosemirror-gapcursor';
import { keymap } from 'prosemirror-keymap';
import { history } from 'prosemirror-history';
import { baseKeymap } from '@lblod/ember-rdfa-editor/core/keymap';
import { dropCursor } from 'prosemirror-dropcursor';
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
import { pasteHandler } from './paste-handler';
import { tracked } from 'tracked-built-ins';
import recreateUuidsOnPaste from '../plugins/recreateUuidsOnPaste';
import Owner from '@ember/owner';
import {
  DefaultAttrGenPuginOptions,
  defaultAttributeValueGeneration,
} from '@lblod/ember-rdfa-editor/plugins/default-attribute-value-generation';

interface ProsemirrorArgs {
  owner: Owner;
  target: Element;
  schema: Schema;
  baseIRI: string;
  plugins?: Plugin[];
  nodeViews?: (
    controller: ProseController
  ) => Record<string, NodeViewConstructor>;
  defaultAttrGenerators?: DefaultAttrGenPuginOptions;
}

export class RdfaEditorView extends EditorView {
  @tracked trackedState: EditorState;

  constructor(
    place:
      | Node
      | ((editor: HTMLElement) => void)
      | {
          mount: HTMLElement;
        }
      | null,
    props: DirectEditorProps
  ) {
    super(place, {
      ...props,
      dispatchTransaction: (tr) => {
        if (props.dispatchTransaction) {
          props.dispatchTransaction(tr);
          this.trackedState = this.state;
        } else {
          const newState = this.state.apply(tr);
          this.trackedState = newState;
          this.updateState(newState);
        }
      },
    });
    this.trackedState = this.state;
  }
}

export default class Prosemirror {
  @tracked view: RdfaEditorView;
  @tracked embeddedView?: RdfaEditorView | null;
  @tracked showRdfaBlocks = false;
  owner: Owner;
  root: Element;
  baseIRI: string;
  pathFromRoot: Node[];
  schema: Schema;

  private logger: Logger;

  constructor({
    owner,
    target,
    schema,
    baseIRI,
    plugins = [],
    nodeViews = () => {
      return {};
    },
    defaultAttrGenerators = [],
  }: ProsemirrorArgs) {
    this.logger = createLogger(this.constructor.name);
    this.owner = owner;
    this.root = target;
    this.pathFromRoot = getPathFromRoot(this.root, false);
    this.baseIRI = baseIRI;
    this.schema = schema;
    const state = EditorState.create({
      doc: ProseParser.fromSchema(this.schema).parse(target),
      plugins: [
        datastore({ pathFromRoot: this.pathFromRoot, baseIRI }),
        ...plugins,
        pasteHandler(),
        dropCursor(),
        gapCursor(),
        keymap(baseKeymap(schema)),
        history(),
        recreateUuidsOnPaste,
        defaultAttributeValueGeneration([
          {
            attribute: '__rdfaId',
            generator() {
              return uuidv4();
            },
          },
          ...defaultAttrGenerators,
        ]),
      ],
    });
    this.view = new RdfaEditorView(target, {
      state,
      attributes: { class: 'say-editor__inner say-content' },
      nodeViews: nodeViews(new ProseController(this)),
      dispatchTransaction: (tr) => {
        const newState = this.state.apply(tr);
        this.view.updateState(newState);
      },
      handleDOMEvents: {
        focus: () => {
          this.clearEmbeddedView();
        },
      },
    });
  }

  setEmbeddedView(view?: RdfaEditorView) {
    this.embeddedView = view;
  }

  clearEmbeddedView() {
    this.embeddedView = null;
  }

  get editable() {
    return this.view.editable;
  }

  get embeddedState() {
    return this.embeddedView?.trackedState;
  }

  get state() {
    return this.view.trackedState;
  }

  getState(includeEmbeddedView = false) {
    return includeEmbeddedView && this.embeddedState
      ? this.embeddedState
      : this.state;
  }

  getView(includeEmbeddedView = false) {
    return includeEmbeddedView && this.embeddedView
      ? this.embeddedView
      : this.view;
  }

  focus(includeEmbeddedView = false) {
    includeEmbeddedView && this.embeddedView
      ? this.embeddedView.focus()
      : this.view.focus();
  }
}

export class ProseController {
  @tracked
  private pm: Prosemirror;

  constructor(pm: Prosemirror) {
    this.pm = pm;
  }

  get externalContextStore(): ProseStore {
    return unwrap(datastoreKey.getState(this.pm.state)).contextStore;
  }

  clone() {
    return new ProseController(this.pm);
  }

  toggleMark(type: MarkType, includeEmbeddedView?: boolean): void;

  /**
   *
   * @deprecated
   */
  toggleMark(name: string, includeEmbeddedView?: boolean): void;

  /**
   *
   * @deprecated use doCommand with the {@link toggleMark} or {@link toggleMarkAddFirst} commands
   */
  toggleMark(type: string | MarkType, includeEmbeddedView = false) {
    this.focus(includeEmbeddedView);
    const markType = typeof type === 'string' ? this.schema.marks[type] : type;
    this.doCommand(toggleMarkAddFirst(markType), includeEmbeddedView);
  }

  focus(includeEmbeddedView = false) {
    this.pm.focus(includeEmbeddedView);
  }

  setEmbeddedView(view?: RdfaEditorView) {
    this.pm.setEmbeddedView(view);
  }

  clearEmbeddedView() {
    this.pm.clearEmbeddedView();
  }

  setHtmlContent(content: string) {
    this.focus();
    const tr = this.pm.state.tr;
    const domParser = new DOMParser();
    tr.replaceWith(
      0,
      tr.doc.nodeSize - 2,
      ProseParser.fromSchema(this.schema).parse(
        domParser.parseFromString(content, 'text/html'),
        {
          preserveWhitespace: true,
        }
      )
    );
    tr.setSelection(Selection.atEnd(tr.doc));
    this.pm.view.dispatch(tr);
  }

  doCommand(command: Command, includeEmbeddedView = false): boolean {
    const view = this.pm.getView(includeEmbeddedView);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    return command(view.state, view.dispatch, view);
  }

  checkCommand(command: Command, includeEmbeddedView = false): boolean {
    const state = this.pm.getState(includeEmbeddedView);
    return command(state);
  }

  /**
   * @deprecated This method is obsolete and will be removed in version 3.0. Use doCommand instead.
   */
  checkAndDoCommand(command: Command, includeEmbeddedView = false): boolean {
    const view = this.pm.getView(includeEmbeddedView);
    if (command(view.state)) {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      return command(view.state, view.dispatch, view);
    }
    return false;
  }

  isMarkActive(markType: MarkType, includeEmbeddedView = false) {
    const state = this.pm.getState(includeEmbeddedView);
    const { from, $from, to, empty } = state.selection;
    if (empty) {
      return !!markType.isInSet(state.storedMarks || $from.marks());
    } else {
      return rangeHasMarkEverywhere(state.doc, from, to, markType);
    }
  }

  withTransaction(
    callback: (tr: Transaction) => Transaction | null,
    includeEmbeddedView = false
  ) {
    const view = this.pm.getView(includeEmbeddedView);
    const tr = view.state.tr;
    const result = callback(tr);
    if (result) {
      view.dispatch(result);
    }
  }

  get datastore(): ProseStore {
    return unwrap(datastoreKey.getState(this.pm.state)).datastore();
  }

  get schema(): Schema {
    return this.pm.state.schema;
  }

  /**
   * @deprecated This getter is deprecated and will be removed in version 3.0. Use the getState method instead.
   */
  get state(): EditorState {
    return this.pm.state;
  }

  /**
   * @deprecated This getter is deprecated and will be removed in version 3.0. Use the getView method instead.
   */
  get view(): EditorView {
    return this.pm.view;
  }

  get owner(): Owner {
    return this.pm.owner;
  }

  getState(includeEmbeddedView = false) {
    return this.pm.getState(includeEmbeddedView);
  }

  getView(includeEmbeddedView = false) {
    return this.pm.getView(includeEmbeddedView);
  }

  get htmlContent(): string {
    const div = document.createElement('div');
    DOMSerializer.fromSchema(this.schema).serializeFragment(
      this.pm.state.doc.content,
      undefined,
      div
    );
    return div.innerHTML;
  }

  get inEmbeddedView(): boolean {
    return !!this.pm.embeddedView;
  }

  toggleRdfaBlocks() {
    console.log('TOGGLE');
    this.pm.showRdfaBlocks = !this.pm.showRdfaBlocks;
  }

  get showRdfaBlocks() {
    return this.pm.showRdfaBlocks;
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
