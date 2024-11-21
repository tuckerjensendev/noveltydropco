document.addEventListener("DOMContentLoaded", () => {
    console.log("[DEBUG] homeContent.js loaded and DOMContentLoaded triggered.");

    const gridContainer = document.getElementById("contentDisplay");

    if (!gridContainer) {
        console.error("[DEBUG] Grid container not found. Exiting.");
        return;
    }
    console.log("[DEBUG] Grid container found.");

    // Function to group small and medium blocks
    const groupBlocks = (blocks) => {
        const processedBlocks = [];
        let i = 0;

        while (i < blocks.length) {
            const currentBlock = blocks[i];
            const nextBlock = blocks[i + 1];

            // Define types that can be grouped
            const groupableTypes = ["block-grid-small", "block-spacer-small", "block-grid-medium", "block-spacer-medium"];

            const isCurrentGroupable = groupableTypes.includes(currentBlock.type);
            const isNextGroupable = nextBlock && groupableTypes.includes(nextBlock.type);

            if (isCurrentGroupable && isNextGroupable) {
                // Group the two blocks
                processedBlocks.push({
                    type: "group-wrapper",
                    blocks: [currentBlock, nextBlock]
                });
                console.log(`[DEBUG] Grouped blocks ${currentBlock.block_id} and ${nextBlock.block_id} into a group.`);
                i += 2; // Skip the next block as it's already grouped
            } else {
                // Push the current block as is
                processedBlocks.push(currentBlock);
                i += 1;
            }
        }

        return processedBlocks;
    };

    // Function to render blocks
    const renderBlocks = (blocks) => {
        // Clear the grid container
        gridContainer.innerHTML = "";

        blocks.forEach((block) => {
            if (block.type === "group-wrapper") {
                // Create a wrapper div
                const groupElement = document.createElement("div");
                groupElement.className = "group-wrapper";

                // Append each block inside the group-wrapper
                block.blocks.forEach((innerBlock) => {
                    const blockElement = document.createElement("div");
                    blockElement.className = `grid-item ${innerBlock.type}`;
                    blockElement.dataset.blockId = innerBlock.block_id;

                    // Set the inner content
                    blockElement.innerHTML = `<div class="block-content">${innerBlock.content || ""}</div>`;

                    // Append the block to the group-wrapper
                    groupElement.appendChild(blockElement);
                });

                // Append the group-wrapper to the grid container
                gridContainer.appendChild(groupElement);
                console.log("[DEBUG] Appended a grouped block to the grid.");
            } else {
                // Render individual blocks as before
                const blockElement = document.createElement("div");
                blockElement.className = `grid-item ${block.type}`;
                blockElement.dataset.blockId = block.block_id;

                // Set the inner content
                blockElement.innerHTML = `<div class="block-content">${block.content || ""}</div>`;

                // Append the block to the grid container
                gridContainer.appendChild(blockElement);
                console.log("[DEBUG] Appended an individual block to the grid.");
            }
        });

        console.log("[DEBUG] Finished rendering blocks. Grid container state:", gridContainer.innerHTML);
    };

    // Fetch layout for the home page
    const fetchLayout = () => {
        const pageId = "home"; // Hardcoded for the home page
        console.log(`[DEBUG] Fetching layout for page ID: ${pageId}`);

        fetch(`/api/content/${pageId}`)
            .then((res) => {
                console.log(`[DEBUG] Fetch response status: ${res.status}`);
                return res.json();
            })
            .then((blocks) => {
                console.log("[DEBUG] Fetched blocks:", JSON.stringify(blocks, null, 2));

                // Group small and medium blocks
                const processedBlocks = groupBlocks(blocks);

                // Render the processed blocks
                renderBlocks(processedBlocks);
            })
            .catch((err) => console.error("[ERROR] Failed to fetch layout:", err));
    };

    // Initial fetch and setup
    fetchLayout();
});
