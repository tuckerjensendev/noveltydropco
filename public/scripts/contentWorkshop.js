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

                if (event.oldIndex !== event.newIndex) {
                    updateLocalLayoutFromDOM(); // Update in-memory layout after sorting
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
                console.log("[DEBUG] Fetched blocks:", JSON.stringify(blocks, null, 2));
    
                // Clear the grid container and render fetched blocks
                gridContainer.innerHTML = ""; 
                blocks.forEach((block) => {
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
    
                // Sync layout to memory
                updateLocalLayoutFromDOM();
            })
            .catch((err) => console.error("[DEBUG] Error fetching layout:", err));
    };
    

// Update in-memory layout from the DOM
const updateLocalLayoutFromDOM = () => {
    console.log("[DEBUG] Updating local layout from DOM...");
    const blocks = Array.from(gridContainer.querySelectorAll(".grid-item"));
    localLayout = blocks.map((block, index) => {
        const computedStyle = window.getComputedStyle(block);
        const rowSpan = parseInt(computedStyle.getPropertyValue("grid-row").split("span")[1]?.trim() || 1);
        const colSpan = parseInt(computedStyle.getPropertyValue("grid-column").split("span")[1]?.trim() || 1);

        return {
            block_id: block.dataset.blockId || null,
            content: block.querySelector(".block-content")?.innerHTML || "",
            row: index + 1, // Ensure rows are updated based on new index
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

            // Re-render layout based on server response
            if (data.layout) {
                console.log("[DEBUG] Re-rendering updated layout from server response...");
                gridContainer.innerHTML = ""; // Clear all current blocks
                data.layout.forEach((block) => {
                    const blockElement = document.createElement("div");
                    blockElement.className = `grid-item ${block.type}`;
                    blockElement.dataset.blockId = block.block_id;
                    blockElement.style.gridRow = `${block.row} / span ${block.height}`;
                    blockElement.style.gridColumn = `${block.col} / span ${block.width}`;
                    blockElement.innerHTML = `<div class="block-content" contenteditable="true">${block.content || ""}</div>`;
                    gridContainer.appendChild(blockElement);
                });
                console.log("[DEBUG] Updated layout re-rendered.");
                initializeSortable(); // Re-initialize sortable
            } else {
                console.log("[DEBUG] No updated layout received from server.");
            }
        })
        .catch((err) => console.error("[DEBUG] Error saving layout:", err));
};



    // Add a new block to the DOM and update memory
    const addBlock = () => {
        console.log("[DEBUG] Add Block button clicked.");
        const blockType = blockTypeControl.value;

        // Calculate row and column for new block
        const row = localLayout.length + 1; // Add new block to the next row
        const col = 1; // Default column

        const block = document.createElement("div");

        block.className = `grid-item ${blockType}`;
        block.dataset.blockId = `temp-${Date.now()}`; // Temporary ID for new blocks
        block.style.gridRow = `${row} / span 2`;
        block.style.gridColumn = `${col} / span 3`;
        // No gridArea to prevent stacking
        block.innerHTML = `<div class="block-content" contenteditable="true">New ${blockType.replace("-", " ").toUpperCase()}</div>`;

        gridContainer.appendChild(block);
        console.log("[DEBUG] Added new block:", block);

        updateLocalLayoutFromDOM(); // Update in-memory layout with the new block
        initializeSortable(); // Re-initialize sortable to include the new block
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
