import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerAdminRoutes } from "./routes";
import { validateSlug } from "./middleware";
import { createServer } from "http";
import { connectDatabase } from "../../server/db";
import { setupAdmin } from "../../server/setup-admin";
import { startBlacklistMonitoring } from "../../server/blacklist-service";
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
const currentDir = getCurrentDir();

const app = express();
const httpServer = createServer(app);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

function log(message: string, source = "admin-panel") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && res.statusCode >= 400) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    await connectDatabase();
    await setupAdmin();
    await registerAdminRoutes(app);
    
    startBlacklistMonitoring(24);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${message}`, "error");
      res.status(status).json({ message });
    });

    const isProduction = process.env.NODE_ENV?.trim() === "production";

    app.use("/secure/:slug", validateSlug);

    if (isProduction) {
      const clientDistPath = path.join(currentDir, "..", "client", "dist");
      app.use(express.static(clientDistPath));
      
      app.get("*", (_req, res) => {
        res.sendFile(path.join(clientDistPath, "index.html"));
      });
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    const adminPort = parseInt(process.env.ADMIN_PORT || "3001", 10);
    const adminHost = process.env.ADMIN_HOST || "127.0.0.1";
    
    httpServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[FATAL] Port ${adminPort} is already in use. Please stop the other process or change ADMIN_PORT.`);
      } else {
        console.error("[FATAL] Server error:", err);
      }
      process.exit(1);
    });

    httpServer.listen(adminPort, adminHost, () => {
      log("");
      log("=".repeat(80));
      log("ADMIN PANEL SERVER STARTED", "security");
      log("=".repeat(80));
      log(`URL: http://${adminHost}:${adminPort}`);
      log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      log("");
      log("SECURITY NOTICE:");
      log(`   - This admin panel is ONLY accessible from: ${adminHost}`);
      log(`   - Default port: ${adminPort}`);
      log(`   - For production, ensure firewall rules block external access`);
      log(`   - Use VPN or SSH tunnel for remote access`);
      log("=".repeat(80));
      log("");
    });
  } catch (error) {
    console.error("[FATAL] Failed to start admin panel server:", error);
    process.exit(1);
  }
})();

