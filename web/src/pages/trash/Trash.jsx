import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";

const Trash = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const list = (await window.api.listTrash()) || [];
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRestore = async (id) => {
    await window.api.restoreTrash(id);
    await load();
  };

  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 0",
    borderBottom: "1px solid var(--border)",
  };

  return (
    <div
      style={{
        width: "90vw",
        height: "94vh",
        overflow: "auto",
        padding: "32px 24px",
        boxSizing: "border-box",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 850 }}>
        <h1 style={{ fontSize: 24, marginBottom: 24 }}>{t("trash.title")}</h1>
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 20 }}>
          {loading ? (
            <div style={{ color: "var(--text-secondary)" }}>{t("common.loading")}</div>
          ) : rows.length === 0 ? (
            <div style={{ color: "var(--text-secondary)" }}>{t("trash.empty")}</div>
          ) : (
            rows.map((r) => (
              <div key={r.id} style={rowStyle}>
                <div>
                  <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{r.name || r.id}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                    {t("trash.deleteDate")}: {r.last_up_time ? new Date(r.last_up_time).toLocaleString() : "-"}
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(r.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  <RotateCcw size={14} />
                  {t("trash.restore")}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Trash;
