document.addEventListener("DOMContentLoaded", () => {
    console.log("[DEBUG] homeContent.js loaded and DOMContentLoaded triggered.");

    const gridContainer = document.getElementById("contentDisplay");

    if (!gridContainer) {
        console.error("[DEBUG] Grid container not found. Exiting.");
        return;
    }
    console.log("[DEBUG] Grid container found.");

    // Function to fetch layout for the home page
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

                // Clear the grid container and render fetched blocks
                gridContainer.innerHTML = "";

                const blocksToSkip = new Set(); // Track indices of blocks that are already grouped

                blocks.forEach((block, index) => {
                    if (blocksToSkip.has(index)) {
                        // Skip blocks that are already grouped
                        return;
                    }

                    // Create a block element
                    const blockElement = document.createElement("div");
                    blockElement.className = `grid-item ${block.type}`; // Use CSS classes to control the positioning
                    blockElement.dataset.blockId = block.block_id;
                    blockElement.innerHTML = `<div class="block-content">${block.content || ""}</div>`;

                    // Check if the current block and the next block should be grouped
                    const nextBlock = blocks[index + 1];
                    if (
                        (block.type === "block-grid-medium" && nextBlock?.type === "block-grid-small") ||
                        (block.type === "block-grid-small" && nextBlock?.type === "block-grid-medium")
                    ) {
                        // Create a group wrapper to hold the medium and small blocks together
                        const groupWrapper = document.createElement("div");
                        groupWrapper.className = "grid-item-group grid-item-large"; // Treat as a large block
                        groupWrapper.dataset.blockId = `${block.block_id}-${nextBlock.block_id}`;

                        // Add current and next blocks to the group
                        groupWrapper.appendChild(blockElement);

                        const nextBlockElement = document.createElement("div");
                        nextBlockElement.className = `grid-item ${nextBlock.type}`;
                        nextBlockElement.dataset.blockId = nextBlock.block_id;
                        nextBlockElement.innerHTML = `<div class="block-content">${nextBlock.content || ""}</div>`;
                        groupWrapper.appendChild(nextBlockElement);

                        // Append the group to the grid container
                        gridContainer.appendChild(groupWrapper);

                        // Mark the next block as grouped
                        blocksToSkip.add(index + 1);
                    } else {
                        // Append individual blocks directly to the grid container
                        gridContainer.appendChild(blockElement);
                    }
                });

                console.log("[DEBUG] Finished rendering blocks. Grid container state:", gridContainer.innerHTML);

                // Enforce group behavior on initial rendering
                enforceGroupIntegrity();
            })
            .catch((err) => console.error("[ERROR] Failed to fetch layout:", err));
    };

    // Function to enforce group integrity to ensure blocks stay grouped
    const enforceGroupIntegrity = () => {
        console.log("[DEBUG] Enforcing group integrity.");
        const allBlocks = [...gridContainer.children];
        const blocksToSkip = new Set(); // Track blocks that have already been grouped

        allBlocks.forEach((block, index) => {
            if (blocksToSkip.has(index)) return;

            // If current block is medium or small and next is the pair
            if (
                block.classList.contains("block-grid-medium") ||
                block.classList.contains("block-grid-small")
            ) {
                const nextBlock = allBlocks[index + 1];
                if (
                    nextBlock &&
                    ((block.classList.contains("block-grid-medium") && nextBlock.classList.contains("block-grid-small")) ||
                        (block.classList.contains("block-grid-small") && nextBlock.classList.contains("block-grid-medium")))
                ) {
                    // Create a new group wrapper to hold both blocks
                    const groupWrapper = document.createElement("div");
                    groupWrapper.className = "grid-item-group grid-item-large";
                    groupWrapper.dataset.blockId = `${block.dataset.blockId}-${nextBlock.dataset.blockId}`;

                    // Move current and next block inside the group
                    groupWrapper.appendChild(block);
                    groupWrapper.appendChild(nextBlock);

                    // Insert the group wrapper at the appropriate location
                    gridContainer.insertBefore(groupWrapper, nextBlock.nextSibling);
                    blocksToSkip.add(index + 1); // Mark next block as grouped
                }
            }
        });
    };

    // Initial fetch and setup
    fetchLayout();

    // Reapply grouping logic on window resize
    window.addEventListener("resize", () => {
        console.log("[DEBUG] Window resized, enforcing group integrity.");
        enforceGroupIntegrity();
    });

    // Monitor DOM changes to ensure group integrity with MutationObserver
    const observer = new MutationObserver((mutations) => {
        console.log("[DEBUG] DOM mutation detected, enforcing group integrity.");
        enforceGroupIntegrity();
    });

    observer.observe(gridContainer, { childList: true, subtree: true });
});
