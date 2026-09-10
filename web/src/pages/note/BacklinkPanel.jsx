import { useTranslation } from "react-i18next";

function BacklinkPanel({ backlinks, onOpenNode }) {
  const { t } = useTranslation();
  if (!backlinks?.length) return null;

  return (
    <div className="w-full shrink-0 border-t border-dashed border-neutral-300/50 bg-white/40 px-4 py-1 backdrop-blur-sm dark:border-neutral-700/40 dark:bg-neutral-900/30">
      <div className="mb-0.5 text-[10px] tracking-wide text-neutral-400 dark:text-neutral-500">
        {t("backlinks.title", { total: backlinks.length })}
      </div>
      <div className="max-h-24 overflow-y-auto">
        {backlinks.map((note) => (
          <div
            key={note.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpenNode(note)}
            className="cursor-pointer border-b border-dashed border-neutral-300/40 py-[3px] text-xs text-neutral-600 last:border-b-0 hover:underline dark:border-neutral-700/30 dark:text-neutral-400"
          >
            {note.name}
          </div>
        ))}
      </div>
    </div>
  );
}

export default BacklinkPanel;
