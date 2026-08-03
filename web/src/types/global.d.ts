declare module "*.css";

interface PyramidSettings {
  theme?: string;
  storagePath?: string;
  autoUpdate?: boolean;
  language?: "system" | "zh-CN" | "en";
  shortcuts?: Record<string, Record<string, string>>;
  tutorialVersion?: string;
  systemFontSize?: number;
  noteFontSize?: number;
  nodeSpacing?: 'compact' | 'normal' | 'loose';
}

interface PyramidApi {
  getSettings: () => Promise<PyramidSettings>;
  saveSettings: (settings: Partial<PyramidSettings>) => Promise<boolean>;
  capturePage: (options?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }) => Promise<string | null>;
  onSettingsChanged: (callback: (settings: PyramidSettings) => void) => () => void;
  getVersion?: () => string;
  saveAttachmentFromBase64: (base64Data: string, noteName: string, extension: string) => Promise<{ fileName: string } | { error: string }>;
  saveAttachmentFromPath: (sourcePath: string, noteName: string) => Promise<{ fileName: string } | { error: string }>;
  readAttachment: (fileName: string) => Promise<{ base64: string; mimeType: string } | { error: string }>;
  [key: string]: unknown;
}

interface Window {
  api: PyramidApi;
}
