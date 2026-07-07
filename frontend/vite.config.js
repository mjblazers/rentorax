import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// RentoraX Vite config.
// - Keeps existing CRA-style env var `REACT_APP_BACKEND_URL` working (via `define`).
// - Treats `.js` files as JSX so App.js et al. compile without renaming.
// - Serves dev on 0.0.0.0:3000 (supervisor + preview ingress expect that).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const clientEnv = Object.fromEntries(
    Object.entries(env).filter(([k]) => k.startsWith("REACT_APP_") || k.startsWith("VITE_"))
  );

  return {
    plugins: [react({ include: /\.(js|jsx|ts|tsx)$/ })],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    // Compile .js files as JSX (CRA convention) so we don't have to rename hundreds of files.
    esbuild: {
      loader: "jsx",
      include: /src\/.*\.(js|jsx|ts|tsx)$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: { ".js": "jsx" },
      },
    },
    // Expose CRA-style process.env.REACT_APP_* variables to the client code.
    define: {
      "process.env": JSON.stringify(clientEnv),
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      allowedHosts: true,
      hmr: {
        clientPort: 443,
      },
      watch: {
        ignored: ["**/node_modules/**", "**/.git/**", "**/build/**", "**/dist/**"],
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
    },
    build: {
      outDir: "build",
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
    },
  };
});
