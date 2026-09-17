// src/components/ContextMenu/index.jsx
import React, { useLayoutEffect, useRef } from "react";
import "./style.css";
import { useTranslation } from "react-i18next";

const ContextMenu = ({ menu, onClose, requestCreateNode, requestEditNode, requestDeleteNode, onRequestMoveNode }) => {
  const { t } = useTranslation();
  const menuRef = useRef(null);

  // 菜单宽度随文案变化（英文比中文长），需要夹紧在视口内，避免在靠边处右键时溢出
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!menu?.show || !el) return;
    const { width, height } = el.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);
    el.style.left = Math.min(menu.x, maxLeft) + "px";
    el.style.top = Math.min(menu.y, maxTop) + "px";
  }, [menu?.show, menu?.x, menu?.y]);

  if (!menu.show) return null;

  return (
    <>
      {/* 菜单本体 */}
      <div
        ref={menuRef}
        className="context-menu"
        style={{
          top: menu.y,
          left: menu.x
        }}
      >
        {menu.type === "pane" && (
          <div className="menu-item" data-menu-item="create" onClick={() => { requestCreateNode(menu.nodeId); onClose(); }}>
            ➕ {t("nodeMenu.create")}
          </div>
        )}

        {menu.type === "node" && (
          <>
            <div className="menu-item" data-menu-item="create" onClick={() => { requestCreateNode(menu.nodeId, menu.title); onClose(); }}>
              ➕ {t("nodeMenu.create")}
            </div>
            <div className="menu-item" data-menu-item="edit" onClick={() => { requestEditNode(menu.nodeId, menu.title); onClose(); }}>
              ✏️ {t("nodeMenu.rename")}
            </div>
            {!menu.isRoot && (
              <div className="menu-item" data-menu-item="move" onClick={() => { onRequestMoveNode(menu.nodeId, menu.title); onClose(); }}>
                📦 {t("nodeMenu.move")}
              </div>
            )}
            <div className="menu-item" data-menu-item="delete" onClick={() => { requestDeleteNode(menu.nodeId, menu.title); onClose(); }}>
              🗑️ {t("nodeMenu.delete")}
            </div>
          </>
        )}
      </div>

      {/* 点击空白关闭 */}
      <div className="context-menu-mask" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}></div>
    </>
  );
}
export default ContextMenu;
