import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import TipTapEditor from "../../core/editor/TipTapEditor";
import { useTranslation } from "react-i18next";
import { nanoid } from "nanoid";
import db from "../db/db";
import { buildChildNodeRecord } from "./extractionUtils";


const Note = ({ shortcuts }) => {
  const { t } = useTranslation();
  const { id, name } = useParams(); // 路由传入的文件名
  const [value, setValue] = useState("");
  const [yamlValue, setYamlValue] = useState("");
  const [fileName, setFileName] = useState("");
  const [ready, setReady] = useState(false);
  const [allNodes, setAllNodes] = useState([]);
  const navigate = useNavigate();

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
    return safeName;
  };

  const openNodeByName = (nodeName) => {
    const target = allNodes.find((node) => node.name === nodeName);
    if (!target) return;
    navigate(`/note/${target.id}/${target.name}`, { state: { fromNote: id } });
  };


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
          onCreateChildFromSelection={createChildFromSelection}
          onOpenNode={openNodeByName}
        />
      </div>

  );
};

export default Note;
