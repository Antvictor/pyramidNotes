import { HashRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "./pages/Sidebar";
import Settings from "./pages/settings/Settings";
import MindMap from "./pages/MindMap";
import Node from "./pages/note/Node"
import Paywall from "./pages/paywall/Paywall";
import { SelectedNodeProvider } from "./contexts/SelectedNodeContext";
import { LicenseProvider, useLicense } from "./contexts/LicenseContext";
import TutorialController from "./components/tutorial/TutorialController";
import { initializeI18n } from "./i18n";

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
    find: "Ctrl+F",
    replace: "Ctrl+R",
  },
  global: {
    search: "Ctrl+K",
    backToMap: "Escape",
  },
};

function mergeShortcutsWithDefaults(shortcuts) {
  return {
    node: { ...DEFAULT_SHORTCUTS.node, ...(shortcuts?.node || {}) },
    note: { ...DEFAULT_SHORTCUTS.note, ...(shortcuts?.note || {}) },
    global: { ...DEFAULT_SHORTCUTS.global, ...(shortcuts?.global || {}) },
  };
}

function AppContent() {
  const { licenseState } = useLicense();
  const [selectedNode, setSelectedNode] = useState(null);
  const [shortcuts, setShortcuts] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await window.api.getSettings();
      setShortcuts(mergeShortcutsWithDefaults(settings.shortcuts));
    };
    loadSettings();
  }, []);

  // Listen for settings changes
  useEffect(() => {
    if (!window.api?.onSettingsChanged) return undefined;
    return window.api.onSettingsChanged((newSettings) => {
      setShortcuts(mergeShortcutsWithDefaults(newSettings.shortcuts));
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
                  searchOpen={searchOpen}
                  setSearchOpen={setSearchOpen}
                />
              } />
              <Route path="/settings" element={<Settings shortcuts={shortcuts} />} />
              <Route path="/note/:id/:name" element={<Node shortcuts={shortcuts} />} />
              <Route path="/paywall" element={<Paywall />} />
            </Routes>
          </TutorialController>
        </div>
      </div>
    </SelectedNodeProvider>
  );
}

// Wrapper for MindMap that handles shortcuts
function MindMapWrapper({ selectedNode, setSelectedNode, clearSelectedNode, shortcuts, searchOpen, setSearchOpen }) {
  const location = useLocation();
  const navigate = useNavigate();

  // useShortcuts hook - handles global shortcut dispatch
  useEffect(() => {
    if (!shortcuts) return;

    const handler = (e) => {
      // Global search shortcut works everywhere
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          if (location.pathname === '/' || location.pathname === '') {
            setSearchOpen(true);
          } else if (location.pathname.startsWith('/note/')) {
            setSearchOpen(true);
          }
          return;
        }
      }

      // Escape key
      if (e.key === 'Escape') {
        if (searchOpen) {
          setSearchOpen(false);
        } else if (location.pathname.startsWith('/note/')) {
          navigate('/');
        } else {
          clearSelectedNode();
        }
        return;
      }

      // Only process node shortcuts if shortcuts is loaded
      if (!shortcuts) return;

      // MindMap page shortcuts - they work but the actual operations
      // are triggered by passing callbacks to MindMap component
      // For now, we let MindMap handle its own operations internally
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNode, shortcuts, location.pathname, searchOpen, navigate, setSearchOpen, clearSelectedNode]);

  return (
    <MindMap
      selectedNode={selectedNode}
      setSelectedNode={setSelectedNode}
      clearSelectedNode={clearSelectedNode}
      shortcuts={shortcuts}
      searchOpen={searchOpen}
      setSearchOpen={setSearchOpen}
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
