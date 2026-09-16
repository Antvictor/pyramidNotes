import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import TipTapEditor from "../../core/editor/TipTapEditor";
import BacklinkPanel from "./BacklinkPanel";
import { useTranslation } from "react-i18next";
import { nanoid } from "nanoid";
import db from "../db/db";
import { buildChildNodeRecord } from "./extractionUtils";
import { NodeSearchDialog } from "@/components/node-search";
import OpenPrompt from "../commons/OpenPrompt";
import { matchShortcut } from "../../hooks/useShortcuts";
import { computeAncestorChain } from "../treeUtils";
import { useMindMapViewStore } from "@/stores/mindMapViewStore";


// 是否有弹窗/浮层打开并在自行处理 Esc？用 DOM 判断，而不是 React state：
// 弹窗（Radix）会先于全局监听关闭自己并触发重渲染，此时读 state 会误得"没有弹窗"。
// 两类契约：
//   - 通用弹窗：role="dialog" + data-state="open"（Radix 自带）
//   - 自制浮层：data-esc-claim="true"（查找替换栏、抽成子节点弹窗）
const isAnyModalOpen = () =>
  !!document.querySelector('[role="dialog"][data-state="open"], [data-esc-claim="true"]');

const Note = ({ shortcuts }) => {
  const { t } = useTranslation();
  const { id, name } = useParams(); // 路由传入的文件名
  const [value, setValue] = useState("");
  const [yamlValue, setYamlValue] = useState("");
  const [fileName, setFileName] = useState("");
  const [ready, setReady] = useState(false);
  const [allNodes, setAllNodes] = useState([]);
  const [backlinks, setBacklinks] = useState([]);
  const [noteFontSize, setNoteFontSize] = useState(16);
  const [editorWidthMode, setEditorWidthMode] = useState('constrained');
  const [showBacklinks, setShowBacklinks] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTab, setSearchTab] = useState("node");
  const [newNodePromptVisible, setNewNodePromptVisible] = useState(false);

  // Build keyBindings from shortcuts
  const keyBindings = shortcuts?.note ? [
    { key: shortcuts.note.bold, action: "bold" },
    { key: shortcuts.note.italic, action: "italic" },
    { key: shortcuts.note.heading1, action: "heading1" },
    { key: shortcuts.note.heading2, action: "heading2" },
    { key: shortcuts.note.extractNode, action: "extractNode" },
    { key: shortcuts.note.find, action: "find" },
    { key: shortcuts.note.replace, action: "replace" },
  ] : [
    { key: "Ctrl+B", action: "bold" },
    { key: "Ctrl+I", action: "italic" },
    { key: "Ctrl+1", action: "heading1" },
    { key: "Ctrl+2", action: "heading2" },
    { key: "Ctrl+Shift+M", action: "extractNode" },
    { key: "Ctrl+F", action: "find" },
    { key: "Ctrl+R", action: "replace" },
  ];

  useEffect(() => {
    if (!id) return;

    const loadFile = async () => {
      setReady(false);
      // Load settings for font config
      const s = await window.api.getSettings();
      if (s.noteFontSize) {
        setNoteFontSize(s.noteFontSize);
      }
      if (s.editorWidthMode) {
        setEditorWidthMode(s.editorWidthMode);
      }
      if (s.showBacklinks !== undefined) {
        setShowBacklinks(s.showBacklinks);
      }
      // 1. 获取 Electron userData 路径
      const fileName = `${id}-${name}.md`;
      setFileName(fileName);

      // 2. 打开文件
      const { data: yamlData, content: markdownContent } = await window.api.openFile(fileName);
      // const { data, content: markdownContent } = matter(content);
      setValue(markdownContent);
      setYamlValue(yamlData);
      const nodes = await db.notes.select();
      setAllNodes(nodes || []);
      const backlinkRows = await db.notes.findBacklinks(id);
      setBacklinks(backlinkRows || []);
      setReady(true);
    }

    loadFile();
  }, [id, name]);

  // Listen for settings changes (e.g., note font size)
  useEffect(() => {
    if (!window.api?.onSettingsChanged) return;
    return window.api.onSettingsChanged((newSettings) => {
      if (newSettings.noteFontSize) {
        setNoteFontSize(newSettings.noteFontSize);
      }
      if (newSettings.editorWidthMode) {
        setEditorWidthMode(newSettings.editorWidthMode);
      }
      if (newSettings.showBacklinks !== undefined) {
        setShowBacklinks(newSettings.showBacklinks);
      }
    });
  }, []);

  const saveFile = async (content) => {
    if (fileName) {
      setValue(content);
      await window.api.saveFile(fileName, yamlValue, content, id);
      setAllNodes((nodes) => nodes.map((node) => (
        node.id === id ? { ...node, content } : node
      )));
    }
  }

  const createChildFromSelection = async (nodeName, content) => {
    const { safeName, childId, newNode, yamlStr } = buildChildNodeRecord({
      allNodes,
      parentId: id,
      nodeName,
      content,
      createId: () => nanoid(12),
    });
    await db.notes.insert(newNode);
    await window.api.saveFile(`${childId}-${safeName}.md`, yamlStr, content, childId);
    setAllNodes((nodes) => [...nodes, newNode]);
    // 揭示新节点：展开其父链，返回脑图时立即可见
    // （此处 allNodes 是插入前快照，只用来算父节点 id 的祖先链，父节点必在其中）
    const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
    const displayRootId = allNodes.find((n) => n.top === '0')?.id;
    if (displayRootId) {
      const parentChain = computeAncestorChain(id, displayRootId, nodeMap);
      useMindMapViewStore.getState().revealNodeIds(newNode.id, parentChain);
    }
    return newNode;
  };

  const openNode = (target, focusRefId) => {
    navigate(
      `/note/${encodeURIComponent(target.id)}/${encodeURIComponent(target.name)}`,
      { state: { fromNote: id, ...(focusRefId ? { focusRef: focusRefId } : {}) } },
    );
  };

  const handleSelectSearchResult = ({ id: targetId, name: targetName }) => {
    // 带上来源笔记（与引用跳转一致），这样 ESC 是返回来源笔记而不是 MindMap
    navigate(
      `/note/${encodeURIComponent(targetId)}/${encodeURIComponent(targetName)}`,
      { state: { fromNote: id } },
    );
  };

  const handleNewChild = async (nodeName) => {
    setNewNodePromptVisible(false);
    const newNode = await createChildFromSelection(nodeName, "");
    // reveal 已由 createChildFromSelection 统一负责
    navigate(
      `/note/${encodeURIComponent(newNode.id)}/${encodeURIComponent(newNode.name)}`,
      { state: { fromNote: id } },
    );
  };

  useEffect(() => {
    if (!shortcuts) return;
    const handler = (e) => {
      if (matchShortcut(e, shortcuts.global?.backToMap)) {
        e.preventDefault();
        // 有弹窗打开 → 让路，交给弹窗自己处理 Esc（通用弹窗与抽成子节点弹窗都带 role=dialog）。
        // 用 DOM 判断而非 state：弹窗会先于本监听（捕获阶段）关闭自己并重渲染，读 state 会误判。
        if (isAnyModalOpen()) return;
        // 兜底：不带 role=dialog 的旧弹窗，仍按各自 state 关闭
        if (searchOpen) { setSearchOpen(false); return; }
        if (newNodePromptVisible) { setNewNodePromptVisible(false); return; }
        if (location.state?.fromNote) {
          navigate(-1);
        } else {
          navigate('/');
        }
        return;
      }
      // Ctrl+K / Ctrl+Shift+K：未打开则按对应 tab 打开；已打开则切到该 tab。
      // 必须在下面的守卫之前，否则"已打开→切 tab"不会触发
      if (matchShortcut(e, shortcuts.global?.search)) {
        e.preventDefault();
        setSearchOpen(true);
        setSearchTab("node");
        return;
      }
      if (matchShortcut(e, shortcuts.global?.searchFullText)) {
        e.preventDefault();
        setSearchOpen(true);
        setSearchTab("fulltext");
        return;
      }
      if (searchOpen || newNodePromptVisible) return;
      if (matchShortcut(e, shortcuts.node?.newNode)) {
        e.preventDefault();
        setNewNodePromptVisible(true);
        return;
      }
    };
    // 用捕获阶段注册：必须在弹窗（Radix）自己处理 Esc 并关闭**之前**观察到"确实有弹窗打开"。
    // 若用冒泡阶段，弹窗会先关闭并触发重渲染，这里读到的两个 state 都是 false →
    // 误判为"没有弹窗"从而直接回退到上一层（实测日志证实）。
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [shortcuts, searchOpen, newNodePromptVisible, location.state, navigate]);

  return (
    // <StrictMode>
    //   <MilkdownProvider>
    //     <MilkdownEditor content={value} onChange={saveFile} />
    //   </MilkdownProvider>
    // </StrictMode>
    // <Markdown content={value} onChange={saveFile} />
    !ready ?
      <div>{t("editor.loading")}</div> :
      <div style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden" }}>
        <div style={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          overflow: "hidden" }}>
          <TipTapEditor
            content={value}
            onChange={saveFile}
            keyBindings={keyBindings}
            nodes={allNodes}
            noteName={name}
            noteId={id}
            noteFontSize={noteFontSize}
            editorWidthMode={editorWidthMode}
            onCreateChildFromSelection={createChildFromSelection}
            onOpenNode={openNode}
            focusRefId={location.state?.focusRef}
          />
        </div>
        {showBacklinks && (
          <BacklinkPanel backlinks={backlinks} onOpenNode={(note) => openNode(note, id)} />
        )}
        <NodeSearchDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
          activeTab={searchTab}
          onActiveTabChange={setSearchTab}
          onSelectNode={handleSelectSearchResult}
        />
        <OpenPrompt
          visible={newNodePromptVisible}
          id={id}
          title=""
          onOk={(parentId, nodeName) => handleNewChild(nodeName)}
          onCancel={() => setNewNodePromptVisible(false)}
        />
      </div>

  );
};

export default Note;
