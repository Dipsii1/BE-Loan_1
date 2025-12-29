var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');


var indexRouter = require('./src/routes/index');
var usersRouter = require('./src/routes/users');
var creditAplicationsRouter = require('./src/routes/creditAplications');
var statusApplicationsRouter = require('./src/routes/applicationStatus');
var profileRouter = require('./src/routes/profile');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// cors
app.use(
  cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    
  })
);

// preflight untuk semua route
app.options('*', cors());

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/credit-applications', creditAplicationsRouter);
app.use('/application-status', statusApplicationsRouter);
app.use('/profile', profileRouter);

// 404 handler
app.use((req, res, next) => {
  next(createError(404));
});

// Error handler (MUST use 4 parameters)
app.use((err, req, res, next) => {
  const env = req.app.get('env');
  const statusCode = err.status || 500;

  res.status(statusCode).json({
    error: true,
    message: err.message,
    ...(env === 'development' && { stack: err.stack }),
  });
});

const port = process.env.APP_PORT || 4000;
const env = process.env.ENV_TYPE || 'production';

app.listen(port, () => {
  console.log(`Server running in ${env} mode on port ${port}`);
});


module.exports = app;
