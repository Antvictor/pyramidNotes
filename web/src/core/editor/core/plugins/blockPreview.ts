import {
  ViewPlugin,
  ViewUpdate,
  WidgetType,
  Decoration,
  EditorView,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { md } from "../markdown.js";

class PreviewWidget extends WidgetType {
  constructor(html: string) {
    super();
    this.html = html;
  }

  html: string;

  toDOM() {
    const el = document.createElement("div");
    el.className = "cm-md-inline";

    // ⚠️ 真实 HTML
    el.innerHTML = this.html;

    return el;
  }

  ignoreEvent() {
    return false;
  }
}

export function blockPreviewPlugin() {
  return ViewPlugin.fromClass(
    class {
      decorations;

      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.build(update.view);
        }
      }

      build(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        const doc = view.state.doc;

        const cursor = view.state.selection.main.head;

        for (let { from, to } of view.visibleRanges) {
          let pos = from;

          while (pos <= to) {
            const line = doc.lineAt(pos);

            const text = line.text;

            if (!text.trim()) {
              pos = line.to + 1;
              continue;
            }

            // 当前行不渲染（避免编辑冲突）
            if (cursor >= line.from && cursor <= line.to) {
              pos = line.to + 1;
              continue;
            }

            const html = md.render(text);

            builder.add(
              line.from,
              line.to,
              Decoration.widget({
                widget: new PreviewWidget(html),
                side: 1,
              })
            );

            pos = line.to + 1;
          }
        }

        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
}