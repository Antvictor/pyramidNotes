// src/components/ContextMenu/index.jsx
import React from "react";
import "./style.css";

const ContextMenu = ({ menu, onClose, onCreateNode, onEditNode, onDeleteNode }) => {
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
          <div className="menu-item" onClick={() => { onCreateNode(menu.nodeId); onClose(); }}>
            ➕ 创建节点
          </div>
        )}

        {menu.type === "node" && (
          <>
            <div className="menu-item" onClick={() => { onCreateNode(menu.nodeId, menu.title); onClose(); }}>
              ➕ 创建节点
            </div>
            <div className="menu-item" onClick={() => { onEditNode(menu.nodeId, menu.title); onClose(); }}>
              ✏️ 修改节点
            </div>
            <div className="menu-item" onClick={() => { onDeleteNode(menu.nodeId, menu.title); onClose(); }}>
              🗑 删除节点
            </div>
          </>
        )}
      </div>

      {/* 点击空白关闭 */}
      <div className="context-menu-mask" onClick={onClose}></div>
    </>
  );
}
export default ContextMenu;