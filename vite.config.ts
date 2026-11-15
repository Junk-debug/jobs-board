import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv, type ProxyOptions } from "vite";
import { defineConfig } from "vitest/config";
import { z } from "zod";

const serverEnvSchema = z.object({
  COOPLE_API_ORIGIN: z.url().default("https://www.coople.com"),
});

export default defineConfig(({ mode }) => {
  const serverEnv = serverEnvSchema.parse(loadEnv(mode, process.cwd(), ""));

  const apiProxy: Record<string, ProxyOptions> = {
    "/api": {
      target: serverEnv.COOPLE_API_ORIGIN,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, "/ch/resources/api"),
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": resolve(import.meta.dirname, "./src"),
      },
    },
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy },
    test: {
      include: ["src/**/*.test.{ts,tsx}"],
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
      restoreMocks: true,
    },
  };
});
