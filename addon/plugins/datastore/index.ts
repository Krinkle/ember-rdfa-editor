import {
  EditorState,
  EditorStateConfig,
  PluginKey,
  Transaction,
} from 'prosemirror-state';
import {
  ProseStore,
  proseStoreFromParse,
} from '@lblod/ember-rdfa-editor/utils/datastore/prose-store';
import { Mark, PNode, ProsePlugin, Schema } from '@lblod/ember-rdfa-editor';
import { map, objectFrom } from 'iter-tools';
import { ProseReferenceManager } from '@lblod/ember-rdfa-editor/core/prosemirror';
import { createLogger } from '@lblod/ember-rdfa-editor/utils/logging-utils';
import { DOMSerializer, MarkType } from 'prosemirror-model';
import { isElement, tagName } from '@lblod/ember-rdfa-editor/utils/dom-helpers';
import { Option, unwrap } from '@lblod/ember-rdfa-editor/utils/option';
import ArrayUtils from '@lblod/ember-rdfa-editor/utils/array-utils';

export const datastoreKey = new PluginKey<ProseStore>('datastore');

export { ProseStore } from '@lblod/ember-rdfa-editor/utils/datastore/prose-store';

export interface TextPNode {
  children: ResolvedPNode[];
  mark?: Mark;
  parent?: ResolvedPNode;
  domNode: Node;
  from: number;
  to: number;
}

export interface ElementPNode {
  node: PNode;
  from: number;
  to: number;
}

export function isElementPNode(pnode: ResolvedPNode): pnode is ElementPNode {
  return 'node' in pnode;
}

export function getAppliedMarks(pnode: ResolvedPNode): Mark[] {
  const marks = [];
  let currentNode: ResolvedPNode | undefined = pnode;
  while (currentNode && !isElementPNode(currentNode)) {
    if (currentNode.mark) {
      marks.unshift(currentNode.mark);
    }
    currentNode = currentNode.parent;
    console.log('CURRENT NODE: ', currentNode);
  }
  return marks;
}

export type ResolvedPNode = ElementPNode | TextPNode;

export interface DatastorePluginArgs {
  pathFromRoot: Node[];
  baseIRI: string;
}

export function datastore({
  pathFromRoot,
  baseIRI,
}: DatastorePluginArgs): ProsePlugin<ProseStore> {
  const logger = createLogger('datastore');
  return new ProsePlugin({
    key: datastoreKey,
    state: {
      init(config: EditorStateConfig, state: EditorState) {
        const refman = new ProseReferenceManager();
        const store = proseStoreFromParse({
          root: { node: state.doc, from: -1, to: state.doc.nodeSize },
          textContent,
          tag: tag(state.schema),
          children: children(state.schema, refman),
          attributes: attributes(state.schema),
          isText,
          getParent: getParent(refman),

          pathFromDomRoot: pathFromRoot,
          baseIRI,
        });

        logger(`parsed ${store.size} triples`);
        return store;
      },
      apply(
        tr: Transaction,
        oldStore: ProseStore,
        oldState: EditorState,
        newState: EditorState
      ) {
        const refman = new ProseReferenceManager();
        if (tr.docChanged) {
          const newStore = proseStoreFromParse({
            root: { node: newState.doc, from: -1, to: newState.doc.nodeSize },
            textContent,
            tag: tag(newState.schema),
            children: children(newState.schema, refman),
            attributes: attributes(newState.schema),
            isText: isText,
            getParent: getParent(refman),

            pathFromDomRoot: pathFromRoot,
            baseIRI,
          });
          logger(`parsed ${newStore.size} triples`);
          return newStore;
        } else {
          return oldStore;
        }
      },
    },
  });
}

function textContent(resolvedNode: ResolvedPNode): string {
  if (isElementPNode(resolvedNode)) {
    return resolvedNode.node.textContent;
  } else {
    return resolvedNode.domNode.textContent ?? '';
  }
}

function isText(resolvedNode: ResolvedPNode): boolean {
  return (
    isElementPNode(resolvedNode) &&
    resolvedNode.node.type.name !== 'invisible_rdfa' &&
    (resolvedNode.node.isText || resolvedNode.node.isLeaf)
  );
}

function getRdfaMarks(rdfaMarks: MarkType[], node: PNode): Mark | undefined {
  const isText = node.isText || node.isAtom || node.isLeaf;
  if (isText) {
    for (const type of rdfaMarks) {
      const mark = type.isInSet(node.marks);
      if (mark) {
        return mark;
      }
    }
  }
  return undefined;
}

function children(schema: Schema, refman: ProseReferenceManager) {
  const serializer = DOMSerializer.fromSchema(schema);
  const rdfaMarks: MarkType[] = [];
  for (const markType of Object.values(schema.marks)) {
    if (markType.spec.hasRdfa as boolean) {
      rdfaMarks.push(markType);
    }
  }
  return function (resolvedNode: ResolvedPNode): Iterable<ResolvedPNode> {
    if (isElementPNode(resolvedNode)) {
      const { from, node } = resolvedNode;
      const rslt: ResolvedPNode[] = [];
      let textBuffer: [PNode, number][] = [];

      node.descendants((child, relativePos) => {
        const absolutePos = from + 1 + relativePos;
        if (child.isText || child.isLeaf || child.isAtom) {
          textBuffer.push([child, absolutePos]);
        } else {
          if (textBuffer.length) {
            rslt.push(
              ...map((pChild: TextPNode) => {
                pChild.parent = resolvedNode;
                return pChild;
              }, serializeTextBlob(refman, rdfaMarks, serializer, schema, textBuffer))
            );
          }
          textBuffer = [];
          rslt.push(
            refman.get({
              node: child,
              from: absolutePos,
              to: absolutePos + child.nodeSize,
            })
          );
        }

        return false;
      });
      if (textBuffer.length) {
        rslt.push(
          ...map((pChild: TextPNode) => {
            pChild.parent = resolvedNode;
            return pChild;
          }, serializeTextBlob(refman, rdfaMarks, serializer, schema, textBuffer))
        );
      }
      return rslt;
    } else {
      return resolvedNode.children;
    }
  };
}

function serializeTextBlob(
  refman: ProseReferenceManager,
  rdfaMarks: MarkType[],
  serializer: DOMSerializer,
  schema: Schema,
  buffer: [PNode, number][]
): Iterable<ResolvedPNode> {
  let currentMark: Mark | null = null;
  let newBuffer: [PNode, number][] = [];
  const children: ResolvedPNode[] = [];
  for (const [node, pos] of buffer) {
    const rdfaMark = getRdfaMarks(rdfaMarks, node) ?? null;
    if (rdfaMark === currentMark) {
      if (rdfaMark) {
        newBuffer.push([node.mark(rdfaMark.removeFromSet(node.marks)), pos]);
      } else {
        newBuffer.push([node, pos]);
      }
    } else {
      if (newBuffer.length) {
        children.push(
          ...serializeTextBlobRec(
            refman,
            rdfaMarks,
            serializer,
            schema,
            newBuffer,
            currentMark
          )
        );
      }
      if (rdfaMark) {
        newBuffer = [[node.mark(rdfaMark.removeFromSet(node.marks)), pos]];
      } else {
        newBuffer = [[node, pos]];
      }
      currentMark = rdfaMark;
    }
  }
  if (newBuffer.length) {
    children.push(
      ...serializeTextBlobRec(
        refman,
        rdfaMarks,
        serializer,
        schema,
        newBuffer,
        currentMark
      )
    );
  }
  return children;
}

function serializeTextBlobRec(
  refman: ProseReferenceManager,
  rdfaMarks: MarkType[],
  serializer: DOMSerializer,
  schema: Schema,
  buffer: [PNode, number][],
  mark: Option<Mark>
): Iterable<ResolvedPNode> {
  if (!mark) {
    return buffer.map(([node, pos]) =>
      refman.get({
        from: pos,
        to: pos + node.nodeSize,
        node,
      })
    );
  } else {
    const from = buffer[0][1];
    const lastNode = unwrap(ArrayUtils.lastItem(buffer));
    const to = lastNode[1] + lastNode[0].nodeSize;
    const markSerializer = serializer.marks[mark.type.name];
    const outputSpec = markSerializer(mark, true);
    const { dom } = DOMSerializer.renderSpec(document, outputSpec);
    let currentMark: Mark | undefined;
    let newBuffer: [PNode, number][] = [];
    const children: ResolvedPNode[] = [];
    for (const [node, pos] of buffer) {
      const rdfaMark = getRdfaMarks(rdfaMarks, node);
      if (rdfaMark === currentMark) {
        if (rdfaMark) {
          newBuffer.push([node.mark(rdfaMark.removeFromSet(node.marks)), pos]);
        } else {
          newBuffer.push([node, pos]);
        }
      } else {
        if (newBuffer.length) {
          children.push(
            ...serializeTextBlobRec(
              refman,
              rdfaMarks,
              serializer,
              schema,
              newBuffer,
              currentMark
            )
          );
        }
        if (rdfaMark) {
          newBuffer = [[node.mark(rdfaMark?.removeFromSet(node.marks)), pos]];
        } else {
          newBuffer = [[node, pos]];
        }
        currentMark = rdfaMark;
      }
    }

    if (newBuffer.length) {
      children.push(
        ...serializeTextBlobRec(
          refman,
          rdfaMarks,
          serializer,
          schema,
          newBuffer,
          currentMark
        )
      );
    }
    const result = refman.get({
      mark: mark,
      from,
      to,
      domNode: dom,
      children,
    }) as TextPNode;
    result.children.forEach((child: TextPNode) => (child.parent = result));
    return [result];
  }
}

function tag(schema: Schema) {
  return function (resolvedNode: ResolvedPNode): string {
    if (isElementPNode(resolvedNode)) {
      return resolvedNode.node.type.name;
    } else {
      return tagName(resolvedNode.domNode);
    }
  };
}

function attributes(schema: Schema) {
  return function (resolvedNode: ResolvedPNode): Record<string, string> {
    if (isElementPNode(resolvedNode)) {
      return resolvedNode.node.attrs;
    } else {
      const { domNode } = resolvedNode;

      return isElement(domNode)
        ? objectFrom(map((attr) => [attr.name, attr.value], domNode.attributes))
        : {};
    }
  };
}

function getParent(refman: ProseReferenceManager) {
  return function (
    resolvedNode: ResolvedPNode,
    resolvedRoot: ElementPNode
  ): ResolvedPNode | null {
    if (isElementPNode(resolvedNode)) {
      const { from } = resolvedNode;
      if (from === -1) {
        return null;
      } else {
        let result: ResolvedPNode | null;
        const resolvedPos = resolvedRoot.node.resolve(from);
        if (resolvedPos.depth === 0) {
          result = refman.get({
            node: resolvedPos.parent,
            from: -1,
            to: resolvedPos.parent.nodeSize,
          });
        } else {
          result = refman.get({
            node: resolvedPos.parent,
            from: resolvedPos.before(),
            to: resolvedPos.after(),
          });
        }
        return result;
      }
    } else {
      return resolvedNode.parent ?? null;
    }
  };
}
