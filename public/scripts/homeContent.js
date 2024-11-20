document.addEventListener("DOMContentLoaded", () => {
    const gridContainer = document.getElementById("contentDisplay");

    if (!gridContainer) {
        console.error("[DEBUG] Grid container not found. Exiting.");
        return;
    }

    const fetchLayout = () => {
        const pageId = "home"; // Hardcoded for the home page

        fetch(`/api/content/${pageId}`)
            .then((res) => res.json())
            .then((blocks) => {
                gridContainer.innerHTML = ""; // Clear the grid container

                const blocksToSkip = new Set(); // Track indices of blocks that are already grouped

                blocks.forEach((block, index) => {
                    if (blocksToSkip.has(index)) {
                        // Skip blocks that are already grouped
                        return;
                    }

                    const blockElement = document.createElement("div");
                    blockElement.className = `grid-item ${block.type}`;
                    blockElement.dataset.blockId = block.block_id;
                    blockElement.innerHTML = `<div class="block-content">${block.content || ""}</div>`;

                    // Check if the screen width is <= 1240px before grouping
                    if (window.matchMedia("(max-width: 1240px)").matches) {
                        // Identify and group medium + small blocks, regardless of order
                        const nextBlock = blocks[index + 1];
                        if (
                            (block.type === "block-grid-medium" && nextBlock?.type === "block-grid-small") ||
                            (block.type === "block-grid-small" && nextBlock?.type === "block-grid-medium")
                        ) {
                            const groupWrapper = document.createElement("div");
                            groupWrapper.className = "grid-item-group";
                            groupWrapper.style.display = "grid";
                            groupWrapper.style.gap = "18px"; // Match gap from CSS
                            groupWrapper.style.gridTemplateColumns = "1fr"; // Stack vertically
                            groupWrapper.style.gridAutoRows = "92px"; // Match row height
                            groupWrapper.style.gridColumn = "span 3"; // Ensure it spans the same as individual blocks

                            // Add the current block to the group
                            groupWrapper.appendChild(blockElement);

                            // Add the next block to the group
                            const nextBlockElement = document.createElement("div");
                            nextBlockElement.className = `grid-item ${nextBlock.type}`;
                            nextBlockElement.dataset.blockId = nextBlock.block_id;
                            nextBlockElement.innerHTML = `<div class="block-content">${nextBlock.content || ""}</div>`;
                            groupWrapper.appendChild(nextBlockElement);

                            // Skip processing the next block as it's already grouped
                            blocksToSkip.add(index + 1);

                            gridContainer.appendChild(groupWrapper); // Append the grouped block to the grid
                        } else {
                            // Append other blocks directly
                            gridContainer.appendChild(blockElement);
                        }
                    } else {
                        // Outside media query, append blocks directly without grouping
                        blockElement.style.gridColumn = ""; // Clear any inline styles
                        blockElement.style.gridRow = ""; // Clear any inline styles
                        gridContainer.appendChild(blockElement);
                    }
                });

                // Always ensure proper layout adjustment
                adjustGridSpacing();
            })
            .catch((err) => console.error("[ERROR] Failed to fetch layout:", err));
    };

    // Helper function to fix grid spacing issues
    const adjustGridSpacing = () => {
        const groupedBlocks = document.querySelectorAll(".grid-item-group");

        if (window.matchMedia("(max-width: 1240px)").matches) {
            groupedBlocks.forEach((group) => {
                group.style.gridRowEnd = `span ${Math.ceil(group.childElementCount * 2)}`; // Dynamically calculate row span
            });

            // Ensure the contentDisplay grid layout adjusts properly only after 1240px
            gridContainer.style.gridAutoRows = "minmax(75px, auto)"; // Dynamically adjust row height
        } else {
            groupedBlocks.forEach((group) => {
                group.style.gridRowEnd = ""; // Reset the grouped block's row span
            });

            // Reset the grid styles for larger screens
            gridContainer.style.gridAutoRows = ""; // Reset grid rows
        }
    };

    fetchLayout();

    // Re-fetch and reapply layout on window resize to adjust for media query
    window.addEventListener("resize", () => {
        fetchLayout();
    });
});
