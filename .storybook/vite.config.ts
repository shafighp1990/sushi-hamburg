import path from "node:path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".."),
      "next/navigation": path.resolve(__dirname, "navigation.ts"),
      "next/link": path.resolve(__dirname, "link.tsx"),
      "next/image": "vinext/shims/image",
    },
    dedupe: ["react", "react-dom"],
  },
});
