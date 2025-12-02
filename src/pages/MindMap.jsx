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
} from "reactflow";
import "reactflow/dist/style.css";

// 自定义节点组件
import NodeCustom from "./note/NodeCustom";
import db from "./db/db"
import { table } from "@milkdown/crepe/feature/table";
import ContextMenu from "./note/ContextMenu/ContextMenu";

// 数据文件
// import notesData from "../assets/data/data.json";

const nodeTypes = { custom: NodeCustom };
function layoutTree(
  nodes,
  rootId,
  startX,
  startY,
  levelGap = 100,
  siblingGap = 100
) {
  const nodeMap = new Map();
  nodes.forEach((n) => nodeMap.set(n.id, { ...n, children: [] }));
  nodes.forEach((n) => {
    if (n.top) nodeMap.get(n.top)?.children.push(nodeMap.get(n.id));
  });

  const positions = new Map();

  function dfs(node, depth, x) {
    const y = startY + depth * levelGap;
    positions.set(node.id, { x, y });

    const children = node.children || [];
    if (!children.length) return;

    // 水平分布子节点
    const totalWidth = (children.length - 1) * siblingGap;
    let startChildX = x - totalWidth / 2;

    children.forEach((child, index) => {
      dfs(child, depth + 1, startChildX + index * siblingGap);
    });
  }

  const rootNode = nodeMap.get(rootId);
  if (rootNode) dfs(rootNode, 0, startX);

  return positions;
}

export default function MindMap() {
  // const flowWrapperRef = useRef(null);
  // 查询sqlite中的节点数据
  const [notesData, setNotesData] = useState(null);
  const addNote = (note) => {
    setNotesData((prevData) => [...prevData, note]);
  };
  const deleteNode = (id) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    db.notes.delete({"id":id});
  };

  useEffect(() => {
    db.notes.select().then((res) => {
      console.log("notesData:", notesData);
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
  }, [notesData]);

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
    nodeId: null
  });

  // 右键空白区域
  const onPaneContextMenu = useCallback((e) => {
    e.preventDefault();
    setMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      type: "pane",
      nodeId: null
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
  const addNewNode = useCallback(
    () => {
      // const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const id = `${nodes.length + 1}`;
      const newNodeDb = {
        id: `${id}`,
        name: `${id}`,
        content: "",
        alias: "",
        top: "1",
        left: ""
      }
      console.log("newNodeDb:", newNodeDb);
      db.notes.insert(newNodeDb);
      addNote(newNodeDb);
    },
    [nodes.length]
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
          fitView
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          nodesDraggable={true}
          panOnScroll={false} // ✅ 禁止滚动拖动画布
          zoomOnScroll={false} // ✅ 禁止滚轮缩放
          panOnDrag={false} // 🚫 禁止拖动画布
          attributionPosition={null}
          border="none"
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          {/* <MiniMap /> */}
        </ReactFlow>
        <ContextMenu
          menu={menu}
          onClose={closeMenu}
          onCreateNode={addNewNode}
          onEditNode={(id) => console.log("修改节点：", id)}
          onDeleteNode={deleteNode}
        />
      </ReactFlowProvider>
    </div>
  );
}
