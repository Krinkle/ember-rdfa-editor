import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import xmlFormat from 'xml-formatter';
import { basicSetup, EditorView } from 'codemirror';
import { xml } from '@codemirror/lang-xml';
import { html } from '@codemirror/lang-html';
import sampleData from '../../config/sample-data';
import { EditorState } from '@codemirror/state';
import {
  ProseController,
  WidgetSpec,
} from '@lblod/ember-rdfa-editor/core/prosemirror';
import { NodeViewConstructor } from 'prosemirror-view';
import { ProsePlugin } from '@lblod/ember-rdfa-editor';
import { Schema } from 'prosemirror-model';
import { unwrap } from '@lblod/ember-rdfa-editor/utils/option';

interface RdfaEditorDebugArgs {
  rdfaEditorInit: (rdfaDocument: ProseController) => void;
  devtools?: boolean;
  nodeViews?: Record<string, NodeViewConstructor>;
  plugins?: ProsePlugin[];
  schema: Schema;
  widgets?: WidgetSpec[];
  baseIRI: string;
}

export default class RdfaRdfaEditorWithDebug extends Component<RdfaEditorDebugArgs> {
  @tracked rdfaEditor?: ProseController;
  @tracked debug: unknown;
  @tracked xmlDebuggerOpen = false;
  @tracked debuggerContent = '';
  @tracked pasteBehaviour = 'full-html';
  @tracked htmlDebuggerOpen = false;
  @tracked sampleData = sampleData;
  @tracked exportContent = '';
  private unloadListener?: () => void;
  private xmlEditor?: EditorView;
  private htmlEditor?: EditorView;

  @action
  setup() {
    this.unloadListener = () => {
      this.saveEditorContentToLocalStorage();
    };
    window.addEventListener('beforeunload', this.unloadListener);
  }

  @action
  teardown() {
    if (this.unloadListener) {
      window.removeEventListener('beforeunload', this.unloadListener);
    }
  }

  @action
  initDebug(info: unknown) {
    this.debug = info;
  }

  @action
  setupXmlEditor(element: HTMLElement) {
    this.xmlEditor = new EditorView({
      state: EditorState.create({
        extensions: [basicSetup, xml()],
      }),
      parent: element,
    });
    this.xmlEditor.dispatch({
      changes: { from: 0, insert: this.debuggerContent },
    });
  }

  @action
  setupHtmlEditor(element: HTMLElement) {
    this.htmlEditor = new EditorView({
      state: EditorState.create({
        extensions: [basicSetup, html()],
      }),
      parent: element,
    });
    this.htmlEditor.dispatch({
      changes: { from: 0, insert: this.debuggerContent },
    });
  }

  get formattedXmlContent() {
    if (this.debuggerContent) {
      try {
        return xmlFormat(this.debuggerContent);
      } catch (e) {
        return this.debuggerContent;
      }
    }
    return this.debuggerContent;
  }

  @action
  rdfaEditorInitFromArg(rdfaEditor: ProseController) {
    this.args.rdfaEditorInit(rdfaEditor);
    this.rdfaEditor = rdfaEditor;
  }

  @action
  setDebuggerContent(content: string) {
    this.debuggerContent = content;
  }

  @action
  setEditorContent(type: 'xml' | 'html', content: string) {
    if (this.rdfaEditor) {
      if (type === 'html') {
        this.rdfaEditor.setHtmlContent(content);
        this.saveEditorContentToLocalStorage();
      }
    }
  }

  @action openContentDebugger(type: 'xml' | 'html') {
    if (this.rdfaEditor) {
      if (type === 'xml') {
        this.debuggerContent = 'Coming soon!';
        this.xmlDebuggerOpen = true;
      } else {
        this.debuggerContent = this.rdfaEditor.htmlContent;
        this.htmlDebuggerOpen = true;
      }
    }
  }

  @action closeContentDebugger(type: 'xml' | 'html', save: boolean) {
    if (type === 'xml') {
      this.debuggerContent = 'Coming soon!';
      this.xmlDebuggerOpen = false;
    } else {
      this.debuggerContent = unwrap(this.htmlEditor).state.sliceDoc();
      this.htmlDebuggerOpen = false;
    }
    if (save) {
      const content = this.debuggerContent;
      if (!content) {
        //xml parser doesn't accept an empty string
        this.setEditorContent('html', '');
      } else {
        this.setEditorContent(type, content);
      }
    }
  }

  @action
  setPasteBehaviour(event: InputEvent) {
    const val = (event.target as HTMLSelectElement).value;
    this.pasteBehaviour = val;
  }

  @action
  showExportPreview() {
    const wnd = window.open('about:blank', '', '_blank');
    if (wnd) {
      wnd.document.write(this.rdfaEditor?.htmlContent || '');
    }
  }

  saveEditorContentToLocalStorage() {
    if (this.rdfaEditor) {
      localStorage.setItem('EDITOR_CONTENT', this.rdfaEditor.htmlContent);
    }
  }
}
