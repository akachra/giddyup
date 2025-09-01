import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import fs from "node:fs";
import path from "node:path";

// ⬇️ Remove top-level vite imports; define a tiny logger here instead
const log = (msg: string) => console.log(`[express] ${msg}`);
import { setupHealthImportScheduler } from "./scheduler";

// Force override if provided
if (process.env.FORCE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.FORCE_DATABASE_URL;
}

// --- TEMP DEBUG: Which DB URL is my deploy using? ---
try {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.log("[BOOT] No DATABASE_URL visible at runtime");
  } else {
    const u = new URL(raw);
    console.log("[BOOT] DB host:", u.hostname, "DB name:", u.pathname, "SSL:", u.searchParams.get("sslmode"));
  }
} catch (e) {
  console.log("[BOOT] DATABASE_URL parse error:", e);
}
// --- END TEMP ---

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API timing/logger
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
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

// --- PROD-ONLY auth shims (unchanged) ---
if (process.env.NODE_ENV === "production") {
  app.use((req, _res, next) => {
    const sessionId =
      (req as any)?.user?.id ||
      (req as any)?.session?.userId ||
      (req as any)?.auth?.userId;

    if (!sessionId && process.env.FORCE_USER_ID) {
      const uid = process.env.FORCE_USER_ID!;
      (req as any).user = { id: uid };
      (req as any).session = { ...(req as any).session, userId: uid };
      console.log("[WHOAMI] using forced user id:", uid);
    }
    next();
  });

  app.use((req, _res, next) => {
    const forcedId = process.env.FORCE_USER_ID;
    if (forcedId) {
      const email = process.env.FORCE_EMAIL || "akachra1@gmail.com";
      (req as any).user = { ...(req as any).user, id: forcedId, email };
      (req as any).isAuthenticated = () => true;
      (req as any).session = {
        ...(req as any).session,
        userId: forcedId,
        email,
        passport: { user: { id: forcedId, email } },
      };
    }
    next();
  });

  app.get("/api/manual-heart-rate", async (_req, res) => {
    const userId = process.env.FORCE_USER_ID;
    if (!userId) return res.json([]);
    try {
      const { Client } = await import("pg");
      const client = new Client({
        connectionString: process.env.FORCE_DATABASE_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();
      const r = await client.query(
        `select id, user_id, date, bpm
           from public.manual_heart_rate
          where user_id = $1
          order by date desc
          limit 100`,
        [userId]
      );
      await client.end();
      return res.json(r.rows);
    } catch (e) {
      console.log("[MANUAL-HR SHIM] error:", e);
      return res.json([]);
    }
  });

  app.get("/api/manual-heart-rate/:date", async (req, res) => {
    const userId = process.env.FORCE_USER_ID;
    if (!userId) return res.json([]);
    const date = req.params.date;
    try {
      const { Client } = await import("pg");
      const client = new Client({
        connectionString: process.env.FORCE_DATABASE_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();
      const r = await client.query(
        `select id, user_id, date, bpm
           from public.manual_heart_rate
          where user_id = $1 and date::date = $2::date
          order by date desc`,
        [userId, date]
      );
      await client.end();
      return res.json(r.rows);
    } catch (e) {
      console.log("[MANUAL-HR SHIM] error:", e);
      return res.json([]);
    }
  });

  app.use("/api/auth/user", (_req, res) => {
    const id = process.env.FORCE_USER_ID;
    const email = process.env.FORCE_EMAIL || "akachra1@gmail.com";
    if (!id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const payload = {
      user: { id, email, name: "Aly", picture: "" },
      id,
      email,
      authenticated: true,
      roles: ["user"],
    };
    console.log("[AUTH OVERRIDE] /api/auth/user -> 200", payload);
    return res.json(payload);
  });
}

// --- Single AUTH DEBUG block (remove duplicate) ---
app.use((req, _res, next) => {
  if (req.path.startsWith("/api")) {
    console.log("[AUTH DEBUG] user:", (req as any)?.user);
    console.log("[AUTH DEBUG] session:", (req as any)?.session);
    console.log("[AUTH DEBUG] auth:", (req as any)?.auth);
  }
  next();
});

(async () => {
  const { server, storage } = await registerRoutes(app);

  // schedulers
  setupHealthImportScheduler(storage);
  const { backupScheduler } = await import("./backupScheduler");
  backupScheduler.start();
  const { deploymentSyncManager } = await import("./deploymentSync");
  await deploymentSyncManager.initializeSyncSystem();

  // error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

// Use direct static serving instead of Vite
const clientDist = path.join(process.cwd(), "client", "dist");
console.log("[FRONTEND] Checking for static files at:", clientDist);
console.log("[FRONTEND] Files exist:", fs.existsSync(clientDist));
if (fs.existsSync(clientDist)) {
  // serve static assets (js/css/images)
  app.use(express.static(clientDist, { index: false, maxAge: "1h" }));
  // SPA fallback to index.html
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
  console.log("[express] Serving static client from:", clientDist);
} else {
  console.log("[express] No static client build found; API will still run.");
}


  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
