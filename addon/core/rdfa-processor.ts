import { v4 as uuidv4 } from 'uuid';
import {
  isElement,
  isTextNode,
  tagName,
} from '@lblod/ember-rdfa-editor/utils/_private/dom-helpers';
import Datastore, {
  EditorStore,
} from '@lblod/ember-rdfa-editor/utils/_private/datastore/datastore';
import { Quad } from '@rdfjs/types';

export type ExternalPropertyObject =
  | {
      type: 'literal';
      rdfaId: string;
    }
  | {
      type: 'resource';
      resource: string;
    };
export type ExternalProperty = {
  type: 'external';
  predicate: string;
  object: ExternalPropertyObject;
};

export type AttributeProperty = {
  type: 'attribute';
  predicate: string;
  object: string;
};
export type ContentProperty = {
  type: 'content';
  predicate: string;
};
export type Property = AttributeProperty | ExternalProperty | ContentProperty;

export type Backlink = {
  subject: string;
  predicate: string;
};

/**
 * Function responsible for computing the properties and backlinks of a given document.
 * The properties and backlinks are stored in data-attributes in the nodes themselves.
 */
export function preprocessRDFa(dom: Node) {
  // parse the html
  const datastore = EditorStore.fromParse<Node>({
    parseRoot: true,
    root: dom,
    tag: tagName,
    baseIRI: 'http://example.org',
    attributes(node: Node): Record<string, string> {
      if (isElement(node)) {
        const result: Record<string, string> = {};
        for (const attr of node.attributes) {
          result[attr.name] = attr.value;
        }
        return result;
      }
      return {};
    },
    isText: isTextNode,
    children(node: Node): Iterable<Node> {
      return node.childNodes;
    },
    pathFromDomRoot: [],
    textContent(node: Node): string {
      return node.textContent || '';
    },
  });

  // every resource node
  for (const [node, entry] of datastore.getResourceNodeMap().entries()) {
    const properties: Property[] = [];
    // get all quads that have our subject
    const outgoingQuads = datastore.match(entry.subject).asQuadResultSet();
    const seenLinks = new Set<string>();
    for (const quad of outgoingQuads) {
      quadToProperties(datastore, quad, node).forEach((prop) => {
        if (prop.type === 'external' && prop.object.type === 'literal') {
          if (!seenLinks.has(prop.object.rdfaId)) {
            seenLinks.add(prop.object.rdfaId);
            properties.push(prop);
          }
        } else {
          properties.push(prop);
        }
      });
    }
    console.log('entry', entry)
    if (entry.contentPredicate) {
      properties.push({
        type: 'content',
        predicate: entry.contentPredicate.value,
      });
    }

    const incomingProps: Backlink[] = [];
    const incomingQuads = datastore.match(null, null, entry.subject);
    for (const quad of incomingQuads.asQuadResultSet()) {
      incomingProps.push(quadToBacklink(quad));
    }

    // write info to node
    (node as HTMLElement).dataset.outgoingProps = JSON.stringify(properties);
    (node as HTMLElement).dataset.incomingProps = JSON.stringify(incomingProps);
    (node as HTMLElement).dataset.rdfaNodeType = 'resource';
    (node as HTMLElement).dataset.subject = entry.subject.value;
  }
  // each content node
  for (const [node, object] of datastore.getContentNodeMap().entries()) {
    const { subject, predicate } = object;
    const incomingProp: Backlink = {
      subject: subject.value,
      predicate: predicate.value,
    };
    // write info to node
    (node as HTMLElement).dataset.incomingProps = JSON.stringify([
      incomingProp,
    ]);
    (node as HTMLElement).dataset.rdfaNodeType = 'literal';
  }
}

function quadToProperties(
  datastore: Datastore<Node>,
  quad: Quad,
  node: Node,
): Property[] {
  const result: Property[] = [];
  const element = node as HTMLElement;
  // check if quad refers to a contentNode
  const contentNodes = datastore
    .getContentNodeMap()
    .getValues({ subject: quad.subject, predicate: quad.predicate });
  if (contentNodes) {
    for (const contentNode of contentNodes) {
      const contentId = ensureId(contentNode as HTMLElement);
      result.push({
        type: 'external',
        predicate: quad.predicate.value,
        object: {
          type: 'literal',
          rdfaId: contentId,
        },
      });
    }
    return result;
  } else {
    // check if this quad refers to a resourceNode
    if (
      quad.object.termType === 'BlankNode' ||
      quad.object.termType === 'NamedNode'
    ) {
      const resourceNode = datastore
        .getResourceNodeMap()
        .getFirstValue({ subject: quad.object });
      if (resourceNode) {
        return [
          {
            type: 'external',
            predicate: quad.predicate.value,
            object: {
              type: 'resource',
              resource: quad.object.value,
            },
          },
        ];
      }
    }
    // neither a content nor resource node, so just a plain attribute
    return [
      {
        type: 'attribute',
        predicate: quad.predicate.value,
        object: quad.object.value,
      },
    ];
  }
}

function quadToBacklink(quad: Quad): Backlink {
  // check if theres a resource node for the subject
  return {
    subject: quad.subject.value,
    predicate: quad.predicate.value,
  };
}

function ensureId(element: HTMLElement): string {
  const rdfaId = element.getAttribute('__rdfaId') || uuidv4();
  element.setAttribute('__rdfaId', rdfaId);
  return rdfaId;
}
