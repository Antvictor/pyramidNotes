import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import DocEditor from "@/components/doc-editor";
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/react';

const Note = () => {
  const { id, name } = useParams();
  const [value, setValue] = useState("");
  const [yamlValue, setYamlValue] = useState("");
  const [fileName, setFileName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadFile = async () => {
      const fileName = `${id}-${name}.md`;
      console.log("fileName:", fileName);
      setFileName(fileName);

      const { data: yamlData, content: markdownContent } =
        await window.api.openFile(fileName);
      console.log("yamlData:", yamlData);
      setValue(markdownContent);
      setYamlValue(yamlData);
      setReady(true);
    };

    loadFile();
  }, [id, name]);

  const saveFile = async (content) => {
    console.log("saveFile content:", content);

    if (fileName) {
      await window.api.saveFile(fileName, yamlValue, content, id);
    }
  };

  if (!ready) {
    return <div>loading...</div>;
  }

  return (
    <div className="mx-8 pt-24 pb-10 md:mx-24 md:pb-24 lg:mx-40 xl:mx-80 2xl:mx-auto 2xl:max-w-4xl">
      <ProsemirrorAdapterProvider>
        <DocEditor  content={value} />
      </ProsemirrorAdapterProvider>
    </div>
  );
};

export default Note;
