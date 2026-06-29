// src/components/ContextMenu/index.jsx
import React from "react";
import "./style.css";
import { useTranslation } from "react-i18next";

const ContextMenu = ({ menu, onClose, requestCreateNode, requestEditNode, requestDeleteNode, onRequestMoveNode }) => {
  const { t } = useTranslation();
  if (!menu.show) return null;

  return (
    <>
      {/* 菜单本体 */}
      <div
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
              🗑 {t("nodeMenu.delete")}
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
