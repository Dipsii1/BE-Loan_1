var createError = require("http-errors")
var express = require("express")
var cookieParser = require("cookie-parser")
var logger = require("morgan")
var cors = require("cors")

var indexRouter = require("./src/routes/index")
var usersRouter = require("./src/routes/users")
var creditApplicationsRouter = require("./src/routes/creditAplications")
var statusApplicationsRouter = require("./src/routes/applicationStatus")
var profileRouter = require("./src/routes/profile")

var app = express()

// middleware
app.use(logger("dev"))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

// CORS
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://loan-mu-nine.vercel.app"
    ],
    credentials: true,
  })
)

app.options("*", cors())

// disable cache
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store")
  res.setHeader("Pragma", "no-cache")
  res.setHeader("Expires", "0")
  next()
})

// routes
app.use("/", indexRouter)
app.use("/users", usersRouter)
app.use("/credit-applications", creditApplicationsRouter)
app.use("/application-status", statusApplicationsRouter)
app.use("/profile", profileRouter)

// 404 handler
app.use((req, res, next) => {
  next(createError(404, "Endpoint tidak ditemukan"))
})

// error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: true,
    message: err.message,
    ...(process.env.NODE_ENV !== "production" && {
      stack: err.stack,
    }),
  })
})

module.exports = app
