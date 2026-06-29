const { BrowserWindow, ipcMain } = require("electron");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function registerCaptureIPC() {
  ipcMain.handle("capturePage", async (event, options = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      return null;
    }

    const width = Number.isFinite(options.width) ? Math.round(options.width) : undefined;
    const height = Number.isFinite(options.height) ? Math.round(options.height) : undefined;
    const clip = {
      x: Number.isFinite(options.x) ? Math.round(options.x) : 0,
      y: Number.isFinite(options.y) ? Math.round(options.y) : 0,
      width: width ?? win.getContentBounds().width,
      height: height ?? win.getContentBounds().height,
    };

    if (width && height) {
      win.setContentSize(width, height);
      await wait(300);
    }

    win.show();
    win.focus();
    await wait(150);

    const image = await win.webContents.capturePage(clip);
    return image.toPNG().toString("base64");
  });
}

module.exports = { registerCaptureIPC };
