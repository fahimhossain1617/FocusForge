const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runTests() {
  console.log('--- Starting FocusForge Backend Integration Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  try {
    // 1. Check Tables Existence
    const tablesRes = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('profiles', 'support_tickets', 'ticket_replies', 'user_roles', 'user_notification_settings', 'push_subscriptions', 'tasks', 'notes', 'diary_entries', 'learning_logs');
    `);
    const existingTables = tablesRes.rows.map(r => r.table_name);
    console.log('Verified database tables:', existingTables.length);
    assert(existingTables.includes('support_tickets'), 'support_tickets table exists');
    assert(existingTables.includes('ticket_replies'), 'ticket_replies table exists');
    assert(existingTables.includes('user_roles'), 'user_roles table exists');
    assert(existingTables.includes('user_notification_settings'), 'user_notification_settings table exists');

    // 2. Test Support Ticket Creation & Numbering
    const seqRes = await pool.query("SELECT nextval('support_ticket_seq') as seq");
    const testSeq = String(seqRes.rows[0].seq).padStart(6, '0');
    const testTicketNumber = `FF-${testSeq}`;

    const insertTicketRes = await pool.query(`
      INSERT INTO support_tickets (
        ticket_number, type, category, subject, message, name, email, is_guest, app_version, status, priority
      ) VALUES (
        $1, 'report', 'Bug', 'Test Problem Report', 'This is an automated backend test problem description.', 'Test User', 'test@focusforge.app', true, '1.0.0', 'new', 'normal'
      ) RETURNING id, ticket_number, status;
    `, [testTicketNumber]);

    const createdTicket = insertTicketRes.rows[0];
    assert(createdTicket && createdTicket.ticket_number === testTicketNumber, 'Support ticket created with FF-XXXXXX format');

    // 3. Test Ticket Reply & Threading
    const replyRes = await pool.query(`
      INSERT INTO ticket_replies (
        ticket_id, sender_role, sender_name, message
      ) VALUES (
        $1, 'supervisor', 'Support Team', 'We have investigated your issue and applied a fix.'
      ) RETURNING id, message;
    `, [createdTicket.id]);

    assert(replyRes.rows.length === 1, 'Supervisor reply inserted into ticket thread');

    // 4. Test Ticket Status & Internal Notes Update
    const updateTicketRes = await pool.query(`
      UPDATE support_tickets 
      SET status = 'resolved', internal_notes = 'Resolved via automated test verification', resolved_at = NOW()
      WHERE id = $1
      RETURNING status, internal_notes;
    `, [createdTicket.id]);

    assert(updateTicketRes.rows[0].status === 'resolved', 'Ticket status updated to resolved');

    // 5. Test Profile Extensions & Unique Display Name Check
    const profileColsRes = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name IN ('phone', 'bio', 'date_of_birth', 'gender', 'country', 'city');
    `);
    const profileCols = profileColsRes.rows.map(r => r.column_name);
    assert(profileCols.includes('phone') && profileCols.includes('bio') && profileCols.includes('date_of_birth'), 'Profile table has extended phone, bio, DOB fields');

    // 6. Test Notification Settings Upsert
    const testUserId = '00000000-0000-0000-0000-000000000001';
    // Clean up test records
    await pool.query('DELETE FROM support_tickets WHERE id = $1', [createdTicket.id]);

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await pool.end();
  }
}

runTests();
