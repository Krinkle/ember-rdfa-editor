import Reader from "@lblod/ember-rdfa-editor/core/readers/reader";
import ModelTable from "@lblod/ember-rdfa-editor/core/model/model-table";
import {HtmlReaderContext} from "@lblod/ember-rdfa-editor/core/readers/html-reader";
import HtmlNodeReader from "@lblod/ember-rdfa-editor/core/readers/html-node-reader";
import {copyAttributes} from "@lblod/ember-rdfa-editor/core/readers/reader-utils";

export default class HtmlTableReader implements Reader<HTMLElement, ModelTable[], HtmlReaderContext> {
  read(from: HTMLTableElement, context: HtmlReaderContext): ModelTable[] {
    const table = new ModelTable();
    copyAttributes(from, table);
    const nodeReader = new HtmlNodeReader();
    for (const child of from.childNodes) {
      const parsedChildren = nodeReader.read(child, context);
      table.appendChildren(...parsedChildren);
    }
    context.bindNode(table, from);
    return [table];
  }

}
