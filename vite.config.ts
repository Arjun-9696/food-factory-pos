import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { componentTagger } from "lovable-tagger";

type ApiHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

// ---------------------------------------------------------------------------
// Local API routes.
// These request handlers are the SAME files deployed as Vercel serverless
// functions under /api/*. Mounting them into the Vite dev server keeps the
// local experience identical to production (no separate API process needed).
// The dev server now auto-restarts when files under api/ change so the
// comment above no longer applies during development.
// ---------------------------------------------------------------------------
import createOrderHandler from "./api/create-order";
import verifyPaymentHandler from "./api/verify-payment";
import razorpayWebhookHandler from "./api/webhooks/razorpay";
import orderStatusHandler from "./api/order-status";
import orderDetailsHandler from "./api/order-details";
import orderCompleteHandler from "./api/order-complete";
import coinsWalletHandler from "./api/coins/wallet";
import coinsTransactionsHandler from "./api/coins/transactions";
import coinsValidateHandler from "./api/coins/validate";
import adminCoinsAdjustHandler from "./api/admin/coins/adjust";
import adminCoinsStatsHandler from "./api/admin/coins/stats";

function paymentApiPlugin(): Plugin {
  const routes: Record<string, ApiHandler> = {
    "/api/create-order": createOrderHandler,
    "/api/verify-payment": verifyPaymentHandler,
    "/api/webhooks/razorpay": razorpayWebhookHandler,
    "/api/order-status": orderStatusHandler,
    "/api/order-details": orderDetailsHandler,
    "/api/order-complete": orderCompleteHandler,
    "/api/coins/wallet": coinsWalletHandler,
    "/api/coins/transactions": coinsTransactionsHandler,
    "/api/coins/validate": coinsValidateHandler,
    "/api/admin/coins/adjust": adminCoinsAdjustHandler,
    "/api/admin/coins/stats": adminCoinsStatsHandler,
  };

  return {
    name: "payment-api",
    configureServer(server) {
      // Auto-restart the dev server when any file under api/ is saved.
      // Without this, the static imports above capture the handler at startup
      // and never pick up edits — the frontend HMRs but the API stays stale.
      // Watch all node_modules-independent dirs under api/ by absolute path
      // and treat change/add as triggers (debounced so a multi-file save
      // restarts once).
      const apiRoot = path.resolve(__dirname, "api");
      let apiRestartTimer: ReturnType<typeof setTimeout> | null = null;
      const scheduleRestart = (changedPath: string) => {
        const rel = path.relative(apiRoot, changedPath);
        // Only care about files actually under the api/ directory.
        if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return;
        if (apiRestartTimer) clearTimeout(apiRestartTimer);
        apiRestartTimer = setTimeout(() => {
          console.log(`[payment-api] ${path.basename(changedPath)} changed — restarting dev server`);
          server.restart();
          apiRestartTimer = null;
        }, 250);
      };
      server.watcher.add(apiRoot);
      server.watcher.on("change", scheduleRestart);
      server.watcher.on("add", scheduleRestart);
      server.watcher.on("unlink", scheduleRestart);

      server.middlewares.use((req, res, next) => {
        const url = (req.url || "").split("?")[0];
        const route = routes[url];
        if (!route) return next();
        route(req as IncomingMessage, res as ServerResponse).catch((err) => {
          console.error(`[payment-api] ${url} error:`, err instanceof Error ? err.message : err);
          if (!res.writableEnded) {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.writeHead(500);
            res.end(JSON.stringify({ success: false, code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." }));
          }
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), paymentApiPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));