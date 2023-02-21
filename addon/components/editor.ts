import { action } from '@ember/object';
import Component from '@glimmer/component';
import {
  createLogger,
  Logger,
} from '@lblod/ember-rdfa-editor/utils/logging-utils';
import { tracked } from 'tracked-built-ins';
import SayEditor, {
  SayController,
} from '@lblod/ember-rdfa-editor/core/say-editor';
import RdfaEditorPlugin from '@lblod/ember-rdfa-editor/core/rdfa-editor-plugin';
import { NodeViewConstructor } from 'prosemirror-view';
import { Schema } from 'prosemirror-model';
import { Plugin } from 'prosemirror-state';
import { getOwner } from '@ember/application';
import Owner from '@ember/owner';
import { DefaultAttrGenPuginOptions } from '@lblod/ember-rdfa-editor/plugins/default-attribute-value-generation';

/**
 *
 * @deprecated RdfaEditor plugins are deprecated and will be removed in version 3.0.
 */
export type PluginConfig =
  | string
  | {
      name: string;
      options: unknown;
    };

/**
 *
 * @deprecated RdfaEditor plugins are deprecated and will be removed in version 3.0.
 */
export interface ResolvedPluginConfig {
  instance: RdfaEditorPlugin;
  options: unknown;
}

interface RdfaEditorArgs {
  /**
   * callback that is called with an interface to the editor after editor init completed
   * @default 'default'
   * @public
   */
  rdfaEditorInit(editor: SayController): void;

  initializers?: Array<() => Promise<void>>;
  schema: Schema;
  baseIRI?: string;
  plugins?: Plugin[];
  stealFocus?: boolean;
  nodeViews?: (controller: SayController) => {
    [node: string]: NodeViewConstructor;
  };
  defaultAttrGenerators?: DefaultAttrGenPuginOptions;
}

/**
 * RDFa editor
 *
 * This module contains all classes and components provided by the @lblod/ember-rdfa-editor addon.
 * The main entrypoint is the {{#crossLink "RdfaEditorComponent"}}{{/crossLink}}.
 * @module rdfa-editor
 * @main rdfa-editor
 */

/**
 * RDFa editor component
 *
 * This component wraps around a {{#crossLink "ContentEditableComponent"}}{{/crossLink}}
 * and provides an architecture to interact with the document through plugins.
 * {{#crossLinkModule "rdfa-editor"}}rdfa-editor{{/crossLinkModule}}.
 * @module rdfa-editor
 * @class RdfaEditorComponent
 * @extends Component
 */
export default class RdfaEditor extends Component<RdfaEditorArgs> {
  @tracked controller: SayController | null = null;

  private logger: Logger = createLogger(this.constructor.name);
  private prosemirror: SayEditor | null = null;

  get initializers() {
    return this.args.initializers || [];
  }

  get baseIRI() {
    return this.args.baseIRI || window.document.baseURI;
  }

  /**
   * Handle init of rawEditor
   *
   * @method handleRawEditorInit
   *
   * @param {Element} target the html element the editor will render into
   *
   * @private
   */
  @action
  async handleRawEditorInit(target: Element) {
    if (this.initializers.length) {
      await Promise.all(this.initializers);
      this.logger(`Awaited ${this.initializers.length} initializers.`);
    }

    this.prosemirror = new SayEditor({
      owner: getOwner(this) as Owner,
      target,
      schema: this.args.schema,
      baseIRI: this.baseIRI,
      plugins: this.args.plugins,
      nodeViews: this.args.nodeViews,
      defaultAttrGenerators: this.args.defaultAttrGenerators,
    });
    window.__PM = this.prosemirror;
    window.__PC = new SayController(this.prosemirror);
    this.controller = new SayController(this.prosemirror);
    if (this.args.rdfaEditorInit) {
      this.args.rdfaEditorInit(new SayController(this.prosemirror));
    }
  }
}
