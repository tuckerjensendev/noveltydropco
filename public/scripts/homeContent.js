document.addEventListener("DOMContentLoaded", () => {
    console.log("[DEBUG] homeContent.js loaded and DOMContentLoaded triggered.");

    const gridContainer = document.getElementById("contentDisplay");

    if (!gridContainer) {
        console.error("[DEBUG] Grid container not found. Exiting.");
        return;
    }
    console.log("[DEBUG] Grid container found.");

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

                // Clear the grid container and render fetched blocks
                gridContainer.innerHTML = "";
                
                blocks.forEach((block) => {
                    const blockElement = document.createElement("div");
                    blockElement.className = `grid-item ${block.type}`; // Use CSS classes to control the positioning
                    blockElement.dataset.blockId = block.block_id;

                    // Set the inner content
                    blockElement.innerHTML = `<div class="block-content">${block.content || ""}</div>`;

                    // Add the block to the container
                    gridContainer.appendChild(blockElement);
                });

                console.log("[DEBUG] Finished rendering blocks. Grid container state:", gridContainer.innerHTML);
            })
            .catch((err) => console.error("[ERROR] Failed to fetch layout:", err));
    };

    // Initial fetch and setup
    fetchLayout();
});
