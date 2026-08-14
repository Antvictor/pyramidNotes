import { forwardRef, useImperativeHandle, useState, useRef, useCallback } from "react";
import { useCurrentEditor } from "@tiptap/react";
import { useTranslation } from "react-i18next";

export interface FindReplaceBarHandle {
  open: (mode: "find" | "replace") => void;
}

type FindStorage = {
  results?: Array<{ from: number; to: number }>;
  currentIndex?: number | null;
};

const FindReplaceBar = forwardRef<FindReplaceBarHandle, object>(function FindReplaceBar(_props, ref) {
  const { editor } = useCurrentEditor();
  const { t } = useTranslation();

  const [findMode, setFindMode] = useState<"find" | "replace" | null>(null);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matchInfo, setMatchInfo] = useState<{ count: number; current: number | null }>({ count: 0, current: null });
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const applySearch = useCallback((query: string, cs: boolean, rx: boolean) => {
    if (!editor) return;
    editor.commands.setCaseSensitive(cs);
    editor.commands.setUseRegex(rx);
    editor.commands.setSearchTerm(query);
    const storage = editor.storage.findAndReplace as FindStorage;
    setMatchInfo({ count: storage.results?.length ?? 0, current: storage.currentIndex ?? null });
  }, [editor]);

  const handleFindQueryChange = useCallback((v: string) => {
    setFindQuery(v);
    applySearch(v, caseSensitive, useRegex);
  }, [applySearch, caseSensitive, useRegex]);

  const scrollToSelection = useCallback(() => {
    if (!editor) return;
    const { from } = editor.state.selection;
    const dom = editor.view.domAtPos(from).node;
    const el = dom instanceof Element ? dom : dom.parentElement;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [editor]);

  const goToNext = useCallback(() => {
    if (!editor) return;
    editor.commands.goToNextResult();
    scrollToSelection();
    const storage = editor.storage.findAndReplace as FindStorage;
    setMatchInfo({ count: storage.results?.length ?? 0, current: storage.currentIndex ?? null });
  }, [editor, scrollToSelection]);

  const goToPrevious = useCallback(() => {
    if (!editor) return;
    editor.commands.goToPreviousResult();
    scrollToSelection();
    const storage = editor.storage.findAndReplace as FindStorage;
    setMatchInfo({ count: storage.results?.length ?? 0, current: storage.currentIndex ?? null });
  }, [editor, scrollToSelection]);

  const replaceCurrent = useCallback(() => {
    if (!editor) return;
    editor.commands.replace();
    const storage = editor.storage.findAndReplace as FindStorage;
    setMatchInfo({ count: storage.results?.length ?? 0, current: storage.currentIndex ?? null });
  }, [editor]);

  const replaceAll = useCallback(() => {
    if (!editor) return;
    editor.commands.replaceAll();
    setMatchInfo({ count: 0, current: null });
  }, [editor]);

  const toggleCaseSensitive = useCallback(() => {
    const next = !caseSensitive;
    setCaseSensitive(next);
    applySearch(findQuery, next, useRegex);
  }, [applySearch, caseSensitive, useRegex, findQuery]);

  const toggleRegex = useCallback(() => {
    const next = !useRegex;
    setUseRegex(next);
    applySearch(findQuery, caseSensitive, next);
  }, [applySearch, caseSensitive, useRegex, findQuery]);

  const closeFindPanel = useCallback(() => {
    setFindMode(null);
    setFindQuery("");
    setReplaceQuery("");
    editor?.commands.clearSearch();
    editor?.chain().focus().run();
  }, [editor]);

  useImperativeHandle(ref, () => ({
    open: (mode: "find" | "replace") => {
      setFindMode(mode);
      setTimeout(() => (mode === "replace" ? replaceInputRef : findInputRef).current?.focus(), 0);
    },
  }));

  if (!findMode) return null;

  return (
    <div className="editor-find-bar" onKeyDown={(e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeFindPanel(); }
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); goToNext(); }
      if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); e.stopPropagation(); goToPrevious(); }
    }}>
      <div className="editor-find-row">
        <input ref={findInputRef} value={findQuery}
          onChange={(e) => handleFindQueryChange(e.target.value)}
          placeholder={t("find.findPlaceholder")} />
        <button type="button" onClick={toggleCaseSensitive} className={caseSensitive ? "is-active" : ""}>Aa</button>
        <button type="button" onClick={toggleRegex} className={useRegex ? "is-active" : ""}>.*</button>
        <button type="button" onClick={goToPrevious}>↑</button>
        <button type="button" onClick={goToNext}>↓</button>
        <span className="find-count">
          {matchInfo.count > 0 ? `${(matchInfo.current ?? 0) + 1}/${matchInfo.count}` : "0/0"}
        </span>
        <button type="button" className="find-close" onClick={closeFindPanel}>×</button>
      </div>
      {findMode === "replace" && (
        <div className="editor-find-row">
          <input ref={replaceInputRef} value={replaceQuery}
            onChange={(e) => { setReplaceQuery(e.target.value); editor?.commands.setReplaceTerm(e.target.value); }}
            placeholder={t("find.replacePlaceholder")} />
          <button type="button" onClick={replaceCurrent}>{t("find.replace")}</button>
          <button type="button" onClick={replaceAll}>{t("find.replaceAll")}</button>
        </div>
      )}
    </div>
  );
});

export default FindReplaceBar;
