import Component from '@glimmer/component';
import {
  IncomingProp,
  OutgoingProp,
} from '@lblod/ember-rdfa-editor/core/say-parser';
import { ResolvedNode } from '@lblod/ember-rdfa-editor/plugins/_private/editable-node';
import { SayController } from '@lblod/ember-rdfa-editor';
import { isResourceNode } from '@lblod/ember-rdfa-editor/utils/node-utils';
import { selectNodeByRdfaId } from '@lblod/ember-rdfa-editor/commands/rdfa-commands';

type Args = {
  controller?: SayController;
  node: ResolvedNode;
};

export default class RdfaRelationshipEditor extends Component<Args> {
  get outgoing() {
    const properties = this.args.node.value.attrs.properties as
      | OutgoingProp[]
      | undefined;
    return properties?.filter((prop) => prop.type === 'node');
  }

  get backlinks() {
    return this.args.node.value.attrs.backlinks as IncomingProp[] | undefined;
  }

  get controller() {
    return this.args.controller;
  }

  get showOutgoingSection() {
    return isResourceNode(this.args.node.value);
  }

  goToNodeWithId = (id: string) => {
    this.controller?.doCommand(selectNodeByRdfaId({ rdfaId: id }));
  };
}
