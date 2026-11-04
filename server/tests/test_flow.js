/**
 * Comprehensive Automated Test Suite
 * Tests all requirements, FR-001 to FR-005, DB operations, and HTTP APIs
 */

const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log(' STARTING CONCERT TICKETING SYSTEM INTEGRATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`TEST: ${name}... `);
      await fn();
      console.log('✓ PASSED');
      passed++;
    } catch (err) {
      console.log('✗ FAILED');
      console.error('  Error:', err.message);
      failed++;
    }
  }

  // 1. Static & View Routes
  await test('Frontend Welcome Screen Route (GET /)', async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert(text.includes('Concert Ticketing'));
    assert(text.includes('Secure Digital Tickets'));
  });

  await test('Organizer Login Page (GET /organizer/login)', async () => {
    const res = await fetch(`${BASE_URL}/organizer/login`);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert(text.includes('Organizer Login'));
  });

  await test('Organizer Dashboard Page (GET /organizer/dashboard)', async () => {
    const res = await fetch(`${BASE_URL}/organizer/dashboard`);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert(text.includes('Attendee Ticket Roster'));
  });

  // 2. Events API
  await test('Get Events List (GET /api/events)', async () => {
    const res = await fetch(`${BASE_URL}/api/events`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert(data.events.length >= 3);
    const featured = data.events.find(e => e.slug === 'midnight-echoes');
    assert(featured);
    assert.strictEqual(featured.capacity, 3000);
  });

  await test('Get Event Details & Ticket Types (GET /api/events/midnight-echoes)', async () => {
    const res = await fetch(`${BASE_URL}/api/events/midnight-echoes`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert(data.ticketTypes.length >= 3);
    const ga = data.ticketTypes.find(t => t.code === 'ga');
    assert(ga);
    assert.strictEqual(Number(ga.price), 85);
    assert(Array.isArray(ga.inclusions));
  });

  // 3. Quick Account Lookup
  await test('Quick Account Lookup for existing ticket (POST /api/attendee/lookup)', async () => {
    const res = await fetch(`${BASE_URL}/api/attendee/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountNumber: 'ACCT-892410' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.ticket.account_number, 'ACCT-892410');
    assert.strictEqual(data.ticket.full_name, 'Alex Morgan');
    assert.strictEqual(data.ticket.status, 'Valid');
  });

  // 4. Missing Information Modal Trigger (FR-001)
  await test('Missing Information Validation (POST /api/tickets/purchase)', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: '', email: '', accountNumber: '' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.errorType, 'MISSING_INFO');
  });

  // 5. Successful Ticket Purchase & Issuance (FR-001 & FR-005)
  const testAccount = `TEST-ACCT-${Date.now()}`;
  let issuedTicketCode = '';

  await test('New Attendee Registration & Ticket Issuance', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Jane Doe',
        email: 'jane.doe@example.com',
        accountNumber: testAccount,
        eventId: 1,
        ticketTypeId: 1
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert(data.ticketCode.startsWith('TKT-2025-'));
    assert.strictEqual(data.ticket.status, 'Valid');
    issuedTicketCode = data.ticketCode;
  });

  // 6. Duplicate Ticket Prevention (FR-002)
  await test('Duplicate Ticket Claim Rejection (FR-002)', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Jane Doe Duplicate',
        email: 'jane.duplicate@example.com',
        accountNumber: testAccount, // same account
        eventId: 1,
        ticketTypeId: 2
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(data.errorType, 'DUPLICATE_TICKET');
    assert.strictEqual(data.ticketCode, issuedTicketCode);
  });

  // 7. Sold Out Modal Trigger (FR-003)
  await test('Sold Out Event Rejection (FR-003)', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Late Booker',
        email: 'late@example.com',
        accountNumber: `LATE-${Date.now()}`,
        eventId: 2, // Neon Dreams (sold out)
        ticketTypeId: 1
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 410);
    assert.strictEqual(data.errorType, 'SOLD_OUT');
  });

  // 8. Bot Detection & Rate Limiting (FR-004)
  await test('Bot Pattern Rapid Request Detection (FR-004)', async () => {
    const botAccount = `BOT-ACCT-${Date.now()}`;
    let blocked = false;

    // Fire 7 rapid requests to exceed 5 request threshold
    for (let i = 0; i < 7; i++) {
      const res = await fetch(`${BASE_URL}/api/tickets/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Bot User',
          email: 'bot@spam.com',
          accountNumber: botAccount,
          eventId: 1,
          ticketTypeId: 1
        })
      });
      if (res.status === 429) {
        const data = await res.json();
        assert.strictEqual(data.errorType, 'PURCHASE_BLOCKED');
        assert(data.refId.startsWith('SEC-'));
        blocked = true;
        break;
      }
    }
    assert.strictEqual(blocked, true, 'Bot requests should be blocked with 429');
  });

  // 9. Digital Ticket Retrieval (FR-005)
  await test('Digital Ticket Page Data (GET /api/tickets/:code)', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets/${issuedTicketCode}`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.ticket.ticket_code, issuedTicketCode);
    assert.strictEqual(data.ticket.status, 'Valid');
  });

  // 10. Organizer Authentication
  await test('Organizer Login Authentication (POST /api/organizer/login)', async () => {
    // Valid
    const resOk = await fetch(`${BASE_URL}/api/organizer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'organizer@venue.com', password: 'password123' })
    });
    const dataOk = await resOk.json();
    assert.strictEqual(resOk.status, 200);
    assert.strictEqual(dataOk.success, true);
    assert.strictEqual(dataOk.organizer.email, 'organizer@venue.com');

    // Invalid
    const resBad = await fetch(`${BASE_URL}/api/organizer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'organizer@venue.com', password: 'wrongpassword' })
    });
    assert.strictEqual(resBad.status, 401);
  });

  // 11. Organizer Dashboard Metrics & Roster (GET /api/organizer/dashboard)
  await test('Organizer Dashboard Metrics & Roster', async () => {
    const res = await fetch(`${BASE_URL}/api/organizer/dashboard?page=1&limit=10`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert(data.metrics.ticketsSold >= 2840);
    assert(data.roster.length > 0);
  });

  // 12. Ticket Revocation by Organizer (FR-005)
  await test('Organizer Ticket Revocation (FR-005)', async () => {
    const res = await fetch(`${BASE_URL}/api/organizer/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketCode: issuedTicketCode })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status, 'Revoked');

    // Verify revoked status via ticket query
    const checkRes = await fetch(`${BASE_URL}/api/tickets/${issuedTicketCode}`);
    const checkData = await checkRes.json();
    assert.strictEqual(checkData.ticket.status, 'Revoked');
  });

  console.log('\n====================================================');
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
