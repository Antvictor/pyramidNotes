import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./main/Sidebar";
import Home from "./pages/Home";
import About from "./pages/About";
import Settings from "./pages/settings/Settings";

function App() {
  return (
    <Router>
      <div style={{ display: "flex", height: "100vh" }}>
        {/* 左侧固定边栏 */}
        <Sidebar />

        {/* 右侧动态内容区 */}
        <div style={{ flex: 1, padding: "20px", overflowY: "auto", color: "#bfbfbfff" }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
