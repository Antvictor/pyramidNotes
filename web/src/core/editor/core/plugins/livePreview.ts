import {
    ViewPlugin,
    Decoration,
    EditorView,
    ViewUpdate,
    WidgetType,
} from "@codemirror/view";

import { RangeSetBuilder } from "@codemirror/state";
import { md } from "../markdown.js";

class PreviewWidget extends WidgetType {
    private html: string;

    constructor(html: string) {
        super();
        this.html = html;
    }

    toDOM() {
        const el = document.createElement("div");
        el.className = "md-preview";
        el.innerHTML = this.html;
        return el;
    }

    ignoreEvent() {
        return false; // 允许点击、选中
    }
}

export function livePreviewPlugin() {
    return ViewPlugin.fromClass(
        class {
            decorations;

            constructor(view: EditorView) {
                this.decorations = this.build(view);
            }

            update(update: ViewUpdate) {
                if (update.docChanged || update.selectionSet || update.viewportChanged) {
                  this.decorations = this.build(update.view);
                }
                // if (update.docChanged || update.viewportChanged) {
                //     this.decorations = this.build(update.view);
                // }
            }

            build(view: EditorView) {
                const builder = new RangeSetBuilder<Decoration>();
                const cursor = view.state.selection.main.head;

                for (let { from, to } of view.visibleRanges) {
                    let pos = from;

                    while (pos <= to) {
                        const line = view.state.doc.lineAt(pos);

                        // 👉 当前光标所在行，不做替换（显示源码）
                        if (cursor >= line.from && cursor <= line.to) {
                            pos = line.to + 1;
                            continue;
                        }

                        const text = line.text;

                        // 空行不处理（保留空行结构）
                        if (!text.trim()) {
                            pos = line.to + 1;
                            continue;
                        }

                        const html = md.render(text);

                        builder.add(
                            line.from,
                            line.to,
                            Decoration.replace({
                                widget: new PreviewWidget(html),
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