const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'concert_ticketing',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  multipleStatements: true
});

async function initDatabase() {
  try {
    // 1. Connect without selecting database to ensure it exists
    const rootConn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'rootpassword',
      multipleStatements: true
    });

    await rootConn.query('CREATE DATABASE IF NOT EXISTS concert_ticketing;');
    await rootConn.end();

    // 2. Connect with pool to execute schema DDL
    const connection = await pool.getConnection();
    console.log('Connected to MySQL/MariaDB database successfully.');
    
    const schemaSql = fs.readFileSync(path.join(__dirname, '../models/schema.sql'), 'utf8');
    await connection.query(schemaSql);
    console.log('Database tables ensured.');
    
    connection.release();
    return true;
  } catch (error) {
    console.error('Database initialization error:', error.message);
    throw error;
  }
}

module.exports = {
  pool,
  initDatabase
};
