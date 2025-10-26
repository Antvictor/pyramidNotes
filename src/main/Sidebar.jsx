import { Link, useLocation } from "react-router-dom";
import { House,Settings,FileQuestionMark } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navStyle = {
    width: "15px",
    backgroundColor: "rgba(241,241,241,1)",
    color: "#bfbfbfff",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
  };

  const linkStyle = (path) => ({
    color: location.pathname === path ? "#61dafb" : "#bfbfbfff",
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
