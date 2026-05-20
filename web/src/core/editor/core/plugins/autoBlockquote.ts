// autoBlockquote strategy for autoContinue
// 块级回车行为：
// - 有内容 + 回车：插入 "> "
// - 空内容 + 回车：删除空引用行

import { registerStrategy } from "./autoContinue";
import type { AutoContinueStrategy } from "./autoContinue";
import type { EditorView } from "@codemirror/view";

const blockquoteStrategy: AutoContinueStrategy = {
  name: "blockquote",

  match(lineText: string): boolean {
    // BUG FIX: [+\-*] inside character class makes - a range operator
    // This file only uses > but keep fix for consistency
    return !!lineText.match(/^(\s*>\s*)/);
  },

  getContinuation(_lineText: string): string | null {
    // 始终返回 "> " 用于继续（autoContinue 会在空内容时处理）
    return "> ";
  },

  cancel(view: EditorView, from: number, to: number, _lineText: string): boolean {
    // 删除整行（从 from 到 to）
    view.dispatch({ changes: { from, to, insert: "" } });
    return true;
  }
};

export function initBlockquoteStrategy() {
  registerStrategy(blockquoteStrategy);
}
