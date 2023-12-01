import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import xmlFormat from 'xml-formatter';
import { basicSetup, EditorView } from 'codemirror';
import { xml } from '@codemirror/lang-xml';
import { html } from '@codemirror/lang-html';
import sampleData from '../config/sample-data';
import { EditorState } from '@codemirror/state';
import { unwrap } from '@lblod/ember-rdfa-editor/utils/_private/option';
import ApplicationInstance from '@ember/application/instance';
import SayController from '@lblod/ember-rdfa-editor/core/say-controller';

interface DebugToolArgs {
  controller?: SayController;
}

export default class RdfaEditorDebugTools extends Component<DebugToolArgs> {
  @tracked debug: unknown;
  @tracked xmlDebuggerOpen = false;
  @tracked debuggerContent = '';
  @tracked htmlDebuggerOpen = false;
  @tracked sampleData = sampleData;
  @tracked exportContent = '';
  private unloadListener?: () => void;
  private xmlEditor?: EditorView;
  private htmlEditor?: EditorView;

  get controller() {
    return this.args.controller;
  }

  constructor(owner: ApplicationInstance, args: DebugToolArgs) {
    super(owner, args);
    this.unloadListener = () => {
      this.saveEditorContentToLocalStorage();
    };
    window.addEventListener('beforeunload', this.unloadListener);
  }

  willDestroy(): void {
    super.willDestroy();
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
  setDebuggerContent(content: string) {
    this.debuggerContent = content;
  }

  @action
  setEditorContent(type: 'xml' | 'html', content: string) {
    if (this.controller) {
      if (type === 'html') {
        this.controller.initialize(content);
        this.saveEditorContentToLocalStorage();
      }
    }
  }

  @action openContentDebugger(type: 'xml' | 'html') {
    if (this.controller) {
      if (type === 'xml') {
        this.debuggerContent = 'Coming soon!';
        this.xmlDebuggerOpen = true;
      } else {
        this.debuggerContent = this.controller.htmlContent;
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
  showExportPreview() {
    const wnd = window.open('about:blank', '', '_blank');
    if (wnd) {
      wnd.document.write(
        `<!DOCTYPE html>\n${this.controller?.htmlContent || ''}`,
      );
    }
  }

  saveEditorContentToLocalStorage() {
    if (this.controller) {
      localStorage.setItem('EDITOR_CONTENT', this.controller.htmlContent);
    }
  }
}
