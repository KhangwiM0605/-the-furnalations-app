require("dotenv").config();

const bcrypt = require("bcryptjs");
const cors = require("cors");
const { createHash, randomBytes } = require("node:crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const { MongoClient, ObjectId } = require("mongodb");
const { z } = require("zod");

const configSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  FRONTEND_ORIGIN: z.string().url(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  FRONTEND_URL: z.string().url().optional()
}).superRefine((config, context) => {
  if (config.RESEND_API_KEY && !config.EMAIL_FROM) {
    context.addIssue({
      code: "custom",
      path: ["EMAIL_FROM"],
      message: "EMAIL_FROM is required when RESEND_API_KEY is configured."
    });
  }
  if (config.RESEND_API_KEY && !config.FRONTEND_URL) {
    context.addIssue({
      code: "custom",
      path: ["FRONTEND_URL"],
      message: "FRONTEND_URL is required when RESEND_API_KEY is configured."
    });
  }
});

const parsedConfig = configSchema.safeParse(process.env);
if (!parsedConfig.success) {
  console.error("Invalid server configuration:", parsedConfig.error.flatten().fieldErrors);
  process.exit(1);
}

const {
  PORT,
  NODE_ENV,
  MONGODB_URI,
  MONGODB_DB,
  JWT_SECRET,
  RESEND_API_KEY,
  EMAIL_FROM,
  FRONTEND_URL
} = parsedConfig.data;
const FRONTEND_ORIGIN = new URL(parsedConfig.data.FRONTEND_ORIGIN).origin;
const emailVerificationEnabled = Boolean(RESEND_API_KEY && EMAIL_FROM && FRONTEND_URL);
const app = express();
const mongoClient = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const userInputSchema = z.object({
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(8).refine(value => Buffer.byteLength(value, "utf8") <= 72, {
    message: "Password must be no more than 72 UTF-8 bytes."
  })
});
const signUpInputSchema = userInputSchema.extend({
  displayName: z.string().trim().min(1).max(60)
});
const verificationInputSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i)
}).strict();
const emailInputSchema = z.object({
  email: userInputSchema.shape.email
}).strict();
const dateKeySchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(value => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  });
const progressSchema = z.object({
  checkins: z.array(z.object({
    date: dateKeySchema,
    reflection: z.string().max(500)
  }).strict()).max(3000).refine(entries => new Set(entries.map(entry => entry.date)).size === entries.length),
  challengeHistory: z.record(dateKeySchema, z.literal(true)).refine(entries => Object.keys(entries).length <= 3000),
  savedRules: z.array(z.number().int().min(1).max(12)).max(12)
    .refine(rules => new Set(rules).size === rules.length)
}).strict();

let users;
let progress;

app.disable("x-powered-by");
if (NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    let isLocalDevelopmentOrigin = false;
    if (origin && NODE_ENV === "development") {
      try {
        const url = new URL(origin);
        isLocalDevelopmentOrigin = url.protocol === "http:"
          && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      } catch {
        isLocalDevelopmentOrigin = false;
      }
    }

    if (!origin || origin === FRONTEND_ORIGIN || isLocalDevelopmentOrigin) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin is not allowed by CORS."));
  },
  methods: ["GET", "POST", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600
}));
app.use(express.json({ limit: "2mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please wait a few minutes and try again." }
});
const verificationEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many verification email requests. Please try again later." }
});

function publicUser(user) {
  return {
    id: user._id.toHexString(),
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString()
  };
}

function createAccessToken(user) {
  return jwt.sign({ sub: user._id.toHexString() }, JWT_SECRET, {
    expiresIn: "1h",
    issuer: "furnalations-api",
    audience: "furnalations-web"
  });
}

function respondWithSession(res, user, status = 200) {
  res.status(status).json({
    accessToken: createAccessToken(user),
    expiresIn: 3600,
    user: publicUser(user)
  });
}

function hashVerificationToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

async function sendVerificationEmail(user, token) {
  const verificationUrl = new URL("login.html", `${FRONTEND_URL.replace(/\/+$/, "")}/`);
  verificationUrl.hash = new URLSearchParams({ verify: token }).toString();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [user.email],
      subject: "Verify your Furnalations account",
      text: `Hello ${user.displayName},\n\nVerify your email address to activate your Furnalations account:\n${verificationUrl}\n\nThis link expires in 24 hours. If you did not create this account, you can ignore this email.`,
      html: `<p>Hello ${escapeHtml(user.displayName)},</p><p>Verify your email address to activate your Furnalations account:</p><p><a href="${verificationUrl.toString()}">Verify my email address</a></p><p>This link expires in 24 hours. If you did not create this account, you can ignore this email.</p>`
    })
  });
  if (!response.ok) {
    throw new Error(`Resend returned HTTP ${response.status}.`);
  }
}

async function issueVerificationEmail(user) {
  const token = randomBytes(32).toString("hex");
  const result = await users.updateOne(
    { _id: user._id, emailVerified: false },
    {
      $set: {
        emailVerificationTokenHash: hashVerificationToken(token),
        emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    }
  );
  if (!result.matchedCount) {
    throw new Error("Account is already verified or is no longer available.");
  }
  await sendVerificationEmail(user, token);
}

function validateBody(schema, req, res) {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Please check the information you entered.",
      fields: parsed.error.issues.map(issue => ({ field: issue.path.join("."), message: issue.message }))
    });
    return null;
  }
  return parsed.data;
}

function requireAccessToken(req, res, next) {
  const authorization = req.get("authorization") || "";
  const [scheme, token, ...extra] = authorization.split(" ");
  if (scheme !== "Bearer" || !token || extra.length) {
    res.status(401).json({ error: "Please sign in to continue." });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: "furnalations-api",
      audience: "furnalations-web"
    });
    if (typeof payload === "string" || typeof payload.sub !== "string" || !ObjectId.isValid(payload.sub)) {
      res.status(401).json({ error: "Your session is invalid. Please sign in again." });
      return;
    }
    req.userId = new ObjectId(payload.sub);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Your session expired. Please sign in again." });
      return;
    }
    next(error);
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/signup", authLimiter, async (req, res, next) => {
  const input = validateBody(signUpInputSchema, req, res);
  if (!input) return;

  try {
    const existing = await users.findOne({ email: input.email }, { projection: { _id: 1 } });
    if (existing) {
      res.status(409).json({ error: "An account with that email already exists. Try signing in instead." });
      return;
    }

    const user = {
      email: input.email,
      displayName: input.displayName,
      passwordHash: await bcrypt.hash(input.password, 12),
      emailVerified: !emailVerificationEnabled,
      createdAt: new Date()
    };
    const result = await users.insertOne(user);
    user._id = result.insertedId;
    if (emailVerificationEnabled) {
      try {
        await issueVerificationEmail(user);
      } catch (error) {
        console.error("Verification email delivery failed:", error.message);
        res.status(502).json({
          error: "Your account was created, but the verification email could not be sent. Please try resending it.",
          code: "VERIFICATION_EMAIL_FAILED"
        });
        return;
      }
      res.status(201).json({ verificationRequired: true });
      return;
    }
    respondWithSession(res, user, 201);
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({ error: "An account with that email already exists. Try signing in instead." });
      return;
    }
    next(error);
  }
});

app.post("/api/auth/verify-email", authLimiter, async (req, res, next) => {
  if (!emailVerificationEnabled) {
    res.status(503).json({ error: "Email verification is not configured yet." });
    return;
  }
  const input = validateBody(verificationInputSchema, req, res);
  if (!input) return;

  try {
    const now = new Date();
    const result = await users.updateOne(
      {
        emailVerified: false,
        emailVerificationTokenHash: hashVerificationToken(input.token),
        emailVerificationExpiresAt: { $gt: now }
      },
      {
        $set: { emailVerified: true, emailVerifiedAt: now },
        $unset: { emailVerificationTokenHash: "", emailVerificationExpiresAt: "" }
      }
    );
    if (!result.matchedCount) {
      res.status(400).json({ error: "This verification link is invalid or has expired. Request a new email and try again." });
      return;
    }
    res.json({ verified: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/resend-verification", verificationEmailLimiter, async (req, res, next) => {
  if (!emailVerificationEnabled) {
    res.status(503).json({ error: "Email verification is not configured yet." });
    return;
  }
  const input = validateBody(emailInputSchema, req, res);
  if (!input) return;

  try {
    const user = await users.findOne(
      { email: input.email, emailVerified: false },
      { projection: { _id: 1, email: 1, displayName: 1 } }
    );
    if (user) {
      try {
        await issueVerificationEmail(user);
      } catch (error) {
        console.error("Verification email delivery failed:", error.message);
      }
    }
    res.json({ message: "If an unverified account exists for that address, a verification email has been sent." });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", authLimiter, async (req, res, next) => {
  const input = validateBody(userInputSchema, req, res);
  if (!input) return;

  try {
    const user = await users.findOne({ email: input.email });
    const passwordMatches = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
    if (!user || !passwordMatches) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    if (!user.emailVerified) {
      res.status(403).json({
        error: "Please verify your email address before signing in. Check your inbox or request a new verification email.",
        code: "EMAIL_NOT_VERIFIED"
      });
      return;
    }
    respondWithSession(res, user);
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireAccessToken, async (req, res, next) => {
  try {
    const user = await users.findOne({ _id: req.userId });
    if (!user) {
      res.status(401).json({ error: "This account is no longer available. Please sign in again." });
      return;
    }
    if (!user.emailVerified) {
      res.status(403).json({
        error: "Please verify your email address before signing in.",
        code: "EMAIL_NOT_VERIFIED"
      });
      return;
    }
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/progress", requireAccessToken, async (req, res, next) => {
  try {
    const savedProgress = await progress.findOne({ userId: req.userId }, { projection: { _id: 0, checkins: 1, challengeHistory: 1, savedRules: 1 } });
    res.json({
      progress: savedProgress || { checkins: [], challengeHistory: {}, savedRules: [] }
    });
  } catch (error) {
    next(error);
  }
});

app.put("/api/progress", requireAccessToken, async (req, res, next) => {
  const input = validateBody(progressSchema, req, res);
  if (!input) return;

  try {
    await progress.replaceOne(
      { userId: req.userId },
      { userId: req.userId, ...input, updatedAt: new Date() },
      { upsert: true }
    );
    res.json({ progress: input });
  } catch (error) {
    next(error);
  }
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found." });
});

app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  if (error.message === "Origin is not allowed by CORS.") {
    res.status(403).json({ error: "This website is not allowed to use the account API." });
    return;
  }
  if (error.type === "entity.parse.failed") {
    res.status(400).json({ error: "The request body must be valid JSON." });
    return;
  }
  if (error.type === "entity.too.large") {
    res.status(413).json({ error: "The request body is too large." });
    return;
  }
  console.error("Unhandled API error:", error);
  res.status(500).json({ error: "The service could not complete that request. Please try again later." });
});

async function start() {
  await mongoClient.connect();
  const database = mongoClient.db(MONGODB_DB);
  await database.command({ ping: 1 });
  users = database.collection("users");
  progress = database.collection("progress");
  await users.createIndex({ email: 1 }, { unique: true, name: "unique_user_email" });
  await progress.createIndex({ userId: 1 }, { unique: true, name: "unique_progress_user" });
  await users.updateMany(
    { emailVerified: { $exists: false } },
    { $set: { emailVerified: true, emailVerifiedAt: new Date() } }
  );

  const host = NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
  const server = app.listen(PORT, host, () => {
    console.log(`Furnalations API listening on port ${PORT} (${NODE_ENV}).`);
  });

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received; closing the Furnalations API.`);
    server.close(async error => {
      try {
        await mongoClient.close();
        if (error) {
          console.error("API shutdown failed:", error);
          process.exitCode = 1;
        }
      } catch (closeError) {
        console.error("Database shutdown failed:", closeError);
        process.exitCode = 1;
      }
    });
  }
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch(async error => {
  console.error("Could not start the Furnalations API:", error.message);
  try {
    await mongoClient.close();
  } catch (closeError) {
    console.error("Could not close the MongoDB client after startup failure:", closeError.message);
  }
  process.exitCode = 1;
});
