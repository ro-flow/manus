import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import mollieWebhook from "../webhooks/mollie";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy for rate limiting behind reverse proxy (Manus hosting)
  app.set('trust proxy', 1);

  // ============ SECURITY MIDDLEWARE ============
  
  // Helmet security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://maps.googleapis.com", "https://maps.gstatic.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        connectSrc: ["'self'", "https:", "wss:"],
        frameSrc: ["'self'", "https://maps.google.com", "https://www.google.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false, // Required for Google Maps
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));

  // Global rate limiter - 100 requests per minute per IP
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 500, // 500 requests per minute
    message: { error: "Te veel verzoeken. Probeer het later opnieuw." },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for webhooks (they have their own auth)
      return req.path.startsWith("/api/webhooks");
    },
  });
  app.use(globalLimiter);

  // Stricter rate limiter for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per 15 minutes
    message: { error: "Te veel inlogpogingen. Probeer het over 15 minuten opnieuw." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/oauth", authLimiter);

  // Stricter rate limiter for analysis endpoints (expensive operations)
  const analysisLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 analyses per minute
    message: { error: "Te veel analyses. Wacht even voordat je een nieuwe analyse start." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/trpc/analyse", analysisLimiter);

  // ============ BODY PARSERS ============
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ============ CSRF PROTECTION ============
  
  // CSRF token endpoint - generates a token for state-changing operations
  app.get("/api/csrf-token", (req, res) => {
    // Generate a simple CSRF token based on session
    // In production, use a proper CSRF library like csurf
    const token = Buffer.from(
      JSON.stringify({
        timestamp: Date.now(),
        random: Math.random().toString(36).substring(2),
      })
    ).toString("base64");
    
    res.cookie("csrf-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 hour
    });
    
    res.json({ token });
  });

  // CSRF validation middleware for mutations
  app.use("/api/trpc", (req, res, next) => {
    // Skip CSRF check for GET requests (queries)
    if (req.method === "GET") {
      return next();
    }
    
    // Skip CSRF check for webhooks
    if (req.path.includes("webhook") || req.path.includes("Webhook")) {
      return next();
    }

    // For mutations, check CSRF token
    const csrfHeader = req.headers["x-csrf-token"];
    const csrfCookie = req.cookies?.["csrf-token"];
    
    // In development, be more lenient
    if (process.env.NODE_ENV === "development") {
      return next();
    }
    
    // In production, require CSRF token for mutations
    if (!csrfHeader || csrfHeader !== csrfCookie) {
      // Log but don't block yet - gradual rollout
      console.warn("[CSRF] Token mismatch for:", req.path);
      // Uncomment to enforce:
      // return res.status(403).json({ error: "CSRF token invalid" });
    }
    
    next();
  });

  // ============ ROUTES ============
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Mollie webhook routes
  app.use("/api/webhooks", mollieWebhook);
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // ============ STATIC FILES ============
  
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ============ START SERVER ============

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`Security: Helmet enabled, Rate limiting active`);
  });
}

startServer().catch(console.error);
