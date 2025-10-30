import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
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
import NodeCustom from "../main/note/NodeCustom";

// 数据文件
import notesData from "../assets/data/data.json";
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
    if (n.parentId) nodeMap.get(n.parentId)?.children.push(nodeMap.get(n.id));
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
  const flowWrapperRef = useRef(null);

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
    const rootNode = notesData.find((n) => !n.parentId);
    const rootId = rootNode?.id;

    console.log(rootId);
    const posMap = layoutTree(notesData, rootId, 50, 50);
    console.log(posMap);
    const initNodes = notesData.map((n) => ({
      id: n.id,
      type: "custom",
      data: { label: n.label, ...n.data },
      // position: n.position || { x: Math.random() * 400, y: Math.random() * 400 },
      position: posMap.get(n.id),
    }));

    const initEdges = (notesData || []).map((e) => ({
      id: e.id,
      source: e.parentId,
      target: e.id,
      type: "tree",
    }));

    setNodes(initNodes);
    setEdges(initEdges);
  }, []);

  // 添加连接
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // 点击空白处添加节点示例（可删）
  const onPaneClick = useCallback(
    (event) => {
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const id = `${nodes.length + 1}`;
      const newNode = {
        id,
        type: "custom",
        data: { label: `节点${id}` },
        position: {
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [nodes, setNodes]
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
          onPaneClick={onPaneClick}
          nodesDraggable={true}
          panOnScroll={false} // ✅ 禁止滚动拖动画布
          zoomOnScroll={false} // ✅ 禁止滚轮缩放
          attributionPosition={null}
          border="none"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
