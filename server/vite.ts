import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep a tiny logger here too (index.ts uses its own local one)
export const log = (msg: string) => console.log(`[express] ${msg}`);

/** DEV ONLY: dynamically import vite + plugins inside the function */
export async function setupVite(app: any, _server: any) {
  try {
    const { createServer } = await import("vite");
    const react = (await import("@vitejs/plugin-react")).default;

    // Optional Replit plugins – ignore if not installed
    let cartographer: any = null;
    let runtimeErrorModal: any = null;
    try { cartographer = (await import("@replit/vite-plugin-cartographer")).default; } catch {}
    try { runtimeErrorModal = (await import("@replit/vite-plugin-runtime-error-modal")).default; } catch {}

    const plugins = [react()];
    if (cartographer) plugins.push(cartographer());
    if (runtimeErrorModal) plugins.push(runtimeErrorModal());

    const vite = await createServer({
      appType: "custom",
      server: { middlewareMode: true },
      plugins,
    });

    app.use(vite.middlewares);
    log("Vite middleware attached (development)");
  } catch (err) {
    console.error("[VITE SETUP] failed in dev:", err);
    throw err; // let index.ts fall back to serveStatic
  }
}

/** PROD (and dev fallback): serve prebuilt client if present */
export function serveStatic(app: any) {
  const candidates = [
    path.resolve(__dirname, "../dist"),          // typical vite build output
    path.resolve(__dirname, "../client/dist"),
    path.resolve(__dirname, "../dist/client"),
    path.resolve(__dirname, "../build"),
    path.resolve(__dirname, "../../client/dist"),
  ];

  const root = candidates.find((p) => existsWithIndexHtml(p));
  if (!root) {
    log("No static client build found; API will still run.");
    return;
  }

  app.use(express.static(root));
  app.get("*", (_req, res) => res.sendFile(path.join(root, "index.html")));
  log(`Serving static client from: ${root}`);
}

function existsWithIndexHtml(p: string) {
  try {
    const fs = require("node:fs");
    return fs.existsSync(p) && fs.existsSync(path.join(p, "index.html"));
  } catch {
    return false;
  }
}
