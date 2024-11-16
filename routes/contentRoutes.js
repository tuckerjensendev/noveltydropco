const express = require('express');
const router = express.Router();
const db = require('../models/User'); // Ensure this points to your central db connection

// Helper function to use Promises with db.all
function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Helper function to use Promises with db.run
function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this); // `this` refers to the statement context, useful for inserted ID, etc.
        });
    });
}

// Fetch all content blocks for a specific page
router.get('/api/content/:page_id', async (req, res) => {
    const { page_id } = req.params;
    try {
        const blocks = await dbAll(
            `SELECT 
                block_id, 
                page_id, 
                type, 
                content, 
                images, 
                row, 
                col, 
                width, 
                height, 
                style, 
                font_size, 
                font_color, 
                bg_color, 
                text_align, 
                visibility, 
                animation, 
                link_url, 
                z_index, 
                created_at, 
                last_updated 
             FROM content_blocks 
             WHERE page_id = ? 
             ORDER BY row, col`,
            [page_id]
        );
        res.json(blocks);
    } catch (error) {
        console.error('Error fetching layout:', error);
        res.status(500).json({ error: 'Failed to fetch content blocks' });
    }
});

// Save layout positions and update content
router.post('/api/save-layout', async (req, res) => {
    const layout = req.body; // Expect JSON from the client
    try {
        for (const block of layout) {
            const {
                block_id,
                page_id,
                type,
                content,
                images,
                row,
                col,
                width,
                height,
                style,
                font_size,
                font_color,
                bg_color,
                text_align,
                visibility,
                animation,
                link_url,
                z_index,
            } = block;

            if (block_id) {
                // Update existing block
                await dbRun(
                    `UPDATE content_blocks 
                     SET 
                        page_id = ?, 
                        type = ?, 
                        content = ?, 
                        images = ?, 
                        row = ?, 
                        col = ?, 
                        width = ?, 
                        height = ?, 
                        style = ?, 
                        font_size = ?, 
                        font_color = ?, 
                        bg_color = ?, 
                        text_align = ?, 
                        visibility = ?, 
                        animation = ?, 
                        link_url = ?, 
                        z_index = ?, 
                        last_updated = CURRENT_TIMESTAMP 
                     WHERE block_id = ?`,
                    [
                        page_id,
                        type,
                        content || null,
                        JSON.stringify(images || []),
                        row || 1,
                        col || 1,
                        width || 1,
                        height || 1,
                        style || null,
                        font_size || null,
                        font_color || null,
                        bg_color || null,
                        text_align || null,
                        visibility || 'visible',
                        animation || null,
                        link_url || null,
                        z_index || null,
                        block_id,
                    ]
                );
            } else {
                // Insert new block
                await dbRun(
                    `INSERT INTO content_blocks 
                     (page_id, type, content, images, row, col, width, height, style, font_size, 
                      font_color, bg_color, text_align, visibility, animation, link_url, z_index, 
                      created_at, last_updated) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [
                        page_id,
                        type,
                        content || null,
                        JSON.stringify(images || []),
                        row || 1,
                        col || 1,
                        width || 1,
                        height || 1,
                        style || null,
                        font_size || null,
                        font_color || null,
                        bg_color || null,
                        text_align || null,
                        visibility || 'visible',
                        animation || null,
                        link_url || null,
                        z_index || null,
                    ]
                );
            }
        }
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
        await dbRun('DELETE FROM content_blocks WHERE block_id = ?', [block_id]);
        res.json({ message: 'Content block deleted successfully' });
    } catch (error) {
        console.error('Error deleting block:', error);
        res.status(500).json({ error: 'Failed to delete content block' });
    }
});

module.exports = router;
