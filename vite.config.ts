import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  // SUSTITUYE esto con el nombre exacto de tu repositorio entre barras
  base: "/osu-better-rankings/", 
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
