// src/components/ContextMenu/index.jsx
import React from "react";
import "./style.css";

const ContextMenu = ({ menu, onClose, requestCreateNode, requestEditNode, requestDeleteNode }) => {
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
            ➕ 创建节点
          </div>
        )}

        {menu.type === "node" && (
          <>
            <div className="menu-item" data-menu-item="create" onClick={() => { requestCreateNode(menu.nodeId, menu.title); onClose(); }}>
              ➕ 创建节点
            </div>
            <div className="menu-item" data-menu-item="edit" onClick={() => { requestEditNode(menu.nodeId, menu.title); onClose(); }}>
              ✏️ 修改节点
            </div>
            <div className="menu-item" data-menu-item="delete" onClick={() => { requestDeleteNode(menu.nodeId, menu.title); onClose(); }}>
              🗑 删除节点
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