import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import Transaction from '@lblod/ember-rdfa-editor/core/transaction';
import Controller from '@lblod/ember-rdfa-editor/model/controller';
import ModelSelection from '@lblod/ember-rdfa-editor/model/model-selection';
import Operation from '@lblod/ember-rdfa-editor/model/operations/operation';
import { PropertyState } from '@lblod/ember-rdfa-editor/model/util/types';

interface Args {
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
  @tracked tableAddRows = 2;
  @tracked tableAddColumns = 2;
  selection: ModelSelection | null = null;

  constructor(parent: unknown, args: Args) {
    super(parent, args);
    this.args.controller.addTransactionListener(this.update.bind(this));
  }

  modifiesSelection(operations: Operation[]) {
    return operations.some(
      (operation) => operation.type === 'selection-operation'
    );
  }

  update(transaction: Transaction, operations: Operation[]) {
    if (this.modifiesSelection(operations)) {
      this.updateProperties(transaction.currentSelection);
    }
  }

  updateProperties(selection: ModelSelection) {
    this.isBold = selection.bold === PropertyState.enabled;
    this.isItalic = selection.italic === PropertyState.enabled;
    this.isUnderline = selection.underline === PropertyState.enabled;
    this.isStrikethrough = selection.strikethrough === PropertyState.enabled;
    this.isInList = selection.inListState === PropertyState.enabled;
    this.canInsertList = this.args.controller.canExecuteCommand(
      'make-list',
      {}
    );
    this.isInTable = selection.inTableState === PropertyState.enabled;
    this.canIndent =
      this.isInList &&
      this.args.controller.canExecuteCommand('indent-list', {});
    this.canUnindent =
      this.isInList &&
      this.args.controller.canExecuteCommand('unindent-list', {});
    this.selection = selection;
  }

  @action
  insertIndent() {
    if (this.isInList) {
      this.args.controller.executeCommand('indent-list', {});
    }
  }

  @action
  insertUnindent() {
    if (this.isInList) {
      this.args.controller.executeCommand('unindent-list', {});
    }
  }

  @action
  insertNewLine() {
    this.args.controller.executeCommand('insert-newLine', {});
  }

  @action
  insertNewLi() {
    this.args.controller.executeCommand('insert-newLi', {});
  }

  @action
  toggleItalic() {
    this.setMark(!this.isItalic, 'italic');
  }

  @action
  toggleUnorderedList() {
    if (this.isInList) {
      this.args.controller.executeCommand('remove-list', {});
    } else {
      this.args.controller.executeCommand('make-list', { listType: 'ul' });
    }
  }

  @action
  toggleOrderedList() {
    if (this.isInList) {
      this.args.controller.executeCommand('remove-list', {});
    } else {
      this.args.controller.executeCommand('make-list', { listType: 'ol' });
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
      this.args.controller.executeCommand('add-mark-to-selection', {
        markName,
        markAttributes: attributes,
      });
    } else {
      this.args.controller.executeCommand('remove-mark-from-selection', {
        markName,
        markAttributes: attributes,
      });
    }
  }

  @action
  undo() {
    this.args.controller.executeCommand('undo', undefined);
  }

  // Table commands
  @action
  insertTable() {
    this.tableAddRows = isNaN(this.tableAddRows) ? 2 : this.tableAddRows;
    this.tableAddColumns = isNaN(this.tableAddColumns)
      ? 2
      : this.tableAddColumns;
    this.tableAddRows = this.tableAddRows < 1 ? 1 : this.tableAddRows;
    this.tableAddColumns = this.tableAddColumns < 1 ? 1 : this.tableAddColumns;
    this.args.controller.executeCommand('insert-table', {
      rows: this.tableAddRows,
      columns: this.tableAddColumns,
    });
  }

  @action
  insertRowBelow() {
    this.args.controller.executeCommand('insert-table-row-below', {});
  }

  @action
  insertRowAbove() {
    this.args.controller.executeCommand('insert-table-row-above', {});
  }

  @action
  insertColumnAfter() {
    this.args.controller.executeCommand('insert-table-column-after', {});
  }

  @action
  insertColumnBefore() {
    this.args.controller.executeCommand('insert-table-column-before', {});
  }

  @action
  removeTableRow() {
    this.args.controller.executeCommand('remove-table-row', {});
  }

  @action
  removeTableColumn() {
    this.args.controller.executeCommand('remove-table-column', {});
  }

  @action
  removeTable() {
    this.args.controller.executeCommand('remove-table', {});
  }
}
