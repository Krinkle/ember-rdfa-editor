import Command from "../command";
import Model from "@lblod/ember-rdfa-editor/model/model";
import {TextAttribute} from "@lblod/ember-rdfa-editor/model/model-text";
import ModelSelection from "@lblod/ember-rdfa-editor/model/model-selection";

export default abstract class SetPropertyCommand extends Command {
  constructor(model: Model) {
    super(model);
  }

  protected setProperty(executedBy: string, property: TextAttribute, value: boolean, selection: ModelSelection = this.model.selection, affectSelection = true) {


    if (!ModelSelection.isWellBehaved(selection)) {
      console.info("Not executing SetPropertyCommand because selection is missing");
      return;
    }

    const range = selection.lastRange;

    this.model.change(executedBy, mutator => {
      const resultRange = mutator.setTextProperty(range, property, value);
      if(affectSelection) {
        this.model.selectRange(resultRange);
      }
    });
  }
}
