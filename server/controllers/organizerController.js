const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const [rows] = await pool.query('SELECT * FROM organizers WHERE email = ? AND is_active = 1', [email.trim().toLowerCase()]);
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const organizer = rows[0];
    const isMatch = await bcrypt.compare(password, organizer.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // In a production app, set signed cookie or JWT token
    res.json({
      success: true,
      organizer: {
        id: organizer.id,
        email: organizer.email,
        fullName: organizer.full_name,
        organization: organizer.organization,
        role: organizer.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getDashboard(req, res) {
  try {
    const search = (req.query.search || '').trim().toLowerCase();
    const tierFilter = (req.query.tier || 'all').toLowerCase();
    const statusFilter = (req.query.status || 'all').toLowerCase();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit || '10', 10));
    const offset = (page - 1) * limit;

    // 1. Featured Event & Global Metrics
    const [events] = await pool.query("SELECT * FROM events WHERE slug = 'midnight-echoes' LIMIT 1");
    const event = events.length > 0 ? events[0] : { capacity: 3000, sold_count: 2840, title: 'Midnight Echoes World Tour 2025' };

    const [revokedRows] = await pool.query("SELECT COUNT(*) AS total_revoked FROM tickets WHERE status = 'Revoked'");
    const revokedCount = revokedRows[0].total_revoked;

    const [soldRows] = await pool.query("SELECT COUNT(*) AS total_tickets FROM tickets");
    // Calculate total sold (using actual ticket records or event sold_count)
    const ticketsSold = Math.max(event.sold_count, soldRows[0].total_tickets);
    const spotsRemaining = Math.max(0, event.capacity - ticketsSold);
    const capacityPercent = ((ticketsSold / event.capacity) * 100).toFixed(1);

    // 2. Query Roster with filters
    let whereClause = "WHERE 1=1";
    const queryParams = [];

    if (search) {
      whereClause += " AND (LOWER(a.full_name) LIKE ? OR LOWER(a.email) LIKE ? OR LOWER(t.ticket_code) LIKE ?)";
      const pattern = `%${search}%`;
      queryParams.push(pattern, pattern, pattern);
    }

    if (tierFilter !== 'all') {
      whereClause += " AND (LOWER(tt.code) = ? OR LOWER(tt.tier) = ?)";
      queryParams.push(tierFilter, tierFilter);
    }

    if (statusFilter !== 'all') {
      whereClause += " AND LOWER(t.status) = ?";
      queryParams.push(statusFilter);
    }

    // Total filtered count
    const [countRows] = await pool.query(`
      SELECT COUNT(*) AS count
      FROM tickets t
      JOIN attendees a ON t.attendee_id = a.id
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      ${whereClause}
    `, queryParams);

    const totalFiltered = countRows[0].count;

    // Query paginated rows
    const [rosterRows] = await pool.query(`
      SELECT t.id AS ticket_id, t.ticket_code, t.status, t.seat_info, t.gate, t.price, t.issued_at, t.revoked_at,
             a.id AS attendee_id, a.full_name, a.email, a.account_number,
             tt.code AS tier_code, tt.name AS ticket_type_name, tt.tier
      FROM tickets t
      JOIN attendees a ON t.attendee_id = a.id
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      ${whereClause}
      ORDER BY t.id DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    const formattedRoster = rosterRows.map(r => {
      const initials = r.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      return {
        ...r,
        initials
      };
    });

    res.json({
      success: true,
      metrics: {
        featuredEvent: {
          title: event.title,
          venue: event.venue,
          hall: event.hall || 'Hall B & Grand Floor',
          dateTimeStr: event.date_time_str,
          productionCode: 'MP-2025-LON'
        },
        ticketsSold,
        capacity: event.capacity,
        spotsRemaining,
        capacityPercent: `${capacityPercent}%`,
        revokedPasses: revokedCount,
        disputeRate: `${((revokedCount / Math.max(1, ticketsSold)) * 100).toFixed(2)}%`,
        scanningStaff: 14
      },
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit)
      },
      roster: formattedRoster
    });
  } catch (err) {
    console.error('Error in getDashboard:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

async function revokeTicket(req, res) {
  try {
    const { ticketId, ticketCode } = req.body;
    if (!ticketId && !ticketCode) {
      return res.status(400).json({ success: false, message: 'Ticket ID or Code is required.' });
    }

    const [tickets] = await pool.query(
      'SELECT * FROM tickets WHERE id = ? OR ticket_code = ? LIMIT 1',
      [ticketId || 0, ticketCode || '']
    );

    if (tickets.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const ticket = tickets[0];
    if (ticket.status === 'Revoked') {
      return res.status(400).json({ success: false, message: 'Ticket is already revoked.' });
    }

    await pool.query(`
      UPDATE tickets
      SET status = 'Revoked', revoked_at = NOW(), revoked_reason = 'Revoked by Box Office Organizer'
      WHERE id = ?
    `, [ticket.id]);

    // Update event sold count
    await pool.query('UPDATE events SET sold_count = GREATEST(0, sold_count - 1) WHERE id = ?', [ticket.event_id]);

    res.json({
      success: true,
      message: `Pass ${ticket.ticket_code} has been successfully revoked.`,
      ticketId: ticket.id,
      ticketCode: ticket.ticket_code,
      status: 'Revoked'
    });
  } catch (err) {
    console.error('Error in revokeTicket:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  login,
  getDashboard,
  revokeTicket
};
