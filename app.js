// app.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const swaggerDocs = require("./src/swagger");
const AppError = require("./src/ErrorHandling/appErrors");
const errorCodes = require("./src/ErrorHandling/errorCodes");
const errorHandler = require("./src/Middleware/errorHandler.js");
const requireAuth = require("./src/Middleware/requireAuth");
const authorizeRole = require("./src/Middleware/authRole");
const { guestOrCustomerOnly } = require("./src/Middleware/authRole");

const app = express();

// =======================
// 🔒 Security Middleware
// =======================
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for development; configure properly in production
    crossOriginEmbedderPolicy: false,
  })
);

// =======================
// 🌐 Middleware
// =======================
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL]
    : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ✅ Serve static frontend files
app.use(express.static(path.join(__dirname, "FrontEnd")));
app.use("/images", express.static(path.join(__dirname, "FrontEnd", "images")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =======================
// 🚀 Rate Limiting
// =======================
const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth attempts per windowMs
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// =======================
// 📦 Routes
// =======================
const authRoutes = require("./src/Routes/authRoutes");
const productRoutes = require("./src/Routes/productRoutes");
const cartRoutes = require("./src/Routes/cartRoutes");
const orderRoutes = require("./src/Routes/orderRoutes");
const userRoutes = require("./src/Routes/userRoutes");
const reviewRoutes = require("./src/Routes/reviewRoutes");

// ✅ API routes
app.use("/api", apiLimiter); // Apply general rate limiting to all API routes
app.use("/api/auth", authLimiter, authRoutes); // Stricter limit for auth
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);

// ✅ Health check (optional)
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Bakery API is running!" });
});

// ✅ HTML pages
app.get("/loginPage", (req, res) => {
  if (req.cookies.token) {
    return res.redirect("/home");
  }
  return res.sendFile(path.join(__dirname, "FrontEnd", "Login.html"));
});

app.get("/home", guestOrCustomerOnly, (req, res) => {
  return res.sendFile(path.join(__dirname, "FrontEnd", "homepage.html"));
});
// Serve Cart Page
app.get("/cart", (req, res) => {
  res.sendFile(path.join(__dirname, "FrontEnd", "cart.html"));
});

// Serve Orders Page
app.get("/orders", (req, res) => {
  res.sendFile(path.join(__dirname, "FrontEnd", "order.html"));
});

// ✅ Admin dashboard (server-side protected)
app.get("/admin", requireAuth, authorizeRole("admin"), (req, res) => {
  return res.sendFile(path.join(__dirname, "FrontEnd", "admin.html"));
});

// ✅ Driver dashboard (server-side protected)
app.get("/driver", requireAuth, authorizeRole("driver"), (req, res) => {
  return res.sendFile(path.join(__dirname, "FrontEnd", "driver.html"));
});

// ✅ Swagger setup
swaggerDocs(app);

// =======================
// 🚨 Error Handling
// =======================
app.use((req, res, next) => {
  if (!res.headersSent) {
    return next(
      new AppError(
        "NOT_FOUND",
        errorCodes.NOT_FOUND.message,
        errorCodes.NOT_FOUND.httpStatus
      )
    );
  }
  next();
});

app.use(errorHandler);

module.exports = app;
