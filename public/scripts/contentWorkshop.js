document.addEventListener("DOMContentLoaded", () => {
    console.log("[DEBUG] contentWorkshop.js loaded and DOMContentLoaded triggered.");

    const gridContainer = document.getElementById("contentPreview");
    const blockTypeControl = document.getElementById("blockTypeControl");
    const addBlockButton = document.getElementById("addBlockButton");
    const saveButton = document.getElementById("saveButton");
    const undoButton = document.getElementById("undoButton");
    const deleteModeButton = document.getElementById("deleteModeButton");

    if (!gridContainer || !blockTypeControl || !addBlockButton || !saveButton || !undoButton || !deleteModeButton) {
        console.error("[DEBUG] One or more critical DOM elements are missing. Script aborted.");
        return;
    }
    console.log("[DEBUG] All critical DOM elements are present.");

    let sortableInstance;
    let localLayout = []; // In-memory layout for unsaved updates
    let layoutHistory = []; // Stack for undo functionality
    let deleteMode = false; // Track delete mode state

    // Disable undo button initially
    undoButton.disabled = true;

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
                    saveLayoutState(); // Save current state to history
                } else {
                    console.log("[DEBUG] Block order unchanged.");
                }
            },
        });
        console.log("[DEBUG] Sortable.js initialized successfully.");
    };

    // Update undo button state
    const updateUndoButtonState = () => {
        undoButton.disabled = layoutHistory.length <= 1; // Disable if no undo steps are available
        console.log(`[DEBUG] Undo button is now ${undoButton.disabled ? "disabled" : "enabled"}.`);
    };

    // Toggle Delete Mode
    const toggleDeleteMode = () => {
        deleteMode = !deleteMode;
        console.log(`[DEBUG] Delete mode ${deleteMode ? "enabled" : "disabled"}.`);
        gridContainer.classList.toggle("delete-mode", deleteMode);

        if (deleteMode) {
            gridContainer.addEventListener("click", deleteBlock);
            saveButton.disabled = true; // Disable save button when in delete mode
        } else {
            gridContainer.removeEventListener("click", deleteBlock);
            saveButton.disabled = false; // Enable save button when delete mode is off
        }

        // Highlight blocks in delete mode
        Array.from(gridContainer.children).forEach((block) => {
            block.style.border = deleteMode ? "3px solid red" : "1px solid var(--border-color, #ccc)";
            block.style.cursor = deleteMode ? "pointer" : "default";
        });
    };

    // Delete a block when in delete mode
    const deleteBlock = (event) => {
        if (!deleteMode) return;

        const blockElement = event.target.closest(".grid-item");
        if (blockElement) {
            console.log(`[DEBUG] Block clicked for deletion: ${blockElement.dataset.blockId}`);
            // Remove the block from the DOM immediately
            blockElement.remove();
            updateLocalLayoutFromDOM(); // Update the layout after removing the block
        }
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
                saveLayoutState(); // Save the initial fetched state
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

    // Save current layout state to the history stack
    const saveLayoutState = () => {
        console.log("[DEBUG] Saving current layout state to history...");
        layoutHistory.push(JSON.parse(JSON.stringify(localLayout))); // Save a deep copy
        console.log("[DEBUG] Layout history updated. Current history length:", layoutHistory.length);
        updateUndoButtonState(); // Update undo button state
    };

    // Undo the last layout change
    const undoLayoutChange = () => {
        if (layoutHistory.length > 1) { // Ensure there's something to undo (keep at least the initial state)
            layoutHistory.pop(); // Remove the latest change
            const previousState = layoutHistory[layoutHistory.length - 1]; // Get the previous state
            console.log("[DEBUG] Undoing layout change. Reverting to previous state:", JSON.stringify(previousState, null, 2));
            renderLayout(previousState);
        } else {
            console.log("[DEBUG] No more undo steps available.");
        }
        updateUndoButtonState(); // Update undo button state
    };

    // Render layout from a given state
    const renderLayout = (layout) => {
        gridContainer.innerHTML = ""; // Clear all current blocks
        layout.forEach((block) => {
            const blockElement = document.createElement("div");
            blockElement.className = `grid-item ${block.type}`;
            blockElement.dataset.blockId = block.block_id;
            blockElement.style.gridRow = `${block.row} / span ${block.height}`;
            blockElement.style.gridColumn = `${block.col} / span ${block.width}`;
            blockElement.innerHTML = `<div class="block-content" contenteditable="true">${block.content || ""}</div>`;
            gridContainer.appendChild(blockElement);
        });
        initializeSortable(); // Re-initialize sortable to ensure the layout is draggable
    };

    // Save layout to the database
    const saveLayout = (layout) => {
        const pageId = document.querySelector(".side-panel .active").dataset.page; // Ensure the page ID is retrieved
        if (!pageId) {
            console.error("[DEBUG] Page ID is missing. Save aborted.");
            return;
        }

        // Construct the payload with `page_id` and `layout`
        const payload = { page_id: pageId, layout };

        console.log("[DEBUG] Saving layout with payload:", JSON.stringify(payload, null, 2));

        fetch("/api/save-layout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload), // Send the payload including `page_id`
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
                    renderLayout(data.layout);
                    saveLayoutState(); // Save the saved state to history
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
        block.innerHTML = `<div class="block-content" contenteditable="true">New ${blockType.replace("-", " ").toUpperCase()}</div>`;

        gridContainer.appendChild(block);
        console.log("[DEBUG] Added new block:", block);

        updateLocalLayoutFromDOM(); // Update in-memory layout with the new block
        saveLayoutState(); // Save the current state to history
        initializeSortable(); // Re-initialize sortable to include the new block
    };

    // Event listeners
    addBlockButton.addEventListener("click", addBlock);
    saveButton.addEventListener("click", () => {
        console.log("[DEBUG] Save button clicked.");
        saveLayout(localLayout);
    });
    undoButton.addEventListener("click", () => {
        console.log("[DEBUG] Undo button clicked.");
        undoLayoutChange();
    });
    deleteModeButton.addEventListener("click", () => {
        console.log("[DEBUG] Delete Mode button clicked.");
        toggleDeleteMode();
    });

    // Initial fetch and setup
    fetchLayout(true);
});
