import { Modal, Input } from "antd";
import { useEffect, useRef, useState } from "react";

export default function OpenPrompt({ visible, onOk, onCancel }) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);
   useEffect(() => {
    if (visible) setValue("");  // 每次打开都清空
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [visible]);

  return (
    <Modal
      title="请输入节点名称"
      open={visible}
      onOk={() => onOk(value)}
      onCancel={onCancel}
      footer={null}
    >
      <Input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onPressEnter={() => onOk(value)}
        placeholder="节点名称"
        autoFocus
        autoComplete="off" 
      />
    </Modal>
  );
}
