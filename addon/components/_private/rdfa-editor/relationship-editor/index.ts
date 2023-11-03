import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import {
  IncomingProp,
  OutgoingNodeProp,
  OutgoingProp,
} from '@lblod/ember-rdfa-editor/core/say-parser';
import { ResolvedNode } from '@lblod/ember-rdfa-editor/plugins/_private/editable-node';
import { PNode, SayController } from '@lblod/ember-rdfa-editor';
import { isResourceNode } from '@lblod/ember-rdfa-editor/utils/node-utils';
import {
  removeBacklink,
  removeProperty,
  selectNodeByRdfaId,
  selectNodeByResource,
} from '@lblod/ember-rdfa-editor/commands/rdfa-commands';
import { addProperty } from '@lblod/ember-rdfa-editor/commands/rdfa-commands/add-property';
import { insertRelation } from '@lblod/ember-rdfa-editor/commands/rdfa-commands/insert-relation';
import { NotImplementedError } from '@lblod/ember-rdfa-editor/utils/_private/errors';
import { getAllRdfaIds } from '@lblod/ember-rdfa-editor/utils/rdfa-utils';
import RelationshipEditorModal, { AddRelationshipType } from './modal';
import { getPositionByRdfaId } from '@lblod/ember-rdfa-editor/plugins/rdfa-info';

type Args = {
  controller?: SayController;
  node: ResolvedNode;
};

export default class RdfaRelationshipEditor extends Component<Args> {
  @tracked addRelationshipType?: AddRelationshipType;

  Modal = RelationshipEditorModal;

  get backlinks() {
    return this.args.node.value.attrs.backlinks as IncomingProp[] | undefined;
  }

  get properties() {
    return this.args.node.value.attrs.properties as OutgoingProp[] | undefined;
  }

  get hasOutgoing() {
    return this.properties?.some((prop) => prop.type === 'node');
  }

  get controller() {
    return this.args.controller;
  }

  get showOutgoingSection() {
    return isResourceNode(this.args.node.value);
  }

  // TODO this probably shouldn't be calculated every time
  get allRdfaids() {
    if (!this.controller) throw Error('No Controller');
    return getAllRdfaIds(this.controller.mainEditorState.doc);
  }

  goToOutgoing = (outgoing: OutgoingNodeProp) => {
    this.controller?.doCommand(selectNodeByRdfaId({ rdfaId: outgoing.nodeId }));
  };

  goToBacklink = (backlink: IncomingProp) => {
    this.controller?.doCommand(
      selectNodeByResource({ resource: backlink.subject }),
    );
  };

  removeBacklink = (index: number) => {
    console.log('remove backlink');
    this.controller?.doCommand(
      removeBacklink({ position: this.args.node.pos, index }),
    );
  };

  removeProperty = (index: number) => {
    this.controller?.doCommand(
      removeProperty({ position: this.args.node.pos, index }),
    );
  };

  get canAddRelationship() {
    if (isResourceNode(this.args.node.value)) {
      return true;
    } else {
      // Content nodes may only have 1 backlink
      return !this.backlinks || this.backlinks.length === 0;
    }
  }

  addRelationship = () => {
    this.addRelationshipType = 'unspecified';
  };
  setAddRelationshipType = (type: AddRelationshipType | null) => {
    this.addRelationshipType = type ?? undefined;
  };

  saveNewRelationship = (predicate: string, rdfaid: string) => {
    switch (this.addRelationshipType) {
      case 'existing': {
        const node = this.getPosById(rdfaid)?.node();
        if (!node) {
          return false;
        }
        this.relateNodes(predicate, node);
        this.addRelationshipType = undefined;
        return true;
      }
      case 'content':
      case 'resource':
        return this.addNode(this.addRelationshipType, predicate);
      default:
        throw new NotImplementedError();
    }
  };

  addNode = (type: 'content' | 'resource', predicate: string) => {
    this.controller?.doCommand(
      insertRelation({ position: this.args.node.pos, type, predicate }),
    );
    this.addRelationshipType = undefined;
  };

  addBacklink = (_backlink: IncomingProp) => {
    throw new NotImplementedError();
  };

  relateNodes(predicate: string, obj: PNode) {
    this.addProperty({
      type: 'node',
      predicate,
      object: obj.attrs.resource as string,
      nodeId: obj.attrs.__rdfaId as string,
    });
  }

  addProperty = (property: OutgoingNodeProp) => {
    this.controller?.doCommand(
      addProperty({ position: this.args.node.pos, property }),
    );
  };

  getPosById = (rdfaid: string) => {
    if (!this.controller) {
      return;
    }
    return getPositionByRdfaId(this.controller.mainEditorState, rdfaid);
  };
}
