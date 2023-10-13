import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { SayController } from '@lblod/ember-rdfa-editor';
import {
  clearBacklinks,
  clearProperties,
} from '@lblod/ember-rdfa-editor/commands/rdfa-commands';
import { ResolvedNode } from '@lblod/ember-rdfa-editor/plugins/_private/editable-node';
import { isResourceNode } from '@lblod/ember-rdfa-editor/utils/node-utils';
import { v4 as uuidv4 } from 'uuid';
type Args = {
  node: ResolvedNode;
  controller: SayController;
};
export default class RdfaTypeConvertor extends Component<Args> {
  @tracked newResource?: string = undefined;
  @tracked showDialog = false;

  get isResourceNode() {
    return isResourceNode(this.args.node.value);
  }

  get controller() {
    return this.args.controller;
  }

  get node() {
    return this.args.node;
  }

  get buttonLabel() {
    if (this.isResourceNode) {
      return 'Convert to content node';
    } else {
      return 'Convert to resource node';
    }
  }

  get confirmationDialogTitle() {
    if (this.isResourceNode) {
      return 'Are you sure you want to convert this node to a content node?';
    } else {
      return 'Are you sure you want to convert this node to a resource node?';
    }
  }

  setNewResource(event: InputEvent) {
    this.newResource = (event.target as HTMLInputElement).value;
  }

  showConfirmationDialog = () => {
    this.showDialog = true;
  };

  confirmConversion = () => {
    if (this.isResourceNode) {
      this.convertToContentNode();
    } else {
      this.convertToResourceNode();
    }
    this.showDialog = false;
  };

  cancelConversion = () => {
    this.showDialog = false;
    this.newResource = undefined;
  };

  convertToContentNode = () => {
    this.args.controller.withTransaction((tr) => {
      return tr.setNodeAttribute(this.node.pos, 'resource', null);
    });
    this.controller.doCommand(clearBacklinks({ position: this.node.pos }));
    this.controller.doCommand(clearProperties({ position: this.node.pos }));
  };

  convertToResourceNode = () => {
    const newResource =
      this.newResource?.trim() || `http://example.org/${uuidv4()}`;
    this.args.controller.withTransaction((tr) => {
      tr.setNodeAttribute(this.node.pos, 'resource', newResource);
      tr.setNodeAttribute(this.node.pos, 'properties', []);
      tr.setNodeAttribute(this.node.pos, 'backlinks', []);
      return tr;
    });
    this.newResource = undefined;
  };
}
