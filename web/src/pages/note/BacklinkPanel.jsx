import { useTranslation } from "react-i18next";

function BacklinkPanel({ backlinks, onOpenNode }) {
  const { t } = useTranslation();
  if (!backlinks?.length) return null;

  return (
    <div className="w-full shrink-0 border-t border-neutral-200 bg-white/80 px-4 py-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80">
      <div className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">
        {t("backlinks.title", { total: backlinks.length })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {backlinks.map((note) => (
          <button
            key={note.id}
            type="button"
            onClick={() => onOpenNode(note)}
            className="max-w-[240px] truncate rounded px-2 py-0.5 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
          >
            {note.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default BacklinkPanel;
