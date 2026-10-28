require("dotenv").config();

const bcrypt = require("bcryptjs");
const cors = require("cors");
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
  FRONTEND_ORIGIN: z.string().url()
});

const parsedConfig = configSchema.safeParse(process.env);
if (!parsedConfig.success) {
  console.error("Invalid server configuration:", parsedConfig.error.flatten().fieldErrors);
  process.exit(1);
}

const { PORT, NODE_ENV, MONGODB_URI, MONGODB_DB, JWT_SECRET } = parsedConfig.data;
const FRONTEND_ORIGIN = new URL(parsedConfig.data.FRONTEND_ORIGIN).origin;
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

let users;

app.disable("x-powered-by");
if (NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === FRONTEND_ORIGIN) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin is not allowed by CORS."));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600
}));
app.use(express.json({ limit: "10kb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please wait a few minutes and try again." }
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
      createdAt: new Date()
    };
    const result = await users.insertOne(user);
    user._id = result.insertedId;
    respondWithSession(res, user, 201);
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({ error: "An account with that email already exists. Try signing in instead." });
      return;
    }
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
    res.json({ user: publicUser(user) });
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
  await users.createIndex({ email: 1 }, { unique: true, name: "unique_user_email" });

  const server = app.listen(PORT, () => {
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
