const express = require('express');
const router = express.Router();
const db = require('../models/User');

// Fetch all content blocks for a specific page
router.get('/api/content/:page_id', async (req, res) => {
    const { page_id } = req.params;
    try {
        const blocks = await db.all('SELECT * FROM content_blocks WHERE page_id = ?', [page_id]);
        res.json(blocks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch content blocks' });
    }
});

// Save or update content block
router.post('/api/content', async (req, res) => {
    const { block_id, page_id, type, content, position } = req.body;
    try {
        if (block_id) {
            // Update existing block
            await db.run('UPDATE content_blocks SET content = ?, position = ?, last_updated = CURRENT_TIMESTAMP WHERE block_id = ?', [content, position, block_id]);
        } else {
            // Insert new block
            await db.run('INSERT INTO content_blocks (page_id, type, content, position) VALUES (?, ?, ?, ?)', [page_id, type, content, position]);
        }
        res.json({ message: 'Content saved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save content' });
    }
});

// Delete content block
router.delete('/api/content/:block_id', async (req, res) => {
    const { block_id } = req.params;
    try {
        await db.run('DELETE FROM content_blocks WHERE block_id = ?', [block_id]);
        res.json({ message: 'Content block deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete content block' });
    }
});

module.exports = router;
