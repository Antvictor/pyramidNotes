import { Modal, Input } from "antd";
import { useEffect, useRef, useState } from "react";

export default function OpenPrompt({ visible,id,title, onOk, onCancel }) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);
   useEffect(() => {
    setValue(title)
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [visible, title]);

  return (
    <Modal
      title="请输入节点名称"
      open={visible}
      onOk={() => onOk(id,value)}
      onCancel={onCancel}
      footer={null}
    >
      <Input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onPressEnter={() => onOk(id,value,title)}
        placeholder="节点名称"
        autoFocus
        autoComplete="off" 
      />
    </Modal>
  );
}
