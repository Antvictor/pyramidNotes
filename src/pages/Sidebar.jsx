import { Link, useLocation } from "react-router-dom";
import { House,Settings,FileQuestionMark } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navStyle = {
    width: "56px",
    minWidth: "56px",
    backgroundColor: "#f1f1f1",
    color: "#bfbfbfff",
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  const linkStyle = (path) => ({
    color: location.pathname === path ? "#61dafb" : "#313030ff",
    textDecoration: "none",
    marginBottom: "16px",
    fontWeight: "bold",
  });

  return (
    <div style={navStyle}>
      <Link to="/" style={linkStyle("/")}>
        <House />
      </Link>
      <Link to="/about" style={linkStyle("/about")}>
        <FileQuestionMark />
      </Link>
      <Link to="/settings" style={linkStyle("/settings")}>
        <Settings />
      </Link>
    </div>
  );
};

export default Sidebar;
