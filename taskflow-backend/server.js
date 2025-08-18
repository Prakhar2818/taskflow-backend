// server.js - UPDATED WITH YOUR ACTUAL FRONTEND URL
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const connectDB = require("./config/database");

// Route imports with error handling
let authRoutes, taskRoutes, sessionRoutes;

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

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// ✅ FIXED CORS configuration with your actual frontend URL
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "https://taskflow-wheat.vercel.app", // ✅ Production domain
  "https://taskflow-git-master-prakhars-projects-415595c3.vercel.app", // ✅ Git branch domain
  "https://taskflow-pbcf7qenh-prakhars-projects-415595c3.vercel.app", // ✅ Deployment domain
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
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
  })
);

// Handle preflight requests explicitly
app.options(
  "*",
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser(process.env.COOKIE_SECRET));

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/sessions", sessionRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "TaskFlow API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Global Error:", error);

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
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

const server = app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`
  );
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;
