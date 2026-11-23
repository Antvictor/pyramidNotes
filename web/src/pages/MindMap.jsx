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
  useReactFlow,
  useNodesInitialized,
  NodeToolbar,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// 自定义节点组件
import NodeCustom from "./note/NodeCustom";
import db, { NOTE_LIST_COLUMNS } from "./db/db"
import { computeAncestorChain, collectExpandedChildren, needsSortBump, canSwapNodes, applySwapSorts, filterSiblingsByName, collectVisibleIdsToDepth } from "./treeUtils";
import { getNavigationTargets } from "./nodeNavigation";
import { getActiveEdgeIds } from "./mindMapEdges";
import {
  MAP_EXIT_MS,
  prefersReducedMotion,
  resolveEntryCamera,
} from "@/lib/routeTransition";
import { useMindMapViewStore } from "@/stores/mindMapViewStore";
import ContextMenu from "./note/ContextMenu/ContextMenu";
import ColorPalette from "./note/ColorPalette";
import OpenPrompt from "./commons/OpenPrompt";
import { PermissionDialog } from "@/components/ui/permission-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DeleteNodeDialog } from "@/components/ui/delete-node-dialog";
import { buildDeleteConfirmation, buildDeleteRequest } from "./deleteNodeRequest";
import { nanoid } from "nanoid";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useShortcutActions } from "@/hooks/useShortcuts";

// 数据文件
// import notesData from "../assets/data/data.json";

const nodeTypes = { custom: NodeCustom };

const SPACING_PRESETS = {
  compact:  { gapBase: 60, hGap: 60 },
  normal:   { gapBase: 80, hGap: 70 },
  loose:    { gapBase: 100, hGap: 80 },
};

// 视角平滑移动的时长（居中/平移）。太短会像"闪一下"，太长会拖沓。
const CENTER_ANIM_MS = 700;
// 方向键长按的节流间隔：系统按键重复约 30ms/次，太密会一步跨到头且看不清
const NAV_REPEAT_INTERVAL_MS = 150;
// 方向键导航的视角动画：只做小幅补位，不需要返回脑图那种完整 700ms 平移
const NAV_CENTER_ANIM_MS = 200;
// 节点的位置过渡时长（对应 index.css 里 .react-flow__node 的 transition）
const NODE_SLIDE_MS = 180;
// 创建节点：先让节点滑到位，视角再跟过去
const CREATE_ANIM_MS = 900;
// 移动节点：视角与节点一起出发，但比节点慢很多，形成"镜头追随"的感觉
const MOVE_ANIM_MS = 1300;

// 跨 MindMap 卸载保留的首帧缓存（仅用于快速恢复显示；正确性始终以挂载时的 DB 刷新为准）
let notesDataCache = null;       // 上次的节点行
let measuredSizesCache = null;   // 各节点实测尺寸 Map
let viewportCache = null;        // ReactFlow 视口 { x, y, zoom }
// 启动对账完成前，渲染端不得建根：库为空而目录有文件时（如损坏恢复），
// 抢建 1-root.md 会与对账导入的既有根冲突，形成双根。模块级存在，跨卸载保留。
let reconcileDone = typeof window === "undefined" || !window.api?.onNotesReconciled;

// 只有会改变脑图布局的字段变化才算“图变了”；
// content / last_up_time 变化（例如在编辑器里改正文）不应触发重排
function sameGraph(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  const byId = new Map(a.map((n) => [n.id, n]));
  for (const n of b) {
    const p = byId.get(n.id);
    if (!p || p.top !== n.top || p.left !== n.left || p.name !== n.name
      || (p.category ?? null) !== (n.category ?? null)
      || (Number(n.sort) || 0) !== (Number(p.sort) || 0)) return false;
  }
  return true;
}

/**
 * 动态树布局（按子树宽度分配 X），避免分支多时互相遮盖。
 *
 * 思路：
 * - 第 1 遍 DFS 计算每个节点的"子树宽度"（subtreeWidth）
 * - 第 2 遍 DFS 按子树宽度给每个孩子分配不重叠的区间，并取区间中心作为孩子的 X
 *
 * @param {Array} nodes - 笔记数据
 * @param {string} rootId - 根节点 id
 * @param {number} startX - 根节点起始 X
 * @param {number} startY - 根节点起始 Y
 * @param {Map} nodeSizes - ReactFlow 测量的节点尺寸 Map<id, {width, height}>
 * @param {Object} spacingPreset - 间距预设 { gapBase, hGap }
 */
function layoutTree(nodes, rootId, startX, startY, nodeSizes, spacingPreset, opts = {}) {
  const { gapBase, hGap: H_GAP } = spacingPreset || SPACING_PRESETS.normal;

  const nodeMap = new Map();
  nodes.forEach((n) => nodeMap.set(n.id, { ...n, children: [] }));
  nodes.forEach((n) => {
    if (n.top && n.top !== "0") nodeMap.get(n.top)?.children.push(nodeMap.get(n.id));
  });

  const positions = new Map();

  const getNodeSize = (node) => {
    if (nodeSizes) {
      const m = nodeSizes.get(node.id);
      if (m?.width && m?.height) return m;
    }
    const text = `${node?.name ?? ""}`;
    const nodeMaxWidth = 140, padX = 16, padY = 16;
    const width = Math.min(nodeMaxWidth, Math.max(30, 30 + text.length * 8));
    // 丰富模式顶部多一行（色点/预览图标）
    const richPad = opts.displayMode === 'rich' ? 18 : 0;
    // 固定宽度开启：与 DOM 的 nowrap 一致，强制单行
    if (opts.nameTruncate) {
      return { width, height: padY + 24 + richPad };
    }
    const charsPerLine = Math.max(1, Math.floor((nodeMaxWidth - padX) / 8));
    const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
    return {
      width,
      height: padY + 24 * lines + richPad,
    };
  };

  // 子树左右偏移量（距节点中心的距离），支持非对称子树
  const subL = new Map(), subR = new Map();
  function calcBounds(node) {
    const ch = node.children || [];
    const ownW = getNodeSize(node).width;
    if (!ch.length) { subL.set(node.id, ownW / 2); subR.set(node.id, ownW / 2); return; }

    ch.forEach(calcBounds);
    const owns = ch.map((c) => getNodeSize(c).width);
    const tight = owns.reduce((s, w) => s + w, 0) + H_GAP * (ch.length - 1);
    let cur = -tight / 2;
    const xs = ch.map((_, i) => { const x = cur + owns[i] / 2; cur += owns[i] + H_GAP; return x; });

    let lastWithChildren = ch[0].children?.length ? 0 : -1;
    for (let i = 1; i < ch.length; i++) {
      if (!ch[i].children?.length) continue;
      if (lastWithChildren >= 0) {
        const r = xs[lastWithChildren] + subR.get(ch[lastWithChildren].id);
        const l = xs[i] - subL.get(ch[i].id);
        if (r + H_GAP > l) { const sh = r + H_GAP - l; for (let j = i; j < xs.length; j++) xs[j] += sh; }
      }
      lastWithChildren = i;
    }

    let L = Infinity, R = -Infinity;
    for (let i = 0; i < ch.length; i++) {
      L = Math.min(L, xs[i] - subL.get(ch[i].id));
      R = Math.max(R, xs[i] + subR.get(ch[i].id));
    }
    subL.set(node.id, Math.max(ownW / 2, -L));
    subR.set(node.id, Math.max(ownW / 2, R));
  }

  const place = (node, centerX, y) => {
    const sz = getNodeSize(node);
    positions.set(node.id, { x: centerX - sz.width / 2, y });
    const ch = node.children || [];
    if (!ch.length) return;

    const childY = y + sz.height + gapBase;
    const owns = ch.map((c) => getNodeSize(c).width);
    const tight = owns.reduce((s, w) => s + w, 0) + H_GAP * (ch.length - 1);
    let cur = centerX - tight / 2;
    const xs = ch.map((_, i) => { const x = cur + owns[i] / 2; cur += owns[i] + H_GAP; return x; });

    let lastWithChildren2 = ch[0].children?.length ? 0 : -1;
    for (let i = 1; i < ch.length; i++) {
      if (!ch[i].children?.length) continue;
      if (lastWithChildren2 >= 0) {
        const r = xs[lastWithChildren2] + subR.get(ch[lastWithChildren2].id);
        const l = xs[i] - subL.get(ch[i].id);
        if (r + H_GAP > l) { const sh = r + H_GAP - l; for (let j = i; j < xs.length; j++) xs[j] += sh; }
      }
      lastWithChildren2 = i;
    }

    ch.forEach((c, i) => place(c, xs[i], childY));
  };

  const rootNode = nodeMap.get(rootId);
  if (rootNode) {
    calcBounds(rootNode);
    place(rootNode, startX, startY);

    const rootCh = rootNode.children || [];
    if (rootCh.length > 0) {
      let minX = Infinity, maxX = -Infinity;
      for (const ch of rootCh) {
        const chPos = positions.get(ch.id);
        if (!chPos) continue;
        const chSz = getNodeSize(ch);
        const chCenterX = chPos.x + chSz.width / 2;
        const left = chCenterX - (subL.get(ch.id) || chSz.width / 2);
        const right = chCenterX + (subR.get(ch.id) || chSz.width / 2);
        minX = Math.min(minX, left);
        maxX = Math.max(maxX, right);
      }
      if (minX < Infinity) {
        const rootMid = (minX + maxX) / 2;
        const rootSz = getNodeSize(rootNode);
        positions.set(rootNode.id, { x: rootMid - rootSz.width / 2, y: startY });
      }
    }
  }

  return positions;
}

function getDescendantIdsSync(nodeId, nodeMap) {
  const result = [nodeId];
  const children = nodeMap.get(nodeId)?.children || [];
  for (const child of children) {
    result.push(...getDescendantIdsSync(child.id, nodeMap));
  }
  return result;
}

function countDescendants(nodeId, nodeMap) {
  let count = 0;
  const node = nodeMap.get(nodeId);
  if (!node?.children) return 0;
  for (const child of node.children) {
    count += 1 + countDescendants(child.id, nodeMap);
  }
  return count;
}

// ReactFlow 测量完成后用实测尺寸重新布局
function LayoutOnMeasured({ nodeSpacing, displayedNotes, focusNodeId, setNodes }) {
  const { getNodes } = useReactFlow();
  const nodesInitialized = useNodesInitialized({ includeHiddenNodes: false });
  const retryRef = useRef(0);

  useEffect(() => {
    if (!nodesInitialized || !displayedNotes?.length) return;

    let raf = 0;
    let cancelled = false;

    const doLayout = () => {
      if (cancelled) return;
      const currentNodes = getNodes();
      const nodeSizes = new Map();
      currentNodes.forEach(n => {
        if (n.measured?.width && n.measured?.height) {
          nodeSizes.set(n.id, { width: n.measured.width, height: n.measured.height });
        }
      });

      // 等待所有节点测量完成：逐帧重试（最多 ~30 帧），而不是固定 200ms 延迟，
      // 这样实测布局紧跟主布局，视觉上只有一次平滑移动
      if (nodeSizes.size < currentNodes.length && retryRef.current < 30) {
        retryRef.current++;
        raf = requestAnimationFrame(doLayout);
        return;
      }
      retryRef.current = 0;

      if (nodeSizes.size === 0) return;

      const rootId = focusNodeId !== "1"
        ? focusNodeId
        : displayedNotes.find(n => n.top === "0")?.id;
      if (!rootId) return;

      // 缓存实测尺寸，供主布局复用（两次布局结果一致）
      measuredSizesCache = nodeSizes;

      const preset = SPACING_PRESETS[nodeSpacing] || SPACING_PRESETS.normal;
      const posMap = layoutTree(displayedNotes, rootId, 50, 50, nodeSizes, preset);

      // 实测布局与主布局结果一致时（都复用 measuredSizesCache），不要新建节点对象：
      // 否则整图节点会白白重渲染一轮。增删/移动节点时的卡顿主要来自这里。
      setNodes(nds => {
        let changed = false;
        const next = nds.map(n => {
          const p = posMap.get(n.id);
          if (!p || (p.x === n.position.x && p.y === n.position.y)) return n;
          changed = true;
          return { ...n, position: p };
        });
        return changed ? next : nds;
      });
    };

    raf = requestAnimationFrame(doLayout);

    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [nodesInitialized, nodeSpacing, focusNodeId, displayedNotes]);

  return null;
}

export default function MindMap({ selectedNode, setSelectedNode, clearSelectedNode, shortcuts }) {
  const { t, i18n } = useTranslation();
  // 抽成变量：既用于写进节点 data，也作为重建 nodes 的依赖
  const selectedNodeId = selectedNode?.id ?? null;
  // 方向键导航：长按连发时 React 状态可能尚未提交，用 ref 保证逐次推进
  const selectedIdRef = useRef(selectedNodeId);
  selectedIdRef.current = selectedNodeId;
  const lastNavAtRef = useRef(0);
  // const flowWrapperRef = useRef(null);
  // 查询sqlite中的节点数据
  const [notesData, setNotesData] = useState(null);
  const [visible, setVisible] = useState(false);
  const [nodeAction, setNodeAction] = useState();
  const [nodeId, setNodeId] = useState();
  const [title, setTitle] = useState();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTab, setSearchTab] = useState("node");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [moveSource, setMoveSource] = useState(null);
  const [swapSource, setSwapSource] = useState(null);
  const [swapTarget, setSwapTarget] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const [searchParams] = useSearchParams();
  const [nodeSpacing, setNodeSpacing] = useState('normal');
  const [deleteMode, setDeleteMode] = useState('trash');
  const [nodeDisplayMode, setNodeDisplayMode] = useState('simple');
  const [nodeNameTruncate, setNodeNameTruncate] = useState(false);
  const [colorPicker, setColorPicker] = useState({ show: false, x: 0, y: 0, nodeId: null });
  const focusNodeId = useMindMapViewStore((s) => s.focusNodeId);
  const setFocusNodeId = useMindMapViewStore((s) => s.setFocusNodeId);
  const loadedNodeIds = useMindMapViewStore((s) => s.loadedNodeIds);
  const setLoadedNodeIds = useMindMapViewStore((s) => s.setLoadedNodeIds);
  const expandedNodeIds = useMindMapViewStore((s) => s.expandedNodeIds);
  const setExpandedNodeIds = useMindMapViewStore((s) => s.setExpandedNodeIds);
  const initializedFocusId = useMindMapViewStore((s) => s.initializedFocusId);
  const setInitializedFocusId = useMindMapViewStore((s) => s.setInitializedFocusId);
  const [pendingRevealNodeId, setPendingRevealNodeId] = useState(null);
  const navigate = useNavigate();
  // 路由过渡：进入编辑器前先淡出；返回时在定位完成前保持不可见
  const [mapVisible, setMapVisible] = useState(!selectedNode);
  const [mapAnim, setMapAnim] = useState("");
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const leaveTimerRef = useRef(null);
  // 入口定位只在本次挂载执行一次；内联子组件会随父组件渲染重挂，避免后续选中变化被误判为"返回"
  const entryDoneRef = useRef(false);
  const handleMapReady = useCallback(() => {
    entryDoneRef.current = true;
    setMapVisible(true);
  }, []);
  const [menu, setMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    type: "",
    nodeId: focusNodeId,
    title: ""
  });

  const allNotesNodeMap = useMemo(() => {
    if (!notesData) return null;
    const nodeMap = new Map();
    notesData.forEach(n => nodeMap.set(n.id, { ...n, children: [] }));
    notesData.forEach(n => {
      if (n.top && n.top !== '0') {
        const parent = nodeMap.get(n.top);
        if (parent) parent.children.push(nodeMap.get(n.id));
      }
    });
    return nodeMap;
  }, [notesData]);

  // 交换位置：搜索范围仅限同一父级下的其他兄弟
  const swapScopeIds = useMemo(() => {
    if (!swapSource || !notesData) return undefined;
    return new Set(
      notesData
        .filter((n) => n.top === swapSource.top && n.id !== swapSource.id)
        .map((n) => n.id),
    );
  }, [swapSource, notesData]);

  // 交换位置的默认候选：全部兄弟（notesData 已按 sort 排序）
  const swapSiblings = useMemo(() => {
    if (!swapSource || !notesData) return [];
    return notesData
      .filter((n) => n.top === swapSource.top && n.id !== swapSource.id)
      .map((n) => ({ id: n.id, name: n.name }));
  }, [swapSource, notesData]);

  const searchSwapSiblings = useCallback(
    (keyword) => filterSiblingsByName(swapSiblings, keyword),
    [swapSiblings],
  );

  // 供节点回调读取最新的节点图，同时保持回调引用稳定：否则每次数据变化都会
  // 让所有节点的 onExpand* 变成新函数，React.memo 全部失效、整图重渲染。
  const allNotesNodeMapRef = useRef(allNotesNodeMap);
  allNotesNodeMapRef.current = allNotesNodeMap;

  // 不变量：已展开的节点，其子节点必须都已加载，
  // 否则会出现“显示为已展开、却看不到子节点/兄弟”的矛盾状态
  useEffect(() => {
    if (!allNotesNodeMap) return;
    const needed = collectExpandedChildren(expandedNodeIds, allNotesNodeMap);
    if (!needed.size) return;
    setLoadedNodeIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const cid of needed) {
        if (!next.has(cid)) { next.add(cid); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [expandedNodeIds, allNotesNodeMap, setLoadedNodeIds]);

  const expandOneLevel = useCallback((nodeId) => {
    const node = allNotesNodeMapRef.current?.get(nodeId);
    if (!node?.children?.length) return;
    setLoadedNodeIds(prev => {
      const next = new Set(prev);
      for (const child of node.children) next.add(child.id);
      return next;
    });
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
    setSelectedNode({ id: nodeId, name: node.name });
  }, [setSelectedNode]);

  const expandAll = useCallback((nodeId) => {
    const map = allNotesNodeMapRef.current;
    if (!map) return;
    const node = map.get(nodeId);
    const descIds = getDescendantIdsSync(nodeId, map);
    setLoadedNodeIds(prev => {
      const next = new Set(prev);
      for (const id of descIds) next.add(id);
      return next;
    });
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
    if (node) setSelectedNode({ id: nodeId, name: node.name });
  }, [setSelectedNode]);

  const collapseNode = useCallback((nodeId) => {
    const map = allNotesNodeMapRef.current;
    if (!map) return;
    const node = map.get(nodeId);
    const descIds = getDescendantIdsSync(nodeId, map);
    const childIds = new Set(descIds.filter(id => id !== nodeId));
    setLoadedNodeIds(prev => {
      const next = new Set(prev);
      for (const id of childIds) next.delete(id);
      return next;
    });
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      next.delete(nodeId);
      for (const id of childIds) next.delete(id);
      return next;
    });
    if (node) setSelectedNode({ id: nodeId, name: node.name });
  }, [setSelectedNode]);

  const handleRevealNode = useCallback(({ id, name }) => {
    if (!allNotesNodeMap) return;
    const displayRootId = focusNodeId === '1'
      ? notesData.find((n) => n.top === '0')?.id
      : focusNodeId;
    if (!displayRootId) return;
    const chain = computeAncestorChain(id, displayRootId, allNotesNodeMap);
    setLoadedNodeIds((prev) => {
      const next = new Set(prev);
      for (const c of chain) next.add(c);
      return next;
    });
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      for (const c of chain) next.add(c);
      return next;
    });
    setSelectedNode({ id, name });
    setPendingRevealNodeId(id);
  }, [allNotesNodeMap, focusNodeId, notesData, setSelectedNode]);

  // 设置/清除节点颜色：写 state（即时刷新）+ DB + YAML（合并写，只动 category）
  const setNodeCategory = useCallback(async (id, category) => {
    const node = notesData?.find((n) => n.id === id);
    if (!node) return;
    const next = category || null;
    setNotesData((nds) => (nds ? nds.map((n) => (n.id === id ? { ...n, category: next } : n)) : nds));
    await db.notes.update({ id }, { category: next });
    await window.api.updateYaml(`${id}-${node.name}.md`, { category: next });
  }, [notesData]);

  const openColorPicker = useCallback((nodeId, x, y) => {
    setColorPicker({ show: true, x, y, nodeId });
  }, []);

  // 预览：单条查正文（不给列表查询加 content，遵守 MINDMAP_VIEW.md 禁忌#7）
  const fetchPreview = useCallback(async (id) => {
    const rows = await db.notes.select({ id }, '', '', { columns: 'content' });
    return rows?.[0]?.content ?? '';
  }, []);

  const closeColorPicker = useCallback(() => {
    setColorPicker((p) => ({ ...p, show: false }));
  }, []);

  // 首次加载或聚焦切换时加载前三层；数据变更/导航返回不重置
  useEffect(() => {
    if (!allNotesNodeMap || !notesData) return;
    if (initializedFocusId === focusNodeId) return;

    const effectiveRootId = focusNodeId === '1'
      ? notesData.find(n => n.top === '0')?.id
      : focusNodeId;
    if (!effectiveRootId) return;

    let pool = notesData;
    if (focusNodeId !== '1') {
      const subtreeIds = new Set(getDescendantIdsSync(focusNodeId, allNotesNodeMap));
      pool = notesData.filter(n => subtreeIds.has(n.id));
    }

    // 与 displayedNotes 首帧分支同源，保证初始化前后可见集合完全一致
    const ids = collectVisibleIdsToDepth(pool, effectiveRootId, 2);

    setInitializedFocusId(focusNodeId);
    setLoadedNodeIds(ids);
    setExpandedNodeIds(new Set());
  }, [allNotesNodeMap, focusNodeId, initializedFocusId, notesData]);

  const clickTimerRef = useRef(null);
  const lastClickRef = useRef(null);
  const creatingRootRef = useRef(false);

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
  const getAllDescendantIds = async (nodeId) => {
    const descendantIds = [nodeId];
    const directChildren = await db.notes.select({ top: nodeId });
    for (const child of directChildren) {
      descendantIds.push(...await getAllDescendantIds(child.id));
    }
    return descendantIds;
  };

  // 删除整个子树（根节点永不删除/进回收站）
  const deleteEntireTree = async (id, isRoot) => {
    const allIds = await getAllDescendantIds(id);
    // 根节点永不删除：整树删除时剔除根（isRoot 在 requestDeleteNode 时已算出）
    const restIds = isRoot ? allIds.filter((nid) => nid !== id) : allIds;

    // 先乐观更新 UI（立即响应），IO 随后进行
    setNotesData(nds => nds.filter(n => !restIds.includes(n.id)));
    setEdges(eds => eds.filter(e => !restIds.includes(e.source) && !restIds.includes(e.target)));

    if (restIds.length) {
      const result = await window.api.deleteNotes(restIds);
      if (handleFileError(result)) return;
    }
  };

  // 将子节点提升到祖父节点下。
  // 数据库和 .md 文件都要改：启动对账以文件为准（见 electron/nodes/noteSync.cjs），
  // 只改库会让文件里那个已经不存在的旧上级在下次启动时被当成真相，
  // 这些节点会被一路挪到别的父节点底下。
  const promoteChildren = async (parentId, grandParentId) => {
    const children = await db.notes.select({ top: parentId });

    // 更新所有直接子节点的 top 为 grandParentId
    await db.notes.update({ top: parentId }, { top: grandParentId });
    for (const child of children) {
      await window.api.updateYaml(`${child.id}-${child.name}.md`, { top: grandParentId });
    }

    // 更新 notesData 状态
    setNotesData(nds => nds.map(n => {
      if (n.top === parentId) {
        return { ...n, top: grandParentId };
      }
      return n;
    }));
  };

  const _internalDeleteNode = async (id) => {
    // 先乐观更新 UI（立即响应），IO 随后进行
    setNotesData(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    const result = await window.api.deleteNotes([id]);
    if (handleFileError(result)) return;
  };

  // ========== Unified Request Methods ==========
  // All shortcuts and context menu call these instead of direct operation functions
  // This ensures consistent behavior and permission checks

  // Request delete node - unified entry point with child count check
  const requestDeleteNode = async (nodeId, nodeName) => {
    const childCount = await db.notes.count({ top: nodeId });
    const currentNode = (await db.notes.select({ id: nodeId }))[0];
    const request = buildDeleteRequest({
      nodeId,
      nodeName,
      childCount,
      grandParentId: currentNode?.top || null,
      isRoot: currentNode?.top === '0',
    });

    if (!request.requiresChoice) {
      setDeleteConfirmation({
        ...request,
        mode: request.isRoot ? "entire-tree" : "parent-only",
        confirmation: buildDeleteConfirmation({
          nodeName: request.name,
          mode: request.isRoot ? "entire-tree" : "parent-only",
        }),
      });
      return;
    }

    setDeleteTarget(request);
  };

  const requestDeleteConfirmation = (mode) => {
    if (!deleteTarget) return;
    setDeleteConfirmation({
      ...deleteTarget,
      mode,
      confirmation: buildDeleteConfirmation({
        nodeName: deleteTarget.name,
        mode,
      }),
    });
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    if (deleteConfirmation.mode === "entire-tree") {
      await deleteEntireTree(deleteConfirmation.id, deleteConfirmation.isRoot);
    } else {
      const grandParentId = deleteConfirmation.grandParentId;
      await promoteChildren(deleteConfirmation.id, grandParentId);
      await _internalDeleteNode(deleteConfirmation.id);
    }

    if (deleteConfirmation.id === focusNodeId) {
      setFocusNodeId("1");
    }

    setDeleteConfirmation(null);
    clearSelectedNode();
  };

  // Request create node - unified entry point (same logic for shortcut and right-click)
  const requestCreateNode = (parentId, prefillName) => {
    _internalAddNode(parentId, prefillName);
  };

  // 新增同级节点：与选中节点同父；根节点无同级；父级已失效时不创建
  const requestCreateSibling = (nodeId) => {
    const node = notesData?.find((n) => n.id === nodeId);
    const parentId = node?.top;
    if (!node || !parentId || parentId === '0') return;
    if (!notesData.some((n) => n.id === parentId)) return;
    requestCreateNode(parentId);
  };

  // Request edit node - unified entry point
  const requestEditNode = (nodeId, nodeName) => {
    _internalUpdateNode(nodeId, nodeName);
  };

  // Request move node - opens search dialog
  // 守卫只针对被移动的源节点：根（top === '0'）不能移动（菜单本就隐藏，移动根必然被 isDescendantOf 判环）。
  // 目标侧不变：根仍可在搜索弹窗中作为目标父节点被选中。
  const requestMoveNode = (nodeId, nodeName) => {
    const node = notesData?.find((n) => n.id === nodeId);
    if (!node || !node.top || node.top === '0') return;
    setMoveSource({ id: nodeId, name: nodeName });
  };

  // Check if nodeId is a descendant of ancestorId (prevent cycles)
  const isDescendantOf = async (nodeId, ancestorId) => {
    let current = nodeId;
    const visited = new Set();
    while (current && current !== "0") {
      if (visited.has(current)) break;
      visited.add(current);
      const rows = await db.notes.select({ id: current });
      if (!rows.length) break;
      if (rows[0].top === ancestorId) return true;
      current = rows[0].top;
    }
    return false;
  };

  // Execute node move
  const executeMoveNode = async (targetId) => {
    if (!moveSource) return;
    if (moveSource.id === targetId) return;
    if (await isDescendantOf(targetId, moveSource.id)) return;
    const sourceNode = (await db.notes.select({ id: moveSource.id }))[0];
    if (!sourceNode || sourceNode.top === targetId) return;

    // 目标父下兄弟的最大 sort：不满足「严格大于」则抬升到全局 max+1，
    // 既保证落到最右，也保持全局序号唯一。
    const siblings = await db.notes.select({ top: targetId });
    const siblingMax = siblings.reduce((m, s) => Math.max(m, Number(s.sort) || 0), 0);
    let nextSort = Number(sourceNode.sort) || 0;
    let sortChanged = false;
    if (needsSortBump(nextSort, siblingMax)) {
      nextSort = await db.notes.nextSort();
      sortChanged = true;
    }

    const moved = { id: moveSource.id, name: moveSource.name };
    // 乐观更新 UI，IO 后台执行；按 sort 稳定重排，移动后的节点立即落到同级最右
    setNotesData(nds => {
      const next = nds.map(n => (n.id === moved.id ? { ...n, top: targetId, sort: nextSort } : n));
      next.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
      return next;
    });
    setSelectedNode(moved);
    setMoveSource(null);

    const sortPatch = sortChanged ? { sort: nextSort } : {};
    await db.notes.update({ id: moved.id }, { top: targetId, ...sortPatch });
    await window.api.updateYaml(`${moved.id}-${moved.name}.md`, { top: targetId, ...sortPatch });

    // 目标可能处于折叠状态（甚至祖先链也被折叠）：展开目标并揭示祖先链，
    // 让移入节点作为目标的直接子级正常落位，同时让目标出现折叠按钮。
    const displayRootId = focusNodeId === '1'
      ? notesData.find((n) => n.top === '0')?.id
      : focusNodeId;
    if (displayRootId && allNotesNodeMap) {
      const chain = computeAncestorChain(targetId, displayRootId, allNotesNodeMap);
      useMindMapViewStore.getState().revealNodeIds(moved.id, chain);
    }

    // 移动后视角跟着节点一起飞过去，但比节点慢很多，形成"镜头追随"的感觉
    centerWhenRendered({ keepZoom: true, durationMs: MOVE_ANIM_MS });
  };

  // Request swap position - opens a sibling-scoped search dialog
  const requestSwapNode = (nodeId) => {
    const source = notesData?.find((n) => n.id === nodeId);
    if (!source || !source.top || source.top === '0') return;
    setSwapTarget(null);
    setSwapSource({ id: source.id, name: source.name, top: source.top });
  };

  // Execute position swap: exchange sort and persist to DB + markdown
  const executeSwap = async () => {
    const pair = swapTarget;
    if (!pair) return;
    setSwapTarget(null);
    const [aRows, bRows] = await Promise.all([
      db.notes.select({ id: pair.source.id }),
      db.notes.select({ id: pair.id }),
    ]);
    const a = aRows?.[0];
    const b = bRows?.[0];
    if (!canSwapNodes(a, b)) return;
    const aSort = Number(a.sort) || 0;
    const bSort = Number(b.sort) || 0;
    setNotesData(nds => applySwapSorts(nds, a, b));
    setSelectedNode({ id: a.id, name: a.name });
    // 相同 sort 时互换为恒等，不写库/文件
    if (aSort === bSort) return;
    await db.notes.update({ id: a.id }, { sort: bSort });
    await db.notes.update({ id: b.id }, { sort: aSort });
    await window.api.updateYaml(`${a.id}-${a.name}.md`, { sort: bSort });
    await window.api.updateYaml(`${b.id}-${b.name}.md`, { sort: aSort });
  };

  useEffect(() => {
    if (window.api?.getSettings) {
      window.api.getSettings().then((s) => {
        if (s?.nodeSpacing) setNodeSpacing(s.nodeSpacing);
        if (s?.deleteMode) setDeleteMode(s.deleteMode);
        if (s?.nodeDisplayMode) setNodeDisplayMode(s.nodeDisplayMode);
        if (s?.nodeNameTruncate !== undefined) setNodeNameTruncate(s.nodeNameTruncate);
      });
    }
    // 首帧：若有缓存先立即渲染，避免返回脑图时的空白闪屏
    if (notesDataCache) setNotesData(notesDataCache);

    const applyRows = (res) => {
      // 调用electron api，扫描数据目录下的markdown，并根据yaml头构建节点数据，然后存入sqlite; 最后从sqlite读取节点数据进行展示
      if (!res || res.length === 0) {
        // 启动对账完成前不建根：空库可能只是「文件尚未导入」，抢建会与对账的根冲突
        if (!reconcileDone) return;
        // 新建根节点
        const rootNode = {
          id: "1",
          name: "root",
          content: "",
          alias: "",
          top: "0",
          left: "0",
          sort: 0
        }
        db.notes.insert(rootNode);
        // 同时新建markdown文件, 保存yaml数据，title;left;top等元信息
        saveNode(rootNode);
        setNotesData([rootNode]);
      } else if (!sameGraph(notesDataCache, res)) {
        // 结构有变化（如编辑页新增/删除了节点）才更新，避免无谓重排
        setNotesData(res);
      }
    };

    let disposed = false;
    // 先订阅、再读库：订阅前完成的对账由下面「拉取状态」或 select 覆盖；订阅后完成的由事件触发重读
    const unsubscribe = window.api?.onNotesReconciled?.(() => {
      reconcileDone = true;
      if (!disposed) db.notes.select("", "", "", { columns: NOTE_LIST_COLUMNS }).then(applyRows);
    });

    const loadRows = () => {
      if (disposed) return;
      db.notes.select("", "", "", { columns: NOTE_LIST_COLUMNS }).then(applyRows);
    };
    // 对账可能比 React 订阅更快（事件已错过）：主动拉一次完成状态再读库
    const stateRequest = window.api?.getReconcileState?.();
    if (stateRequest) {
      stateRequest
        .then((state) => { if (state?.done) reconcileDone = true; loadRows(); })
        .catch(loadRows);
    } else {
      loadRows();
    }

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);

  // 空闲时预取编辑器 chunk（与 Node 的懒加载同一模块），首次打开笔记不再等加载
  useEffect(() => {
    let cancelled = false;
    const prefetch = () => {
      if (cancelled) return;
      import("../core/editor/TipTapEditor").catch(() => {});
    };
    if (typeof requestIdleCallback === "function") {
      const idleId = requestIdleCallback(prefetch, { timeout: 2000 });
      return () => {
        cancelled = true;
        if (typeof cancelIdleCallback === "function") cancelIdleCallback(idleId);
      };
    }
    const timer = setTimeout(prefetch, 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // notesData 变更时同步缓存，供下次挂载首帧使用
  useEffect(() => {
    if (notesData) notesDataCache = notesData;
  }, [notesData]);

  // Listen for settings changes (storagePath change)
  useEffect(() => {
    if (!window.api?.onSettingsChanged) return undefined;
    return window.api.onSettingsChanged((newSettings) => {
      if (newSettings.nodeSpacing) {
        setNodeSpacing(newSettings.nodeSpacing);
      }
      if (newSettings.nodeDisplayMode) {
        setNodeDisplayMode(newSettings.nodeDisplayMode);
      }
      if (newSettings.nodeNameTruncate !== undefined) {
        setNodeNameTruncate(newSettings.nodeNameTruncate);
      }
      if (newSettings.storagePath) {
        console.log("Settings changed, reloading notes for storagePath:", newSettings.storagePath);
        db.notes.select("", "", "", { columns: NOTE_LIST_COLUMNS }).then((res) => {
          console.log("Reloaded notes:", res);
          if (res && res.length > 0) {
            setNotesData(res);
          }
        });
      }
    });
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

  const displayedNotes = useMemo(() => {
    if (!notesData || !allNotesNodeMap) return null;

    let pool = notesData;
    if (focusNodeId !== '1') {
      const subtreeIds = new Set(getDescendantIdsSync(focusNodeId, allNotesNodeMap));
      pool = notesData.filter(n => subtreeIds.has(n.id));
    }

    // loadedNodeIds 为空 = 首次加载（初始化 effect 还没跑）。
    // 直接按「聚焦根 + 前三层」过滤，避免先把全图布局挂载一遍再收缩；
    // 找不到根时保留旧兜底（下方 effect 会建根并收编孤儿）。
    if (loadedNodeIds.size === 0) {
      const rootId = focusNodeId === '1'
        ? notesData.find(n => n.top === '0')?.id
        : focusNodeId;
      const initial = collectVisibleIdsToDepth(pool, rootId, 2);
      return initial.size > 0 ? pool.filter(n => initial.has(n.id)) : pool;
    }

    return pool.filter(n => loadedNodeIds.has(n.id));
  }, [notesData, focusNodeId, loadedNodeIds, allNotesNodeMap]);

  // 添加连接
  useEffect(() => {
    if (!displayedNotes) return;

    let rootNode;
    if (focusNodeId === "1") {
      rootNode = displayedNotes.find((n) => "0" === n.top);
    } else {
      rootNode = displayedNotes.find((n) => n.id === focusNodeId);
    }

    // 没有 root 节点时的处理（仅全局模式，且数据库中确实无root）
    if (!rootNode && !creatingRootRef.current && focusNodeId === "1") {
      // 启动对账未完成：空库可能只是文件还没导入，等 notes:reconciled 后再判定
      if (!reconcileDone) return;
      const dbHasRoot = notesData?.some(n => n.top === "0");
      if (dbHasRoot) return;
      creatingRootRef.current = true;
      const newRoot = {
        id: "1",
        name: "root",
        content: "",
        alias: "",
        top: "0",
        left: "0",
        sort: 0
      };

      db.notes.insert(newRoot);
      saveNode(newRoot);

      if (displayedNotes.length > 0) {
        // 有孤儿节点：全部收编到新 root 下
        const updated = displayedNotes.map(n => {
          db.notes.update({ id: n.id }, { top: "1" });
          return { ...n, top: "1" };
        });
        setNotesData([newRoot, ...updated]);
      } else {
        setNotesData([newRoot]);
      }
      return;
    }

    if (!rootNode) return;

    const rootId = rootNode.id;
    creatingRootRef.current = false;
    const preset = SPACING_PRESETS[nodeSpacing] || SPACING_PRESETS.normal;
    // 复用上一轮实测尺寸，使本布局与 LayoutOnMeasured 的结果一致，
    // 避免“估算布局 → 实测再重排”造成的二次跳动
    const posMap = layoutTree(displayedNotes, rootId, 50, 50, measuredSizesCache, preset, { nameTruncate: nodeNameTruncate, displayMode: nodeDisplayMode });

    const displayedIds = new Set(displayedNotes.map(n => n.id));
    const descCountMap = new Map();
    const hiddenChildrenMap = new Map();

    for (const n of displayedNotes) {
      const allDescIds = allNotesNodeMap
        ? getDescendantIdsSync(n.id, allNotesNodeMap).filter(id => id !== n.id)
        : [];
      descCountMap.set(n.id, allDescIds.length);
      // 有隐藏后代 = 全量后代中存在但未加载的
      hiddenChildrenMap.set(n.id, allDescIds.some(id => !loadedNodeIds.has(id)));
    }

    const initNodes = displayedNotes.map((n) => {
      const descendantCount = descCountMap.get(n.id) || 0;
      return {
        id: n.id,
        type: "custom",
        data: {
          name: n.name,
          label: n.name,
          ...n,
          descendantCount,
          hasHiddenChildren: hiddenChildrenMap.get(n.id) || false,
          // 无后代时不再显示折叠按钮（如源父节点被移走最后一个子节点）
          isExpanded: descendantCount > 0 && expandedNodeIds.has(n.id),
          // 选中态与语言写进 data：让 NodeCustom 的 memo 能正确失效，
          // 而不是靠订阅 context（那样任何选中变化都会重渲染整图）
          isSelected: selectedNodeId === n.id,
          lang: i18n.language,
          displayMode: nodeDisplayMode,
          nameTruncate: nodeNameTruncate,
          onSetCategory: setNodeCategory,
          onOpenColor: openColorPicker,
          fetchPreview,
          onExpandOneLevel: expandOneLevel,
          onExpandAll: expandAll,
          onCollapseNode: collapseNode,
        },
        position: posMap.get(n.id) || { x: Math.random() * 400, y: Math.random() * 400 },
      };
    });

    const displayedIdsEdge = new Set(displayedNotes.map(n => n.id));
    const activeEdgeIds = getActiveEdgeIds({
      selectedId: selectedNodeId,
      nodeMap: allNotesNodeMap,
    });
    const edgeStyle = (id) => (
      activeEdgeIds.has(id)
        ? { stroke: 'var(--mm-edge-active)', strokeWidth: 2 }
        : { stroke: 'var(--mm-edge)', strokeWidth: 1.5 }
    );
    const initEdges = [];
    (displayedNotes || []).forEach((e) => {
      if (e.top && e.top !== "0" && displayedIdsEdge.has(e.top)) {
        initEdges.push({
          id: `e${e.top}-${e.id}`,
          source: e.top,
          sourceHandle: "bottom",
          target: e.id,
          targetHandle: "top",
          style: edgeStyle(`e${e.top}-${e.id}`),
        });
      };
      if (e.left && displayedIdsEdge.has(e.left)) {
        initEdges.push({
          id: `e${e.left}-${e.id}`,
          source: e.left,
          sourceHandle: "right",
          target: e.id,
          targetHandle: "left",
          style: edgeStyle(`e${e.left}-${e.id}`),
        });
      }
    });
    // 活跃边排在末尾，最后绘制：共享路径段的非活跃灰线不会盖住高亮主干
    initEdges.sort((a, b) => (
      Number(activeEdgeIds.has(a.id)) - Number(activeEdgeIds.has(b.id))
    ));
    // 未变化的节点复用旧对象（NodeCustom 带 memo），这样新建/移动/选中
    // 只重渲染真正变化的节点，而不是整图 30+ 个节点一起刷新。
    setNodes(prev => {
      const prevById = new Map(prev.map(n => [n.id, n]));
      let changed = initNodes.length !== prev.length;
      const next = initNodes.map(n => {
        const p = prevById.get(n.id);
        if (
          p &&
          p.data.name === n.data.name &&
          p.data.descendantCount === n.data.descendantCount &&
          p.data.hasHiddenChildren === n.data.hasHiddenChildren &&
          p.data.isExpanded === n.data.isExpanded &&
          p.data.isSelected === n.data.isSelected &&
          p.data.lang === n.data.lang &&
          p.data.category === n.data.category &&
          p.data.displayMode === n.data.displayMode &&
          p.data.nameTruncate === n.data.nameTruncate &&
          p.position.x === n.position.x &&
          p.position.y === n.position.y
        ) return p;
        changed = true;
        return n;
      });
      return changed ? next : prev;
    });
    // 选中变化只更新边样式与绘制顺序；结构与样式都未变时复用旧数组
    setEdges(prev => {
      if (
        prev.length === initEdges.length
        && prev.every((e, i) => e.id === initEdges[i].id
          && e.source === initEdges[i].source
          && e.target === initEdges[i].target
          && e.sourceHandle === initEdges[i].sourceHandle
          && e.targetHandle === initEdges[i].targetHandle
          && e.style?.stroke === initEdges[i].style.stroke
          && e.style?.strokeWidth === initEdges[i].style.strokeWidth)
      ) return prev;
      return initEdges;
    });
  }, [displayedNotes, setEdges, setNodes, allNotesNodeMap, loadedNodeIds, expandedNodeIds, expandOneLevel, expandAll, collapseNode, selectedNodeId, i18n.language, nodeDisplayMode, nodeNameTruncate, setNodeCategory, openColorPicker, fetchPreview]);

  // 添加连接
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const centerOnSelectedRef = useRef(null);
  const isNodeVisibleRef = useRef(null);

  // 等所选节点真正进入 ReactFlow 后再居中，替代固定 300ms 延迟
  // onlyIfOffscreen：目标已在视口内则不动视角（方向键导航用，避免每步都平移）
  const centerWhenRendered = useCallback((opts = {}, tries = 30) => {
    const run = (o) => {
      requestAnimationFrame(() => {
        if (o.onlyIfOffscreen && o.nodeId && isNodeVisibleRef.current?.(o.nodeId)) return;
        const done = centerOnSelectedRef.current && centerOnSelectedRef.current(o);
        // 重试时不再重复延时，否则每帧都要重新等一遍
        if (!done && tries > 0) centerWhenRendered({ ...o, delayMs: 0 }, tries - 1);
      });
    };
    // delayMs：等节点的位置过渡跑完再动视角 —— "节点先到位，视角再跟过去"
    if (opts.delayMs) setTimeout(() => run(opts), opts.delayMs);
    else run(opts);
  }, []);

  // 打开笔记：脑图先淡出再切换路由；淡出期间冻结交互，避免选中被清空或重复导航
  const openNodeWithTransition = useCallback((id, name) => {
    if (leavingRef.current || !id) return;
    leavingRef.current = true;
    setLeaving(true);
    setSelectedNode({ id, name });
    const target = `/note/${id}/${name}`;
    if (prefersReducedMotion()) {
      navigate(target);
      return;
    }
    setMapAnim("leave");
    leaveTimerRef.current = setTimeout(() => navigate(target), MAP_EXIT_MS);
  }, [navigate, setSelectedNode]);

  useEffect(() => () => clearTimeout(leaveTimerRef.current), []);

  // 方向键"向下"选视觉中间孩子：用渲染坐标的水平中心比较
  const getNodeCenterX = useCallback((id) => {
    const node = nodes.find((n) => n.id === id);
    if (!node?.position) return null;
    const width = node.measured?.width ?? node.width ?? measuredSizesCache?.get(id)?.width;
    if (typeof width !== 'number') return null;
    return node.position.x + width / 2;
  }, [nodes]);

  // 方向键导航选中：展开祖先链使目标可见（不展开目标自身），保持缩放居中
  const selectNavigationTarget = useCallback((targetId) => {
    const map = allNotesNodeMapRef.current;
    const node = map?.get(targetId);
    if (!node) return;

    const displayRootId = focusNodeId === '1'
      ? notesData?.find((n) => n.top === '0')?.id
      : focusNodeId;
    if (displayRootId && map) {
      const chain = computeAncestorChain(targetId, displayRootId, map);
      setLoadedNodeIds((prev) => {
        const next = new Set(prev);
        for (const id of chain) next.add(id);
        return next;
      });
      setExpandedNodeIds((prev) => {
        const next = new Set(prev);
        // 只展开祖先：展开目标本身会连带展开它的子树，导致布局跳动
        for (const id of chain) {
          if (id !== targetId) next.add(id);
        }
        return next;
      });
    }

    setSelectedNode({ id: node.id, name: node.name });
    // 已在视口内就不动视角；离开视口才用较短的动画补位
    centerWhenRendered({
      keepZoom: true,
      nodeId: targetId,
      onlyIfOffscreen: true,
      durationMs: NAV_CENTER_ANIM_MS,
    });
  }, [focusNodeId, notesData, setLoadedNodeIds, setExpandedNodeIds, setSelectedNode, centerWhenRendered]);

  const navigateSelection = useCallback((direction, event) => {
    const map = allNotesNodeMapRef.current;
    const currentId = selectedIdRef.current;
    if (!map || !currentId) return;

    // 长按连发节流：系统重复间隔约 30ms，按可感知的节奏推进
    if (event?.repeat) {
      const now = Date.now();
      if (now - lastNavAtRef.current < NAV_REPEAT_INTERVAL_MS) return;
    }

    const displayRootId = focusNodeId === '1'
      ? notesData?.find((n) => n.top === '0')?.id
      : focusNodeId;
    const targets = getNavigationTargets({
      selectedId: currentId,
      nodeMap: map,
      displayRootId,
      getCenterX: getNodeCenterX,
    });
    const targetId = targets[direction];
    if (!targetId) return;

    lastNavAtRef.current = Date.now();
    // 长按连发：先同步 ref 再 setState，避免下一次事件读到旧选中
    selectedIdRef.current = targetId;
    selectNavigationTarget(targetId);
  }, [focusNodeId, notesData, getNodeCenterX, selectNavigationTarget]);

  // 右键空白区域
  const onPaneContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      type: "pane",
      nodeId: focusNodeId,
      title: ""
    });
  }, [focusNodeId]);

  // 右键节点：选中 + 弹出菜单（不居中）
  const onNodeContextMenu = useCallback((e, node) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedNode({ id: node.id, name: node.data.name });
    setMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      type: "node",
      nodeId: node.id,
      title: node.data.name,
      isRoot: node.data.top === "0"
    });
  }, [setSelectedNode]);

  const closeMenu = () => setMenu((m) => ({ ...m, show: false }));

  // 快捷键分发：分类即作用域 —— shortcuts.node 只在脑图页激活，shortcuts.global 全页面激活。
  // 绑定与 processor 的对应关系在这里声明，规则本身在 useShortcuts 里。
  useShortcutActions({
    shortcuts,
    scope: "mindmap",
    blocked: Boolean(
      visible || searchOpen || moveSource || swapSource || swapTarget || menu.show
      || deleteTarget || deleteConfirmation || permissionError || leaving
    ),
    // 方向键支持长按连续移动；其余动作仍忽略长按
    repeatableActions: ["selectParent", "selectPrevSibling", "selectNextSibling", "selectChild"],
    handlers: {
      search: (e) => {
        e.preventDefault();
        setSearchOpen(true);
        setSearchTab("node");
      },
      searchFullText: (e) => {
        e.preventDefault();
        setSearchOpen(true);
        setSearchTab("fulltext");
      },
      newNode: (e) => {
        e.preventDefault();
        requestCreateNode(selectedNode?.id || focusNodeId);
      },
      newSibling: (e) => {
        e.preventDefault();
        if (selectedNode) requestCreateSibling(selectedNode.id);
      },
      renameNode: (e) => {
        e.preventDefault();
        if (selectedNode) requestEditNode(selectedNode.id, selectedNode.name);
      },
      deleteNode: (e) => {
        e.preventDefault();
        if (selectedNode) requestDeleteNode(selectedNode.id, selectedNode.name);
      },
      moveNode: (e) => {
        e.preventDefault();
        if (selectedNode) requestMoveNode(selectedNode.id, selectedNode.name);
      },
      swapNode: (e) => {
        e.preventDefault();
        if (selectedNode) requestSwapNode(selectedNode.id);
      },
      openNode: (e) => {
        e.preventDefault();
        if (!selectedNode) return;
        openNodeWithTransition(selectedNode.id, selectedNode.name);
      },
      focusMode: (e) => {
        e.preventDefault();
        if (!selectedNode || selectedNode.id === focusNodeId) return;
        setFocusNodeId(selectedNode.id);
        centerWhenRendered();
      },
      selectParent: (e) => {
        e.preventDefault();
        navigateSelection("up", e);
      },
      selectPrevSibling: (e) => {
        e.preventDefault();
        navigateSelection("left", e);
      },
      selectNextSibling: (e) => {
        e.preventDefault();
        navigateSelection("right", e);
      },
      selectChild: (e) => {
        e.preventDefault();
        navigateSelection("down", e);
      },
    },
  });

  // 新增节点
  const _internalAddNode = (id) => {
    setVisible(true);
    setNodeId(id);
    setTitle("");
    setNodeAction(() => insertNode);
  }
  const insertNode = useCallback(
    async (parent, name) => {
      setVisible(false);
      const safeName = name.replace(/\//g, '-');
      const id = nanoid(12);
      const sort = await db.notes.nextSort();
      const newNodeDb = {
        id: `${id}`,
        name: safeName,
        content: "",
        alias: "",
        top: `${parent}`,
        left: "",
        sort
      }
      console.log("newNodeDb:", newNodeDb);
      await db.notes.insert(newNodeDb);
      await saveNode(newNodeDb);
      // 创建新节点的 markdown 文件, 把这两个合成一个方法
      addNote(newNodeDb);
      // 立即选中；节点先滑到位，视角再跟过去（保持当前缩放）
      setSelectedNode({ id: `${id}`, name: safeName });
      centerWhenRendered({ keepZoom: true, delayMs: NODE_SLIDE_MS + 60, durationMs: CREATE_ANIM_MS });
      if (allNotesNodeMap) {
        const displayRootId = focusNodeId === '1'
          ? notesData.find((n) => n.top === '0')?.id
          : focusNodeId;
        if (displayRootId) {
          const parentChain = computeAncestorChain(`${parent}`, displayRootId, allNotesNodeMap);
          useMindMapViewStore.getState().revealNodeIds(`${id}`, parentChain);
        }
      }
    },
    [allNotesNodeMap, focusNodeId, notesData, setSelectedNode, centerWhenRendered]
  );
  const saveNode = async (node) => {
    const yamlStr = { id: node.id, alias: "", title: node.name, left: node.left, top: node.top, sort: node.sort };
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
      setVisible(false);
      const safeName = name.replace(/\//g, '-');
      db.notes.update({ id: id }, { name: safeName });
      setNotesData(nds => nds.map(n => n.id === id ? { ...n, name: safeName } : n));
      // 修改文件名称
      const renameResult = await window.api.renameFile(`${id}-${orginName}.md`, `${id}-${safeName}.md`);
      if (handleFileError(renameResult)) return;

      const yamlResult = await window.api.updateYaml(`${id}-${safeName}.md`, { title: safeName });
      if (handleFileError(yamlResult)) return;

      // Sync selectedNode with updated name
      setSelectedNode({ id, name: safeName });
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

  // 居中辅助组件：通过 ref 暴露居中/可见性方法，供方向键导航与入口定位调用
  const CenterOnSelected = () => {
    const { setCenter, getNodes, getZoom, getViewport } = useReactFlow();

    useEffect(() => {
      // opts.nodeId：按指定节点居中（导航时选中状态可能尚未提交，不能依赖 selectedNode 闭包）
      centerOnSelectedRef.current = (opts = {}) => {
        const id = opts.nodeId ?? selectedNode?.id;
        if (!id) return false;
        const n = getNodes().find(nd => nd.id === id);
        if (!n) return false;
        // keepZoom：返回脑图时保持当前缩放，只平滑平移把选中节点带到画面中心
        const zoom = opts.keepZoom ? getZoom() : 1;
        setCenter(n.position.x + 80, n.position.y + 20, { zoom, duration: opts.durationMs ?? CENTER_ANIM_MS });
        return true;
      };

      isNodeVisibleRef.current = (id, margin = 80) => {
        const n = getNodes().find(nd => nd.id === id);
        const container = document.querySelector('.react-flow');
        if (!n || !container) return false;
        const rect = container.getBoundingClientRect();
        const { x, y, zoom } = getViewport();
        const width = n.measured?.width ?? n.width ?? 0;
        const height = n.measured?.height ?? n.height ?? 0;
        const cx = (n.position.x + width / 2) * zoom + x;
        const cy = (n.position.y + height / 2) * zoom + y;
        return cx >= margin && cx <= rect.width - margin
          && cy >= margin && cy <= rect.height - margin;
      };
    });

    return null;
  };

  // 从编辑器返回：定位在脑图可见之前完成。节点已可见则保持视角；离屏则零时长居中。
  const MapEntryCenter = ({ nodeId, onReady }) => {
    useEffect(() => {
      if (entryDoneRef.current) return undefined;
      if (!nodeId) {
        onReady();
        return undefined;
      }
      let raf;
      let tries = 0;
      const tick = () => {
        const refsReady = typeof centerOnSelectedRef.current === "function"
          && typeof isNodeVisibleRef.current === "function";
        if (refsReady) {
          const camera = resolveEntryCamera({
            hasSelection: true,
            isVisible: isNodeVisibleRef.current(nodeId, 8),
          });
          if (camera === "none") {
            onReady();
            return;
          }
          if (centerOnSelectedRef.current({ nodeId, keepZoom: true, durationMs: 0 })) {
            onReady();
            return;
          }
        }
        if (++tries < 30) {
          raf = requestAnimationFrame(tick);
          return;
        }
        onReady();
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [nodeId, onReady]);
    return null;
  };

  // 搜索选中后：等节点进入 ReactFlow 再 fitView 定位
  const RevealOnPending = () => {
    const { fitView } = useReactFlow();
    useEffect(() => {
      if (!pendingRevealNodeId) return;
      const node = nodes.find((n) => n.id === pendingRevealNodeId);
      if (node) {
        fitView({ nodes: [node], duration: 300 });
        setPendingRevealNodeId(null);
      }
    }, [pendingRevealNodeId, nodes, fitView]);
    return null;
  };

  const breadcrumbPath = useMemo(() => {
    if (!allNotesNodeMap || focusNodeId === '1') return null;
    const segments = [];
    let current = allNotesNodeMap.get(focusNodeId);
    const visited = new Set();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      segments.unshift({ id: current.id, name: current.name || t('mindMap.rootFallback') });
      if (current.top === '0' || !allNotesNodeMap.has(current.top)) break;
      current = allNotesNodeMap.get(current.top);
    }
    return segments;
  }, [focusNodeId, allNotesNodeMap, t]);

  const mapClass = !mapVisible
    ? undefined
    : mapAnim === "leave"
      ? "route-anim-map-out"
      : undefined;

  return (
    <div
      className={mapClass}
      style={{
        width: "90vw",
        height: "94vh",
        background: "var(--mm-canvas)",
        visibility: mapVisible ? "visible" : "hidden",
      }}
    >
      <ReactFlowProvider>
        <CenterOnSelected />
        <MapEntryCenter nodeId={selectedNode?.id} onReady={handleMapReady} />
        <RevealOnPending />
        <LayoutOnMeasured nodeSpacing={nodeSpacing} displayedNotes={displayedNotes} focusNodeId={focusNodeId} setNodes={setNodes} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '6px 12px', fontSize: 13,
          color: 'var(--text-secondary)', userSelect: 'none',
          flexWrap: 'wrap',
        }}>
          {focusNodeId === '1' ? (
            <span style={{ color: 'var(--text-primary)', fontWeight: 600, padding: '2px 6px' }}>
              {t('mindMap.rootFallback')}
            </span>
          ) : (
            breadcrumbPath?.map((seg, idx) => {
              const isLast = idx === breadcrumbPath.length - 1;
              return (
                <span key={seg.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {idx > 0 && <span style={{ opacity: 0.5, margin: '0 2px' }}>&gt;</span>}
                  {isLast ? (
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, padding: '2px 6px', borderRadius: 3 }}>
                      {seg.name}
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedNode({ id: seg.id, name: seg.name });
                        setFocusNodeId(seg.id);
                      }}
                      style={{
                        background: 'none', border: 'none', color: 'var(--link-color)',
                        cursor: 'pointer', fontSize: 13, padding: '2px 6px', borderRadius: 3,
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => { e.target.style.textDecoration = 'underline'; e.target.style.background = 'var(--bg-markdown)'; }}
                      onMouseLeave={(e) => { e.target.style.textDecoration = 'none'; e.target.style.background = 'none'; }}
                    >
                      {seg.name}
                    </button>
                  )}
                </span>
              );
            })
          )}
        </div>
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 120,
          display: 'flex',
          flexDirection: 'row',
          gap: 8,
          zIndex: 10,
        }}>
          <button
            onClick={() => {
              if (selectedNode) {
                setFocusNodeId(selectedNode.id);
                // 聚焦后整棵树会以该节点为重根重排，需把视口跟过去，否则节点会移出屏幕
                centerWhenRendered();
              }
            }}
            disabled={!selectedNode || selectedNode.id === focusNodeId}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--mm-card-bg)',
              color: (!selectedNode || selectedNode.id === focusNodeId) ? 'var(--text-secondary)' : 'var(--text-primary)',
              cursor: (!selectedNode || selectedNode.id === focusNodeId) ? 'default' : 'pointer',
              fontSize: 12,
              opacity: (!selectedNode || selectedNode.id === focusNodeId) ? 0.4 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {t("nodeMenu.focusMode")}
          </button>
          <button
            onClick={() => {
              setFocusNodeId("1");
              // 回到全局同理：重排后把视口跟到当前选中节点
              centerWhenRendered();
            }}
            disabled={focusNodeId === "1"}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--mm-card-bg)',
              color: focusNodeId === "1" ? 'var(--text-secondary)' : 'var(--text-primary)',
              cursor: focusNodeId === "1" ? 'default' : 'pointer',
              fontSize: 12,
              opacity: focusNodeId === "1" ? 0.4 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {t("nodeMenu.globalMode")}
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={memoNodeTypes}
          nodesConnectable={false}
          defaultEdgeOptions={{ type: 'smoothstep', selectable: false, style: { stroke: 'var(--mm-edge)', strokeWidth: 1.5 } }}
          defaultViewport={viewportCache || undefined}
          fitView={!viewportCache}
          onMoveEnd={(e, vp) => {
            // 只有脑图路由激活时才记录视口。离开脑图后，旧实例在真正卸载前
            // 仍会因容器重排继续发 onMoveEnd；若照单全收就会把错误视口写进
            // viewportCache，返回时 zoom 被逐次放大。
            const path = location.hash.slice(1) || "/";
            if (path !== "/") return;
            viewportCache = vp;
          }}
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
            if (leavingRef.current) return;
            if (lastClickRef.current === node.id) {
              if (clickTimerRef.current) {
                clearTimeout(clickTimerRef.current);
              }

              lastClickRef.current = null;

              // 双击进入编辑，设置 selectedNode 以便返回时居中
              openNodeWithTransition(node.id, node.data.name);
              return;
            }

            // 第一次点击
            lastClickRef.current = node.id;

            clickTimerRef.current = setTimeout(() => {
              setSelectedNode({
                id: node.id,
                name: node.data.name,
              });

              lastClickRef.current = null;
            }, 250);
          }}
          onPaneClick={() => {
            if (leavingRef.current) return;
            clearSelectedNode();
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="var(--mm-dot)" bgColor="var(--mm-canvas)" />
          <Controls />
        </ReactFlow>
        <NodeSearchDialog
          open={searchOpen}
          activeTab={searchTab}
          onActiveTabChange={setSearchTab}
          scopeNodeIds={
            focusNodeId !== '1' && allNotesNodeMap
              ? new Set(getDescendantIdsSync(focusNodeId, allNotesNodeMap))
              : undefined
          }
          onSelectNode={handleRevealNode}
          onOpenChange={(open) => {
            setSearchOpen(open);
            if (!open) {
              navigate('/');
            }
          }}
        />
        {moveSource && (
          <NodeSearchDialog
            open={!!moveSource}
            onOpenChange={(open) => {
              if (!open) setMoveSource(null);
            }}
            onSelectNode={(node) => executeMoveNode(node.id)}
          />
        )}
        {/* 选中时把 source 快照进 target：搜索关闭会立即清空 swapSource */}
        {swapSource && (
          <NodeSearchDialog
            open={!!swapSource}
            scopeNodeIds={swapScopeIds}
            autoSearchOnOpen
            onSearch={searchSwapSiblings}
            onOpenChange={(open) => {
              if (!open) setSwapSource(null);
            }}
            onSelectNode={(node) => setSwapTarget({ ...node, source: swapSource })}
          />
        )}
        <ConfirmDialog
          open={!!swapTarget}
          title={t("dialogs.swapNode.title")}
          message={swapTarget ? t("dialogs.swapNode.message", {
            source: swapTarget.source.name,
            target: swapTarget.name,
          }) : ""}
          onConfirm={executeSwap}
          onCancel={() => setSwapTarget(null)}
          onOpenChange={(open) => {
            if (!open) setSwapTarget(null);
          }}
        />
        <ContextMenu
          menu={menu}
          onClose={closeMenu}
          requestCreateNode={requestCreateNode}
          requestCreateSibling={requestCreateSibling}
          requestEditNode={requestEditNode}
          requestDeleteNode={requestDeleteNode}
          onRequestMoveNode={requestMoveNode}
          onRequestSwapNode={requestSwapNode}
          onRequestSetCategory={openColorPicker}
        />
        <ColorPalette
          picker={colorPicker}
          onPick={setNodeCategory}
          onClear={(id) => setNodeCategory(id, null)}
          onClose={closeColorPicker}
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
          isRootNode={deleteTarget?.isRoot || false}
          requiresChoice={deleteTarget?.requiresChoice ?? true}
          deleteMode={deleteMode}
          onDeleteEntireTree={() => {
            requestDeleteConfirmation("entire-tree");
          }}
          onDeleteParentOnly={() => {
            requestDeleteConfirmation("parent-only");
          }}
          onCancel={() => setDeleteTarget(null)}
        />
        <ConfirmDialog
          open={!!deleteConfirmation}
          title={t("dialogs.deleteNode.title")}
          message={deleteConfirmation ? t(
            deleteConfirmation.confirmation.translationKey,
            deleteConfirmation.confirmation.values,
          ) : ""}
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirmation(null)}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteConfirmation(null);
            }
          }}
        />
      </ReactFlowProvider>
    </div>
  );
}
