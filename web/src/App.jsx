import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "./pages/Sidebar";
import Home from "./pages/Home";
import About from "./pages/About";
import Settings from "./pages/settings/Settings";
import MindMap from "./pages/MindMap";
import Node from "./pages/note/Node"
import { SelectedNodeProvider } from "./contexts/SelectedNodeContext";
import TutorialController from "./components/tutorial/TutorialController";
import useShortcuts from "./hooks/useShortcuts";

function AppContent() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [shortcuts, setShortcuts] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await window.api.getSettings();
      setShortcuts(settings.shortcuts || null);
    };
    loadSettings();
  }, []);

  // Listen for settings changes
  useEffect(() => {
    if (window.api.onSettingsChanged) {
      window.api.onSettingsChanged((newSettings) => {
        setShortcuts(newSettings.shortcuts || null);
      });
    }
  }, []);

  const clearSelectedNode = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleBackToMap = useCallback(() => {
    if (location.pathname.startsWith('/note/')) {
      navigate('/');
    } else {
      // In MindMap, Esc clears selection if search is not open
      if (!searchOpen) {
        clearSelectedNode();
      }
    }
  }, [location.pathname, searchOpen, navigate, clearSelectedNode]);

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
              <Route path="/about" element={<About />} />
              <Route path="/settings" element={<Settings shortcuts={shortcuts} />} />
              <Route path="/note/:id/:name" element={
                <NodeWrapper
                  selectedNode={selectedNode}
                  setSelectedNode={setSelectedNode}
                  shortcuts={shortcuts}
                />
              } />
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

function matchKey(shortcutStr, e) {
  if (!shortcutStr) return false;

  const isMod = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;
  const isAlt = e.altKey;

  const parts = shortcutStr.split('+');
  const modifiers = parts.slice(0, -1);
  const key = parts[parts.length - 1];

  const modStateMatch =
    (modifiers.includes('Ctrl') || !isMod) &&
    (modifiers.includes('Shift') || !isShift) &&
    (modifiers.includes('Alt') || !isAlt);

  const keyMatch =
    key === 'Escape' ? e.key === 'Escape' :
    key === 'Delete' ? e.key === 'Delete' :
    key === 'Enter' ? e.key === 'Enter' :
    key === 'Backspace' ? e.key === 'Backspace' :
    key.startsWith('F') ? e.key === key :
    e.key.toLowerCase() === key.toLowerCase();

  return keyMatch && modStateMatch;
}

// Wrapper for Node that handles shortcuts
function NodeWrapper({ selectedNode, setSelectedNode, shortcuts }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!shortcuts) return;

    const handler = (e) => {
      // Escape - return to MindMap
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/');
        return;
      }

      // Ctrl+N - create new child node
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        // This will be handled - the parent is selectedNode or current note's node
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, navigate]);

  return <Node selectedNode={selectedNode} setSelectedNode={setSelectedNode} shortcuts={shortcuts} />;
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
