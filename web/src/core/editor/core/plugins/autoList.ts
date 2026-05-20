// autoList strategy for autoContinue
// 块级回车行为：
// - 有内容 + 回车：插入下一个列表标记（序号递增）
// - 空内容 + 回车：删除空列表行

import { registerStrategy } from "./autoContinue";
import type { AutoContinueStrategy } from "./autoContinue";
import type { EditorView } from "@codemirror/view";

const listStrategy: AutoContinueStrategy = {
  name: "list",

  match(lineText: string): boolean {
    // BUG FIX: [+\-*] makes - a range operator; put - first to be literal: [-+*]
    return !!lineText.match(/^(\s*[-+*]|\s*\d+\.|\s*\d+\))\s/);
  },

  getContinuation(lineText: string): string | null {
    console.log("getContinuation called with:", JSON.stringify(lineText));
    const match = lineText.match(/^(\s*[-+*]|\s*\d+\.|\s*\d+\))\s/);
    console.log("getContinuation match:", match ? JSON.stringify({full: match[0], marker: match[1]}) : null);
    if (!match) return null;
    const result = getNextMarker(match[1]);
    console.log("getContinuation returning:", JSON.stringify(result));
    return result;
  },

  cancel(view: EditorView, from: number, to: number, _lineText: string): boolean {
    // 删除整行
    view.dispatch({ changes: { from, to, insert: "" } });
    return true;
  }
};

function getNextMarker(marker: string): string {
  console.log("getNextMarker called with marker:", JSON.stringify(marker));
  const orderedMatch = marker.match(/^(\s*)(\d+)([.)])(\s*)$/);
  if (orderedMatch) {
    const indent = orderedMatch[1];
    const num = parseInt(orderedMatch[2], 10);
    const style = orderedMatch[3];
    // Always add trailing space for ordered lists
    const result = `${indent}${num + 1}${style} `;
    console.log("getNextMarker ordered result:", JSON.stringify(result));
    return result;
  }
  // For unordered list (+ - *), append trailing space
  if (/^[-+*]$/.test(marker.trim())) {
    const result = marker.trim() + " ";
    console.log("getNextMarker unordered result:", JSON.stringify(result));
    return result;
  }
  console.log("getNextMarker fallback:", JSON.stringify(marker));
  return marker;
}

export function initListStrategy() {
  console.log("initListStrategy called, registering list strategy");
  registerStrategy(listStrategy);
}