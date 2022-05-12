import Operation, {
  OperationResult,
} from '@lblod/ember-rdfa-editor/model/operations/operation';
import ModelRange from '@lblod/ember-rdfa-editor/model/model-range';
import {
  AttributeSpec,
  Mark,
  MarkSpec,
} from '@lblod/ember-rdfa-editor/model/mark';
import { UnconfinedRangeError } from '@lblod/ember-rdfa-editor/utils/errors';
import ModelText from '@lblod/ember-rdfa-editor/model/model-text';
import {
  CORE_OWNER,
  INVISIBLE_SPACE,
} from '@lblod/ember-rdfa-editor/model/util/constants';
import ModelNode from '@lblod/ember-rdfa-editor/model/model-node';
import ModelTreeWalker, {
  FilterResult,
} from '@lblod/ember-rdfa-editor/model/util/model-tree-walker';
import OperationAlgorithms from '@lblod/ember-rdfa-editor/model/operations/operation-algorithms';
import EventBus from '@lblod/ember-rdfa-editor/utils/event-bus';
import { ContentChangedEvent } from '@lblod/ember-rdfa-editor/utils/editor-event';
import RangeMapper from '@lblod/ember-rdfa-editor/model/range-mapper';

type MarkAction = 'add' | 'remove';
export default class MarkOperation extends Operation {
  private _action: MarkAction;
  private _spec: MarkSpec;
  private _attributes: AttributeSpec;

  constructor(
    eventbus: EventBus | undefined,
    range: ModelRange,
    spec: MarkSpec,
    attributes: AttributeSpec,
    action: MarkAction
  ) {
    super(eventbus, range);
    this._spec = spec;
    this._attributes = attributes;
    this._action = action;
  }

  get action(): MarkAction {
    return this._action;
  }

  set action(value: MarkAction) {
    this._action = value;
  }

  get attributes(): AttributeSpec {
    return this._attributes;
  }

  set attributes(value: AttributeSpec) {
    this._attributes = value;
  }

  get spec(): MarkSpec {
    return this._spec;
  }

  set spec(value: MarkSpec) {
    this._spec = value;
  }

  canExecute() {
    return true;
  }

  markAction(
    node: ModelText,
    spec: MarkSpec,
    attributes: AttributeSpec,
    action: MarkAction
  ) {
    if (action === 'add') {
      node.addMark(new Mark(spec, attributes, node));
    } else {
      node.removeMarkByName(`${spec.name}-${attributes.setBy || CORE_OWNER}`);
    }
  }

  execute(): OperationResult {
    if (!this.canExecute()) {
      throw new UnconfinedRangeError();
    }

    if (this.range.collapsed) {
      this.range.start.split();

      const referenceNode =
        this.range.start.nodeBefore() || this.range.start.nodeAfter()!;
      const node = new ModelText(INVISIBLE_SPACE);
      if (ModelNode.isModelText(referenceNode)) {
        node.marks = referenceNode.marks.clone();
      }
      //insert new textNode with property set
      this.markAction(node, this.spec, this.attributes, this.action);
      const insertionIndex = this.range.start.parent.offsetToIndex(
        this.range.start.parentOffset
      );
      this.range.start.parent.addChild(node, insertionIndex);

      //put the cursor inside that node
      const newRange = ModelRange.fromInNode(node, 1, 1);
      this.emit(
        new ContentChangedEvent({
          owner: CORE_OWNER,
          payload: {
            type: 'insert',
            oldRange: this.range,
            newRange,
            overwrittenNodes: [],
            insertedNodes: [node],
            _markCheckNodes: [node],
          },
        })
      );
      return { defaultRange: newRange, mapper: new RangeMapper() };
    } else {
      OperationAlgorithms.splitText(this.range.start);
      OperationAlgorithms.splitText(this.range.end);

      const walker = new ModelTreeWalker<ModelText>({
        range: this.range,
        filter: (node: ModelNode) => {
          return ModelNode.isModelText(node)
            ? FilterResult.FILTER_ACCEPT
            : FilterResult.FILTER_SKIP;
        },
      });
      const textNodes = Array.from(walker);
      const _markCheckNodes: ModelNode[] = [...textNodes];

      for (const node of textNodes) {
        this.markAction(node, this.spec, this.attributes, this.action);
      }
      OperationAlgorithms.mergeTextNodes(textNodes);
      const before = this.range.start.nodeBefore();
      const after = this.range.end.nodeAfter();
      if (before) {
        _markCheckNodes.push(before);
        if (ModelNode.isModelText(before)) {
          OperationAlgorithms.mergeTextNodes([before]);
        }
      }
      if (after) {
        _markCheckNodes.push(after);
      }
      OperationAlgorithms.mergeTextNodes([textNodes[textNodes.length - 1]]);
      this.emit(
        new ContentChangedEvent({
          owner: CORE_OWNER,
          payload: {
            type: 'insert',
            oldRange: this.range,
            newRange: this.range,
            overwrittenNodes: [],
            insertedNodes: [],
            _markCheckNodes,
          },
        })
      );
      return { defaultRange: this.range, mapper: new RangeMapper() };
    }
  }
}
