CREATE DATABASE IF NOT EXISTS concert_ticketing;
CREATE USER IF NOT EXISTS 'ticket_user'@'%' IDENTIFIED BY 'ticket_password_2025';
ALTER USER 'ticket_user'@'%' IDENTIFIED BY 'ticket_password_2025';
GRANT ALL PRIVILEGES ON concert_ticketing.* TO 'ticket_user'@'%';
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY 'root_password_2025';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
