import { useParams } from "react-router-dom";
import noteData from "../../assets/data/data.json";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { useState } from "react";

const Note = () => {
  const { id } = useParams();
  const note = noteData.find((n) => n.id === id);
  const [value, setValue] = useState(note);
  return (
    <div>
      <CodeMirror
        value={value}
        height="600px"
        extensions={[markdown()]}
        theme={oneDark}
        onChange={(val) => {
          setValue(val);
        }}
      />
    </div>
  );
};
export default Note;
