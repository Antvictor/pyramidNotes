import { HashRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "./pages/Sidebar";
import Settings from "./pages/settings/Settings";
import MindMap from "./pages/MindMap";
import Node from "./pages/note/Node"
import Paywall from "./pages/paywall/Paywall";
import Trash from "./pages/trash/Trash";
import { SelectedNodeProvider } from "./contexts/SelectedNodeContext";
import { LicenseProvider, useLicense } from "./contexts/LicenseContext";
import TutorialController from "./components/tutorial/TutorialController";
import { initializeI18n } from "./i18n";
import { isOverlayEscClaimed } from "./components/ui/overlayEsc";

function AppContent() {
  const { licenseState } = useLicense();
  const [selectedNode, setSelectedNode] = useState(null);
  const [shortcuts, setShortcuts] = useState(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await window.api.getSettings();
      setShortcuts(settings.shortcuts);
    };
    loadSettings();
  }, []);

  // Listen for settings changes
  useEffect(() => {
    if (!window.api?.onSettingsChanged) return undefined;
    return window.api.onSettingsChanged((newSettings) => {
      setShortcuts(newSettings.shortcuts);
      void initializeI18n(newSettings.language, navigator.languages);
    });
  }, []);

  const clearSelectedNode = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Loading screen while license state is being determined
  if (licenseState === null) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-primary)",
      }}>
        加载中...
      </div>
    );
  }

  // Expired state: only show paywall, no sidebar or routes
  if (licenseState === 'expired') {
    return <Paywall />;
  }

  // Provide shortcuts context value
  const contextValue = {
    selectedNode,
    setSelectedNode,
    clearSelectedNode,
    shortcuts,
  };

  return (
    <SelectedNodeProvider {...contextValue}>
      <div style={{ display: "flex", height: "100vh" }}>
        {/* 左侧固定边栏 */}
        <Sidebar style={{ width: 60 }} />

        {/* 右侧动态内容区 */}
        <div style={{
          flex: 1,
          padding: "20px",
          width: "100%",
          color: "var(--text-primary)",
          overflow: "hidden",
        }}>
          <TutorialController>
            <Routes>
              <Route path="/" element={
                <MindMapWrapper
                  selectedNode={selectedNode}
                  setSelectedNode={setSelectedNode}
                  clearSelectedNode={clearSelectedNode}
                  shortcuts={shortcuts}
                />
              } />
              <Route path="/settings" element={<Settings shortcuts={shortcuts} />} />
              <Route path="/note/:id/:name" element={<Node shortcuts={shortcuts} />} />
              <Route path="/trash" element={<Trash />} />
              <Route path="/paywall" element={<Paywall />} />
            </Routes>
          </TutorialController>
        </div>
      </div>
    </SelectedNodeProvider>
  );
}

// Wrapper for MindMap that handles shortcuts
function MindMapWrapper({ selectedNode, setSelectedNode, clearSelectedNode, shortcuts }) {
  const location = useLocation();
  const navigate = useNavigate();

  // useShortcuts hook - handles global shortcut dispatch
  useEffect(() => {
    if (!shortcuts) return;

    const handler = (e) => {
      // Escape key
      if (e.key === 'Escape') {
        // 有浮层正在自行处理 Esc（通用弹窗 / 自制浮层）→ 让路。
        // ⚠️ 不要 preventDefault：Radix 的 DismissableLayer 会跳过已 defaultPrevented 的 Escape
        if (isOverlayEscClaimed()) return;
        e.preventDefault();
        if (location.pathname.startsWith('/note/')) {
          navigate('/');
        } else {
          clearSelectedNode();
        }
        return;
      }
    };

    // 捕获阶段注册：必须在弹窗自己关闭（并触发重渲染）之前观察到"有浮层打开"
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [selectedNode, shortcuts, location.pathname, navigate, clearSelectedNode]);

  return (
    <MindMap
      selectedNode={selectedNode}
      setSelectedNode={setSelectedNode}
      clearSelectedNode={clearSelectedNode}
      shortcuts={shortcuts}
    />
  );
}

function App() {
  return (
    <Router>
      <LicenseProvider>
        <AppContent />
      </LicenseProvider>
    </Router>
  );
}

export default App;
