import SetPropertyCommand from "@lblod/ember-rdfa-editor/commands/text-properties/set-property-command";
import {logExecute} from "@lblod/ember-rdfa-editor/utils/logging-utils";
import ModelSelection from "@lblod/ember-rdfa-editor/core/model/model-selection";

export default class MakeUnderlineCommand extends SetPropertyCommand{
  name = 'make-underline';

  @logExecute
  execute(executedBy: string, selection: ModelSelection = this.model.selection) {
    super.setProperty(executedBy, "underline", true, selection);
  }
}
