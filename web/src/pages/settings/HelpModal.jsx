import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const mindMapShortcuts = [
    ["Ctrl+N", t("help.shortcuts.actions.newChild")],
    ["F2", t("help.shortcuts.actions.rename")],
    ["Delete", t("help.shortcuts.actions.delete")],
    ["Ctrl+K", t("help.shortcuts.actions.search")],
    ["Escape", t("help.shortcuts.actions.clearOrClose")],
  ];
  const editorShortcuts = [
    ["Ctrl+B", t("help.shortcuts.actions.bold")],
    ["Ctrl+I", t("help.shortcuts.actions.italic")],
    ["Ctrl+1", t("help.shortcuts.actions.heading1")],
    ["Ctrl+2", t("help.shortcuts.actions.heading2")],
    ["Escape", t("help.shortcuts.actions.back")],
  ];
  const mouseActions = [
    [t("help.sections.mindMap"), t("help.mouse.select")],
    [t("help.sections.editor"), t("help.mouse.open")],
    [t("nodeMenu.create"), t("help.mouse.contextMenu")],
    [t("mindMap.rootFallback"), t("help.mouse.createRoot")],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 560, maxHeight: "80vh", overflow: "auto" }}>
        <DialogHeader>
          <DialogTitle>{t("help.title")}</DialogTitle>
        </DialogHeader>

        <div style={sectionTitle}>{t("help.sections.shortcuts")}</div>

        <div style={{ ...text, fontWeight: 600, marginBottom: 4 }}>{t("help.sections.mindMap")}</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>{t("help.columns.shortcut")}</th>
              <th style={thStyle}>{t("help.columns.action")}</th>
            </tr>
          </thead>
          <tbody>
            {mindMapShortcuts.map(([key, action], i, arr) => (
              <tr key={key}>
                <td style={tdStyle(i === arr.length - 1)}>{kbd(key)}</td>
                <td style={tdStyle(i === arr.length - 1)}>{action}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ ...text, fontWeight: 600, marginBottom: 4 }}>{t("help.sections.editor")}</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>{t("help.columns.shortcut")}</th>
              <th style={thStyle}>{t("help.columns.action")}</th>
            </tr>
          </thead>
          <tbody>
            {editorShortcuts.map(([key, action], i, arr) => (
              <tr key={key}>
                <td style={tdStyle(i === arr.length - 1)}>{kbd(key)}</td>
                <td style={tdStyle(i === arr.length - 1)}>{action}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ ...text, fontWeight: 600, marginBottom: 4 }}>{t("help.sections.mouse")}</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>{t("help.columns.action")}</th>
              <th style={thStyle}>{t("help.columns.result")}</th>
            </tr>
          </thead>
          <tbody>
            {mouseActions.map(([action, result], i, arr) => (
              <tr key={action}>
                <td style={tdStyle(i === arr.length - 1)}>{action}</td>
                <td style={tdStyle(i === arr.length - 1)}>{result}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={sectionTitle}>{t("help.sections.operations")}</div>

        <div style={text}>
          <strong>{t("help.operations.openTitle")}</strong> — {t("help.operations.openBody")}
        </div>
        <div style={text}>
          <strong>{t("help.operations.moveTitle")}</strong> — {t("help.operations.moveBody")}
        </div>
        <div style={text}>
          <strong>{t("help.operations.searchTitle")}</strong> — {t("help.operations.searchBody")}
        </div>
        <div style={text}>
          <strong>{t("help.operations.shortcutsTitle")}</strong> — {t("help.operations.shortcutsBody")}
        </div>
      </DialogContent>
    </Dialog>
  );
}
