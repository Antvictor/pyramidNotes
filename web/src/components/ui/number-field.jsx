import { useEffect, useState } from "react";

// 受控数字输入：编辑期只改本地字符串，失焦 / 回车才解析、夹取范围并提交。
// 修复原 bug：清空时 parseInt("") 为 NaN，`NaN || fallback` 会立刻跳回默认值，
// 导致「想改成 7 天，得先输 7 再删掉前面的 3」。
export default function NumberField({ value, min, max, fallback, onCommit, style, ...rest }) {
  const [draft, setDraft] = useState(String(value ?? fallback));

  // 外部值变化时同步（例如设置被其它入口改动）
  useEffect(() => {
    setDraft(String(value ?? fallback));
  }, [value, fallback]);

  const commit = () => {
    const n = parseInt(draft, 10);
    // 非法（空 / 非数字）→ 回到原值，而不是默认值
    const clamped = Number.isNaN(n)
      ? (value ?? fallback)
      : Math.max(min, max === undefined ? n : Math.min(max, n));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      style={style}
      {...rest}
    />
  );
}
