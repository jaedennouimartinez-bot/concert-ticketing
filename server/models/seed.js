const bcrypt = require('bcryptjs');
const { pool, initDatabase } = require('../config/database');

async function seedData() {
  await initDatabase();
  const conn = await pool.getConnection();

  try {
    console.log('Seeding concert ticketing database...');

    // 1. Seed Organizer
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);
    
    await conn.query(`
      INSERT INTO organizers (email, password_hash, full_name, organization, role)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        password_hash = VALUES(password_hash),
        full_name = VALUES(full_name);
    `, ['organizer@venue.com', passwordHash, 'Apex Productions', 'Apex Productions', 'Lead Organizer']);

    // 2. Seed Events
    const [eventResult] = await conn.query(`
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
      ),
      (
        'symphony-stars',
        'Symphony Under Stars - Grand Pavilion',
        'Starlight Open Pavilion',
        'Sunday, Nov 30, 2025 • 7:00 PM EST',
        'Grand Pavilion',
        'Auditorium',
        2000,
        1450,
        'Active',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDkq5W5cTuCLYThhj5ChXxJG22EofQ0wmtcV7A7JlCV_U9GNVOVG50xo_ehysQVGjHvT4QzW1WkQMyGoUYlGE1fisdTlf5iNVoU2mp4ox9RE39dfq8qWigiHMvYDeLvH1_p_FBPVz_krPd0Ukm1-AuiVx35yiV0P-Nfy6BAIkfJiwptu68TGYDMLn4GwSdpYsqQIDQY7IUDBTbNN6GnJCiNs3QAOqmX-jpLHspDzgw'
      )
      ON DUPLICATE KEY UPDATE 
        title = VALUES(title),
        capacity = VALUES(capacity),
        sold_count = VALUES(sold_count);
    `);

    // Fetch primary event id
    const [events] = await conn.query("SELECT id FROM events WHERE slug = 'midnight-echoes'");
    const primaryEventId = events[0].id;

    // 3. Seed Ticket Types
    await conn.query(`
      INSERT INTO ticket_types (event_id, code, name, tier, price, description, inclusions_json)
      VALUES 
      (
        ?, 'ga', 'General Admission - Tier 1', 'Tier 1', 85.00, 'Standard admission pass',
        JSON_ARRAY(
          JSON_OBJECT('icon', 'door_open', 'text', 'Free entry'),
          JSON_OBJECT('icon', 'account_balance_wallet', 'text', 'Mobile wallet compatible'),
          JSON_OBJECT('icon', 'badge', 'text', 'Official lanyard')
        )
      ),
      (
        ?, 'floor', 'Floor Pit', 'Tier 2', 120.00, 'General admission with front pit access',
        JSON_ARRAY(
          JSON_OBJECT('icon', 'floor', 'text', 'Floor Pit Access'),
          JSON_OBJECT('icon', 'door_open', 'text', 'Early venue entry'),
          JSON_OBJECT('icon', 'account_balance_wallet', 'text', 'Mobile wallet pass'),
          JSON_OBJECT('icon', 'badge', 'text', 'Commemorative pin')
        )
      ),
      (
        ?, 'vip', 'VIP Lounge Access', 'Tier 3', 180.00, 'Expedited VIP pass with lounge entry',
        JSON_ARRAY(
          JSON_OBJECT('icon', 'local_bar', 'text', 'VIP Lounge bar'),
          JSON_OBJECT('icon', 'star', 'text', 'Dedicated expedited lane'),
          JSON_OBJECT('icon', 'badge', 'text', 'VIP holographic lanyard'),
          JSON_OBJECT('icon', 'account_balance_wallet', 'text', 'Mobile wallet instant pass')
        )
      )
      ON DUPLICATE KEY UPDATE 
        name = VALUES(name),
        price = VALUES(price),
        inclusions_json = VALUES(inclusions_json);
    `, [primaryEventId, primaryEventId, primaryEventId]);

    // Fetch ticket types
    const [ticketTypes] = await conn.query("SELECT id, code FROM ticket_types WHERE event_id = ?", [primaryEventId]);
    const typeMap = {};
    ticketTypes.forEach(t => typeMap[t.code] = t.id);

    // 4. Seed Attendees and Tickets (Matches Stitch Organizer Dashboard Table)
    const seedAttendees = [
      {
        name: 'Alex Morgan',
        email: 'alex.morgan@example.com',
        account: 'ACCT-892410',
        tierCode: 'ga',
        status: 'Valid',
        seat: 'General Admission (Section B, Gate 4)',
        ticketCode: 'TKT-2025-9924-OK',
        price: 85.00
      },
      {
        name: 'Jordan Lee',
        email: 'jordan.lee@domain.com',
        account: 'ACCT-102931',
        tierCode: 'vip',
        status: 'Valid',
        seat: 'VIP Pass (Section A • Express Entry)',
        ticketCode: 'TKT-2025-1029-VIP',
        price: 180.00
      },
      {
        name: 'Taylor Brooks',
        email: 't.brooks@sample.net',
        account: 'ACCT-554120',
        tierCode: 'ga',
        status: 'Revoked',
        seat: 'General Admission (Tier 2 • Stand 14)',
        ticketCode: 'TKT-2025-5541-REV',
        price: 85.00,
        revokedReason: 'Disputed charge / Policy breach'
      },
      {
        name: 'Samira Patel',
        email: 'samira.p@mail.org',
        account: 'ACCT-773190',
        tierCode: 'vip',
        status: 'Valid',
        seat: 'VIP Pass (Section B • Lounge Access)',
        ticketCode: 'TKT-2025-7731-VIP',
        price: 180.00
      },
      {
        name: 'Marcus Chen',
        email: 'm.chen@inbox.io',
        account: 'ACCT-339102',
        tierCode: 'floor',
        status: 'Valid',
        seat: 'Early Bird Entry (Priority Admission)',
        ticketCode: 'TKT-2025-3391-EB',
        price: 120.00
      },
      {
        name: 'Elena Rostova',
        email: 'elena.r@press.com',
        account: 'ACCT-661204',
        tierCode: 'ga',
        status: 'Revoked',
        seat: 'General Admission (Tier 1 • Press Hold)',
        ticketCode: 'TKT-2025-6612-REV',
        price: 85.00,
        revokedReason: 'Credential re-allocation'
      }
    ];

    for (const item of seedAttendees) {
      await conn.query(`
        INSERT INTO attendees (full_name, email, account_number, is_verified)
        VALUES (?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);
      `, [item.name, item.email, item.account]);

      const [attendeeRow] = await conn.query("SELECT id FROM attendees WHERE account_number = ?", [item.account]);
      const attendeeId = attendeeRow[0].id;
      const typeId = typeMap[item.tierCode] || typeMap['ga'];

      const qrPayload = JSON.stringify({
        ticketCode: item.ticketCode,
        attendee: item.name,
        account: item.account,
        event: 'Midnight Echoes World Tour 2025',
        status: item.status,
        timestamp: Date.now()
      });

      await conn.query(`
        INSERT INTO tickets (ticket_code, event_id, attendee_id, ticket_type_id, status, seat_info, gate, price, qr_code_data, revoked_at, revoked_reason)
        VALUES (?, ?, ?, ?, ?, ?, 'Gate 4', ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          status = VALUES(status),
          seat_info = VALUES(seat_info),
          revoked_at = VALUES(revoked_at),
          revoked_reason = VALUES(revoked_reason);
      `, [
        item.ticketCode,
        primaryEventId,
        attendeeId,
        typeId,
        item.status,
        item.seat,
        item.price,
        qrPayload,
        item.status === 'Revoked' ? new Date() : null,
        item.revokedReason || null
      ]);
    }

    console.log('Seeding completed successfully.');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seedData();
