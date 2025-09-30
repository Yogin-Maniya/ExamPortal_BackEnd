const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER, // Username from .env file
  password: process.env.DB_PASSWORD, // Password from .env file
  server: process.env.DB_SERVER, // Server name from .env file
  database: process.env.DB_DATABASE, // Database name from .env file
  options: {
    encrypt: false, // Disable encryption if your server does not support SSL
    trustServerCertificate: true, // Required for some servers
    enableArithAbort: true, // Fixes some compatibility issues
  },
  pool: {
    max: 10, // Maximum number of connections
    min: 0, // Minimum number of connections
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  },
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then((pool) => {
    console.log('✅ Connected to Remote SQL Server');
    return pool;
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err);
  });

module.exports = { sql, poolPromise };
