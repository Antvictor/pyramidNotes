import { useState, useEffect } from "react";
import { Folder, HelpCircle, ChevronDown, Keyboard, Crown } from "lucide-react";
import ShortcutsModal from "./ShortcutsModal";
import HelpModal from "./HelpModal";
import Paywall from "../paywall/Paywall";
import { useLicense } from "../../contexts/LicenseContext";
import { useTranslation } from "react-i18next";

const Settings = () => {
  const { t } = useTranslation();
  const { licenseState } = useLicense();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [settings, setSettings] = useState({
    theme: "system",
    storagePath: "",
    autoUpdate: true,
    language: "system",
    systemFontSize: 16,
    noteFontSize: 16,
    nodeSpacing: "normal",
  });
  const [version, setVersion] = useState("");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  useEffect(() => {
    loadSettings();
    loadVersion();
  }, []);

  const loadSettings = async () => {
    const s = await window.api.getSettings();
    setSettings(s);
  };

  const loadVersion = () => {
    if (window.api.getVersion) {
      setVersion(window.api.getVersion());
    } else {
      setVersion("1.0.0");
    }
  };

  const handleThemeChange = async (theme) => {
    setSettings((prev) => ({ ...prev, theme }));
    await window.api.saveSettings({ theme });
    applyTheme(theme);
  };

  const applyTheme = (theme) => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  };

  const handleStorageChange = async () => {
    const dir = await window.api.selectDirectory();
    if (dir) {
      setSettings((prev) => ({ ...prev, storagePath: dir }));
      await window.api.saveSettings({ storagePath: dir });
    }
  };

  const handleAutoUpdateChange = async (checked) => {
    setSettings((prev) => ({ ...prev, autoUpdate: checked }));
    await window.api.saveSettings({ autoUpdate: checked });
  };

  const handleLanguageChange = async (value) => {
    setSettings((prev) => ({ ...prev, language: value }));
    await window.api.saveSettings({ language: value });
    setLangDropdownOpen(false);
  };

  const handleSystemFontSizeChange = async (value) => {
    const num = Math.max(12, Math.min(32, parseInt(value) || 16));
    setSettings((prev) => ({ ...prev, systemFontSize: num }));
    document.documentElement.style.fontSize = num + 'px';
    await window.api.saveSettings({ systemFontSize: num });
  };

  const handleNoteFontSizeChange = async (value) => {
    const num = Math.max(12, Math.min(32, parseInt(value) || 16));
    setSettings((prev) => ({ ...prev, noteFontSize: num }));
    await window.api.saveSettings({ noteFontSize: num });
  };

  const handleNodeSpacingChange = async (value) => {
    setSettings((prev) => ({ ...prev, nodeSpacing: value }));
    await window.api.saveSettings({ nodeSpacing: value });
  };

  const languages = [
    { value: "system", label: t("settings.language.system") },
    { value: "zh-CN", label: t("settings.language.zhCN") },
    { value: "en", label: t("settings.language.english") },
  ];

  const themeLabels = {
    light: t("settings.theme.light"),
    dark: t("settings.theme.dark"),
    system: t("settings.theme.system"),
  };

  const getLicenseLabel = () => {
    switch (licenseState) {
      case 'trial':
        return '试用';
      case 'permanent':
        return '永久用户';
      case 'expired':
        return '已到期';
      default:
        return '加载中...';
    }
  };

  const canPurchase = licenseState === 'trial' || licenseState === 'expired';

  const sectionStyle = {
    width: "100%",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    boxSizing: "border-box",
  };

  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 0",
    borderBottom: "1px solid var(--border)",
  };

  const labelStyle = {
    fontSize: 14,
    color: "var(--text-primary)",
  };

  const controlStyle = {
    display: "flex",
    alignItems: "center",
    gap: 12,
  };

  return (
    <div
      style={{
        width: "90vw",
        height: "94vh",
        display: "flex",
        justifyContent: "center",
        padding: "32px 24px",
        boxSizing: "border-box",
        overflow: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 850,
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 24 }}>{t("settings.title")}</h1>

        {/* Basic Info Section */}
        <div style={sectionStyle}>
          <h3 style={{ marginBottom: 12 }}>{t("settings.sections.basic")}</h3>

          <div style={rowStyle}>
            <span style={labelStyle}>{t("settings.theme.label")}</span>
            <div style={controlStyle}>
              {["light", "dark", "system"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleThemeChange(mode)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    background:
                      settings.theme === mode
                        ? "var(--link-color)"
                        : "var(--bg-primary)",
                    color:
                      settings.theme === mode ? "white" : "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: 13,
                    textTransform: "capitalize",
                  }}
                >
                  {themeLabels[mode]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ ...rowStyle, borderBottom: "none" }}>
            <span style={labelStyle}>{t("settings.storage.label")}</span>
            <div style={controlStyle}>
              <span
                style={{
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  maxWidth: 200,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {settings.storagePath || t("common.notSet")}
              </span>
              <button
                onClick={handleStorageChange}
                data-tutorial-id="change-storage-directory"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <Folder size={14} />
                {t("settings.storage.change")}
              </button>
            </div>
          </div>
        </div>

        {/* System Settings Section */}
        <div style={sectionStyle}>
          <h3 style={{ marginBottom: 12 }}>{t("settings.sections.systemSettings")}</h3>

          <div style={rowStyle}>
            <div>
              <span style={labelStyle}>{t("settings.systemFontSize.label")}</span>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 2 }}>
                {t("settings.systemFontSize.hint")}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="number"
                min={12}
                max={32}
                value={settings.systemFontSize ?? 16}
                onChange={(e) => handleSystemFontSizeChange(e.target.value)}
                style={{
                  width: 56,
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  textAlign: "center",
                }}
              />
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>px</span>
            </div>
          </div>

          <div style={{ ...rowStyle, borderBottom: "none" }}>
            <div>
              <span style={labelStyle}>{t("settings.noteFontSize.label")}</span>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 2 }}>
                {t("settings.noteFontSize.hint")}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="number"
                min={12}
                max={32}
                value={settings.noteFontSize ?? 16}
                onChange={(e) => handleNoteFontSizeChange(e.target.value)}
                style={{
                  width: 56,
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  textAlign: "center",
                }}
              />
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>px</span>
            </div>
          </div>

          <div style={rowStyle}>
            <div>
              <span style={labelStyle}>{t("settings.nodeSpacing.label")}</span>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 2 }}>
                {t("settings.nodeSpacing.hint")}
              </div>
            </div>
            <div style={controlStyle}>
              {(["compact", "normal", "loose"]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleNodeSpacingChange(mode)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    background:
                      settings.nodeSpacing === mode
                        ? "var(--link-color)"
                        : "var(--bg-primary)",
                    color:
                      settings.nodeSpacing === mode ? "white" : "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  {t(`settings.nodeSpacing.${mode}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Heading ratio preview */}
          <div style={{
            marginTop: 12,
            padding: "10px 12px",
            background: "var(--bg-secondary)",
            borderRadius: 6,
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.8,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>
              {t("settings.headingRatios.title")}
            </div>
            {["h1", "h2", "h3", "h4", "h5", "h6"].map((h, i) => (
              <div key={h}>
                {t(`settings.headingRatios.${h}`)}
                <span style={{ color: "var(--link-color)" }}>
                  {' '}({((settings.noteFontSize ?? 16) * [2, 1.75, 1.5, 1.25, 1.125, 1][i]).toFixed(1)}px)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* License Section */}
        <div style={sectionStyle}>
          <h3 style={{ marginBottom: 12 }}>授权</h3>

          <div style={{ ...rowStyle, borderBottom: "none" }}>
            <span style={labelStyle}>状态</span>
            <div style={{ ...controlStyle, flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: licenseState === 'permanent' ? 'var(--link-color)' : 'var(--text-primary)',
              }}>
                {getLicenseLabel()}
              </span>
              {canPurchase && (
                <button
                  onClick={() => setPaywallOpen(true)}
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    background: "var(--primary)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  <Crown size={16} />
                  购买永久版
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Other Section */}
        <div style={sectionStyle}>
          <h3 style={{ marginBottom: 12 }}>{t("settings.sections.other")}</h3>

          <div style={rowStyle}>
            <span style={labelStyle}>{t("settings.version")}</span>
            <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              {version}
            </span>
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>{t("settings.autoUpdate")}</span>
            <button
              onClick={() => handleAutoUpdateChange(!settings.autoUpdate)}
              style={{
                width: 40,
                height: 22,
                borderRadius: 11,
                background: settings.autoUpdate
                  ? "var(--link-color)"
                  : "var(--border)",
                border: "none",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "white",
                  position: "absolute",
                  top: 2,
                  left: settings.autoUpdate ? 20 : 2,
                  transition: "left 0.2s",
                }}
              />
            </button>
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>{t("settings.help")}</span>
            <button
              onClick={() => setHelpModalOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <HelpCircle size={14} />
              {t("settings.documentation")}
            </button>
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>{t("settings.shortcuts")}</span>
            <button
              onClick={() => setShortcutsModalOpen(true)}
              data-tutorial-id="open-shortcuts"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <Keyboard size={14} />
              {t("settings.configure")}
            </button>
          </div>

          <div style={{ ...rowStyle, borderBottom: "none" }}>
            <span style={labelStyle}>{t("settings.language.label")}</span>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: 13,
                  minWidth: 100,
                  justifyContent: "space-between",
                }}
              >
                {languages.find((l) => l.value === settings.language)?.label ||
                  t("settings.language.system")}
                <ChevronDown size={12} />
              </button>
              {langDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 4,
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    background: "var(--bg-primary)",
                    overflow: "hidden",
                    zIndex: 10,
                  }}
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => handleLanguageChange(lang.value)}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "6px 12px",
                        border: "none",
                        background:
                          settings.language === lang.value
                            ? "var(--link-color)"
                            : "transparent",
                        color:
                          settings.language === lang.value
                            ? "white"
                            : "var(--text-primary)",
                        cursor: "pointer",
                        fontSize: 13,
                        textAlign: "left",
                      }}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <ShortcutsModal
          open={shortcutsModalOpen}
          onOpenChange={setShortcutsModalOpen}
        />
        <HelpModal
          open={helpModalOpen}
          onOpenChange={setHelpModalOpen}
        />

        {/* Paywall Modal */}
        {paywallOpen && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setPaywallOpen(false);
            }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "20px",
            }}
          >
            <Paywall onClose={() => setPaywallOpen(false)} compact />
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
