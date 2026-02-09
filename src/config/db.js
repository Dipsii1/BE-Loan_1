const mysql = require("mysql2");
require("dotenv").config()

const db = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = db.promise();
