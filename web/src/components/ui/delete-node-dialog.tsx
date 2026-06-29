import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"

export function DeleteNodeDialog({
  open,
  onOpenChange,
  nodeName,
  childCount,
  isRootNode,
  onDeleteEntireTree,
  onDeleteParentOnly,
  onCancel,
}) {
  const { t } = useTranslation()
  const [selectedOption, setSelectedOption] = useState(isRootNode ? "entire-tree" : "parent-only")

  // isRootNode 变化时同步默认选项
  useEffect(() => {
    setSelectedOption(isRootNode ? "entire-tree" : "parent-only");
  }, [isRootNode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("dialogs.deleteNode.title")}</DialogTitle>
          <DialogDescription>
            {t("dialogs.deleteNode.description", { nodeName, count: childCount })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="deleteOption"
              value="entire-tree"
              checked={selectedOption === "entire-tree"}
              onChange={() => setSelectedOption("entire-tree")}
              className="mt-1"
            />
            <div>
              <div className="font-medium">
                {isRootNode ? t("dialogs.deleteNode.deleteAll") : t("dialogs.deleteNode.deleteSubtree")}
              </div>
              <div className="text-sm text-muted-foreground">
                {isRootNode
                  ? t("dialogs.deleteNode.deleteRootDescription", { nodeName })
                  : t("dialogs.deleteNode.deleteSubtreeDescription", { nodeName })}
              </div>
            </div>
          </label>

          {!isRootNode && (
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="deleteOption"
              value="parent-only"
              checked={selectedOption === "parent-only"}
              onChange={() => setSelectedOption("parent-only")}
              className="mt-1"
            />
            <div>
              <div className="font-medium">{t("dialogs.deleteNode.deleteParentOnly", { nodeName })}</div>
              <div className="text-sm text-muted-foreground">
                {t("dialogs.deleteNode.promoteChildren")}
              </div>
            </div>
          </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            variant={selectedOption === "entire-tree" ? "destructive" : "default"}
            onClick={() => {
              if (selectedOption === "entire-tree") {
                onDeleteEntireTree?.()
              } else {
                onDeleteParentOnly?.()
              }
            }}
          >
            {t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteNodeDialog
