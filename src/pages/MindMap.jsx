import React, {
  useCallback,
  useMemo,
  useEffect,
  useState,
  // useRef,
} from "react";
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  NodeToolbar,
} from "reactflow";
import "reactflow/dist/style.css";

// 自定义节点组件
import NodeCustom from "./note/NodeCustom";
import db from "./db/db"
import ContextMenu from "./note/ContextMenu/ContextMenu";
import OpenPrompt from "./commons/OpenPrompt";
import { nanoid } from "nanoid";

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
  const NODE_MIN_WIDTH = 20; // 估算的节点最小宽度（px）
  const H_GAP = 20; // 同层兄弟子树之间的最小间距（px），原来 36，缩为约 1/3

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

export default function MindMap() {
  // const flowWrapperRef = useRef(null);
  // 查询sqlite中的节点数据
  const [notesData, setNotesData] = useState(null);
  const [visible, setVisible] = useState(false);
  const [nodeAction, setNodeAction] = useState();
  const [nodeId, setNodeId] = useState();
  const addNote = (note) => {
    setNotesData((prevData) => [...prevData, note]);
  };
  const deleteNode = (id) => {
    setNotesData(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    db.notes.delete({"id":id});
  };

  useEffect(() => {
    db.notes.select().then((res) => {
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
        setNotesData([rootNode]);
      } else { setNotesData(res); }
    })

  }, []);
  // 节点和边状态
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // memo化 nodeTypes 避免每次渲染都创建
  const memoNodeTypes = useMemo(() => nodeTypes, []);

  // 初始化节点和边
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
      data: { name: n.name, ...n },
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
        });
      };
      if (e.left) {
        initEdges.push({
          id: `e${e.left}-${e.id}`,
          source: e.left,
          sourceHandle: "right",
          target: e.id,
          targetHandle: "left",
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
    nodeId: "1"
  });

  // 右键空白区域
  const onPaneContextMenu = useCallback((e) => {
    e.preventDefault();
    setMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      type: "pane",
      nodeId: "1"
    });
  }, []);

  // 右键节点
  const onNodeContextMenu = useCallback((e, node) => {
    e.preventDefault();
    setMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      type: "node",
      nodeId: node.id
    });
  }, []);

  const closeMenu = () => setMenu((m) => ({ ...m, show: false }));

  // 新增节点
  const addNewNode = (id) => {
    setVisible(true);
    setNodeId(id);
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
      addNote(newNodeDb);
    },
    []
  );
  // 修改节点
  const updateNode = (id) => {
    setVisible(true);
    setNodeId(id)
    setNodeAction(() => editNode);
  }
  const editNode = useCallback(
    (id,name) => {
      // const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      setVisible(false);
      db.notes.update({ id: id }, { name: name });
      setNotesData(nds => nds.map(n => n.id === id ? { ...n, name: name } : n));
    },
    [setNotesData]
  );

  return (
    <div
      style={{
        width: "90vw",
        height: "94vh",
        background: "#f0f0f0",
        overflow: "hidden",
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
          defaultEdgeOptions={{type: 'smoothstep', selectable: false }}
          fitView
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          nodesDraggable={false} // ✅ 禁止节点拖动
          panOnScroll={false} // ✅ 禁止滚动拖动画布
          zoomOnScroll={false} // ✅ 禁止滚轮缩放
          panOnDrag={true} // 🚫 禁止拖动画布
          attributionPosition={null}
          border="none"
          onEdgesDelete={() => {}}
          deleteKeyCode={null}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
        </ReactFlow>
        <ContextMenu
          menu={menu}
          onClose={closeMenu}
          onCreateNode={addNewNode}
          onEditNode={updateNode}
          onDeleteNode={deleteNode}
        />
        <OpenPrompt
          visible={visible}
          id={nodeId}
          onOk={nodeAction}
          onCancel={() => setVisible(false)}
        />
      </ReactFlowProvider>
    </div>
  );
}
