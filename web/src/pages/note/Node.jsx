import { useParams, useNavigate } from "react-router-dom";
import { StrictMode, useEffect, useState, useCallback } from "react";
import TipTapEditor from "../../core/editor/TipTapEditor";


const Note = ({ shortcuts }) => {
  const { id, name } = useParams(); // 路由传入的文件名
  const [value, setValue] = useState("");
  const [yamlValue, setYamlValue] = useState("");
  const [fileName, setFileName] = useState("");
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  // Build keyBindings from shortcuts
  const keyBindings = shortcuts?.note ? [
    { key: shortcuts.note.bold, action: "bold" },
    { key: shortcuts.note.italic, action: "italic" },
    { key: shortcuts.note.heading1, action: "heading1" },
    { key: shortcuts.note.heading2, action: "heading2" },
  ] : [
    { key: "Mod-b", action: "bold" },
    { key: "Mod-i", action: "italic" },
  ];

  // Handle Escape key to return to MindMap
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        navigate('/');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  useEffect(() => {
    if (!id) return;

    const loadFile = async () => {
      // 1. 获取 Electron userData 路径
      const fileName = `${id}-${name}.md`;
      setFileName(fileName);

      // 2. 打开文件
      const { data: yamlData, content: markdownContent } = await window.api.openFile(fileName);
      // const { data, content: markdownContent } = matter(content);
      setValue(markdownContent);
      setYamlValue(yamlData);
      setReady(true);
    }

    loadFile();
  }, [id, name]);

  const saveFile = async (content) => {
    if (fileName) {
      await window.api.saveFile(fileName, yamlValue, content, id);
    }
  }


  return (
    // <StrictMode>
    //   <MilkdownProvider>
    //     <MilkdownEditor content={value} onChange={saveFile} />
    //   </MilkdownProvider>
    // </StrictMode>
    // <Markdown content={value} onChange={saveFile} />
    !ready ?
      <div>loading...</div> :
      <div style={{
        width: "90vw",
        height: "94vh", }}>
        <TipTapEditor content={value} onChange={saveFile} keyBindings={keyBindings} />
      </div>

  );
};

export default Note;
