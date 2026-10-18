const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Determine if SSL is needed (TiDB Cloud, Aiven, or DB_SSL=true)
const isSSL =
  process.env.DB_SSL === 'true' ||
  (process.env.DB_PORT && Number(process.env.DB_PORT) === 4000) ||
  (process.env.DB_HOST && process.env.DB_HOST.includes('tidbcloud.com'));

const sslConfig = isSSL
  ? {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true
    }
  : undefined;

// Create connection pool for MySQL / TiDB
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fashion_ecommerce',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  ssl: sslConfig,
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
    console.log('✅ Database Connected successfully to:', process.env.DB_NAME || 'fashion_ecommerce');
    connection.release();
    return true;
  } catch (err) {
    console.error('❌ Database Connection Failed:');
    console.error(err.message);
    console.error('👉 Check your environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT)');
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
