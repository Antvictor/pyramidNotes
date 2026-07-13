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

const DEFAULT_SHORTCUTS = {
  node: {
    newNode: "Ctrl+N",
    renameNode: "F2",
    deleteNode: "Delete",
  },
  note: {
    bold: "Ctrl+B",
    italic: "Ctrl+I",
    heading1: "Ctrl+1",
    heading2: "Ctrl+2",
    extractNode: "Ctrl+Shift+M",
  },
  global: {
    search: "Ctrl+K",
    backToMap: "Escape",
  },
};

const LOCKED_SHORTCUTS = ["backToMap"];

function mergeShortcutsWithDefaults(shortcuts) {
  return {
    node: { ...DEFAULT_SHORTCUTS.node, ...(shortcuts?.node || {}) },
    note: { ...DEFAULT_SHORTCUTS.note, ...(shortcuts?.note || {}) },
    global: { ...DEFAULT_SHORTCUTS.global, ...(shortcuts?.global || {}) },
  };
}

export default function ShortcutsModal({ open, onOpenChange }) {
  const { t } = useTranslation();
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);
  const [editingKey, setEditingKey] = useState(null);
  const [activeTab, setActiveTab] = useState("node");

  // Load shortcuts from settings on mount
  useEffect(() => {
    loadShortcuts();
  }, []);

  // Listen for settings changes to update shortcuts
  useEffect(() => {
    if (!window.api?.onSettingsChanged) return undefined;
    return window.api.onSettingsChanged((newSettings) => {
      if (newSettings.shortcuts) {
        setShortcuts(mergeShortcutsWithDefaults(newSettings.shortcuts));
      }
    });
  }, []);

  const loadShortcuts = async () => {
    const settings = await window.api.getSettings();
    if (settings.shortcuts) {
      setShortcuts(mergeShortcutsWithDefaults(settings.shortcuts));
    } else {
      setShortcuts(DEFAULT_SHORTCUTS);
    }
  };

  const handleSave = async () => {
    await window.api.saveSettings({ shortcuts });
    onOpenChange(false);
  };

  const handleReset = () => {
    setShortcuts(DEFAULT_SHORTCUTS);
  };

  const handleEditShortcut = (category, key) => {
    if (LOCKED_SHORTCUTS.includes(key)) return;
    setEditingKey(`${category}.${key}`);
  };

  const handleShortcutChange = (category, key, value) => {
    setShortcuts((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
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
      return <span style={{ color: "var(--text-secondary)" }}>[{t("shortcuts.locked")}]</span>;
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
          onChange={(e) => handleShortcutChange(category, key, e.target.value)}
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
          color: "var(--text-primary)",
        }}
        onClick={() => handleEditShortcut(category, key)}
      >
        {value}
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
  };

  const globalLabels = {
    search: t("shortcuts.actions.search"),
    backToMap: t("shortcuts.actions.backToMap"),
  };

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
      </DialogContent>
    </Dialog>
  );
}
