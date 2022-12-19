import {Node as PNode, ResolvedPos} from 'prosemirror-model';

export function findAncestors(
  pos: ResolvedPos,
  predicate: (node: PNode) => boolean = () => true
) {
  const result: { node: PNode; pos: number }[] = [];
  let depth = pos.depth;
  while (depth >= 0) {
    const parent = pos.node(depth);
    if (predicate(parent)) {
      result.push({node: parent, pos: pos.before(depth)});
    }
    depth -= 1;
  }
  return result;
}

export function* findChildren(
  doc: PNode,
  pos: number,
  reverse = true,
  recursive = true,
  filter: ({from, to}: { from: number; to: number }) => boolean = () => true,
  startIndex?: number
): Generator<{ from: number, to: number }, void> {
  const node = pos === -1 ? doc : doc.nodeAt(pos);
  if (!node) {
    throw new Error('No node found at provided position');
  }
  if (startIndex === undefined || startIndex === null) {
    startIndex = reverse ? node.childCount - 1 : 0
  }
  if (reverse) {
    let offset = node.content.size;
    for (let i = node.childCount - 1; i >= 0; i--) {
      offset -= node.child(i).nodeSize;
      if (i <= startIndex) {
        const childRange = {from: pos + 1 + offset, to: pos + 1 + offset + node.child(i).nodeSize}
        if (recursive) {
          yield* findChildren(doc, childRange.from, reverse, recursive, filter);
        }
        if (filter(childRange)) {
          yield childRange;
        }
      }
    }
  } else {
    let offset = 0;
    for (let i = 0; i < node.childCount; i++) {
      if (i >= startIndex) {
        const childRange = {from: pos + 1 + offset, to: pos + 1 + offset + node.child(i).nodeSize}
        const resolvedChild = {node: node.child(i), pos: pos + 1 + offset};
        if (filter(childRange)) {
          yield childRange;
        }
        if (recursive) {
          yield* findChildren(doc, childRange.from, reverse, recursive, filter);
        }
      }
      offset += node.child(i).nodeSize;
    }
  }
}

export function* findNodes(
  doc: PNode,
  from: number,
  visitParentUpwards = false,
  reverse = false,
  filter: ({from, to}: { from: number; to: number }) => boolean = () => true
): Generator<{ from: number, to: number }, undefined> {
  if (from === -1) {
    throw new Error('Starting position may not lay before root node');
  }
  const fromResolved = doc.resolve(from);
  let startIndex: number;
  const index = fromResolved.index();
  const indexAfter = fromResolved.indexAfter();
  if (reverse) {
    startIndex = index === indexAfter ? index - 1 : index;
  } else {
    startIndex = index;
  }
  const parentRange = {
    from: fromResolved.depth > 0 ? fromResolved.before() : -1,
    to: fromResolved.depth > 0 ? fromResolved.after() : doc.nodeSize
  }
  yield* findChildren(doc, parentRange.from, reverse, true, filter, startIndex);
  if (visitParentUpwards && fromResolved.depth !== 0) {
    if (filter(parentRange)) {
      yield parentRange;
    }
    yield* findNodes(doc, reverse ? parentRange.from : parentRange.to, visitParentUpwards, reverse, filter);
  }
  return;
}
