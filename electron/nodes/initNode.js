const { getDb } = require("../db/db.cjs");
const { readFile } = require("../ipc/file.cjs");
const { getDataPath } = require("../ipc/userPath.cjs");
const fs = require('fs');
const path = require("path");
const matter = require('gray-matter');
const yaml = require('yaml');

// 15 days retention for soft-deleted notes
const DELETE_RETENTION_DAYS = 15;

async function initNode() {
    console.log('Starting incremental sync...');

    const db = getDb();
    const storagePath = getDataPath();

    console.log('Using storage path:', storagePath);

    // Ensure storage path exists
    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
    }

    // Step 1: Cleanup old deleted_notes (> 15 days)
    cleanupOldDeletedNotes(db);
    console.log('Cleaned up deleted_notes older than 15 days');

    // Step 2: Scan storagePath for .md files
    let fileSet = new Set();
    try {
        const files = fs.readdirSync(storagePath);
        for (const file of files) {
            if (path.extname(file) === '.md') {
                fileSet.add(file);
            }
        }
    } catch (error) {
        console.error('Error reading storage directory:', error);
    }
    console.log('Found', fileSet.size, 'markdown files in storagePath');

    // Step 3: Get all filenames from DB
    const dbRecords = db.prepare('SELECT id, name, content, alias, top, "left" FROM notes').all();
    const dbFilenames = new Set();
    for (const record of dbRecords) {
        // Try to construct filename from id - assume id is used as filename base
        // The actual mapping depends on how files are named when saved
        // For now, we need a way to map record.id to filename
        // Since saveFile uses fileName directly, we should store filename in DB too
        // Let's check if we can derive it
    }

    // Get filenames from DB by checking for filename column or construct from id
    // Actually, looking at current schema, notes table doesn't store filename
    // We need to add filename tracking or use id to match files

    // For incremental sync, we need to know which file corresponds to which DB record
    // Current implementation doesn't store filename in notes table
    // Let's use a simple approach: files with .md extension, match by id in frontmatter

    const notes = db.prepare('SELECT id FROM notes').all();
    const dbIds = new Set(notes.map(n => n.id));

    // Step 4: Files in fileSet but not in dbSet → INSERT new records
    for (const file of fileSet) {
        const filePath = path.join(storagePath, file);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const parsed = matter(content);

            if (parsed.data && parsed.data.id) {
                const noteId = parsed.data.id;
                if (!dbIds.has(noteId)) {
                    // New file - insert into DB
                    console.log('Inserting new note:', noteId, 'from file:', file);
                    db.prepare(`
                        INSERT INTO notes (id, name, content, alias, top, "left")
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET content=excluded.content
                    `).run(noteId, parsed.data.title || parsed.data.name || "", content,
                          parsed.data.alias || null, parsed.data.top || null, parsed.data.left || null);
                }
            }
        } catch (error) {
            console.error('Error processing file', file, ':', error.message);
        }
    }

    // Step 5: Notes in dbSet but not in fileSet → Soft delete to deleted_notes
    // For this, we need to map db ids back to filenames
    // Since we don't store filename in DB, we need another approach
    // Let's scan files again and build id->filename mapping from frontmatter
    const idToFileMap = new Map();
    for (const file of fileSet) {
        const filePath = path.join(storagePath, file);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const parsed = matter(content);
            if (parsed.data && parsed.data.id) {
                idToFileMap.set(parsed.data.id, file);
            }
        } catch (error) {
            // Skip files that can't be read
        }
    }

    // Now check each DB record - if id not in fileSet, soft delete
    for (const note of notes) {
        if (!idToFileMap.has(note.id)) {
            // File no longer exists - soft delete
            console.log('Soft deleting note (file not found):', note.id);

            // Get full note data for deleted_notes table
            const noteData = db.prepare('SELECT * FROM notes WHERE id = ?').get(note.id);

            // Serialize yaml_data (we don't have it directly, but can store frontmatter)
            // We need to preserve content and any metadata
            // Since we don't have yaml_data stored separately, store null or serialize what we have
            db.prepare(`
                INSERT INTO deleted_notes (id, filename, content, yaml_data, original_path)
                VALUES (?, ?, ?, ?, ?)
            `).run(
                noteData.id,
                noteData.name || noteData.id + '.md',  // Use name as filename or construct
                noteData.content,
                JSON.stringify({
                    alias: noteData.alias,
                    top: noteData.top,
                    left: noteData.left
                }),
                noteData.id + '.md'  // original_path as reference
            );

            // Delete from notes table
            db.prepare('DELETE FROM notes WHERE id = ?').run(note.id);
        }
    }

    console.log('Incremental sync completed');
}

function cleanupOldDeletedNotes(db) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DELETE_RETENTION_DAYS);
    const cutoffStr = cutoffDate.toISOString();

    db.prepare(`
        DELETE FROM deleted_notes WHERE deleted_at < ?
    `).run(cutoffStr);
}

module.exports = { initNode };