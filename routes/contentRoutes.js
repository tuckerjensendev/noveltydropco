const express = require('express');
const router = express.Router();
const db = require('../db'); // Centralized connection

// Fetch content blocks for a specific page
router.get('/api/content/:page_id', async (req, res) => {
    const { page_id } = req.params;
    const status = req.query.status || 'live'; // Default to 'live' if no status is provided

    // Validate status parameter
    const validStatuses = ['draft', 'live'];
    if (!validStatuses.includes(status)) {
        console.log(`[ROUTE DEBUG] Invalid status parameter: ${status}`);
        return res.status(400).json({ error: 'Invalid status parameter. Must be "draft" or "live".' });
    }

    console.log(`[ROUTE DEBUG] Fetching ${status} content blocks for page ID: ${page_id}`);

    try {
        const blocks = await db.getContentBlocksByStatus(page_id, status);
        console.log(`[ROUTE DEBUG] Retrieved ${blocks.length} blocks for page ID: ${page_id} with status: ${status}`);

        res.json(blocks);
    } catch (error) {
        console.error(`[ROUTE ERROR] Error fetching blocks for page ID ${page_id}: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch content blocks' });
    }
});

// Save layout positions, update content, and handle drafts or live layouts
router.post('/api/save-layout', async (req, res) => {
    const { page_id, layout, status } = req.body; // Now expecting `status` in the payload
    console.log('Incoming save payload:', JSON.stringify(req.body, null, 2));

    if (!page_id || !status) {
        console.error('Error: Missing page_id or status for saving layout.');
        return res.status(400).json({ error: 'Missing page_id or status for saving layout.' });
    }

    // Validate status parameter
    const validStatuses = ['draft', 'live'];
    if (!validStatuses.includes(status)) {
        console.error(`Error: Invalid status "${status}" provided for saving layout.`);
        return res.status(400).json({ error: 'Invalid status. Must be "draft" or "live".' });
    }

    try {
        // Start a transaction for atomicity
        await db.runQuery('BEGIN TRANSACTION');

        if (status === 'live') {
            // Delete existing live blocks
            await db.runQuery(`DELETE FROM content_blocks WHERE page_id = ? AND status = 'live'`, [page_id]);

            // Promote draft blocks to live
            const promoted = await db.runQuery(
                `UPDATE content_blocks SET status = 'live', last_updated = CURRENT_TIMESTAMP WHERE page_id = ? AND status = 'draft'`,
                [page_id]
            );

            console.log(`[ROUTE DEBUG] Promoted ${promoted.changes} draft blocks to live for page ID: ${page_id}`);
        } else if (status === 'draft') {
            // Delete existing draft blocks for the page
            await db.runQuery('DELETE FROM content_blocks WHERE page_id = ? AND status = ?', [page_id, 'draft']);

            // Insert new draft blocks
            for (let i = 0; i < layout.length; i++) {
                const block = layout[i];
                const {
                    type,
                    content,
                    col,
                    width,
                    height,
                    style,
                } = block;

                const row = i + 1; // Recalculate row based on the order in layout

                console.log(`Inserting new draft block for page ID: ${page_id} with row: ${row}`);
                const result = await db.runQuery(
                    `INSERT INTO content_blocks 
                     (page_id, type, content, row, col, width, height, style, status, created_at, last_updated) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [page_id, type, content, row, col, width, height, style]
                );

                if (!result.lastID) {
                    throw new Error(`Failed to insert new block for page ID: ${page_id}`);
                }
            }

            console.log('All draft blocks inserted successfully.');
        }

        // Commit the transaction
        await db.runQuery('COMMIT');
        res.json({ message: `Layout ${status === 'live' ? 'pushed live' : 'saved as draft'} successfully!` });
    } catch (error) {
        // Rollback transaction in case of an error
        console.error('Error saving layout:', error);
        await db.runQuery('ROLLBACK');
        res.status(500).json({ error: 'Failed to save layout' });
    }
});

// Delete content block
router.delete('/api/content/:block_id', async (req, res) => {
    const { block_id } = req.params;
    console.log(`[ROUTE DEBUG] Deleting block with ID: ${block_id}`);
    try {
        const result = await db.runQuery('DELETE FROM content_blocks WHERE block_id = ?', [block_id]);
        if (result.changes === 0) {
            console.log(`[ROUTE DEBUG] No block found with ID: ${block_id}. Nothing deleted.`);
            return res.status(404).json({ error: 'Content block not found.' });
        }
        res.json({ message: 'Content block deleted successfully' });
    } catch (error) {
        console.error('Error deleting block:', error);
        res.status(500).json({ error: 'Failed to delete content block' });
    }
});

module.exports = router;
