import { Link, useLocation } from "react-router-dom";
import { House, Settings, FileQuestionMark, Search } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navStyle = {
    width: "56px",
    minWidth: "56px",
    backgroundColor: "var(--bg-primary)",
    color: "var(--text-primary)",
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  const linkStyle = (path) => ({
    color: location.pathname === path ? "var(--link-color)" : "var(--text-primary)",
    textDecoration: "none",
    marginBottom: "16px",
    fontWeight: "bold",
  });

  return (
    <div style={navStyle}>
      <Link to="/" style={linkStyle("/")}>
        <House />
      </Link>
      <Link to="/?search=1" style={linkStyle("/")}>
        <Search />
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
