import { Link, useLocation } from "react-router-dom";
import { House, Settings, FileQuestionMark, Search } from 'lucide-react';
import { useTranslation } from "react-i18next";

const Sidebar = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const navStyle = {
    width: "56px",
    minWidth: "56px",
    backgroundColor: "var(--sidebar)",
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
      <Link to="/" style={linkStyle("/")} aria-label={t("navigation.mindMap")}>
        <House />
      </Link>
      <Link to="/?search=1" style={linkStyle("/")} aria-label={t("navigation.search")}>
        <Search />
      </Link>
      <Link to="/about" style={linkStyle("/about")} aria-label={t("navigation.about")}>
        <FileQuestionMark />
      </Link>
      <Link to="/settings" style={linkStyle("/settings")} aria-label={t("navigation.settings")} data-tutorial-id="sidebar-settings">
        <Settings />
      </Link>
    </div>
  );
};

export default Sidebar;
