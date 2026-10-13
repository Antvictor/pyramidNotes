import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
  build: {
    outDir: '../electron/dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // @tiptap/extension-table、@tiptap/extension-code-block-lowlight 会被解析到仓库根 node_modules，
    // 连带拉起根目录的第二份 prosemirror-view / @tiptap/core；两份模块实例会产生跨模块 DecorationSet，
    // 触发 prosemirror-view 的 DecorationGroup 崩溃。这里强制收敛到 web 单份。
    dedupe: [
      "@tiptap/core",
      "@tiptap/pm",
      "prosemirror-view",
      "prosemirror-state",
      "prosemirror-model",
      "prosemirror-transform",
      "prosemirror-tables",
      "prosemirror-gapcursor",
      "prosemirror-dropcursor",
      "prosemirror-commands",
      "prosemirror-keymap",
      "prosemirror-schema-list",
      "prosemirror-history",
      "prosemirror-inputrules",
    ],
  },
})
