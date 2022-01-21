import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import ModelSelection from '@lblod/ember-rdfa-editor/model/model-selection';
import { PropertyState } from '@lblod/ember-rdfa-editor/model/util/types';
import PernetRawEditor from '@lblod/ember-rdfa-editor/utils/ce/pernet-raw-editor';
import Controller from '@lblod/ember-rdfa-editor/model/controller';
import { SelectionChangedEvent } from '@lblod/ember-rdfa-editor/utils/editor-event';

interface Args {
  editor: PernetRawEditor;
  showTextStyleButtons: boolean;
  showListButtons: boolean;
  showIndentButtons: boolean;
  controller: Controller;
}

/**
 * RDFa editor toolbar component
 * @module rdfa-editor
 * @class RdfaEditorToolbarComponent
 * @extends Component
 */
export default class EditorToolbar extends Component<Args> {
  @tracked isBold = false;
  @tracked isItalic = false;
  @tracked isStrikethrough = false;
  @tracked isUnderline = false;
  @tracked isInList = false;
  @tracked canInsertList = true;
  @tracked isInTable = false;
  @tracked canIndent = false;
  @tracked canUnindent = false;
  selection: ModelSelection | null = null;

  constructor(parent: unknown, args: Args) {
    super(parent, args);
    this.args.controller.onEvent(
      'selectionChanged',
      this.updateProperties.bind(this)
    );
  }

  updateProperties(event: SelectionChangedEvent) {
    this.isBold = event.payload.bold === PropertyState.enabled;
    this.isItalic = event.payload.italic === PropertyState.enabled;
    this.isUnderline = event.payload.underline === PropertyState.enabled;
    this.isStrikethrough =
      event.payload.strikethrough === PropertyState.enabled;
    this.isInList = event.payload.inListState === PropertyState.enabled;
    this.canInsertList = this.args.controller.canExecuteCommand('make-list');
    this.isInTable = event.payload.inTableState === PropertyState.enabled;
    this.canIndent =
      this.isInList && this.args.controller.canExecuteCommand('indent-list');
    this.canUnindent =
      this.isInList && this.args.controller.canExecuteCommand('unindent-list');
    this.selection = event.payload;
  }

  @action
  insertIndent() {
    if (this.isInList) {
      this.args.controller.executeCommand('indent-list');
    }
  }

  @action
  insertUnindent() {
    if (this.isInList) {
      this.args.controller.executeCommand('unindent-list');
    }
  }

  @action
  insertNewLine() {
    this.args.controller.executeCommand('insert-newLine');
  }

  @action
  insertNewLi() {
    this.args.controller.executeCommand('insert-newLi');
  }

  @action
  toggleItalic() {
    this.setMark(!this.isItalic, 'italic');
  }

  @action
  toggleUnorderedList() {
    if (this.isInList) {
      this.args.controller.executeCommand('remove-list');
    } else {
      this.args.controller.executeCommand('make-list', 'ul');
    }
  }

  @action
  toggleOrderedList() {
    if (this.isInList) {
      this.args.controller.executeCommand('remove-list');
    } else {
      this.args.controller.executeCommand('make-list', 'ol');
    }
  }

  @action
  randomColor() {
    if (this.selection) {
      this.args.controller.executeCommand(
        'remove-mark',
        this.selection.lastRange,
        'highlighted'
      );
      this.args.controller.executeCommand(
        'add-mark',
        this.selection.lastRange,
        'highlighted'
      );
    }
  }

  @action
  toggleBold() {
    this.setMark(!this.isBold, 'bold');
  }

  @action
  toggleUnderline() {
    this.setMark(!this.isUnderline, 'underline');
  }

  @action
  toggleStrikethrough() {
    this.setMark(!this.isStrikethrough, 'strikethrough');
  }

  @action
  setMark(value: boolean, markName: string, attributes = {}) {
    if (value) {
      this.args.controller.executeCommand(
        'add-mark',
        this.selection?.lastRange,
        markName,
        attributes
      );
    } else {
      this.args.controller.executeCommand(
        'remove-mark',
        this.selection?.lastRange,
        markName
      );
    }
  }

  @action
  undo() {
    this.args.controller.executeCommand('undo');
  }

  // Table commands
  @action
  insertTable() {
    this.args.controller.executeCommand('insert-table');
  }

  @action
  insertRowBelow() {
    this.args.controller.executeCommand('insert-table-row-below');
  }

  @action
  insertRowAbove() {
    this.args.controller.executeCommand('insert-table-row-above');
  }

  @action
  insertColumnAfter() {
    this.args.controller.executeCommand('insert-table-column-after');
  }

  @action
  insertColumnBefore() {
    this.args.controller.executeCommand('insert-table-column-before');
  }

  @action
  removeTableRow() {
    this.args.controller.executeCommand('remove-table-row');
  }

  @action
  removeTableColumn() {
    this.args.controller.executeCommand('remove-table-column');
  }

  @action
  removeTable() {
    this.args.controller.executeCommand('remove-table');
  }
}
