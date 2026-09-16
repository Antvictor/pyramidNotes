import { useEffect } from "react";

// 全局「有模态弹窗打开」计数。
//
// 为什么需要：全局快捷键监听挂在 window 上（且为捕获阶段，见 Node.jsx），
// 它会在弹窗处理 Esc **之前**运行。若没有这个信号，它会以为"没有弹窗"而直接
// 回退到上一层。有了它，全局处理就能让路，交给弹窗自己关闭。
//
// 登记点：`components/ui/dialog.tsx` 的 DialogContent（只在打开时挂载 → 覆盖所有通用弹窗），
// 以及编辑器里自制的弹窗（如抽成子节点对话框）。
let count = 0;

export function enterModal() {
  count += 1;
}

export function exitModal() {
  count = Math.max(0, count - 1);
}

export function isModalOpen() {
  return count > 0;
}

// 在弹窗挂载期间自动登记
export function useModalRegistration(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    enterModal();
    return exitModal;
  }, [active]);
}
