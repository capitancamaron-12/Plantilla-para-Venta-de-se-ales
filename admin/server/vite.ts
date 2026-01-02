import type { Server } from "http";
import type { Express } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory - works in both ESM and CJS environments
function getCurrentDir() {
  try {
    // In CJS bundles, __dirname is available as a module variable
    return __dirname;
  } catch {
    // In ESM, derive from import.meta.url
    return path.dirname(fileURLToPath(import.meta.url));
  }
}

export async function setupVite(httpServer: Server, app: Express) {
  const currentDir = getCurrentDir();
  const vite = await createViteServer({
    root: path.resolve(currentDir, "..", "client"),
    server: {
      middlewareMode: true,
      hmr: {
        server: httpServer,
      },
    },
    appType: "spa",
  });

  app.use(vite.middlewares);
}
