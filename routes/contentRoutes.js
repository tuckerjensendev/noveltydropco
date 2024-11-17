const express = require('express');
const router = express.Router();
const db = require('../db'); // Centralized connection

// Fetch all content blocks for a specific page
router.get('/api/content/:page_id', async (req, res) => {
    const { page_id } = req.params;
    console.log(`[ROUTE DEBUG] Fetching content blocks for page ID: ${page_id}`);
    try {
        const blocks = await db.getContentBlocksFromDatabase(page_id);
        console.log(`[ROUTE DEBUG] Fetched blocks for page ID ${page_id}: ${JSON.stringify(blocks, null, 2)}`);
        res.json(blocks);
    } catch (error) {
        console.error(`[ROUTE ERROR] Error fetching blocks for page ID ${page_id}: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch content blocks' });
    }
});


// Save layout positions and update content
router.post('/api/save-layout', async (req, res) => {
    const layout = req.body;
    console.log('Incoming save payload:', JSON.stringify(layout, null, 2));

    try {
        // Start a transaction for atomicity
        await db.runQuery('BEGIN TRANSACTION');

        const updatedLayout = []; // Store the updated layout for response

        for (let i = 0; i < layout.length; i++) {
            const block = layout[i];
            const {
                block_id,
                page_id,
                type,
                content,
                col,
                width,
                height,
                style,
            } = block;

            const row = i + 1; // Recalculate row based on the order in layout

            if (block_id && !block_id.startsWith('temp-')) {
                console.log(`Updating block ID: ${block_id} with row: ${row}`);
                const result = await db.runQuery(
                    `UPDATE content_blocks 
                     SET 
                        page_id = ?, 
                        type = ?, 
                        content = ?, 
                        row = ?, 
                        col = ?, 
                        width = ?, 
                        height = ?, 
                        style = ?, 
                        last_updated = CURRENT_TIMESTAMP 
                     WHERE block_id = ?`,
                    [page_id, type, content, row, col, width, height, style, block_id]
                );

                if (result.changes === 0) {
                    console.error(`No rows updated for block ID: ${block_id}`);
                    throw new Error(`Failed to update block ID: ${block_id}`);
                } else {
                    console.log(`Block ID ${block_id} updated successfully. Affected Rows: ${result.changes}`);
                }

                updatedLayout.push({ ...block, row }); // Push updated block
            } else if (block_id.startsWith('temp-')) {
                console.log(`Inserting new block for page ID: ${page_id} with row: ${row}`);
                const result = await db.runQuery(
                    `INSERT INTO content_blocks 
                     (page_id, type, content, row, col, width, height, style, created_at, last_updated) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [page_id, type, content, row, col, width, height, style]
                );

                if (!result.lastID) {
                    throw new Error(`Failed to insert new block for page ID: ${page_id}`);
                }

                updatedLayout.push({ ...block, row, block_id: result.lastID }); // Replace temp ID with new database ID
            } else {
                console.error(`Invalid block ID: ${block_id}`);
                throw new Error(`Invalid block ID in save payload: ${block_id}`);
            }
        }

        // Commit the transaction
        await db.runQuery('COMMIT');
        console.log('All blocks processed successfully.');
        console.log('Updated layout:', JSON.stringify(updatedLayout, null, 2));

        res.json({ message: 'Layout saved successfully!', layout: updatedLayout });
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
    try {
        await db.runQuery('DELETE FROM content_blocks WHERE block_id = ?', [block_id]);
        res.json({ message: 'Content block deleted successfully' });
    } catch (error) {
        console.error('Error deleting block:', error);
        res.status(500).json({ error: 'Failed to delete content block' });
    }
});

module.exports = router;
