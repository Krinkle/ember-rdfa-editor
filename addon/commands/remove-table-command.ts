import ModelSelection from '@lblod/ember-rdfa-editor/model/model-selection';
import ModelTable from '@lblod/ember-rdfa-editor/model/model-table';
import { MisbehavedSelectionError } from '@lblod/ember-rdfa-editor/utils/errors';
import { logExecute } from '@lblod/ember-rdfa-editor/utils/logging-utils';
import Command, { CommandContext } from './command';
export interface RemoveTableCommandArgs {
  selection?: ModelSelection;
}

export default class RemoveTableCommand
  implements Command<RemoveTableCommandArgs, void>
{
  name = 'remove-table';
  arguments: string[] = ['selection'];

  canExecute(): boolean {
    return true;
  }

  @logExecute
  execute(
    { transaction }: CommandContext,
    { selection = transaction.workingCopy.selection }: RemoveTableCommandArgs
  ): void {
    if (!ModelSelection.isWellBehaved(selection)) {
      throw new MisbehavedSelectionError();
    }

    const table = ModelTable.getTableFromSelection(selection);
    if (!table) {
      throw new Error('The selection is not inside a table');
    }

    if (table.parent) {
      const offset = table.getOffset();
      if (offset) {
        transaction.collapseIn(table.parent, offset);
      } else {
        transaction.collapseIn(table.parent);
      }
    }
    table.removeTable(transaction);
  }
}
