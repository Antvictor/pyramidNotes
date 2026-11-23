import React, { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
// 复用 ContextMenu 的遮罩样式（.context-menu-mask 为 fixed inset:0）与菜单项样式
import "./ContextMenu/style.css";
import { CATEGORY_COLORS, CATEGORY_ORDER } from "./categoryColors";

const paletteStyle = {
  position: "fixed",
  background: "var(--bg-primary)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  zIndex: 9999,
  boxShadow: "0 2px 8px rgba(0,0,0,.15)",
  userSelect: "none",
  padding: "8px 10px 4px",
};

const ColorPalette = ({ picker, onPick, onClear, onClose }) => {
  const { t } = useTranslation();
  const ref = useRef(null);

  // 与 ContextMenu 一致：夹紧在视口内，避免靠边处溢出
  useLayoutEffect(() => {
    const el = ref.current;
    if (!picker?.show || !el) return;
    const { width, height } = el.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);
    el.style.left = Math.min(picker.x, maxLeft) + "px";
    el.style.top = Math.min(picker.y, maxTop) + "px";
  }, [picker?.show, picker?.x, picker?.y]);

  if (!picker?.show) return null;

  return (
    <>
      <div ref={ref} style={paletteStyle} onContextMenu={(e) => e.preventDefault()}>
        <div style={{ display: "flex", gap: 8, paddingBottom: 6 }}>
          {CATEGORY_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              aria-label={t(`nodeCategory.${key}`)}
              title={t(`nodeCategory.${key}`)}
              onClick={() => { onPick(picker.nodeId, key); onClose(); }}
              style={{
                width: 18,
                height: 18,
                padding: 0,
                borderRadius: "50%",
                border: "1px solid rgba(0,0,0,.15)",
                background: CATEGORY_COLORS[key],
                cursor: "pointer",
              }}
            />
          ))}
        </div>
        <div
          className="menu-item"
          style={{ padding: "6px 4px", fontSize: 13, borderTop: "1px solid var(--border)" }}
          onClick={() => { onClear(picker.nodeId); onClose(); }}
        >
          {t("nodeMenu.clearCategory")}
        </div>
      </div>
      <div
        className="context-menu-mask"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
    </>
  );
};

export default ColorPalette;
