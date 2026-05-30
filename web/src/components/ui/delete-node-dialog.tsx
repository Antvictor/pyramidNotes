import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function DeleteNodeDialog({
  open,
  onOpenChange,
  nodeName,
  childCount,
  onDeleteEntireTree,
  onDeleteParentOnly,
  onCancel,
}) {
  const [selectedOption, setSelectedOption] = useState("parent-only") // 默认选择"仅删除父节点"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>确认删除节点</DialogTitle>
          <DialogDescription>
            节点 "{nodeName}" 包含 {childCount} 个子节点，请选择删除方式：
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
              <div className="font-medium">删除整个子树</div>
              <div className="text-sm text-muted-foreground">
                删除 "{nodeName}" 及其所有子节点，此操作不可撤销
              </div>
            </div>
          </label>

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
              <div className="font-medium">仅删除 "{nodeName}"</div>
              <div className="text-sm text-muted-foreground">
                子节点将提升到上一级
              </div>
            </div>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
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
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteNodeDialog