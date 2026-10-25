import dotenv from 'dotenv';
dotenv.config({ path: './frontend/.env.local' });
dotenv.config({ path: './backend/.env' });

import { dbSaveSharedNote, dbGetSharedNote, pool } from '../backend/src/services/db';

async function runTest() {
  console.log('--- Testing Shared Notes & Files Subsystem ---');
  try {
    const testShareId = 'test_' + Math.random().toString(36).slice(2, 10);
    const mockNote = {
      title: 'Project Roadmap & Architecture Specs',
      category: 'Project',
      blocks: [
        { id: 'b1', type: 'h1', content: 'Project Specifications' },
        { id: 'b2', type: 'paragraph', content: 'First copied line from external document.' },
        { id: 'b3', type: 'paragraph', content: 'Second copied line after paste split.' },
        { id: 'b4', type: 'file', fileName: 'architecture_diagram.pdf', fileSize: 1048576, url: 'https://example.com/doc.pdf' },
      ],
      attachments: [{ id: 'a1', name: 'architecture_diagram.pdf' }],
      links: [{ id: 'l1', url: 'https://github.com' }],
    };

    console.log(`1. Saving shared note with ID: ${testShareId}...`);
    const saved = await dbSaveSharedNote(testShareId, mockNote, null);
    console.log('   Saved result:', saved.id, saved.title);

    console.log(`2. Fetching shared note by ID: ${testShareId}...`);
    const fetched = await dbGetSharedNote(testShareId);
    if (!fetched) {
      throw new Error('Fetched shared note is null!');
    }
    console.log('   Fetched title:', fetched.title);
    console.log('   Fetched blocks count:', fetched.blocks.length);
    console.log('   Fetched attachments:', fetched.attachments);

    if (fetched.title !== mockNote.title) {
      throw new Error(`Title mismatch: expected "${mockNote.title}", got "${fetched.title}"`);
    }
    if (fetched.blocks.length !== 4) {
      throw new Error(`Blocks count mismatch: expected 4, got ${fetched.blocks.length}`);
    }
    if (fetched.blocks[1].content !== 'First copied line from external document.') {
      throw new Error('Block content mismatch!');
    }

    console.log('3. Testing non-existent share ID returns null...');
    const nonExistent = await dbGetSharedNote('non_existent_key_9999');
    if (nonExistent !== null) {
      throw new Error('Expected null for non-existent note');
    }
    console.log('   Correctly returned null for non-existent note.');

    console.log('4. Cleaning up test record...');
    await pool.query('DELETE FROM public.shared_notes WHERE id = $1', [testShareId]);
    console.log('   Cleaned up successfully.');

    console.log('--- ALL SHARED NOTE TESTS PASSED (100% VERIFIED) ---');
  } catch (err: any) {
    console.error('Test FAILED:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTest();
