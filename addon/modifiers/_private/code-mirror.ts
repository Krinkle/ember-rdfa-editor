import { EditorState, type Extension } from '@codemirror/state';
import { registerDestructor } from '@ember/destroyable';
import type Owner from '@ember/owner';
import { EditorView, basicSetup } from 'codemirror';
import { type ArgsFor, type NamedArgs } from 'ember-modifier';
import Modifier from 'ember-modifier';

export type CodeMirrorSignature = {
  Element: HTMLElement;
  Args: {
    Positional: [];
    Named: {
      content: string;
      extensions?: Extension[];
      onUpdate?: (content: string) => void;
    };
  };
};

function cleanup(instance: CodeMirrorModifier) {
  instance.view?.destroy();
}

const DEFAULT_EXTENSIONS = [basicSetup];

export default class CodeMirrorModifier extends Modifier<CodeMirrorSignature> {
  rootElement?: HTMLElement;
  view?: EditorView;
  isUpdating = false;

  constructor(owner: Owner, args: ArgsFor<CodeMirrorSignature>) {
    super(owner, args);
    registerDestructor(this, cleanup);
  }

  initializeEditor(
    element: HTMLElement,
    {
      extensions = DEFAULT_EXTENSIONS,
      content = '',
      onUpdate,
    }: NamedArgs<CodeMirrorSignature>,
  ) {
    this.rootElement = element;
    if (onUpdate) {
      extensions = [
        ...extensions,
        EditorView.updateListener.of((update) => {
          if (!this.isUpdating) {
            onUpdate(update.state.sliceDoc());
          }
        }),
      ];
    }
    const state = EditorState.create({
      doc: content,
      extensions,
    });
    this.view = new EditorView({
      state,
      parent: element,
    });
  }

  updateEditor({ content = '' }: NamedArgs<CodeMirrorSignature>) {
    if (this.view) {
      if (content !== this.view.state.sliceDoc()) {
        this.isUpdating = true;
        this.view.dispatch({
          changes: {
            from: 0,
            to: this.view.state.doc.length,
            insert: content,
          },
        });
        this.isUpdating = false;
      }
    }
  }

  modify(
    element: HTMLElement,
    _positional: [],
    options: NamedArgs<CodeMirrorSignature>,
  ): void {
    if (!this.rootElement) {
      this.initializeEditor(element, options);
    } else {
      this.updateEditor(options);
    }
  }
}
