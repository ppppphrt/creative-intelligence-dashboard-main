import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

// FR-01: auto-sync Meta Ads every 3 hours when credentials are available
const THREE_HOURS = 3 * 60 * 60 * 1000;
async function scheduleMetaSync() {
  const { ENV } = await import("./env");
  if (!ENV.metaAccessToken && (!ENV.forgeApiUrl || !ENV.forgeApiKey)) return;

  const { syncAllAccountsWithForge } = await import("../services/metaAdsForgeService");

  const run = async () => {
    console.log("[AutoSync] Running scheduled Meta Ads sync (performance only)...");
    try {
      // Skip thumbnail fetch in auto-sync to avoid Management API rate limits
      const result = await syncAllAccountsWithForge(false);
      console.log(`[AutoSync] Done — ${(result as any).totalAdsSynced ?? 0} ads synced`);
    } catch (err) {
      console.error("[AutoSync] Sync failed:", err);
    }
  };

  // Run once on startup, then every 3 hours
  run();
  setInterval(run, THREE_HOURS);
}

scheduleMetaSync();
