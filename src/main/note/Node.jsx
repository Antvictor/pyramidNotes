import { useParams } from "react-router-dom";
import noteData from "../../assets/data/data.json";


import Markdown from "./Markdown";
import { useState } from "react";

const Note = () => {
  const { id } = useParams();
  const note = noteData.find((n) => n.id === id);
  const [value, setValue] = useState(note);
  return (
      <Markdown content={value.markdown} onChange={(markdown) => console.log("实时内容：", markdown)}/>
  );
};
export default Note;
