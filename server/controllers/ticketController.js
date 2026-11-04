const { pool } = require('../config/database');

async function lookupAccount(req, res) {
  try {
    const { accountNumber } = req.body;
    if (!accountNumber || !accountNumber.trim()) {
      return res.status(400).json({
        success: false,
        errorType: 'MISSING_INFO',
        title: 'Missing Information',
        message: 'Please enter a valid Account Number.'
      });
    }

    const trimmedAccount = accountNumber.trim().toUpperCase();

    const [rows] = await pool.query(`
      SELECT t.ticket_code, t.status, t.seat_info, t.price, t.issued_at,
             a.full_name, a.email, a.account_number,
             e.title AS event_title, e.date_time_str, e.venue,
             tt.name AS ticket_type_name
      FROM tickets t
      JOIN attendees a ON t.attendee_id = a.id
      JOIN events e ON t.event_id = e.id
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      WHERE a.account_number = ? AND t.status = 'Valid'
      ORDER BY t.id DESC LIMIT 1
    `, [trimmedAccount]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active ticket found for this Account Number.'
      });
    }

    res.json({
      success: true,
      ticket: rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function purchaseTicket(req, res) {
  const conn = await pool.getConnection();
  try {
    const {
      fullName,
      email,
      accountNumber,
      eventId,
      ticketTypeId
    } = req.body;

    const idDocumentFile = req.file;

    // 1. Missing Information Validation
    if (!fullName || !fullName.trim() ||
        !email || !email.trim() ||
        !accountNumber || !accountNumber.trim() ||
        !eventId || !ticketTypeId) {
      return res.status(400).json({
        success: false,
        errorType: 'MISSING_INFO',
        title: 'Missing Information',
        message: 'Please complete all required fields.'
      });
    }

    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanAccount = accountNumber.trim().toUpperCase();
    const eventIdNum = parseInt(eventId, 10);
    const typeIdNum = parseInt(ticketTypeId, 10);

    await conn.beginTransaction();

    // 2. Fetch Event & Verify Capacity (FR-003)
    const [events] = await conn.query('SELECT * FROM events WHERE id = ? FOR UPDATE', [eventIdNum]);
    if (events.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Selected event not found' });
    }
    const event = events[0];

    if (event.status === 'SoldOut' || event.sold_count >= event.capacity) {
      await conn.rollback();
      return res.status(410).json({
        success: false,
        errorType: 'SOLD_OUT',
        title: 'Sold Out',
        message: 'This event has reached capacity.'
      });
    }

    // 3. Fetch Ticket Type
    const [ticketTypes] = await conn.query('SELECT * FROM ticket_types WHERE id = ?', [typeIdNum]);
    if (ticketTypes.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Ticket type not found' });
    }
    const ticketType = ticketTypes[0];

    // 4. Duplicate Ticket Check (FR-002: One ticket per account per event)
    const [existingAttendees] = await conn.query('SELECT id FROM attendees WHERE account_number = ?', [cleanAccount]);
    
    let attendeeId;
    if (existingAttendees.length > 0) {
      attendeeId = existingAttendees[0].id;

      // Check if already has a valid ticket for this event
      const [existingTickets] = await conn.query(
        "SELECT ticket_code FROM tickets WHERE attendee_id = ? AND event_id = ? AND status = 'Valid'",
        [attendeeId, eventIdNum]
      );

      if (existingTickets.length > 0) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          errorType: 'DUPLICATE_TICKET',
          title: 'Duplicate Ticket',
          message: 'You already hold a ticket for this event.',
          ticketCode: existingTickets[0].ticket_code
        });
      }

      // Update attendee info if needed
      await conn.query(`
        UPDATE attendees 
        SET full_name = ?, email = ?, 
            id_document_path = COALESCE(?, id_document_path)
        WHERE id = ?
      `, [cleanFullName, cleanEmail, idDocumentFile ? idDocumentFile.filename : null, attendeeId]);
    } else {
      // Create new attendee
      const [newAttendeeResult] = await conn.query(`
        INSERT INTO attendees (full_name, email, account_number, id_document_path, is_verified)
        VALUES (?, ?, ?, ?, 1)
      `, [cleanFullName, cleanEmail, cleanAccount, idDocumentFile ? idDocumentFile.filename : null]);
      attendeeId = newAttendeeResult.insertId;
    }

    // 5. Generate Ticket (FR-005)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketCode = `TKT-2025-${randomSuffix}-OK`;
    const seatInfo = `${ticketType.name} (Section B, Gate 4)`;

    const qrPayload = JSON.stringify({
      code: ticketCode,
      name: cleanFullName,
      account: cleanAccount,
      event: event.title,
      tier: ticketType.name,
      valid: true,
      issued: new Date().toISOString()
    });

    await conn.query(`
      INSERT INTO tickets (ticket_code, event_id, attendee_id, ticket_type_id, status, seat_info, gate, price, qr_code_data)
      VALUES (?, ?, ?, ?, 'Valid', ?, 'Gate 4', ?, ?)
    `, [ticketCode, eventIdNum, attendeeId, typeIdNum, seatInfo, ticketType.price, qrPayload]);

    // Update event sold count
    const newSoldCount = event.sold_count + 1;
    const newStatus = newSoldCount >= event.capacity ? 'SoldOut' : 'Active';
    await conn.query('UPDATE events SET sold_count = ?, status = ? WHERE id = ?', [newSoldCount, newStatus, eventIdNum]);

    await conn.commit();

    res.status(201).json({
      success: true,
      ticketCode,
      ticket: {
        ticketCode,
        attendeeName: cleanFullName,
        accountNumber: cleanAccount,
        email: cleanEmail,
        eventTitle: event.title,
        dateTimeStr: event.date_time_str,
        venue: event.venue,
        ticketTypeName: ticketType.name,
        seatInfo,
        price: ticketType.price,
        status: 'Valid'
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Purchase ticket error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
}

async function getTicketByCode(req, res) {
  try {
    const { ticketCode } = req.params;
    const [rows] = await pool.query(`
      SELECT t.id, t.ticket_code, t.status, t.seat_info, t.gate, t.price, t.qr_code_data, t.issued_at, t.revoked_at,
             a.full_name, a.email, a.account_number,
             e.title AS event_title, e.date_time_str, e.venue, e.hall, e.image_url,
             tt.name AS ticket_type_name
      FROM tickets t
      JOIN attendees a ON t.attendee_id = a.id
      JOIN events e ON t.event_id = e.id
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      WHERE t.ticket_code = ?
      LIMIT 1
    `, [ticketCode]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.json({
      success: true,
      ticket: rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  lookupAccount,
  purchaseTicket,
  getTicketByCode
};
