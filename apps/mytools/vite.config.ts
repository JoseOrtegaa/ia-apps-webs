import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, mkdirSync } from "node:fs";
for (const dir of ["cmaps", "standard_fonts", "wasm"]) {
  mkdirSync("public/pdf-assets/" + dir, { recursive: true });
  cpSync("node_modules/pdfjs-dist/" + dir, "public/pdf-assets/" + dir, {
    recursive: true,
  });
}
export default defineConfig({
  plugins: [react()],
  base: "/ia-apps-webs/mytools/",
  build: { target: "safari16.4" },
  server: { host: "0.0.0.0" },
});
