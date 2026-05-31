import React, {
  useCallback,
  useMemo,
  useEffect,
  useState,
  useRef,
} from "react";
import { NodeSearchDialog } from "@/components/node-search";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  NodeToolbar,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// 自定义节点组件
import NodeCustom from "./note/NodeCustom";
import db from "./db/db"
import ContextMenu from "./note/ContextMenu/ContextMenu";
import OpenPrompt from "./commons/OpenPrompt";
import { PermissionDialog } from "@/components/ui/permission-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DeleteNodeDialog } from "@/components/ui/delete-node-dialog";
import { nanoid } from "nanoid";
import { useSearchParams, useNavigate } from "react-router-dom";
import yaml from "yaml";

// 数据文件
// import notesData from "../assets/data/data.json";

const nodeTypes = { custom: NodeCustom };

/**
 * 动态树布局（按子树宽度分配 X），避免分支多时互相遮盖。
 *
 * 思路：
 * - 第 1 遍 DFS 计算每个节点的“子树宽度”（subtreeWidth）
 * - 第 2 遍 DFS 按子树宽度给每个孩子分配不重叠的区间，并取区间中心作为孩子的 X
 */
function layoutTree(nodes, rootId, startX, startY, levelGap = 110) {
  // 这些值越大，节点越不容易挤在一起（可以按 UI 再调）
  const NODE_MIN_WIDTH = 30; // 估算的节点最小宽度（px）
  const H_GAP = 40; // 同层兄弟子树之间的最小间距（px），原来 36，缩为约 1/3

  const nodeMap = new Map();
  nodes.forEach((n) => nodeMap.set(n.id, { ...n, children: [] }));
  nodes.forEach((n) => {
    // top 表示“父节点 id”；根节点 top === "0"
    if (n.top && n.top !== "0") nodeMap.get(n.top)?.children.push(nodeMap.get(n.id));
  });

  const widthMap = new Map(); // id -> subtreeWidth
  const positions = new Map(); // id -> {x,y}

  const getNodeWidth = (node) => {
    // 基于文本长度粗略估算（避免长标题更容易挤）
    const text = `${node?.name ?? ""}`;
    const estimated = Math.min(220, NODE_MIN_WIDTH + text.length * 8);
    return Math.max(NODE_MIN_WIDTH, estimated);
  };

  const calcWidth = (node) => {
    const children = node.children || [];
    const selfWidth = getNodeWidth(node);
    if (!children.length) {
      widthMap.set(node.id, selfWidth);
      return selfWidth;
    }
    const childWidths = children.map(calcWidth);
    const childrenTotal =
      childWidths.reduce((sum, w) => sum + w, 0) + H_GAP * Math.max(0, children.length - 1);
    const subtreeWidth = Math.max(selfWidth, childrenTotal);
    widthMap.set(node.id, subtreeWidth);
    return subtreeWidth;
  };

  const place = (node, depth, centerX) => {
    const y = startY + depth * levelGap;
    positions.set(node.id, { x: centerX, y });

    const children = node.children || [];
    if (!children.length) return;

    // 当前节点的子树宽度，决定孩子整体占用区间
    const subtreeWidth = widthMap.get(node.id) ?? getNodeWidth(node);
    let cursorLeft = centerX - subtreeWidth / 2;

    children.forEach((child) => {
      const w = widthMap.get(child.id) ?? getNodeWidth(child);
      const childCenterX = cursorLeft + w / 2;
      place(child, depth + 1, childCenterX);
      cursorLeft += w + H_GAP;
    });
  };

  const rootNode = nodeMap.get(rootId);
  if (rootNode) {
    calcWidth(rootNode);
    place(rootNode, 0, startX);
  }

  return positions;
}

function matchKey(shortcutStr, e) {
  if (!shortcutStr) return false;
  const isMod = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;
  const parts = shortcutStr.split('+');
  const modifiers = parts.slice(0, -1);
  const key = parts[parts.length - 1];
  const modStateMatch =
    (modifiers.includes('Ctrl') || !isMod) &&
    (modifiers.includes('Shift') || !isShift);
  const keyMatch =
    key === 'Escape' ? e.key === 'Escape' :
    key === 'Delete' ? e.key === 'Delete' :
    key === 'Enter' ? e.key === 'Enter' :
    key === 'Backspace' ? e.key === 'Backspace' :
    key.startsWith('F') ? e.key === key :
    e.key.toLowerCase() === key.toLowerCase();
  return keyMatch && modStateMatch;
}

export default function MindMap({ selectedNode, setSelectedNode, clearSelectedNode, shortcuts }) {
  // const flowWrapperRef = useRef(null);
  // 查询sqlite中的节点数据
  const [notesData, setNotesData] = useState(null);
  const [visible, setVisible] = useState(false);
  const [nodeAction, setNodeAction] = useState();
  const [nodeId, setNodeId] = useState();
  const [title, setTitle] = useState();
  const [searchOpen, setSearchOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const clickTimerRef = useRef(null);
  const lastClickRef = useRef(null);

  // 节点快捷键处理
  useEffect(() => {
    if (!shortcuts) return;
    const handler = (e) => {
      if (!shortcuts) return;
      if (visible) return;
      // Ctrl+N - 新建节点 (no guard needed - works without selection)
      if (matchKey(shortcuts.node?.newNode, e)) {
        e.preventDefault();
        requestCreateNode(selectedNode?.id || "1");
        return;
      }
      // F2 - 修改节点 (requires selection)
      if (!selectedNode) return;
      if (matchKey(shortcuts.node?.renameNode, e)) {
        e.preventDefault();
        requestEditNode(selectedNode.id, selectedNode.name);
        return;
      }
      // Delete - 删除节点 (requires selection)
      if (!selectedNode) return;
      if (matchKey(shortcuts.node?.deleteNode, e)) {
        e.preventDefault();
        requestDeleteNode(selectedNode.id, selectedNode.name);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, selectedNode, visible]);

  const addNote = (note) => {
    setNotesData((prevData) => [...prevData, note]);
  };
  const handleFileError = (result) => {
    if (result && result.error) {
      setPermissionError(result.originalError || result.error);
      return true;
    }
    return false;
  };

  // 递归获取所有后代节点 ID
  const getAllDescendantIds = (nodeId) => {
    const descendantIds = [nodeId];
    const directChildren = db.notes.select().where({ top: nodeId }).run();
    for (const child of directChildren) {
      descendantIds.push(...getAllDescendantIds(child.id));
    }
    return descendantIds;
  };

  // 删除整个子树
  const deleteEntireTree = (id, title) => {
    const allIds = getAllDescendantIds(id);

    // 从 UI 中删除所有节点
    setNotesData(nds => nds.filter(n => !allIds.includes(n.id)));
    setEdges(eds => eds.filter(e => !allIds.includes(e.source) && !allIds.includes(e.target)));

    // 删除所有相关文件
    allIds.forEach(nodeId => {
      const node = db.notes.select().where({ id: nodeId }).run()[0];
      if (node) {
        const result = window.api.deleteFile(`${nodeId}-${node.name}.md`);
        if (handleFileError(result)) return;
      }
    });

    // 从数据库中删除所有记录
    allIds.forEach(nodeId => {
      db.notes.delete({ "id": nodeId });
    });
  };

  // 将子节点提升到祖父节点下
  const promoteChildren = (parentId, grandParentId) => {
    // 更新所有直接子节点的 top 为 grandParentId
    db.notes.update({ top: parentId }, { top: grandParentId });

    // 更新 notesData 状态
    setNotesData(nds => nds.map(n => {
      if (n.top === parentId) {
        return { ...n, top: grandParentId };
      }
      return n;
    }));
  };

  const _internalDeleteNode = (id, title) => {
    setNotesData(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    db.notes.delete({ "id": id });
    // 同时删除markdown文件
    const result = window.api.deleteFile(`${id}-${title}.md`);
    if (handleFileError(result)) return;
  };

  // ========== Unified Request Methods ==========
  // All shortcuts and context menu call these instead of direct operation functions
  // This ensures consistent behavior and permission checks

  // Request delete node - unified entry point with child count check
  const requestDeleteNode = async (nodeId, nodeName) => {
    const childCount = await db.notes.count({ top: nodeId });
    if (childCount === 0) {
      _internalDeleteNode(nodeId, nodeName);
    } else {
      const currentNode = (await db.notes.select({ id: nodeId }))[0];
      setDeleteTarget({ id: nodeId, name: nodeName, childCount, grandParentId: currentNode?.top || null });
    }
  };

  // Request create node - unified entry point (same logic for shortcut and right-click)
  const requestCreateNode = (parentId, prefillName) => {
    _internalAddNode(parentId, prefillName);
  };

  // Request edit node - unified entry point
  const requestEditNode = (nodeId, nodeName) => {
    _internalUpdateNode(nodeId, nodeName);
  };

  const confirmDelete = useCallback(() => {
    if (deleteTarget) {
      _internalDeleteNode(deleteTarget.id, deleteTarget.name);
      clearSelectedNode();
      setDeleteTarget(null);
    }
  }, [deleteTarget, clearSelectedNode]);

  useEffect(() => {
    db.notes.select().then((res) => {
      // 调用electron api，扫描数据目录下的markdown，并根据yaml头构建节点数据，然后存入sqlite; 最后从sqlite读取节点数据进行展示
      console.log("res:", res);
      if (!res || res.length === 0) {
        // 新建根节点
        const rootNode = {
          id: "1",
          name: "root",
          content: "",
          alias: "",
          top: "0",
          left: "0"
        }
        db.notes.insert(rootNode);
        // 同时新建markdown文件, 保存yaml数据，title;left;top等元信息
        saveNode(rootNode);
        setNotesData([rootNode]);
      } else { setNotesData(res); }
    })

  }, []);

  // Listen for settings changes (storagePath change)
  useEffect(() => {
    if (window.api.onSettingsChanged) {
      window.api.onSettingsChanged((newSettings) => {
        console.log("Settings changed, reloading notes for storagePath:", newSettings.storagePath);
        // Re-query the database to get notes from new storage path
        db.notes.select().then((res) => {
          console.log("Reloaded notes:", res);
          if (res && res.length > 0) {
            setNotesData(res);
          }
        });
      });
    }
  }, []);

  // 处理 URL 搜索参数，打开搜索对话框
  useEffect(() => {
    if (searchParams.get('search') === '1') {
      setSearchOpen(true);
    }
  }, [searchParams]);

  // 节点和边状态
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // memo化 nodeTypes 避免每次渲染都创建
  const memoNodeTypes = useMemo(() => nodeTypes, []);

  // 添加连接
  useEffect(() => {
    if (!notesData) return;
    //     if (!flowWrapperRef.current) return;

    //     const { clientWidth: width, clientHeight: height } = flowWrapperRef.current;
    console.log("notesData:", notesData);
    const rootNode = notesData.find((n) => "0" === n.top);
    console.log("rootNode:", rootNode);
    const rootId = rootNode?.id;

    console.log("rootId:", rootId);
    const posMap = layoutTree(notesData, rootId, 50, 50);
    console.log("posMap:", posMap);
    const initNodes = notesData.map((n) => ({
      id: n.id,
      type: "custom",
      // NodeSearch 默认用 node.data.label 搜索，这里补上 label 字段
      data: { name: n.name, label: n.name, ...n },
      // position: n.position || { x: Math.random() * 400, y: Math.random() * 400 },
      position: posMap.get(n.id),
    }));

    const initEdges = [];
    (notesData || []).forEach((e) => {
      if (e.top && e.top !== "0") {
        initEdges.push({
          id: `e${e.top}-${e.id}`,
          source: e.top,
          sourceHandle: "bottom",
          target: e.id,
          targetHandle: "top",
          style: { stroke: 'var(--link-color)', strokeWidth: 2 },
        });
      };
      if (e.left) {
        initEdges.push({
          id: `e${e.left}-${e.id}`,
          source: e.left,
          sourceHandle: "right",
          target: e.id,
          targetHandle: "left",
          style: { stroke: 'var(--link-color)', strokeWidth: 2 },
        });
      }
    });

    setNodes(initNodes);
    setEdges(initEdges);
  }, [notesData, setEdges, setNodes]);

  // 添加连接
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const [menu, setMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    type: "",
    nodeId: "1",
    title: ""
  });

  // 右键空白区域
  const onPaneContextMenu = useCallback((e) => {
    e.preventDefault();
    setMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      type: "pane",
      nodeId: "1",
      title: ""
    });
  }, []);

  // 右键节点
  const onNodeContextMenu = useCallback((e, node) => {
    e.preventDefault();
    console.log("Right-clicked node:", node);
    setMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      type: "node",
      nodeId: node.id,
      title: node.data.name
    });
  }, []);

  const closeMenu = () => setMenu((m) => ({ ...m, show: false }));

  // 新增节点
  const _internalAddNode = (id) => {
    setVisible(true);
    setNodeId(id);
    setTitle("");
    setNodeAction(() => insertNode);
  }
  const insertNode = useCallback(
    (parent, name) => {
      // const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      setVisible(false);
      const id = nanoid(12);
      const newNodeDb = {
        id: `${id}`,
        name: `${name}`,
        content: "",
        alias: "",
        top: `${parent}`,
        left: ""
      }
      console.log("newNodeDb:", newNodeDb);
      db.notes.insert(newNodeDb);
      saveNode(newNodeDb);
      // 创建新节点的 markdown 文件, 把这两个合成一个方法
      addNote(newNodeDb);
    },
    []
  );
  const saveNode = async (node) => {
    const yamlStr = { id: node.id, alias: "", title: node.name, left: node.left, top: node.top };
    const markdownContent = "";
    const result = await window.api.saveFile(`${node.id}-${node.name}.md`, yamlStr, markdownContent, node.id);
    if (handleFileError(result)) return;
  }
  // 修改节点
  const _internalUpdateNode = (id, title) => {
    setVisible(true);
    setNodeId(id)
    setTitle(title);
    setNodeAction(() => editNode);
  }
  const editNode = useCallback(
    async (id, name, orginName) => {
      console.log("editNode id:", id, "name:", name, "orginName:", orginName);
      // const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      setVisible(false);
      db.notes.update({ id: id }, { name: name });
      setNotesData(nds => nds.map(n => n.id === id ? { ...n, name: name } : n));
      // 修改文件名称
      const renameResult = await window.api.renameFile(`${id}-${orginName}.md`, `${id}-${name}.md`);
      if (handleFileError(renameResult)) return;

      const yamlResult = await window.api.updateYaml(`${id}-${name}.md`, { title: name });
      if (handleFileError(yamlResult)) return;

      // Sync selectedNode with updated name
      setSelectedNode({ id, name });
    },
    [setNotesData, setSelectedNode]
  );

  const handleReSelectFolder = async () => {
    setPermissionError(null);
    const dir = await window.api.selectDirectory();
    if (dir) {
      await window.api.saveSettings({ storagePath: dir });
    }
  };

  const handleOpenSystemSettings = async () => {
    await window.api.openSystemSettings();
  };

  return (
    <div
      style={{
        width: "90vw",
        height: "94vh",
        background: "var(--background)",
      }}
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={memoNodeTypes}
          nodesConnectable={false}
          defaultEdgeOptions={{ type: 'smoothstep', selectable: false, style: { stroke: 'var(--link-color)', strokeWidth: 2 } }}
          fitView
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          nodesDraggable={false} // ✅ 禁止节点拖动
          panOnScroll={false} // ✅ 禁止滚动拖动画布
          zoomOnScroll={true} // ✅ 禁止滚轮缩放
          panOnDrag={true} // 🚫 禁止拖动画布
          attributionPosition={null}
          border="none"
          onEdgesDelete={() => { }}
          deleteKeyCode={null}
          onNodeClick={(e, node) => {
            if (lastClickRef.current === node.id) {
              if (clickTimerRef.current) {
                clearTimeout(clickTimerRef.current);
              }

              lastClickRef.current = null;

              console.log("Double click");
              navigate(`/note/${node.id}/${node.data.name}`);
              return;
            }

            // 第一次点击
            lastClickRef.current = node.id;

            clickTimerRef.current = setTimeout(() => {
              console.log("Single click");
              setSelectedNode({
                id: node.id,
                name: node.data.name,
              });

              lastClickRef.current = null;
            }, 250);
          }}
          onPaneClick={() => {
            clearSelectedNode();
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
        </ReactFlow>
        <NodeSearchDialog
          open={searchOpen}
          onOpenChange={(open) => {
            setSearchOpen(open);
            if (!open) {
              navigate('/');
            }
          }}
        />
        <ContextMenu
          menu={menu}
          onClose={closeMenu}
          requestCreateNode={requestCreateNode}
          requestEditNode={requestEditNode}
          requestDeleteNode={requestDeleteNode}
        />
        <OpenPrompt
          visible={visible}
          id={nodeId}
          title={title}
          onOk={nodeAction}
          onCancel={() => setVisible(false)}
        />
        <PermissionDialog
          open={!!permissionError}
          errorMessage={permissionError}
          onReSelectFolder={handleReSelectFolder}
          onOpenSystemSettings={handleOpenSystemSettings}
          onClose={() => setPermissionError(null)}
        />
        <DeleteNodeDialog
          open={!!deleteTarget}
          nodeName={deleteTarget?.name}
          childCount={deleteTarget?.childCount || 0}
          onDeleteEntireTree={() => {
            deleteEntireTree(deleteTarget.id, deleteTarget.name);
            setDeleteTarget(null);
            clearSelectedNode();
          }}
          onDeleteParentOnly={() => {
            const grandParentId = deleteTarget.grandParentId;
            promoteChildren(deleteTarget.id, grandParentId);
            _internalDeleteNode(deleteTarget.id, deleteTarget.name);
            setDeleteTarget(null);
            clearSelectedNode();
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      </ReactFlowProvider>
    </div>
  );
}
