import * as RDF from '@rdfjs/types';
import ModelNode from '@lblod/ember-rdfa-editor/model/model-node';
import {
  conciseToRdfjs,
  PrefixMapping,
} from '@lblod/ember-rdfa-editor/model/util/concise-term-string';
import { first, isEmpty, flatMap, map, filter, execPipe } from 'iter-tools';
import { TermSpec } from '@lblod/ember-rdfa-editor/model/util/datastore/term-spec';
import { single } from '../iterator-utils';

/**
 * Utility class to represent a collection of terms with their
 * respective {@link ModelNode ModelNodes}. The nodes per term
 * are in document order and unique (no duplicates per term).
 *
 * There is no meaningful way to define order on the terms,
 * so don't count on consistent ordering between them.
 */
export class TermMapping<T extends RDF.Term>
  implements
    Iterable<{
      term: T;
      nodes: ModelNode[];
    }>
{
  private termMap: Map<T, ModelNode[]>;
  private getPrefix: PrefixMapping;

  constructor(map: Map<T, ModelNode[]>, getPrefix: PrefixMapping) {
    this.termMap = map;
    this.getPrefix = getPrefix;
  }

  /**
   * Return the only mapping, if there is one.
   * Throws if there is more than 1 mapping.
   *
   * Saves you from unpacking the iterator
   * when you know for sure there can only be one answer,
   * e.g. you matched on a subject and are requesting subjectNodes
   */
  single(): { term: T; nodes: ModelNode[] } | null {
    return (
      single(
        map(
          (entry) => ({
            term: entry[0],
            nodes: entry[1],
          }),
          this.termMap.entries()
        )
      ) || null
    );
  }

  [Symbol.iterator]() {
    return map(
      (entry) => ({
        term: entry[0],
        nodes: entry[1],
      }),
      this.termMap.entries()
    )[Symbol.iterator]();
  }

  /**
   * Request the mapping for a specific term.
   * @param term
   */
  get(term: TermSpec): ModelNode[] | null {
    const convertedTerm = (
      typeof term === 'string' ? conciseToRdfjs(term, this.getPrefix) : term
    ) as T;
    return (
      first(
        execPipe(
          this.termMap.entries(),
          filter((entry) => entry[0].equals(convertedTerm)),
          map((entry) => entry[1])
        )
      ) || null
    );
  }

  /**
   * Return an iterable that applies mappingFunc for each entry
   * @param mappingFunc
   */
  map<R>(
    mappingFunc: (entry: { term: T; nodes: ModelNode[] }) => R
  ): Iterable<R> {
    return execPipe(
      this.termMap.entries(),
      map((entry) => ({ term: entry[0], nodes: entry[1] })),
      map(mappingFunc)
    );
  }

  nodes(): Iterable<ModelNode> {
    return flatMap((entry) => entry[1], this.termMap.entries());
  }

  isEmpty(): boolean {
    return isEmpty(this.termMap.entries());
  }
}
