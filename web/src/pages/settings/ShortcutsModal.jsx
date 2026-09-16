import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";

const LOCKED_SHORTCUTS = ["backToMap"];

export default function ShortcutsModal({ open, onOpenChange }) {
  const { t } = useTranslation();
  const [shortcuts, setShortcuts] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [activeTab, setActiveTab] = useState("node");
  const [conflict, setConflict] = useState(null);

  // Load shortcuts from settings on mount
  useEffect(() => {
    loadShortcuts();
  }, []);

  // Listen for settings changes to update shortcuts
  useEffect(() => {
    if (!window.api?.onSettingsChanged) return undefined;
    return window.api.onSettingsChanged((newSettings) => {
      if (newSettings.shortcuts) {
        setShortcuts(newSettings.shortcuts);
      }
    });
  }, []);

  const loadShortcuts = async () => {
    const settings = await window.api.getSettings();
    setShortcuts(settings.shortcuts || null);
  };

  const handleSave = async () => {
    await window.api.saveSettings({ shortcuts });
    onOpenChange(false);
  };

  const handleReset = async () => {
    // 前端已不持有默认值：重置 = 清空存储的 shortcuts，electron 侧会与默认值深合并
    await window.api.saveSettings({ shortcuts: {} });
    await loadShortcuts();
  };

  const handleEditShortcut = (category, key) => {
    if (LOCKED_SHORTCUTS.includes(key)) return;
    setEditingKey(`${category}.${key}`);
  };

  // 查找与 value 冲突的其它绑定（跨 node / note / global 三类）
  const findConflict = (category, key, value) => {
    if (!value) return null;
    for (const cat of ["node", "note", "global"]) {
      for (const [k, v] of Object.entries(shortcuts?.[cat] || {})) {
        if (cat === category && k === key) continue;
        if (v === value) return { category: cat, key: k, locked: LOCKED_SHORTCUTS.includes(k) };
      }
    }
    return null;
  };

  const applyShortcut = (category, key, value) => {
    setShortcuts((prev) => ({
      ...prev,
      [category]: { ...prev[category], [key]: value },
    }));
  };

  const handleShortcutChange = (category, key, value) => {
    const other = findConflict(category, key, value);
    if (other) {
      // 交给冲突确认弹窗，先不写入
      setConflict({ category, key, value, other });
      return;
    }
    applyShortcut(category, key, value);
  };

  const confirmConflict = () => {
    if (!conflict) return;
    const { category, key, value, other } = conflict;
    // 锁定项不可被清空 —— 只提示，不分配
    if (!other.locked) {
      setShortcuts((prev) => ({
        ...prev,
        [other.category]: { ...prev[other.category], [other.key]: "" },
        [category]: { ...prev[category], [key]: value },
      }));
    }
    setConflict(null);
  };

  const handleKeyDown = (e, category, key) => {
    e.preventDefault();
    e.stopPropagation();

    // Skip modifier-only key presses
    if (e.key === "Control" || e.key === "Meta" || e.key === "Alt" || e.key === "Shift") return;

    if (e.key === "Enter") {
      setEditingKey(null);
    } else if (e.key === "Escape") {
      setEditingKey(null);
    } else {
      // Build shortcut string
      const parts = [];
      if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");

      const keyName =
        e.key === " " ? "Space" :
        e.key === "Escape" ? "Escape" :
        e.key === "Enter" ? "Enter" :
        e.key === "Delete" ? "Delete" :
        e.key === "Backspace" ? "Backspace" :
        /^F\d+$/.test(e.key) ? e.key :
        e.key.toUpperCase();

      parts.push(keyName);
      const shortcutStr = parts.join("+");

      handleShortcutChange(category, key, shortcutStr);
      setEditingKey(null);
    }
  };

  const renderShortcutValue = (category, key, value) => {
    if (LOCKED_SHORTCUTS.includes(key)) {
      // 锁定项也显示实际按键，否则看不出它绑的是什么
      return (
        <span style={{ color: "var(--text-secondary)" }}>
          {value} [{t("shortcuts.locked")}]
        </span>
      );
    }

    if (editingKey === `${category}.${key}`) {
      return (
        <input
          autoFocus
          style={{
            width: 100,
            padding: "4px 8px",
            border: "1px solid var(--link-color)",
            borderRadius: 4,
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
            fontSize: 13,
          }}
          value={value}
          onChange={(e) => applyShortcut(category, key, e.target.value)}
          onBlur={() => setEditingKey(null)}
          onKeyDown={(e) => handleKeyDown(e, category, key)}
        />
      );
    }

    return (
      <span
        style={{
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: 4,
          background: "var(--bg-secondary)",
          color: value ? "var(--text-primary)" : "var(--text-secondary)",
        }}
        onClick={() => handleEditShortcut(category, key)}
      >
        {value || t("shortcuts.unbound")}
      </span>
    );
  };

  const nodeLabels = {
    newNode: t("shortcuts.actions.newNode"),
    renameNode: t("shortcuts.actions.renameNode"),
    deleteNode: t("shortcuts.actions.deleteNode"),
  };

  const noteLabels = {
    bold: t("shortcuts.actions.bold"),
    italic: t("shortcuts.actions.italic"),
    heading1: t("shortcuts.actions.heading1"),
    heading2: t("shortcuts.actions.heading2"),
    extractNode: t("shortcuts.actions.extractNode"),
    find: t("shortcuts.actions.find"),
    replace: t("shortcuts.actions.replace"),
  };

  const globalLabels = {
    search: t("shortcuts.actions.search"),
    searchFullText: t("shortcuts.actions.searchFullText"),
    backToMap: t("shortcuts.actions.backToMap"),
  };

  const labelFor = (category, key) => {
    const maps = { node: nodeLabels, note: noteLabels, global: globalLabels };
    return maps[category]?.[key] || key;
  };

  if (!shortcuts) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 500 }}>
        <DialogHeader>
          <DialogTitle>{t("shortcuts.title")}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList style={{ width: "100%", marginBottom: 16 }}>
            <TabsTrigger value="node" style={{ flex: 1 }}>{t("shortcuts.tabs.node")}</TabsTrigger>
            <TabsTrigger value="note" style={{ flex: 1 }}>{t("shortcuts.tabs.note")}</TabsTrigger>
            <TabsTrigger value="global" style={{ flex: 1 }}>{t("shortcuts.tabs.global")}</TabsTrigger>
          </TabsList>

          <TabsContent value="node">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(shortcuts.node).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                  }}
                >
                  <span>{nodeLabels[key] || key}</span>
                  {renderShortcutValue("node", key, value)}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="global">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(shortcuts.global).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                  }}
                >
                  <span>{globalLabels[key] || key}</span>
                  {renderShortcutValue("global", key, value)}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="note">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(shortcuts.note).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                  }}
                >
                  <span>{noteLabels[key] || key}</span>
                  {renderShortcutValue("note", key, value)}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid var(--border)",
          }}
        >
          <Button variant="outline" onClick={handleReset}>
            {t("shortcuts.reset")}
          </Button>
          <Button onClick={handleSave}>{t("shortcuts.save")}</Button>
        </div>

        {conflict && (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setConflict(null); }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1100,
              padding: 20,
            }}
          >
            <div
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 24,
                maxWidth: 420,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "var(--text-primary)" }}>
                {t("shortcuts.conflict.title")}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20, color: "var(--text-primary)" }}>
                {t(
                  conflict.other.locked ? "shortcuts.conflict.lockedMessage" : "shortcuts.conflict.message",
                  {
                    key: conflict.value,
                    action: labelFor(conflict.other.category, conflict.other.key),
                  },
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <Button variant="outline" onClick={() => setConflict(null)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={confirmConflict}>{t("common.confirm")}</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
