import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom")
          ) {
            return "vendor-react";
          }
          if (id.includes("node_modules/@clerk")) {
            return "vendor-clerk";
          }
          if (id.includes("node_modules/@supabase")) {
            return "vendor-supabase";
          }
        },
      },
    },
  },

  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (err, _req, res) => {
            console.warn(
              "[proxy] /api/chat unreachable — is vercel dev running?",
            );
            res.writeHead(503, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error:
                  'Dev proxy unavailable. Run "vercel dev" or set VITE_GEMINI_DEV_KEY in .env',
              }),
            );
          });
        },
      },
    },
  },
});
