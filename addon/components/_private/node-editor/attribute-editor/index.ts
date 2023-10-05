import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import SayController from '@lblod/ember-rdfa-editor/core/say-controller';
import SayNodeSpec from '@lblod/ember-rdfa-editor/core/say-node-spec';
import { ResolvedNode } from '@lblod/ember-rdfa-editor/plugins/_private/editable-node';
import { unwrap } from '@lblod/ember-rdfa-editor/utils/_private/option';
import { Changeset, EmberChangeset } from 'ember-changeset';
import { trackedReset } from 'tracked-toolbox';

type Args = {
  controller: SayController;
  node: ResolvedNode;
};

export default class AttributeEditor extends Component<Args> {
  @trackedReset<AttributeEditor, boolean>({
    memo: 'node',
    update: (component) => {
      component.changeset = undefined;
      return false;
    },
  })
  isEditing = false;

  @tracked changeset?: EmberChangeset;

  get controller() {
    return this.args.controller;
  }

  get node() {
    return this.args.node;
  }

  get nodespec() {
    return this.node.value.type.spec as SayNodeSpec;
  }

  isEditable = (attr: string) => {
    //@ts-expect-error editable is not defined on attribute-spec type
    return this.node.value.type.spec.attrs[attr].editable as
      | boolean
      | undefined;
  };

  enableEditingMode = () => {
    this.changeset = Changeset(this.node.value.attrs);
    this.isEditing = true;
  };

  cancelEditing = () => {
    this.isEditing = false;
    this.changeset = undefined;
  };

  saveChanges = () => {
    this.controller?.withTransaction((tr) => {
      for (const { key, value } of unwrap(this.changeset).changes) {
        tr.setNodeAttribute(this.node.pos, key, value);
      }
      return tr;
    });
    this.isEditing = false;
    this.changeset = undefined;
  };

  updateChangeset = (attr: string, event: InputEvent) => {
    if (this.changeset) {
      this.changeset[attr] = (event.target as HTMLTextAreaElement).value;
    }
  };

  formatValue = (value: unknown) => {
    return JSON.stringify(value);
  };

  editorComponent = (attr: string) => {
    return this.nodespec?.attrs?.[attr].editor;
  };
}
