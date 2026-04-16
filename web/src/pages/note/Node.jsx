import { useParams } from "react-router-dom";
import { StrictMode, useEffect, useState } from "react";
import MarkdownEditor from "../../core/editor/MarkdownEditor";


const Note = () => {
  const { id, name } = useParams(); // 路由传入的文件名
  const [value, setValue] = useState("");
  const [yamlValue, setYamlValue] = useState("");
  const [fileName, setFileName] = useState("");
  const [ready, setReady] = useState(false);
  const [keys, setKeys] = useState([
    { key: "Mod-b", action: "bold" },
    { key: "Mod-i", action: "italic" },
  ]);

  useEffect(() => {
    if (!id) return;

    const loadFile = async () => {
      // 1. 获取 Electron userData 路径
      const fileName = `${id}-${name}.md`;
      console.log("fileName:", fileName)
      setFileName(fileName);

      // 2. 打开文件
      const { data: yamlData, content: markdownContent } = await window.api.openFile(fileName);
      console.log("yamlData:", yamlData);
      // const { data, content: markdownContent } = matter(content);
      setValue(markdownContent);
      setYamlValue(yamlData);
      setReady(true);
    }

    loadFile();
  }, [id, name]);

  const saveFile = async (content) => {
    console.log("saveFile content:", content);

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
        <MarkdownEditor content={value} onChange={saveFile} keyBindings={keys} />
      </div>

  );
};

export default Note;
