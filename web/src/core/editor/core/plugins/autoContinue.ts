// Base auto-continue input handler
// 块级回车行为：
// - 有内容 + 回车：插入换行 + 自动添加当前块语法
// - 空内容（只有语法标记）+ 回车：删除空标记行，插入普通换行
// - 连续两次回车：退出块继续

import { EditorView, keymap } from "@codemirror/view";

export interface AutoContinueStrategy {
  name: string;
  match: (lineText: string) => boolean;
  getContinuation: (lineText: string) => string | null;
  cancel?: (view: EditorView, from: number, to: number, lineText: string) => boolean;
}

const strategies: AutoContinueStrategy[] = [];

// 记录上一次是否在空块上按了回车
let lastWasEmptyBlock = false;
let lastStrategyName: string | null = null;

export function registerStrategy(strategy: AutoContinueStrategy) {
  strategies.push(strategy);
}

export const autoContinue = keymap.of([
  {
    key: "Enter",
    run: (view) => {
      console.log("autoContinue keymap triggered, strategies count:", strategies.length);
      const line = view.state.doc.lineAt(view.state.selection.main.head);
      const lineText = line.text;

      for (const strategy of strategies) {
        if (strategy.match(lineText)) {
          console.log("autoContinue matched:", strategy.name, "line:", JSON.stringify(lineText));
          const isEmpty = lineText.trim().length <= getMarkerLength(lineText, strategy);

          // 连续两次在空块上按回车：退出块继续
          if (lastWasEmptyBlock && lastStrategyName === strategy.name && isEmpty) {
            lastWasEmptyBlock = false;
            lastStrategyName = null;
            if (strategy.cancel) {
              strategy.cancel(view, line.from, line.to, lineText);
            } else {
              view.dispatch({ changes: { from: line.from, insert: "\n" } });
            }
            return true;
          }

          // 记录当前状态
          lastWasEmptyBlock = isEmpty;
          lastStrategyName = strategy.name;

          if (isEmpty) {
            // 空块 + 回车：删除空标记，插入普通换行
            lastWasEmptyBlock = false;
            lastStrategyName = null;
            if (strategy.cancel) {
              strategy.cancel(view, line.from, line.to, lineText);
            } else {
              view.dispatch({ changes: { from: line.from, insert: "\n" } });
            }
            return true;
          } else {
            // 有内容 + 回车：继续添加块语法
            const continuation = strategy.getContinuation(lineText);
            if (continuation) {
              const cursorPos = view.state.selection.main.head;
              // 记录当前行是否有 md-list-ordered class（避免新行也用 CSS counter）
              const isOrderedList = lineText.match(/^\s*\d+[.)]\s/);
              // 在光标位置插入换行和继续内容
              view.dispatch({
                changes: { from: cursorPos, insert: `\n${continuation}` },
                // 将光标移到继续内容之后
                selection: { anchor: cursorPos + 1 + continuation.length }
              });
              return true;
            }
          }
        }
      }

      // 不在块上，重置状态
      lastWasEmptyBlock = false;
      lastStrategyName = null;
      return false;
    },
  },
]);

function getMarkerLength(lineText: string, strategy: AutoContinueStrategy): number {
  if (strategy.name === "blockquote") {
    const match = lineText.match(/^(\s*>\s*)/);
    return match ? match[1].length : 0;
  }
  if (strategy.name === "list") {
    // Match unordered list (single char like +, -, *) or ordered list (number + . or ))
    const match = lineText.match(/^(\s*[-+*]|\s*\d+\.|\s*\d+\))\s/);
    if (!match) return 0;
    const marker = match[1];
    // For unordered list, marker is just the symbol (length 1)
    if (/^[-+*]$/.test(marker)) {
      return 1;
    }
    // For ordered list, marker is "1." or "1)" etc - return its length without trailing space
    return marker.length;
  }
  return 0;
}
