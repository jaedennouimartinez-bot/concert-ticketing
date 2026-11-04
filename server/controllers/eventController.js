const { pool } = require('../config/database');

async function getEvents(req, res) {
  try {
    const [events] = await pool.query(`
      SELECT id, slug, title, subtitle, date_time_str, venue, hall, capacity, sold_count, status, image_url
      FROM events
      ORDER BY id ASC
    `);
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getEventBySlug(req, res) {
  try {
    const slug = req.params.slug || 'midnight-echoes';
    const [events] = await pool.query(`
      SELECT * FROM events WHERE slug = ? OR id = ? LIMIT 1
    `, [slug, isNaN(slug) ? 0 : parseInt(slug, 10)]);

    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const event = events[0];
    const [ticketTypes] = await pool.query(`
      SELECT id, code, name, tier, price, description, inclusions_json
      FROM ticket_types
      WHERE event_id = ?
      ORDER BY price ASC
    `, [event.id]);

    const formattedTypes = ticketTypes.map(t => ({
      ...t,
      inclusions: typeof t.inclusions_json === 'string' ? JSON.parse(t.inclusions_json) : t.inclusions_json
    }));

    res.json({
      success: true,
      event,
      ticketTypes: formattedTypes
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getEvents,
  getEventBySlug
};
