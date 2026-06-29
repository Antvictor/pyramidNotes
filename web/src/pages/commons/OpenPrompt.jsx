import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export default function OpenPrompt({ visible, id, title, onOk, onCancel }) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    setValue(title || "");
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [visible, title]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      onOk(id, value, title);
    }
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogs.nodePrompt.title")}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("dialogs.nodePrompt.placeholder")}
            autoFocus
            autoComplete="off"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => onOk(id, value, title)}>
            {t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
