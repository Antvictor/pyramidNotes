// extensions/commands.ts

export interface KeyBinding {
  key: string;
  action: "bold" | "italic" | "code" | "heading1" | "heading2" | "custom";
  customHandler?: () => boolean;
}