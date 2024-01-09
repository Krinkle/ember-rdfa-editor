import { action } from '@ember/object';
import { dependencySatisfies, macroCondition } from '@embroider/macros';
import Component from '@glimmer/component';
import { SayController } from '@lblod/ember-rdfa-editor';
import { paintCycleHappened } from '@lblod/ember-rdfa-editor/utils/_private/editor-utils';
import { tracked } from 'tracked-built-ins';

const DEFAULT_SVG_HEIGHT = 100;

type Args = {
  controller: SayController;
  defaultSvgHeight?: number;
};

export default class ImageInsertMenu extends Component<Args> {
  @tracked modalOpen = false;
  @tracked url = '';
  @tracked altText = '';
  @tracked showError = false;

  get controller() {
    return this.args.controller;
  }

  get schema() {
    return this.args.controller.schema;
  }

  get defaultHeight() {
    if (this.url.trim().toLowerCase().endsWith('svg')) {
      return this.args.defaultSvgHeight ?? DEFAULT_SVG_HEIGHT;
    }

    return undefined;
  }

  get isValidUrl(): boolean {
    try {
      const parsedUrl = new URL(this.url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  get imageIcon() {
    if (
      macroCondition(
        dependencySatisfies('@appuniversum/ember-appuniversum', '>=2.16.0'),
      )
    ) {
      return 'image';
    } else {
      return 'website';
    }
  }

  @action
  onChangeUrl(event: InputEvent) {
    this.url = (event.target as HTMLInputElement).value;
  }

  @action
  onChangeAltText(event: InputEvent) {
    this.altText = (event.target as HTMLInputElement).value;
  }

  @action
  resetValues() {
    this.url = '';
    this.altText = '';
    this.hideError();
  }

  @action
  hideError() {
    this.showError = false;
  }

  @action
  showModal() {
    this.modalOpen = true;
  }

  @action
  async closeModal() {
    this.modalOpen = false;
    await paintCycleHappened();
    this.controller.focus();
  }

  @action
  async onCancel() {
    this.resetValues();
    await this.closeModal();
  }

  @action
  async onInsert() {
    if (!this.isValidUrl) {
      this.showError = true;
      return;
    }

    const { image } = this.schema.nodes;
    this.controller.withTransaction((tr) => {
      return tr.replaceSelectionWith(
        image.create({
          src: this.url,
          alt: this.altText,
          height: this.defaultHeight,
        }),
      );
    });
    this.resetValues();
    await this.closeModal();
  }
}
