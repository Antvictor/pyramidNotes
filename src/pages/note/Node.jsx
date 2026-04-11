import { useParams } from "react-router-dom";
import { StrictMode, useEffect, useState } from "react";
import matter from 'gray-matter';
import yaml from 'yaml';
import Markdown from "./Markdown"; // 你自己的 Markdown 渲染组件


const Note = () => {
  const { id,name } = useParams(); // 路由传入的文件名
  const [value, setValue] = useState("");
  const [yamlValue, setYamlValue] = useState("");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (!id) return;

    const loadFile = async () => {
      // 1. 获取 Electron userData 路径
      const fileName = `${id}-${name}.md`;
      console.log("fileName:", fileName)
      setFileName(fileName);

      // 2. 打开文件
      const content = await window.api.openFile(fileName);
      const { data, content: markdownContent } = matter(content);
      setValue(markdownContent);
      setYamlValue(data);
    }

    loadFile();
  }, [id]);

  const saveFile = async (content) => {
    console.log("saveFile content:", content);

    if (fileName) {
      await window.api.saveFile(fileName, buildMarkdown(yamlValue, content), id);
    }
  }

  const  buildMarkdown = (data, content) => {
    const yamlStr = yaml.stringify(data);
    return `---\n${yamlStr}---\n\n${content}`;
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
