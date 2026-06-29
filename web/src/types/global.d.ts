declare module "*.css";

interface PyramidSettings {
  theme?: string;
  storagePath?: string;
  autoUpdate?: boolean;
  language?: "system" | "zh-CN" | "en";
  shortcuts?: Record<string, Record<string, string>>;
  tutorialVersion?: string;
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
  [key: string]: unknown;
}

interface Window {
  api: PyramidApi;
}
