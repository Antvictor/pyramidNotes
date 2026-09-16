import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw, Trash2 } from "lucide-react";

const Trash = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [confirmPurge, setConfirmPurge] = useState(false);

  const load = async () => {
    setLoading(true);
    const list = (await window.api.listTrash()) || [];
    setRows(list);
    // 选中集合收敛到仍存在的条目
    setSelected((prev) => new Set([...prev].filter((id) => list.some((r) => r.id === id))));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRestore = async (id) => {
    await window.api.restoreTrash(id);
    await load();
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = rows.length > 0 && selected.size === rows.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  };

  const handlePermanentDelete = async () => {
    if (selected.size === 0) return;
    await window.api.purgeTrashNodes([...selected]);
    setConfirmPurge(false);
    setSelected(new Set());
    await load();
  };

  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 0",
    borderBottom: "1px solid var(--border)",
    gap: 12,
  };

  const checkboxStyle = { width: 16, height: 16, cursor: "pointer", flexShrink: 0 };

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>{t("trash.title")}</h1>
          <button
            onClick={() => setConfirmPurge(true)}
            disabled={selected.size === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--bg-primary)",
              color: "#dc2626",
              cursor: selected.size === 0 ? "default" : "pointer",
              fontSize: 13,
              opacity: selected.size === 0 ? 0.4 : 1,
            }}
          >
            <Trash2 size={14} />
            {t("trash.permanentDelete")}{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
        </div>

        <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 20 }}>
          {loading ? (
            <div style={{ color: "var(--text-secondary)" }}>{t("common.loading")}</div>
          ) : rows.length === 0 ? (
            <div style={{ color: "var(--text-secondary)" }}>{t("trash.empty")}</div>
          ) : (
            <>
              <label style={{ ...rowStyle, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={checkboxStyle} />
                  {t("trash.selectAll")}
                </span>
              </label>
              {rows.map((r) => (
                <div key={r.id} style={rowStyle}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      style={checkboxStyle}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, color: "var(--text-primary)" }}>
                        {r.name || r.id}
                      </span>
                      <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                        {t("trash.deleteDate")}: {r.last_up_time ? new Date(r.last_up_time).toLocaleString() : "-"}
                      </span>
                    </span>
                  </span>
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
                      flexShrink: 0,
                    }}
                  >
                    <RotateCcw size={14} />
                    {t("trash.restore")}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {confirmPurge && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmPurge(false); }}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 24,
              maxWidth: 420,
            }}
          >
            <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 20, color: "var(--text-primary)" }}>
              {t("trash.permanentDeleteWarning")}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                onClick={() => setConfirmPurge(false)}
                style={{
                  padding: "8px 16px", borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--bg-primary)", color: "var(--text-primary)",
                  cursor: "pointer", fontSize: 14,
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handlePermanentDelete}
                style={{
                  padding: "8px 16px", borderRadius: 6, border: "none",
                  background: "#dc2626", color: "white",
                  cursor: "pointer", fontSize: 14, fontWeight: 500,
                }}
              >
                {t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trash;
