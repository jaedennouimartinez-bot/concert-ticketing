-- Concert Ticketing System Database Schema
-- Implements Functional Requirements FR-001 through FR-007

CREATE DATABASE IF NOT EXISTS concert_ticketing;
USE concert_ticketing;

-- 1. Organizers Table
CREATE TABLE IF NOT EXISTS organizers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  organization VARCHAR(150) NOT NULL DEFAULT 'Apex Productions',
  role VARCHAR(50) NOT NULL DEFAULT 'Lead Organizer',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Events Table
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255) DEFAULT NULL,
  date_time_str VARCHAR(100) NOT NULL,
  venue VARCHAR(255) NOT NULL,
  hall VARCHAR(100) DEFAULT NULL,
  capacity INT NOT NULL DEFAULT 3000,
  sold_count INT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, SoldOut, Closed
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Ticket Types Table
CREATE TABLE IF NOT EXISTS ticket_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  tier VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  inclusions_json JSON NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  UNIQUE KEY unique_event_ticket_type (event_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Attendees Table (FR-001: Verified identity bound to account number)
CREATE TABLE IF NOT EXISTS attendees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  account_number VARCHAR(100) NOT NULL UNIQUE,
  id_document_path VARCHAR(500) DEFAULT NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tickets Table (FR-002: One ticket per account per event, FR-005: Unique QR code & revocable)
CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_code VARCHAR(100) NOT NULL UNIQUE,
  event_id INT NOT NULL,
  attendee_id INT NOT NULL,
  ticket_type_id INT NOT NULL,
  status ENUM('Valid', 'Revoked', 'Used') NOT NULL DEFAULT 'Valid',
  seat_info VARCHAR(150) NOT NULL,
  gate VARCHAR(50) NOT NULL DEFAULT 'Gate 4',
  price DECIMAL(10, 2) NOT NULL,
  qr_code_data TEXT NOT NULL,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL DEFAULT NULL,
  revoked_reason VARCHAR(255) DEFAULT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE,
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE CASCADE,
  UNIQUE KEY unique_attendee_event (attendee_id, event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Bot Detection & Rate Limiting Logs (FR-004)
CREATE TABLE IF NOT EXISTS security_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(100) NOT NULL,
  account_number VARCHAR(100) DEFAULT NULL,
  endpoint VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL, -- Allowed, Blocked_Bot, Blocked_Duplicate, Error
  user_agent TEXT,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Gate Scans Table (FR-006 & FR-007)
CREATE TABLE IF NOT EXISTS gate_scans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_code VARCHAR(100) NOT NULL,
  scanner_id VARCHAR(50) NOT NULL DEFAULT 'TURNSTILE-04',
  scan_result ENUM('Admitted', 'Duplicate_Attempt', 'Revoked_Blocked', 'Invalid') NOT NULL,
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
