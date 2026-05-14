import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Folder, Settings } from "lucide-react";

/**
 * 权限获取弹窗组件
 * 当文件操作遇到权限不足错误时显示
 *
 * @param {Object} props
 * @param {boolean} props.open - 是否显示弹窗
 * @param {string} props.errorMessage - 原始错误信息
 * @param {Function} props.onReSelectFolder - 用户选择"重新选择文件夹"时的回调
 * @param {Function} props.onOpenSystemSettings - 用户选择"打开系统设置"时的回调
 * @param {Function} props.onClose - 关闭弹窗的回调
 */
export function PermissionDialog({
  open,
  errorMessage,
  onReSelectFolder,
  onOpenSystemSettings,
  onClose,
}) {
  const [isOpeningSettings, setIsOpeningSettings] = useState(false);

  const handleOpenSystemSettings = async () => {
    setIsOpeningSettings(true);
    try {
      await onOpenSystemSettings();
    } finally {
      setIsOpeningSettings(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>权限不足</DialogTitle>
          <DialogDescription>
            无法访问存储文件夹。请授予应用程序访问该文件夹的权限，或选择一个新的文件夹。
            {errorMessage && (
              <span className="block mt-2 text-xs text-muted-foreground">
                错误信息: {errorMessage}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-4">
          <Button
            onClick={onReSelectFolder}
            variant="outline"
            className="w-full justify-start"
          >
            <Folder className="mr-2 h-4 w-4" />
            重新选择文件夹
          </Button>

          <Button
            onClick={handleOpenSystemSettings}
            variant="outline"
            className="w-full justify-start"
            disabled={isOpeningSettings}
          >
            <Settings className="mr-2 h-4 w-4" />
            {isOpeningSettings ? "正在打开..." : "打开系统设置"}
          </Button>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PermissionDialog;