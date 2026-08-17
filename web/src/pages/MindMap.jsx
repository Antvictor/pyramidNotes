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
import db from "./db/db"
import { computeAncestorChain } from "./treeUtils";
import { useMindMapViewStore } from "@/stores/mindMapViewStore";
import ContextMenu from "./note/ContextMenu/ContextMenu";
import OpenPrompt from "./commons/OpenPrompt";
import { PermissionDialog } from "@/components/ui/permission-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DeleteNodeDialog } from "@/components/ui/delete-node-dialog";
import { buildDeleteConfirmation, buildDeleteRequest } from "./deleteNodeRequest";
import { nanoid } from "nanoid";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

// 数据文件
// import notesData from "../assets/data/data.json";

const nodeTypes = { custom: NodeCustom };

const SPACING_PRESETS = {
  compact:  { gapBase: 60, hGap: 60 },
  normal:   { gapBase: 80, hGap: 70 },
  loose:    { gapBase: 100, hGap: 80 },
};

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
function layoutTree(nodes, rootId, startX, startY, nodeSizes, spacingPreset) {
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
    const nodeMaxWidth = 100, padX = 16, padY = 16;
    const charsPerLine = Math.max(1, Math.floor((nodeMaxWidth - padX) / 8));
    const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
    return {
      width: Math.max(30, Math.min(220, 30 + text.length * 8)),
      height: padY + 24 * lines,
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

function computeDepths(rootId, nodeMap) {
  const depths = new Map();
  function dfs(nodeId, depth) {
    depths.set(nodeId, depth);
    const node = nodeMap.get(nodeId);
    if (node?.children) {
      for (const child of node.children) dfs(child.id, depth + 1);
    }
  }
  if (nodeMap.has(rootId)) dfs(rootId, 0);
  return depths;
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

    const doLayout = () => {
      const currentNodes = getNodes();
      const nodeSizes = new Map();
      currentNodes.forEach(n => {
        if (n.measured?.width && n.measured?.height) {
          nodeSizes.set(n.id, { width: n.measured.width, height: n.measured.height });
        }
      });

      // 等待所有节点都测量完毕
      if (nodeSizes.size < currentNodes.length && retryRef.current < 5) {
        retryRef.current++;
        timer = setTimeout(doLayout, 150);
        return;
      }
      retryRef.current = 0;

      if (nodeSizes.size === 0) return;

      const rootId = focusNodeId !== "1"
        ? focusNodeId
        : displayedNotes.find(n => n.top === "0")?.id;
      if (!rootId) return;

      const preset = SPACING_PRESETS[nodeSpacing] || SPACING_PRESETS.normal;
      const posMap = layoutTree(displayedNotes, rootId, 50, 50, nodeSizes, preset);

      setNodes(nds => nds.map(n => ({
        ...n,
        position: posMap.get(n.id) || n.position
      })));
    };

    let timer = setTimeout(doLayout, 200);

    return () => clearTimeout(timer);
  }, [nodesInitialized, nodeSpacing, focusNodeId, displayedNotes]);

  return null;
}

function matchKey(shortcutStr, e) {
  if (!shortcutStr) return false;
  const isMod = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;
  const parts = shortcutStr.split('+');
  const modifiers = parts.slice(0, -1);
  const key = parts[parts.length - 1];
  const needsCtrl = modifiers.includes('Ctrl');
  const needsShift = modifiers.includes('Shift');
  const modStateMatch =
    (needsCtrl === isMod) &&
    (needsShift === isShift);
  const keyMatch =
    key === 'Escape' ? e.key === 'Escape' :
    key === 'Delete' ? e.key === 'Delete' :
    key === 'Enter' ? e.key === 'Enter' :
    key === 'Backspace' ? e.key === 'Backspace' :
    /^F\d+$/.test(key) ? e.key === key :
    e.key.toLowerCase() === key.toLowerCase();
  return keyMatch && modStateMatch;
}

export default function MindMap({ selectedNode, setSelectedNode, clearSelectedNode, shortcuts }) {
  const { t } = useTranslation();
  // const flowWrapperRef = useRef(null);
  // 查询sqlite中的节点数据
  const [notesData, setNotesData] = useState(null);
  const [visible, setVisible] = useState(false);
  const [nodeAction, setNodeAction] = useState();
  const [nodeId, setNodeId] = useState();
  const [title, setTitle] = useState();
  const [searchOpen, setSearchOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [moveSource, setMoveSource] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const [searchParams] = useSearchParams();
  const [nodeSpacing, setNodeSpacing] = useState('normal');
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

  const expandOneLevel = useCallback((nodeId) => {
    if (!allNotesNodeMap) return;
    const node = allNotesNodeMap.get(nodeId);
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
  }, [allNotesNodeMap, setSelectedNode]);

  const expandAll = useCallback((nodeId) => {
    if (!allNotesNodeMap) return;
    const node = allNotesNodeMap.get(nodeId);
    const descIds = getDescendantIdsSync(nodeId, allNotesNodeMap);
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
  }, [allNotesNodeMap, setSelectedNode]);

  const collapseNode = useCallback((nodeId) => {
    if (!allNotesNodeMap) return;
    const node = allNotesNodeMap.get(nodeId);
    const descIds = getDescendantIdsSync(nodeId, allNotesNodeMap);
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
  }, [allNotesNodeMap, setSelectedNode]);

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

    const poolMap = new Map();
    pool.forEach(n => poolMap.set(n.id, { ...n, children: [] }));
    pool.forEach(n => {
      if (n.top && n.top !== '0') {
        const parent = poolMap.get(n.top);
        if (parent) parent.children.push(poolMap.get(n.id));
      }
    });

    const depthMap = computeDepths(effectiveRootId, poolMap);
    const ids = new Set();
    for (const [id, depth] of depthMap) {
      if (depth <= 2) ids.add(id);
    }

    setInitializedFocusId(focusNodeId);
    setLoadedNodeIds(ids);
    setExpandedNodeIds(new Set());
  }, [allNotesNodeMap, focusNodeId, initializedFocusId, notesData]);

  const clickTimerRef = useRef(null);
  const lastClickRef = useRef(null);
  const creatingRootRef = useRef(false);

  // 节点快捷键处理
  useEffect(() => {
    if (!shortcuts) return;
    const handler = (e) => {
      if (!shortcuts) return;
      if (visible || searchOpen || moveSource) return;
      // Ctrl+K - 搜索 (no selection required)
      if (matchKey(shortcuts.global?.search, e)) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      // Ctrl+N - 新建节点 (no guard needed - works without selection)
      if (matchKey(shortcuts.node?.newNode, e)) {
        e.preventDefault();
        requestCreateNode(selectedNode?.id || focusNodeId);
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
  }, [shortcuts, selectedNode, visible, searchOpen, moveSource]);

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

  // 删除整个子树
  const deleteEntireTree = async (id) => {
    const allIds = await getAllDescendantIds(id);

    // 先删除所有相关文件
    for (const nodeId of allIds) {
      const node = (await db.notes.select({ id: nodeId }))[0];
      if (node) {
        const result = window.api.deleteFile(`${nodeId}-${node.name}.md`);
        if (handleFileError(result)) return;
      }
    }

    // 从数据库中删除所有记录
    for (const nodeId of allIds) {
      await db.notes.delete({ "id": nodeId });
    }

    // DB 操作全部完成后再更新 UI
    setNotesData(nds => nds.filter(n => !allIds.includes(n.id)));
    setEdges(eds => eds.filter(e => !allIds.includes(e.source) && !allIds.includes(e.target)));
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
      await deleteEntireTree(deleteConfirmation.id, deleteConfirmation.name);
    } else {
      const grandParentId = deleteConfirmation.grandParentId;
      promoteChildren(deleteConfirmation.id, grandParentId);
      _internalDeleteNode(deleteConfirmation.id, deleteConfirmation.name);
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

  // Request edit node - unified entry point
  const requestEditNode = (nodeId, nodeName) => {
    _internalUpdateNode(nodeId, nodeName);
  };

  // Request move node - opens search dialog
  const requestMoveNode = (nodeId, nodeName) => {
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

    await db.notes.update({ id: moveSource.id }, { top: targetId });
    await window.api.updateYaml(`${moveSource.id}-${moveSource.name}.md`, { top: targetId });

    const res = await db.notes.select();
    setNotesData(res);
    setSelectedNode({ id: moveSource.id, name: moveSource.name });
    setMoveSource(null);
  };

  useEffect(() => {
    if (window.api?.getSettings) {
      window.api.getSettings().then((s) => {
        if (s?.nodeSpacing) setNodeSpacing(s.nodeSpacing);
      });
    }
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
    if (!window.api?.onSettingsChanged) return undefined;
    return window.api.onSettingsChanged((newSettings) => {
      if (newSettings.nodeSpacing) {
        setNodeSpacing(newSettings.nodeSpacing);
      }
      if (newSettings.storagePath) {
        console.log("Settings changed, reloading notes for storagePath:", newSettings.storagePath);
        db.notes.select().then((res) => {
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

    // loadedNodeIds 为空时（初始加载中），先跳过过滤，等 useEffect 填充
    if (loadedNodeIds.size === 0) return pool;

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
      const dbHasRoot = notesData?.some(n => n.top === "0");
      if (dbHasRoot) return;
      creatingRootRef.current = true;
      const newRoot = {
        id: "1",
        name: "root",
        content: "",
        alias: "",
        top: "0",
        left: "0"
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
    const posMap = layoutTree(displayedNotes, rootId, 50, 50, null, preset);

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

    const initNodes = displayedNotes.map((n) => ({
      id: n.id,
      type: "custom",
      data: {
        name: n.name,
        label: n.name,
        ...n,
        descendantCount: descCountMap.get(n.id) || 0,
        hasHiddenChildren: hiddenChildrenMap.get(n.id) || false,
        isExpanded: expandedNodeIds.has(n.id),
        onExpandOneLevel: expandOneLevel,
        onExpandAll: expandAll,
        onCollapseNode: collapseNode,
      },
      position: posMap.get(n.id) || { x: Math.random() * 400, y: Math.random() * 400 },
    }));

    const displayedIdsEdge = new Set(displayedNotes.map(n => n.id));
    const initEdges = [];
    (displayedNotes || []).forEach((e) => {
      if (e.top && e.top !== "0" && displayedIdsEdge.has(e.top)) {
        initEdges.push({
          id: `e${e.top}-${e.id}`,
          source: e.top,
          sourceHandle: "bottom",
          target: e.id,
          targetHandle: "top",
          style: { stroke: 'var(--link-color)', strokeWidth: 2 },
        });
      };
      if (e.left && displayedIdsEdge.has(e.left)) {
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
  }, [displayedNotes, setEdges, setNodes, allNotesNodeMap, loadedNodeIds, expandedNodeIds, expandOneLevel, expandAll, collapseNode]);

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
    nodeId: focusNodeId,
    title: ""
  });

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

  // 右键节点
  const onNodeContextMenu = useCallback((e, node) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu(prev => {
      if (prev.show && prev.type === 'node' && prev.nodeId === node.id) {
        return prev; // 已在显示，不重复触发
      }
      return {
        show: true,
        x: e.clientX,
        y: e.clientY,
        type: "node",
        nodeId: node.id,
        title: node.data.name,
        isRoot: node.data.top === "0"
      };
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
      setVisible(false);
      const safeName = name.replace(/\//g, '-');
      const id = nanoid(12);
      const newNodeDb = {
        id: `${id}`,
        name: safeName,
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
    [allNotesNodeMap, focusNodeId, notesData]
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

  // ESC 返回时居中选中节点
  const CenterOnSelected = () => {
    const { setCenter, getNodes } = useReactFlow();
    useEffect(() => {
      if (selectedNode) {
        const n = getNodes().find(nd => nd.id === selectedNode.id);
        if (n) setCenter(n.position.x + 80, n.position.y + 20, { zoom: 1, duration: 300 });
      }
    }, [selectedNode]);
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

  return (
    <div
      style={{
        width: "90vw",
        height: "94vh",
        background: "var(--background)",
      }}
    >
      <ReactFlowProvider>
        <CenterOnSelected />
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
              }
            }}
            disabled={!selectedNode || selectedNode.id === focusNodeId}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
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
            onClick={() => setFocusNodeId("1")}
            disabled={focusNodeId === "1"}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
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

              // 双击进入编辑，设置 selectedNode 以便返回时居中
              setSelectedNode({ id: node.id, name: node.data.name });
              navigate(`/note/${node.id}/${node.data.name}`);
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
            clearSelectedNode();
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
        </ReactFlow>
        <NodeSearchDialog
          open={searchOpen}
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
        <ContextMenu
          menu={menu}
          onClose={closeMenu}
          requestCreateNode={requestCreateNode}
          requestEditNode={requestEditNode}
          requestDeleteNode={requestDeleteNode}
          onRequestMoveNode={requestMoveNode}
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
