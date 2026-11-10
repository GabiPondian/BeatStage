import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const proxyTarget = env.VITE_PROXY_TARGET || "http://localhost:3000";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true
        },
        //FOTOS DE PERFIL ENVIADAS FICAM NO BACKEND, EM /uploads
        "/uploads": {
          target: proxyTarget,
          changeOrigin: true
        }
      }
    },
    preview: {
      port: 4173,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/uploads": {
          target: proxyTarget,
          changeOrigin: true
        }
      }
    }
  };
});
