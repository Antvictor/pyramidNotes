import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

export function DeleteNodeDialog({
  open,
  onOpenChange,
  nodeName,
  childCount,
  isRootNode,
  requiresChoice = true,
  onDeleteEntireTree,
  onDeleteParentOnly,
  onCancel,
}) {
  const { t } = useTranslation()
  const defaultOption = isRootNode ? "entire-tree" : "parent-only"
  const [selectedOption, setSelectedOption] = useState(defaultOption)

  useEffect(() => {
    setSelectedOption(defaultOption)
  }, [defaultOption, open, requiresChoice])

  const handleConfirm = () => {
    if (!requiresChoice) {
      if (isRootNode) {
        onDeleteEntireTree?.()
      } else {
        onDeleteParentOnly?.()
      }
      return
    }

    if (selectedOption === "entire-tree") {
      onDeleteEntireTree?.()
    } else {
      onDeleteParentOnly?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("dialogs.deleteNode.title")}</DialogTitle>
          <DialogDescription>
            {requiresChoice
              ? t("dialogs.deleteNode.description", { nodeName, count: childCount })
              : t("dialogs.deleteNode.deleteLeafDescription", { nodeName })}
          </DialogDescription>
        </DialogHeader>

        {requiresChoice ? (
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

            {!isRootNode ? (
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
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            variant={!requiresChoice || selectedOption === "entire-tree" ? "destructive" : "default"}
            onClick={handleConfirm}
          >
            {t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteNodeDialog
