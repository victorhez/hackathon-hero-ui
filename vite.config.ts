import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tailwindcss(), tsConfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    strictPort: false,
  },
  ssr: {
    noExternal: ["@tailwindcss/vite", "tw-animate-css", "tailwindcss", "recharts"],
  },
  build: {
    sourcemap: false,
  },
  define: {
    "import.meta.env.VITE_APP_NAME": JSON.stringify("ClearLend"),
  },
});
