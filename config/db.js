const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Create connection pool for MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fashion_ecommerce',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection helper
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database Connected successfully to:', process.env.DB_NAME);
    connection.release();
    return true;
  } catch (err) {
    console.error('❌ MySQL Connection Failed:');
    console.error(err.message);
    console.error('👉 Check your .env file credentials (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)');
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
