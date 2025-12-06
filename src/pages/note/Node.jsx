import { useParams } from "react-router-dom";
import { StrictMode, useEffect, useState } from "react";
import Markdown from "./Markdown"; // 你自己的 Markdown 渲染组件


const Note = () => {
  const { id } = useParams(); // 路由传入的文件名
  const [value, setValue] = useState("");
  const [filePath, setFilePath] = useState("");

  useEffect(() => {
    if (!id) return;

    const loadFile = async () => {
      // 1. 获取 Electron userData 路径
      const basePath = await window.api.getPath();
      const path = `${basePath}/${id}.md`;
      console.log("path:", path)
      setFilePath(path);

      // 2. 打开文件
      const content = await window.api.openFile(path);
      setValue(content);
    }

    loadFile();
  }, [id]);

  const saveFile = async (content) => {
    console.log("saveFile content:", content);
    if (filePath) {
      await window.api.saveFile(filePath, content);
    }
  }

  return (
    // <StrictMode>
    //   <MilkdownProvider>
    //     <MilkdownEditor content={value} onChange={saveFile} />
    //   </MilkdownProvider>
    // </StrictMode>
    <Markdown content={value} onChange={saveFile} />
  );
};

export default Note;
