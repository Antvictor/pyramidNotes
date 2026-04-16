import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";
import { md } from "../markdown.js";

/**
 * 方案D：Overlay预览模式
 * - 不使用 Decoration
 * - 不替换CM DOM
 * - 直接渲染到独立预览层
 */
export function livePreviewPluginNew(previewRoot: HTMLElement) {
  return ViewPlugin.fromClass(
    class {
      private scheduled = false;

      constructor(view: EditorView) {
        this.render(view);
      }

      update(update: ViewUpdate) {
        if (!update.docChanged && !update.viewportChanged) return;

        // 防抖，避免连续 update 导致重绘抖动
        if (this.scheduled) return;
        this.scheduled = true;

        requestAnimationFrame(() => {
          this.scheduled = false;
          this.render(update.view);
        });
      }

      render(view: EditorView) {
        const doc = view.state.doc.toString();

        // ⚠️ 全量渲染（稳定版）
        // 后续可升级为分段/缓存
        previewRoot.innerHTML = md.render(doc);
      }
    }
  );
}