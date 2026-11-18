import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// base 用相對路徑，配合 HashRouter 可直接部署到 GitHub Pages 子路徑或 Vercel
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  // 資料檔很大：用 JSON.parse 載入比 JS 物件字面值快
  json: { stringify: true },
  build: {
    // 資料（約 2 MB，gzip 後約 0.5 MB）獨立成一個檔，程式更新時瀏覽器仍可沿用快取
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/src/data/")) return "data";
        },
      },
    },
  },
});
