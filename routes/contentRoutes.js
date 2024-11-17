const express = require('express');
const router = express.Router();
const db = require('../db'); // Centralized connection

// Fetch all content blocks for a specific page
router.get('/api/content/:page_id', async (req, res) => {
    const { page_id } = req.params;
    console.log(`Fetching content blocks for page ID: ${page_id}`);
    try {
        const blocks = await db.getContentBlocksFromDatabase(page_id);
        console.log('Fetched content blocks:', JSON.stringify(blocks, null, 2));
        res.json(blocks);
    } catch (error) {
        console.error('Error fetching layout:', error);
        res.status(500).json({ error: 'Failed to fetch content blocks' });
    }
});

// Save layout positions and update content
router.post('/api/save-layout', async (req, res) => {
    const layout = req.body;
    console.log('Incoming save payload:', JSON.stringify(layout, null, 2));

    try {
        for (const block of layout) {
            const {
                block_id,
                page_id,
                type,
                content,
                row,
                col,
                width,
                height,
                style,
            } = block;

            if (block_id && !block_id.startsWith("temp-")) {
                // Update existing block
                console.log(`Updating block ID: ${block_id}`);
                await db.runQuery(
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
            } else {
                // Insert new block (for temp- IDs or missing block_id)
                console.log(`Inserting new block for page ID: ${page_id}`);
                const result = await db.runQuery(
                    `INSERT INTO content_blocks 
                     (page_id, type, content, row, col, width, height, style, created_at, last_updated) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [page_id, type, content, row, col, width, height, style]
                );
                console.log(`New block created with ID: ${result.lastID}`);
                // Replace temp ID in the frontend with the new database ID
                block.block_id = result.lastID;
            }
        }
        console.log('All blocks processed successfully.');
        res.json({ message: 'Layout saved successfully!' });
    } catch (error) {
        console.error('Error saving layout:', error);
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
