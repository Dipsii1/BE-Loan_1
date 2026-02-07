const createError = require("http-errors");
const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");

// Router
const indexRouter = require("./src/routes/index");
const usersRouter = require("./src/routes/users");
const authRouter = require("./src/routes/authRoutes")
// const creditApplicationsRouter = require("./src/routes/creditAplications"); 
// const statusApplicationsRouter = require("./src/routes/applicationStatus");

const app = express();

// Middleware
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// CORS
const allowedOrigins = [
  "http://localhost:3000",
  "https://loan-mu-nine.vercel.app",
  "https://orangered-dragonfly-199687.hostingersite.com/"
  
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.options("*", cors());

// Disable caching
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Routes
app.use("/", indexRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/auth", authRouter)
// app.use("/credit-applications", creditApplicationsRouter);
// app.use("/application-status", statusApplicationsRouter);

// 404 Handler
app.use((req, res, next) => {
  next(createError(404, "Endpoint tidak ditemukan"));
});

// Error Handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: true,
    message: err.message,
  });
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`✅ Server berjalan di port ${PORT}`);
});

module.exports = app;
