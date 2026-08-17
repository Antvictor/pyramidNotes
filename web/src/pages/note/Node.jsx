import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import TipTapEditor from "../../core/editor/TipTapEditor";
import { useTranslation } from "react-i18next";
import { nanoid } from "nanoid";
import db from "../db/db";
import { buildChildNodeRecord } from "./extractionUtils";
import { NodeSearchDialog } from "@/components/node-search";
import OpenPrompt from "../commons/OpenPrompt";
import { matchShortcut } from "../../hooks/useShortcuts";
import { computeAncestorChain } from "../treeUtils";
import { useMindMapViewStore } from "@/stores/mindMapViewStore";


const Note = ({ shortcuts }) => {
  const { t } = useTranslation();
  const { id, name } = useParams(); // 路由传入的文件名
  const [value, setValue] = useState("");
  const [yamlValue, setYamlValue] = useState("");
  const [fileName, setFileName] = useState("");
  const [ready, setReady] = useState(false);
  const [allNodes, setAllNodes] = useState([]);
  const [noteFontSize, setNoteFontSize] = useState(16);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [newNodePromptVisible, setNewNodePromptVisible] = useState(false);

  // Build keyBindings from shortcuts
  const keyBindings = shortcuts?.note ? [
    { key: shortcuts.note.bold, action: "bold" },
    { key: shortcuts.note.italic, action: "italic" },
    { key: shortcuts.note.heading1, action: "heading1" },
    { key: shortcuts.note.heading2, action: "heading2" },
    { key: shortcuts.note.extractNode || "Ctrl+Shift+M", action: "extractNode" },
  ] : [
    { key: "Ctrl+B", action: "bold" },
    { key: "Ctrl+I", action: "italic" },
    { key: "Ctrl+1", action: "heading1" },
    { key: "Ctrl+2", action: "heading2" },
    { key: "Ctrl+Shift+M", action: "extractNode" },
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
    return newNode;
  };

  const openNode = (target) => {
    navigate(
      `/note/${encodeURIComponent(target.id)}/${encodeURIComponent(target.name)}`,
      { state: { fromNote: id } },
    );
  };

  const handleSelectSearchResult = ({ id: targetId, name: targetName }) => {
    navigate(`/note/${encodeURIComponent(targetId)}/${encodeURIComponent(targetName)}`);
  };

  const handleNewChild = async (nodeName) => {
    setNewNodePromptVisible(false);
    const newNode = await createChildFromSelection(nodeName, "");
    const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
    const displayRootId = allNodes.find((n) => n.top === '0')?.id;
    if (displayRootId) {
      const parentChain = computeAncestorChain(id, displayRootId, nodeMap);
      useMindMapViewStore.getState().revealNodeIds(newNode.id, parentChain);
    }
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
        if (searchOpen) { setSearchOpen(false); return; }
        if (newNodePromptVisible) { setNewNodePromptVisible(false); return; }
        if (location.state?.fromNote) {
          navigate(-1);
        } else {
          navigate('/');
        }
        return;
      }
      if (searchOpen || newNodePromptVisible) return;
      if (matchShortcut(e, shortcuts.global?.search)) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (matchShortcut(e, shortcuts.node?.newNode)) {
        e.preventDefault();
        setNewNodePromptVisible(true);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
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
        width: "90vw",
        height: "94vh",
        overflow: "hidden" }}>
        <TipTapEditor
          content={value}
          onChange={saveFile}
          keyBindings={keyBindings}
          nodes={allNodes}
          noteName={name}
          noteId={id}
          noteFontSize={noteFontSize}
          onCreateChildFromSelection={createChildFromSelection}
          onOpenNode={openNode}
        />
        <NodeSearchDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
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
