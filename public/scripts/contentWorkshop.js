document.addEventListener("DOMContentLoaded", () => {
    console.log("[DEBUG] contentWorkshop.js loaded and DOMContentLoaded triggered.");

    const gridContainer = document.getElementById("contentPreview");
    const blockTypeControl = document.getElementById("blockTypeControl");
    const addBlockButton = document.getElementById("addBlockButton");
    const saveButton = document.getElementById("saveButton");

    if (!gridContainer || !blockTypeControl || !addBlockButton || !saveButton) {
        console.error("[DEBUG] One or more critical DOM elements are missing. Script aborted.");
        return;
    }
    console.log("[DEBUG] All critical DOM elements are present.");

    let sortableInstance;
    let localLayout = []; // In-memory layout for unsaved updates

    // Initialize Sortable.js
    const initializeSortable = () => {
        console.log("[DEBUG] Initializing Sortable.js...");
        if (sortableInstance) {
            sortableInstance.destroy(); // Destroy the existing instance
            console.log("[DEBUG] Previous Sortable.js instance destroyed.");
        }

        // Remove `grid-area` styles for proper sorting
        Array.from(gridContainer.children).forEach((block) => {
            block.style.gridArea = ""; // Clear conflicting styles
        });

        sortableInstance = Sortable.create(gridContainer, {
            animation: 150,
            handle: ".grid-item",
            onEnd: (event) => {
                console.log("[DEBUG] Drag event ended.");
                console.log(`[DEBUG] Old Index: ${event.oldIndex}, New Index: ${event.newIndex}`);

                const blocks = Array.from(gridContainer.children);
                if (event.oldIndex !== event.newIndex) {
                    const movedBlock = blocks.splice(event.oldIndex, 1)[0];
                    blocks.splice(event.newIndex, 0, movedBlock);

                    gridContainer.innerHTML = ""; // Clear container
                    blocks.forEach((block) => gridContainer.appendChild(block)); // Re-render DOM

                    console.log("[DEBUG] Blocks after reordering:", blocks.map((block) => block.dataset.blockId));
                    updateLocalLayoutFromDOM(); // Update local layout after sorting
                } else {
                    console.log("[DEBUG] Block order unchanged.");
                }
            },
        });
        console.log("[DEBUG] Sortable.js initialized successfully.");
    };

    // Fetch layout and initialize Sortable.js
    const fetchLayout = (reinitializeSortable = false) => {
        const pageId = document.querySelector(".side-panel .active").dataset.page;
        console.log(`[DEBUG] Fetching layout for page ID: ${pageId}`);

        fetch(`/api/content/${pageId}`)
            .then((res) => {
                console.log(`[DEBUG] Fetch response status: ${res.status}`);
                return res.json();
            })
            .then((blocks) => {
                console.log("[DEBUG] Fetched blocks:", blocks);

                gridContainer.innerHTML = ""; // Clear all current blocks
                blocks.forEach((block, index) => {
                    console.log(`[DEBUG] Rendering block ${index + 1}:`, block);
                    const blockElement = document.createElement("div");
                    blockElement.className = `grid-item ${block.type}`;
                    blockElement.dataset.blockId = block.block_id;
                    blockElement.style.gridRow = `${block.row} / span ${block.height}`;
                    blockElement.style.gridColumn = `${block.col} / span ${block.width}`;
                    blockElement.innerHTML = `<div class="block-content" contenteditable="true">${block.content || ""}</div>`;
                    gridContainer.appendChild(blockElement);
                });

                console.log("[DEBUG] Finished rendering blocks. Grid container state:", gridContainer.innerHTML);

                if (reinitializeSortable) {
                    console.log("[DEBUG] Reinitializing Sortable.js after fetching layout...");
                    initializeSortable();
                }

                // Sync initial layout to local memory
                updateLocalLayoutFromDOM();
            })
            .catch((err) => console.error("[DEBUG] Error fetching layout:", err));
    };

    // Update in-memory layout from the DOM
    const updateLocalLayoutFromDOM = () => {
        console.log("[DEBUG] Updating local layout from DOM...");
        localLayout = Array.from(gridContainer.querySelectorAll(".grid-item")).map((block, index) => {
            const computedStyle = window.getComputedStyle(block);
            const rowSpan = parseInt(computedStyle.getPropertyValue("grid-row").split("span")[1]?.trim() || 1);
            const colSpan = parseInt(computedStyle.getPropertyValue("grid-column").split("span")[1]?.trim() || 1);

            return {
                block_id: block.dataset.blockId || null,
                content: block.querySelector(".block-content")?.innerHTML || "",
                row: index + 1, // Use DOM order for row
                col: 1, // Default column for simplicity
                width: colSpan,
                height: rowSpan,
                style: block.style.cssText || null,
                type: block.classList[1],
                page_id: document.querySelector(".side-panel .active").dataset.page,
            };
        });
        console.log("[DEBUG] Updated local layout:", JSON.stringify(localLayout, null, 2));
    };

    // Save layout to the database
    const saveLayout = (layout) => {
        console.log("[DEBUG] Saving layout with payload:", JSON.stringify(layout, null, 2));

        fetch("/api/save-layout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(layout),
        })
            .then((res) => {
                console.log(`[DEBUG] Save response status: ${res.status}`);
                return res.json();
            })
            .then((data) => {
                console.log("[DEBUG] Server Response After Save:", JSON.stringify(data, null, 2));
                fetchLayout(true); // Re-fetch layout after saving
            })
            .catch((err) => console.error("[DEBUG] Error saving layout:", err));
    };

    // Add a new block to the DOM and update memory
    const addBlock = () => {
        console.log("[DEBUG] Add Block button clicked.");
        const blockType = blockTypeControl.value;
        const block = document.createElement("div");

        block.className = `grid-item ${blockType}`;
        block.dataset.blockId = `temp-${Date.now()}`; // Temporary ID for new blocks
        block.style.gridRow = "1 / span 2";
        block.style.gridColumn = "1 / span 3";
        block.innerHTML = `<div class="block-content" contenteditable="true">New ${blockType.replace("-", " ").toUpperCase()}</div>`;

        gridContainer.appendChild(block);
        console.log("[DEBUG] Added new block:", block);

        initializeSortable();
        updateLocalLayoutFromDOM(); // Update in-memory layout
    };

    // Event listeners
    addBlockButton.addEventListener("click", addBlock);

    saveButton.addEventListener("click", () => {
        console.log("[DEBUG] Save button clicked.");
        saveLayout(localLayout);
    });

    // Initial fetch and setup
    fetchLayout(true);
});
