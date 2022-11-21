import State from '../index';
import ConfigStep from './config-step';
import SelectionStep from './selection-step';
import { SimpleRangeMapper } from '@lblod/ember-rdfa-editor/core/model/range-mapper';
import PluginStep from './plugin-step';
import ReplaceStep from '@lblod/ember-rdfa-editor/core/state/steps/replace-step';
import { SimpleRange } from '@lblod/ember-rdfa-editor/core/model/simple-range';
import MarkStep from '@lblod/ember-rdfa-editor/core/state/steps/mark-step';
import InsertTextStep from '@lblod/ember-rdfa-editor/core/state/steps/insert-text-step';
import RemoveStep from '@lblod/ember-rdfa-editor/core/state/steps/remove-step';
import SplitStep from '@lblod/ember-rdfa-editor/core/state/steps/split-step';
import StateStep from '@lblod/ember-rdfa-editor/core/state/steps/state-step';
import AttributeStep from '@lblod/ember-rdfa-editor/core/state/steps/attribute-step';
import WrapStep from '@lblod/ember-rdfa-editor/core/state/steps/wrap-step';
import ModelNode from '../../model/nodes/model-node';

const OPERATION_STEP_TYPES = new Set<StepType>([
  'replace-step',
  'remove-step',
  'mark-step',
  'split-step',
  'wrap-step',
]);

const DOCUMENT_STEP_TYPES = new Set<StepType>([
  ...OPERATION_STEP_TYPES,
  'attribute-step',
]);

export interface BaseStep {
  readonly type: StepType;

  getResult(initialState: State): StepResult;
}

export interface OperationStepResult extends StepResult {
  defaultRange: SimpleRange;
  removedNodes: ModelNode[];
}

export interface OperationStep extends BaseStep {
  getResult(initialState: State): OperationStepResult;
}

export type StepType =
  | 'replace-step'
  | 'attribute-step'
  | 'mark-step'
  | 'remove-step'
  | 'selection-step'
  | 'config-step'
  | 'state-step'
  | 'insert-text-step'
  | 'move-step'
  | 'split-step'
  | 'plugin-step'
  | 'wrap-step';

export type Step =
  | SelectionStep
  | ConfigStep
  | PluginStep
  | ReplaceStep
  | MarkStep
  | StateStep
  | AttributeStep
  | WrapStep
  | SplitStep
  | RemoveStep
  | InsertTextStep;

export function isSelectionStep(step: Step): step is SelectionStep {
  return step.type === 'selection-step';
}

export function isConfigStep(step: Step): step is ConfigStep {
  return step.type === 'config-step';
}

export function isOperationStep(step: BaseStep): step is OperationStep {
  return OPERATION_STEP_TYPES.has(step.type);
}

export function modifiesSelection(steps: Step[]) {
  return steps.some((step) => isSelectionStep(step) || isOperationStep(step));
}

export function modifiesContent(steps: Step[]) {
  return steps.some((step) => DOCUMENT_STEP_TYPES.has(step.type));
}

export function isPluginStep(step: Step): step is SelectionStep {
  return step.type === 'plugin-step';
}

export type StepResult = {
  state: State;
  mapper: SimpleRangeMapper;
  timestamp: Date;
};
