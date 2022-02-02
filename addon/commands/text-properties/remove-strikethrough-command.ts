import SetTextPropertyCommand from '@lblod/ember-rdfa-editor/commands/text-properties/set-text-property-command';
import { logExecute } from '@lblod/ember-rdfa-editor/utils/logging-utils';

export default class RemoveStrikethroughCommand extends SetTextPropertyCommand {
  name = 'remove-strikethrough';

  @logExecute
  execute() {
    super.setProperty('strikethrough', false);
  }
}
