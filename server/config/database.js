const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbHost = process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1';
const dbPort = parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306', 10);
const dbUser = process.env.DB_USER || process.env.MYSQLUSER || 'root';
const dbPassword = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'rootpassword';
const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'concert_ticketing';

const pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  multipleStatements: true
});

async function initDatabase() {
  try {
    // 1. Try to ensure database exists if privileges allow
    try {
      const rootConn = await mysql.createConnection({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        multipleStatements: true
      });
      await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
      await rootConn.end();
    } catch (e) {
      console.log('Database ensure note:', e.message);
    }

    // 2. Connect with pool to execute schema DDL
    const connection = await pool.getConnection();
    console.log('Connected to MySQL/MariaDB database successfully.');
    
    // Read schema.sql and strip any hardcoded "CREATE DATABASE ... USE ..." so it runs in current db
    let schemaSql = fs.readFileSync(path.join(__dirname, '../models/schema.sql'), 'utf8');
    schemaSql = schemaSql.replace(/CREATE DATABASE IF NOT EXISTS [^;]+;/gi, '');
    schemaSql = schemaSql.replace(/USE [^;]+;/gi, '');
    
    await connection.query(schemaSql);
    console.log('Database tables ensured in database:', dbName);

    // 3. Ensure default seed data (organizers, events, ticket types) exists if fresh database
    const [eventCount] = await connection.query('SELECT COUNT(*) as count FROM events;');
    if (eventCount[0].count === 0) {
      console.log('Fresh database detected. Seeding default events, ticket types, and organizers...');
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hash1 = await bcrypt.hash('password123', salt);
      const hash2 = await bcrypt.hash('admin123', salt);

      await connection.query(`
        INSERT INTO organizers (email, password_hash, full_name, organization, role)
        VALUES 
          ('organizer@venue.com', ?, 'Apex Productions', 'Apex Productions', 'Lead Organizer'),
          ('admin@concert.test', ?, 'Lead Administrator', 'LivePass Global', 'Admin')
        ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);
      `, [hash1, hash2]);

      await connection.query(`
        INSERT INTO events (slug, title, subtitle, date_time_str, venue, hall, capacity, sold_count, status, image_url)
        VALUES 
        (
          'midnight-echoes',
          'Midnight Echoes World Tour 2025',
          'Metro Arena • Hall A',
          'Saturday, Nov 15, 2025 • 8:00 PM EST',
          'Metro Arena',
          'Hall A & Grand Floor',
          3000,
          2840,
          'Active',
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDLZMfoIoccNYVFJ1ikw_8m7hx1KsaOnqXg26dm6GUvRWDvEejEHPcDm8uOw6KfAA9trr0zW0UaRn2PkB-d7qCK0XuNMI5g7cjkKTlS08IY1HFxZbWAfuYTYMXlnPSm4o59C605WQPPP_z3HfcK95WZlCH35TC1XmC-PCXIpr30-lY7qPBs0iFqSqUxBskYXM3NefkxPHQ_Z8w9Ds_co58LkrimAYGcfHHX3U7W3K4'
        ),
        (
          'neon-dreams',
          'Neon Dreams Festival - Main Stage',
          'Sunset Park Arena',
          'Friday, Nov 21, 2025 • 6:30 PM EST',
          'Sunset Park Amphitheater',
          'Main Stage',
          5000,
          5000,
          'SoldOut',
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDLWWG6THZ850Vyyg8VbS066Dr7e8I7XywhfCEGRceVr7lmnYlelubXhsAAcyJ1CjUlpCdpTsOeh__MDqF2TcROiiL_ZDbwGE9hXZz--OzRZKmDXppG33s0cZvAO-R-yJxOQydpXdUaQE7QNgNpwBCEFh2wJKJWmPghWqpAbdYSjU06CwrCGi-R3HSZ2pD3QbKYCTgKZ9-KhCr-7cjCCBbTJlhMNTiNVzRt_J6VEwQ'
        );
      `);

      const [evRows] = await connection.query("SELECT id FROM events WHERE slug = 'midnight-echoes';");
      if (evRows.length > 0) {
        const evId = evRows[0].id;
        await connection.query(`
          INSERT INTO ticket_types (event_id, code, name, tier, price, description, inclusions_json)
          VALUES 
          (?, 'ga', 'General Admission - Tier 1', 'Tier 1', 85.00, 'Standard floor admission with verified gate access', 
            JSON_ARRAY(
              JSON_OBJECT('icon', 'verified', 'text', 'Official verified digital turnstile pass'),
              JSON_OBJECT('icon', 'schedule', 'text', 'Standard doors open at 6:30 PM')
            )
          ),
          (?, 'floor', 'Floor Pit Admission', 'Tier 2', 120.00, 'Up-close front stage access with express gate entrance', 
            JSON_ARRAY(
              JSON_OBJECT('icon', 'bolt', 'text', 'Front pit perimeter access'),
              JSON_OBJECT('icon', 'fast_forward', 'text', 'Dedicated Gate 4 express entry turnstile')
            )
          ),
          (?, 'vip', 'VIP Lounge & All-Access Pass', 'Tier 3', 180.00, 'Comprehensive VIP hospitality access and merchandise voucher', 
            JSON_ARRAY(
              JSON_OBJECT('icon', 'stars', 'text', 'VIP backstage corridor access'),
              JSON_OBJECT('icon', 'room_service', 'text', 'Complimentary hospitality lounge pass'),
              JSON_OBJECT('icon', 'account_balance_wallet', 'text', 'Mobile wallet instant pass')
            )
          );
        `, [evId, evId, evId]);
      }
      console.log('Default data seeded successfully.');
    }
    
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
