// 时长必须与 web/src/index.css 中 route-anim-* 的 animation-duration 保持一致。
export const MAP_EXIT_MS = 160;
export const EDITOR_ENTER_MS = 280;
export const EDITOR_EXIT_MS = 180;

export function prefersReducedMotion() {
  return typeof window !== "undefined"
    && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

// 返回脑图的相机决策：restore = 恢复缓存视口，none = 保持不动，center = 不可见时居中
export function resolveEntryCamera({ hasSelection, isVisible }) {
  if (!hasSelection) return "restore";
  return isVisible ? "none" : "center";
}
