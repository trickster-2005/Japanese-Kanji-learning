import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// base 用相對路徑，配合 HashRouter 可直接部署到 GitHub Pages 子路徑或 Vercel
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
