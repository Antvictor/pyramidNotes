import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const kbd = (text) => (
  <code style={{
    background: "var(--bg-secondary)",
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "inherit",
  }}>{text}</code>
);

const sectionTitle = {
  fontSize: 15,
  fontWeight: 600,
  marginTop: 20,
  marginBottom: 8,
  color: "var(--text-primary)",
};

const text = {
  fontSize: 13,
  color: "var(--text-secondary)",
  lineHeight: 1.8,
  marginBottom: 8,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  marginBottom: 16,
};

const thStyle = {
  textAlign: "left",
  padding: "6px 10px",
  borderBottom: "2px solid var(--border)",
  color: "var(--text-primary)",
  fontSize: 13,
};

const tdStyle = (last) => ({
  padding: "6px 10px",
  borderBottom: last ? "none" : "1px solid var(--border)",
  color: "var(--text-secondary)",
  fontSize: 13,
});

export default function HelpModal({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 560, maxHeight: "80vh", overflow: "auto" }}>
        <DialogHeader>
          <DialogTitle>使用说明</DialogTitle>
        </DialogHeader>

        <div style={sectionTitle}>快捷键</div>

        <div style={{ ...text, fontWeight: 600, marginBottom: 4 }}>思维导图</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>快捷键</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Ctrl+N", "新建子节点"],
              ["F2", "重命名选中节点"],
              ["Delete", "删除选中节点"],
              ["Ctrl+K", "打开搜索"],
              ["Escape", "取消选中 / 关闭搜索"],
            ].map(([key, action], i, arr) => (
              <tr key={key}>
                <td style={tdStyle(i === arr.length - 1)}>{kbd(key)}</td>
                <td style={tdStyle(i === arr.length - 1)}>{action}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ ...text, fontWeight: 600, marginBottom: 4 }}>编辑器</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>快捷键</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Ctrl+B", "加粗"],
              ["Ctrl+I", "斜体"],
              ["Ctrl+1", "一级标题"],
              ["Ctrl+2", "二级标题"],
              ["Escape", "返回思维导图"],
            ].map(([key, action], i, arr) => (
              <tr key={key}>
                <td style={tdStyle(i === arr.length - 1)}>{kbd(key)}</td>
                <td style={tdStyle(i === arr.length - 1)}>{action}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ ...text, fontWeight: 600, marginBottom: 4 }}>鼠标</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>操作</th>
              <th style={thStyle}>效果</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["单击节点", "选中节点"],
              ["双击节点", "进入编辑器"],
              ["右键节点", "弹出菜单（创建 / 重命名 / 移动 / 删除）"],
              ["右键空白", "创建根级节点"],
            ].map(([action, result], i, arr) => (
              <tr key={action}>
                <td style={tdStyle(i === arr.length - 1)}>{action}</td>
                <td style={tdStyle(i === arr.length - 1)}>{result}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={sectionTitle}>操作指南</div>

        <div style={text}>
          <strong>打开笔记</strong> — 双击思维导图中的节点进入编辑器，按 {kbd("Escape")} 返回。
        </div>
        <div style={text}>
          <strong>移动节点</strong> — 右键节点 → 选择"📦 移动节点" → 搜索目标父节点 → 选中确认。节点及其子节点将整体移动。
        </div>
        <div style={text}>
          <strong>搜索</strong> — 按 {kbd("Ctrl+K")} 打开搜索框，支持两种模式：<strong>节点搜索</strong>（按名称查找）和 <strong>全文搜索</strong>（搜索笔记内容）。
        </div>
        <div style={text}>
          <strong>自定义快捷键</strong> — 设置 → 快捷键 → 点击任意快捷键即可重新绑定。
        </div>
      </DialogContent>
    </Dialog>
  );
}
