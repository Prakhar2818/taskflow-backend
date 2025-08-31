// server.js - FIXED FOR RENDER DEPLOYMENT WITH MONGOOSE STRICTPOPULATE FIX
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const connectDB = require("./config/database");

// ✅ ADD: Global Mongoose Configuration (BEFORE connecting to database)
mongoose.set('strictPopulate', false); // Prevents "Cannot populate path" errors

// Route imports with error handling
let authRoutes, taskRoutes, sessionRoutes, workspaceRoutes;

try {
  authRoutes = require("./routes/auth");
} catch (error) {
  console.error("❌ Auth routes error:", error.message);
  authRoutes = express.Router();
}

try {
  taskRoutes = require("./routes/tasks");
} catch (error) {
  console.error("❌ Task routes error:", error.message);
  taskRoutes = express.Router();
}

try {
  sessionRoutes = require("./routes/sessions");
} catch (error) {
  console.error("❌ Session routes error:", error.message);
  sessionRoutes = express.Router();
}

try{
  workspaceRoutes = require("./routes/workspace");
} catch(error){
  console.error("❌ Workspace routes error:", error.message);
  workspaceRoutes = express.Router();
}

const app = express();

// ✅ TRUST PROXY FOR RENDER
app.set('trust proxy', 1);

// Connect to database
connectDB();

// ✅ SIMPLIFIED HELMET CONFIGURATION (Render-friendly)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable CSP that might interfere with CORS
}));

// Rate limiting (more lenient for production)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ✅ SIMPLIFIED AND IMPROVED CORS CONFIGURATION
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://taskflow-wheat.vercel.app",
  "https://taskflow-git-master-prakhars-projects-415595c3.vercel.app",
  "https://taskflow-pbcf7qenh-prakhars-projects-415595c3.vercel.app",
];

// ✅ MANUAL CORS HEADERS (More reliable on Render)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  const isAllowed = allowedOrigins.some(allowed => {
    if (typeof allowed === 'string') {
      return allowed === origin;
    }
    if (allowed instanceof RegExp) {
      return allowed.test(origin);
    }
    return false;
  });

  if (isAllowed || !origin) { // Allow requests with no origin (mobile apps)
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,X-Access-Token');
  res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// ✅ BACKUP CORS MIDDLEWARE (fallback)
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      }
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked origin: ${origin}`);
      callback(null, false); // Don't throw error, just block
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With", 
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "X-Access-Token",
  ],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser(process.env.COOKIE_SECRET));

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  // Less verbose logging in production
  app.use(morgan("combined"));
}

// ✅ ADD REQUEST LOGGING FOR DEBUGGING
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/workspaces", workspaceRoutes);

// ✅ ENHANCED HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "TaskFlow API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongoose: {
      strictPopulate: false, // ✅ ADD: Show mongoose config
      connectionState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    },
    cors: {
      origin: req.headers.origin,
      allowed: allowedOrigins,
    },
  });
});

// ✅ ADD CORS TEST ENDPOINT
app.get("/api/cors-test", (req, res) => {
  res.json({
    success: true,
    message: "CORS is working!",
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Global Error:", error);
  
  // Don't expose stack traces in production
  const response = {
    success: false,
    message: error.message || "Internal Server Error",
  };
  
  if (process.env.NODE_ENV === "development") {
    response.stack = error.stack;
  }

  res.status(error.statusCode || 500).json(response);
});

// 404 handler
app.all("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
    method: req.method,
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "0.0.0.0", () => { // ✅ Bind to all interfaces
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`🌐 Allowed origins:`, allowedOrigins);
  console.log(`🔧 Mongoose strictPopulate: false`); // ✅ ADD: Log mongoose config
});

// ✅ GRACEFUL SHUTDOWN
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received");
  server.close(() => {
    console.log("✅ Process terminated");
  });
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;
