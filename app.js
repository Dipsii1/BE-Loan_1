var createError = require("http-errors")
var express = require("express")
var path = require("path")
var cookieParser = require("cookie-parser")
var logger = require("morgan")
var cors = require("cors")

var indexRouter = require("./src/routes/index")
var usersRouter = require("./src/routes/users")
var creditApplicationsRouter = require("./src/routes/creditAplications")
var statusApplicationsRouter = require("./src/routes/applicationStatus")
var profileRouter = require("./src/routes/profile")

var app = express()

// basic middleware
app.use(logger("dev"))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, "public")))

// cors configuration (harus di atas routes)
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
)

// handle preflight request
app.options("*", cors())

// disable cache (penting untuk fetch FE)
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
  const statusCode = err.status || 500

  res.status(statusCode).json({
    error: true,
    message: err.message,
    ...(req.app.get("env") === "development" && {
      stack: err.stack,
    }),
  })
})

// server
const port = process.env.APP_PORT || 4000
const env = process.env.ENV_TYPE || "development"

app.listen(port, () => {
  console.log(`Server running in ${env} mode on port ${port}`)
})

module.exports = app
