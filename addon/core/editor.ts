import EventBus, {
  EDITOR_EVENT_MAP,
  EditorEvent,
  EditorEventListener,
  EditorEventName
} from "@lblod/ember-rdfa-editor/archive/utils/event-bus";
import Command from "@lblod/ember-rdfa-editor/core/command";
import EditorModel, {HtmlModel} from "@lblod/ember-rdfa-editor/core/editor-model";

export default interface Editor {
  executeCommand<A extends unknown[], R>(source: string, commandName: string, ...args: A): R | void;

  onEvent<E extends EditorEventName>(eventName: E, callback: EditorEventListener<E>): void;

  emitEvent<E extends EditorEventName>(event: EDITOR_EVENT_MAP[E]): void;

  registerCommand<A extends unknown[], R>(command: { new(model: EditorModel): Command<A, R> }): void;

  canExecuteCommand<A extends unknown[]>(commandName: string, ...args: A): boolean;
}

export class EditorImpl implements Editor {
  private model: EditorModel;
  private registeredCommands: Map<string, Command<unknown[], unknown>> = new Map<string, Command<unknown[], unknown>>();

  constructor(rootElement: HTMLElement) {
    this.model = new HtmlModel(rootElement);
  }

  executeCommand<A extends unknown[], R>(source: string, commandName: string, ...args: A): R | void {
    try {
      const command = this.getCommand(commandName);
      if (command.canExecute(...args)) {
        return command.execute(source, ...args) as R;
      }
    } catch (e) {
      console.error(e);
    }
  }

  private getCommand<A extends unknown[], R>(commandName: string): Command<A, R> {
    const command = this.registeredCommands.get(commandName) as Command<A, R>;
    if (!command) {
      throw new Error(`Unrecognized command ${commandName}`);
    }
    return command;
  }

  onEvent<E extends EditorEventName>(eventName: E, callback: EditorEventListener<E>): void {
    EventBus.on(eventName, callback);
  }

  registerCommand<A extends unknown[], R>(command: { new(model: EditorModel): Command<A, R> }): void {
    const cmd = new command(this.model);
    this.registeredCommands.set(cmd.name, cmd);
  }

  canExecuteCommand<A extends unknown[]>(commandName: string, ...args: A): boolean {
    return this.getCommand(commandName).canExecute(...args);
  }
  emitEvent<E extends EditorEventName>(event: EDITOR_EVENT_MAP[E]) {
    EventBus.emit(event);
  }

}
