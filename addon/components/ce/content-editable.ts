import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { createEditor, Editor } from '@lblod/ember-rdfa-editor/core/editor';
import { InputHandler } from '@lblod/ember-rdfa-editor/editor/input-handlers/input-handler';
import { NotImplementedError } from '@lblod/ember-rdfa-editor/utils/errors';
import { EditorInputHandler } from '../../input/input-handler';
import { ResolvedPluginConfig } from '../rdfa/rdfa-editor';

interface FeatureService {
  isEnabled(key: string): boolean;
}

interface ContentEditableArgs {
  externalHandlers: InputHandler[];

  editorInit(editor: Editor): void;

  plugins: ResolvedPluginConfig[];

  baseIRI?: string;

  stealFocus?: boolean;
}

/**
 * content-editable is the core of {{#crossLinkModule "rdfa-editor"}}rdfa-editor{{/crossLinkModule}}.
 * It provides handlers for input events, a component to display a content editable element and an API for interaction
 * with the document and its internal document representation.
 *
 * rdfa-editor embeds the {{#crossLink "ContentEditable"}}{{/crossLink}} and interacts with the document
 * through the {{#crossLink "RawEditor"}}{{/crossLink}} interface.
 *
 * Input is handled by input handlers such as the {{#crossLink "TextInputHandler"}}{{/crossLink}},
 * {{#crossLink "BackspaceHandler"}}{{/crossLink}}, {{#crossLink "ArrowHandler"}}{{/crossLink}} and
 * {{#crossLink "EnterHandler"}}{{/crossLink}}.
 * @module contenteditable-editor
 * @main contenteditable-editor
 */

/**
 * Content editable editor component.
 * @module contenteditable-editor
 * @class ContentEditableComponent
 * @extends Component
 */
export default class ContentEditable extends Component<ContentEditableArgs> {
  editor: Editor | null = null;
  inputHandler: EditorInputHandler | null = null;

  @service declare features: FeatureService;

  @action
  afterSelectionChange() {
    if (this.inputHandler) {
      this.inputHandler.afterSelectionChange();
    }
  }

  @action
  beforeInput(event: InputEvent) {
    if (this.inputHandler) {
      this.inputHandler.beforeInput(event);
    }
  }
  @action
  keydown(event: KeyboardEvent) {
    if (this.inputHandler) {
      this.inputHandler.keydown(event);
    }
  }
  @action
  paste(event: ClipboardEvent) {
    if (this.inputHandler) {
      this.inputHandler.paste(
        event,
        this.features.isEnabled('editor-html-paste'),
        this.features.isEnabled('editor-extended-html-paste')
      );
    }
  }
  @action
  cut(event: ClipboardEvent) {
    if (this.inputHandler) {
      this.inputHandler.cut(event);
    }
  }
  @action
  copy(event: ClipboardEvent) {
    if (this.inputHandler) {
      this.inputHandler.copy(event);
    }
  }

  @action
  dragstart(event: DragEvent) {
    throw new NotImplementedError(`Event not handled: ${event.type}`);
  }

  /**
   * "didRender" hook: Makes sure the element is focused and calls the rootNodeUpdated action.
   *
   * @method insertedEditorElement
   */
  @action
  async insertedEditorElement(element: HTMLElement) {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    document.addEventListener('selectionchange', this.afterSelectionChange);
    this.editor = await createEditor({
      domRoot: element,
      plugins: this.args.plugins,
    });
    this.inputHandler = new EditorInputHandler(this.editor);
    this.args.editorInit(this.editor);
  }

  @action
  teardown() {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    document.removeEventListener('selectionchange', this.afterSelectionChange);
  }
}
