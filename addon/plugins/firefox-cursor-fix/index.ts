import {
  Decoration,
  DecorationSet,
  EditorState,
  ProsePlugin,
  SayView,
  TextSelection,
} from '@lblod/ember-rdfa-editor';
import { gecko } from '@lblod/ember-rdfa-editor/utils/_private/browser';

export function firefoxCursorFix(): ProsePlugin {
  const firefoxCursorFix = new ProsePlugin({
    props: {
      handleKeyDown(view, event: KeyboardEvent): boolean {
        if (!gecko) {
          return false;
        }
        if (event.key === 'Backspace') {
          const { $from, from, to } = view.state.selection;
          if (from !== to) {
            return false;
          }
          // If we're at the start of the parent node, the problem cannot occur
          // since it only happens when we backspace into a problematic previous sibling
          if ($from.parentOffset === 0) {
            return false;
          }
          // The problematic position is reached AFTER we backspace the char right after the problematic node
          // so we have to check one position in advance
          const $posToCheck = $from.parent.resolve($from.parentOffset - 1);
          const nodeBefore = $posToCheck.nodeBefore;
          if (nodeBefore && nodeBefore.type.spec.needsFFKludge) {
            view.dispatch(view.state.tr.deleteRange($posToCheck.pos, from));
            return true;
          }
        }
        return false;
      },
      handleClick(view: SayView, pos: number, event: MouseEvent) {
        const $pos = view.state.doc.resolve(pos);
        let cur = $pos.nodeAfter;
        let insertPos = $pos.pos;
        while (cur && !cur.type.spec.needsFFKludge) {
          cur = cur.firstChild;
          insertPos++;
        }
        if (cur?.type.spec.needsFFKludge) {
          event.preventDefault();
          view.dispatch(
            view.state.tr
              .setSelection(
                new TextSelection(view.state.doc.resolve(insertPos))
              )
              .scrollIntoView()
          );
          return true;
        }
        return;
      },
      decorations(state: EditorState): DecorationSet | undefined {
        if (!gecko) {
          return;
        }
        const { $from, from, to } = state.selection;
        if (from !== to) {
          return;
        }
        const nextNode = $from.nodeAfter;
        const prevNode = $from.nodeBefore;
        if (
          (nextNode?.type.spec.needsFFKludge && !prevNode) ||
          prevNode?.type.spec.needsFFKludge
        ) {
          return DecorationSet.create(state.doc, [
            Decoration.widget(
              from,
              () => {
                const wrapper = document.createElement('span');
                wrapper.classList.add(
                  'ProseMirror-firefox-fake-cursor-wrapper'
                );
                const cursor = new Text('|');
                const fakeCursor = document.createElement('span');
                fakeCursor.append(cursor);
                fakeCursor.classList.add('ProseMirror-firefox-fake-cursor');
                wrapper.append(fakeCursor);
                return wrapper;
              },
              { side: 1 }
            ),
          ]);
        }
        return;
      },
    },
  });
  return firefoxCursorFix;
}
