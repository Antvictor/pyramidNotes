// 全局 Esc 归属的**唯一判定规则**。
//
// 背景：Esc 有多个处理者（全局监听、Radix 弹窗、自制浮层），它们对"有没有浮层"的
// 认知来源不同；若各写各的判断，修一处就会在另一处冒出来。
//
// 契约（二选一，谁要处理 Esc 谁声明）：
//   - 通用弹窗：role="dialog" + data-state="open"（Radix 自带）
//   - 自制浮层：data-esc-claim="true"
//
// 用法：全局 Esc 处理先调用本函数，为 true 时**直接让路**，且**不要 preventDefault**
// —— Radix 的 DismissableLayer 会跳过「已 defaultPrevented」的 Escape，否则弹窗关不掉。
// 用 DOM 而不是 React state：弹窗会先于全局监听关闭自己并触发重渲染，此时读 state 会误判。
export function isOverlayEscClaimed() {
  if (typeof document === "undefined") return false;
  return !!document.querySelector(
    '[role="dialog"][data-state="open"], [data-esc-claim="true"]',
  );
}
