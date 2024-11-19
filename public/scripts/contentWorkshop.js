// contentWorkshop.js

document.addEventListener("DOMContentLoaded", () => {
    console.log("[DEBUG] contentWorkshop.js loaded and DOMContentLoaded triggered.");

    const gridContainer = document.getElementById("contentPreview");
    const blockTypeControl = document.getElementById("blockTypeControl");
    const addBlockButton = document.getElementById("addBlockButton");
    const saveDraftButton = document.getElementById("saveDraftButton");
    const pushLiveButton = document.getElementById("pushLiveButton");
    const undoButton = document.getElementById("undoButton");
    const redoButton = document.getElementById("redoButton"); // New redo button
    const deleteModeButton = document.getElementById("deleteModeButton");
    const viewToggleButton = document.getElementById("viewToggleButton"); // New toggle button
    const toolbar = document.getElementById('sharedToolbar'); // Floating toolbar reference
    const mainContent = document.querySelector('.main-content'); // Main content section

    if (!gridContainer || !blockTypeControl || !addBlockButton || !saveDraftButton || !pushLiveButton || !undoButton || !redoButton || !deleteModeButton || !viewToggleButton || !toolbar || !mainContent) {
        console.error("[DEBUG] One or more critical DOM elements are missing. Script aborted.");
        return;
    }
    console.log("[DEBUG] All critical DOM elements are present.");

    let sortableInstance;
    let localLayout = []; // In-memory layout for unsaved updates
    let layoutHistory = []; // Stack for undo functionality for non-deletion actions
    let redoHistoryStack = [];   // Stack for redo functionality for non-deletion actions
    let deleteHistory = []; // Stack for undo functionality for deletions
    let deleteRedoHistory = []; // Stack for redo functionality for deletions
    let deleteMode = false; // Track delete mode state
    let viewMode = 'draft'; // Initial view mode is 'draft'
    let unsavedChanges = false; // Track unsaved changes
    let deletionsDuringDeleteMode = false; // Track deletions during delete mode
    let isSaving = false; // Flag to prevent multiple concurrent saves
    let hasPushedLive = false; // Track if Push Live has been clicked

    let selectedBlockType = null; // Declare the variable

    // Set initial button text
    viewToggleButton.textContent = 'View Live';

    // Disable undo, redo, and save buttons initially
    undoButton.disabled = true;
    redoButton.disabled = true;
    saveDraftButton.disabled = true;
    pushLiveButton.disabled = true;

    // Function to update the state of Undo and Redo buttons
    const updateHistoryButtonsState = () => {
        // Update undo button
        undoButton.disabled = deleteMode ? deleteHistory.length === 0 : layoutHistory.length <= 1;
        // Update redo button
        redoButton.disabled = deleteMode ? deleteRedoHistory.length === 0 : redoHistoryStack.length === 0;
        console.log(`[DEBUG] Undo button is now ${undoButton.disabled ? "disabled" : "enabled"}.`);
        console.log(`[DEBUG] Redo button is now ${redoButton.disabled ? "disabled" : "enabled"}.`);
    };

    // Function to update the state of Save Draft and Push Live buttons
    const updateButtonStates = () => {
        saveDraftButton.disabled = !unsavedChanges || isSaving;
        pushLiveButton.disabled = unsavedChanges || isSaving || hasPushedLive;
        console.log(`[DEBUG] Button states updated. Save Draft is ${saveDraftButton.disabled ? 'disabled' : 'enabled'}, Push Live is ${pushLiveButton.disabled ? 'disabled' : 'enabled'}.`);
    };

    // Initialize Sortable.js
    const initializeSortable = () => {
        console.log("[DEBUG] Initializing Sortable.js...");
        if (sortableInstance) {
            sortableInstance.destroy(); // Destroy the existing instance
            sortableInstance = null;
            console.log("[DEBUG] Previous Sortable.js instance destroyed.");
        }

        if (viewMode === 'live' || deleteMode) {
            console.log("[DEBUG] View mode is 'live' or delete mode is active; skipping Sortable.js initialization.");
            return;
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
                    unsavedChanges = true; // Mark changes as unsaved
                    hasPushedLive = false; // Reset after changes
                    updateButtonStates(); // Update button states
                } else {
                    console.log("[DEBUG] Block order unchanged.");
                }
            },
        });
        console.log("[DEBUG] Sortable.js initialized successfully.");
    };

    // Toggle Delete Mode
    const toggleDeleteMode = () => {
        if (viewMode !== 'draft') return; // Prevent delete mode in live mode
        deleteMode = !deleteMode;
        console.log(`[DEBUG] Delete mode ${deleteMode ? "enabled" : "disabled"}.`);
        gridContainer.classList.toggle("delete-mode", deleteMode);

        // Disable all buttons except undo and redo when delete mode is active
        addBlockButton.disabled = deleteMode;
        saveDraftButton.disabled = deleteMode;
        pushLiveButton.disabled = deleteMode;
        blockTypeControl.disabled = deleteMode;
        customDropdownToggle.disabled = deleteMode || (viewMode === 'live'); // Ensure dropdown is disabled if deleteMode or live view
        viewToggleButton.disabled = deleteMode; // Disable "View Live" button

        if (deleteMode) {
            gridContainer.addEventListener("click", deleteBlock);

            // Destroy the sortable instance to disable sorting
            if (sortableInstance) {
                sortableInstance.destroy();
                sortableInstance = null;
                console.log("[DEBUG] Sortable.js instance destroyed for delete mode.");
            }
        } else {
            gridContainer.removeEventListener("click", deleteBlock);
            addBlockButton.disabled = false;
            saveDraftButton.disabled = unsavedChanges || isSaving;
            pushLiveButton.disabled = unsavedChanges || isSaving || hasPushedLive;
            blockTypeControl.disabled = false;
            customDropdownToggle.disabled = viewMode === 'live'; // Enable only if not live
            viewToggleButton.disabled = false; // Re-enable "View Live" button

            // If deletions occurred during delete mode
            if (deletionsDuringDeleteMode) {
                unsavedChanges = true; // Mark changes as unsaved
                hasPushedLive = false; // Reset after changes
                deletionsDuringDeleteMode = false; // Reset the flag
            }

            updateButtonStates(); // Update button states

            // Re-initialize sortable if in draft mode and delete mode is off
            if (viewMode === 'draft') {
                initializeSortable();
            }
        }

        // Highlight blocks in delete mode
        Array.from(gridContainer.children).forEach((block) => {
            block.style.border = deleteMode ? "3px solid red" : "1px solid var(--border-color, #ccc)";
            block.style.cursor = deleteMode ? "pointer" : "default";
        });

        // Update undo and redo buttons
        updateHistoryButtonsState();

        // Apply or remove spacer visibility based on viewMode and deleteMode
        applySpacerVisibility();
    };

    // Delete a block when in delete mode
    const deleteBlock = (event) => {
        if (!deleteMode) return;

        const blockElement = event.target.closest(".grid-item");
        if (blockElement) {
            console.log(`[DEBUG] Block clicked for deletion: ${blockElement.dataset.blockId}`);

            // Save the block state before deletion to delete history for undo purposes
            deleteHistory.push({
                blockElement: blockElement.cloneNode(true),
            });
            // Clear redo history for delete mode
            deleteRedoHistory = [];
            updateHistoryButtonsState(); // Update buttons

            blockElement.remove(); // Remove the block from the DOM
            updateLocalLayoutFromDOM(); // Update the layout after removing the block
            deletionsDuringDeleteMode = true; // Mark that deletions have occurred
        }
    };

    // Fetch layout and initialize Sortable.js
    const fetchLayout = (reinitializeSortable = false) => {
        const pageId = document.querySelector(".side-panel .active").dataset.page;
        console.log(`[DEBUG] Fetching layout for page ID: ${pageId}`);

        fetch(`/api/content/${pageId}?status=${viewMode}`)
            .then((res) => {
                console.log(`[DEBUG] Fetch response status: ${res.status}`);
                return res.json();
            })
            .then((blocks) => {
                if (blocks.length === 0 && viewMode === 'draft') {
                    // If no draft exists, fetch live content
                    console.log("[DEBUG] No draft found, fetching live content.");
                    return fetch(`/api/content/${pageId}?status=live`).then((res) => res.json());
                } else {
                    return blocks;
                }
            })
            .then((blocks) => {
                console.log("[DEBUG] Fetched blocks:", JSON.stringify(blocks, null, 2));

                // Clear the grid container and render fetched blocks
                gridContainer.innerHTML = "";
                blocks.forEach((block) => {
                    const blockElement = document.createElement("div");
                    blockElement.className = `grid-item ${block.type}`;
                    blockElement.dataset.blockId = block.block_id;
                    blockElement.dataset.row = block.row;
                    blockElement.dataset.col = block.col;
                    blockElement.dataset.width = block.width;
                    blockElement.dataset.height = block.height;

                    blockElement.style.gridRow = `${block.row} / span ${block.height}`;
                    blockElement.style.gridColumn = `${block.col} / span ${block.width}`;
                    
                    // Determine if the block is a spacer
                    const isSpacer = block.type.startsWith('block-spacer');

                    // Set contenteditable based on block type
                    const isEditable = (viewMode === 'draft' && !deleteMode && !isSpacer);
                    
                    blockElement.innerHTML = `<div class="block-content" contenteditable="${isEditable}">${block.content || ""}</div>`;
                    
                    // Apply spacer visibility based on viewMode
                    if (isSpacer && viewMode === 'live') {
                        blockElement.style.visibility = 'hidden'; // Hide spacer content but retain grid space
                    } else {
                        blockElement.style.visibility = 'visible';
                    }

                    gridContainer.appendChild(blockElement);
                });

                // Remove `grid-area` styles to prevent conflicts
                Array.from(gridContainer.children).forEach((block) => {
                    block.style.gridArea = ""; // Clear conflicting styles
                });

                // Ensure grid container has correct grid settings
                gridContainer.style.display = 'grid';
                gridContainer.style.gridTemplateColumns = 'repeat(12, 1fr)'; // Adjust as per your grid
                gridContainer.style.gridAutoRows = 'minmax(100px, auto)'; // Adjust as needed
                gridContainer.style.gap = '10px'; // Adjust as needed

                console.log("[DEBUG] Finished rendering blocks. Grid container state:", gridContainer.innerHTML);

                if (reinitializeSortable && viewMode === 'draft' && !deleteMode) {
                    console.log("[DEBUG] Reinitializing Sortable.js after fetching layout...");
                    initializeSortable();
                }

                // Sync layout to memory only if in draft mode
                if (viewMode === 'draft') {
                    updateLocalLayoutFromDOM();
                    saveLayoutState(); // Save the initial fetched state
                    unsavedChanges = false; // No unsaved changes after fetching
                    hasPushedLive = false; // Reset after fetching
                    updateButtonStates(); // Update button states
                }

                // Apply spacer visibility after rendering
                applySpacerVisibility();
            })
            .catch((err) => console.error("[DEBUG] Error fetching layout:", err));
    };

    // Floating toolbar enhancement
    mainContent.addEventListener('scroll', () => {
        if (mainContent.scrollTop > 0) {
            toolbar.classList.add('scrolled');
        } else {
            toolbar.classList.remove('scrolled');
        }
    });

    // Update in-memory layout from the DOM
    const updateLocalLayoutFromDOM = () => {
        if (viewMode !== 'draft') return; // Prevent updating layout in live mode
        console.log("[DEBUG] Updating local layout from DOM...");
        const blocks = Array.from(gridContainer.querySelectorAll(".grid-item"));
        localLayout = blocks.map((block, index) => {
            const computedStyle = window.getComputedStyle(block);
            const rowSpan = parseInt(computedStyle.getPropertyValue("grid-row").split("span")[1]?.trim() || 1);
            const colSpan = parseInt(computedStyle.getPropertyValue("grid-column").split("span")[1]?.trim() || 1);

            return {
                block_id: block.dataset.blockId || null,
                content: block.querySelector(".block-content")?.innerHTML || "",
                row: index + 1, // Rows based on index
                col: 1, // Column set to 1
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
        if (viewMode !== 'draft') return; // Prevent saving state in live mode
        console.log("[DEBUG] Saving current layout state to history...");
        layoutHistory.push(JSON.parse(JSON.stringify(localLayout))); // Save a deep copy
        redoHistoryStack = []; // Clear redo history on new action
        console.log("[DEBUG] Layout history updated. Current history length:", layoutHistory.length);
        updateHistoryButtonsState(); // Update undo and redo button states
    };

    // Undo the last action (deletion or layout change)
    const undoLayoutChange = () => {
        if (viewMode !== 'draft') return; // Prevent undo in live mode
        if (deleteMode && deleteHistory.length > 0) {
            // Handle undo for deletions
            const lastDeleted = deleteHistory.pop(); // Get the last deleted block
            console.log("[DEBUG] Undoing last deletion.");

            // Push the undone action to redo history
            deleteRedoHistory.push({
                blockElement: lastDeleted.blockElement,
            });

            gridContainer.appendChild(lastDeleted.blockElement.cloneNode(true));

            // Update local layout and sortable
            updateLocalLayoutFromDOM();
            initializeSortable();
            // Note: Do not set unsavedChanges here since deletions during delete mode are handled separately

            // Apply spacer visibility after undoing deletion
            applySpacerVisibility();

        } else if (!deleteMode && layoutHistory.length > 1) {
            // Handle undo for layout changes
            redoHistoryStack.push(layoutHistory.pop()); // Move the latest state to redoHistory
            const previousState = layoutHistory[layoutHistory.length - 1]; // Get the previous state
            console.log("[DEBUG] Undoing layout change. Reverting to previous state:", JSON.stringify(previousState, null, 2));
            renderLayout(previousState);
            unsavedChanges = true; // Mark changes as unsaved
            hasPushedLive = false; // Reset after changes
            updateButtonStates(); // Update button states
        } else {
            console.log("[DEBUG] No more undo steps available.");
        }
        updateHistoryButtonsState(); // Update undo and redo button states
    };

    // Redo the last undone action (deletion or layout change)
    const redoLayoutChange = () => {
        if (viewMode !== 'draft') return; // Prevent redo in live mode
        if (deleteMode && deleteRedoHistory.length > 0) {
            // Handle redo for deletions
            const lastRedo = deleteRedoHistory.pop(); // Get the last redo action
            console.log("[DEBUG] Redoing last deletion.");

            // Push the action back to deleteHistory
            deleteHistory.push({
                blockElement: lastRedo.blockElement,
            });

            // Remove the block from the DOM
            const blockElement = gridContainer.querySelector(`[data-block-id="${lastRedo.blockElement.dataset.blockId}"]`);
            if (blockElement) {
                blockElement.remove();
            }

            // Update local layout and sortable
            updateLocalLayoutFromDOM();
            initializeSortable();
            // Note: Do not set unsavedChanges here since deletions during delete mode are handled separately

            // Apply spacer visibility after redoing deletion
            applySpacerVisibility();

        } else if (!deleteMode && redoHistoryStack.length > 0) {
            // Handle redo for layout changes
            const nextState = redoHistoryStack.pop();
            layoutHistory.push(nextState); // Add the next state to layoutHistory
            console.log("[DEBUG] Redoing layout change. Moving to next state:", JSON.stringify(nextState, null, 2));
            renderLayout(nextState);
            unsavedChanges = true; // Mark changes as unsaved
            hasPushedLive = false; // Reset after changes
            updateButtonStates(); // Update button states
        } else {
            console.log("[DEBUG] No more redo steps available.");
        }
        updateHistoryButtonsState(); // Update undo and redo button states
    };

    // Render layout from a given state
    const renderLayout = (layout, reinitializeSortable = true) => {
        gridContainer.innerHTML = ""; // Clear all current blocks
        layout.forEach((block) => {
            const blockElement = document.createElement("div");
            blockElement.className = `grid-item ${block.type}`;
            blockElement.dataset.blockId = block.block_id;
            blockElement.dataset.row = block.row;
            blockElement.dataset.col = block.col;
            blockElement.dataset.width = block.width;
            blockElement.dataset.height = block.height;

            blockElement.style.gridRow = `${block.row} / span ${block.height}`;
            blockElement.style.gridColumn = `${block.col} / span ${block.width}`;
            
            // Determine if the block is a spacer
            const isSpacer = block.type.startsWith('block-spacer');

            // Set contenteditable based on block type
            const isEditable = (viewMode === 'draft' && !deleteMode && !isSpacer);
            
            blockElement.innerHTML = `<div class="block-content" contenteditable="${isEditable}">${block.content || ""}</div>`;
            
            // Apply spacer visibility based on viewMode
            if (isSpacer && viewMode === 'live') {
                blockElement.style.visibility = 'hidden'; // Hide spacer content but retain grid space
            } else {
                blockElement.style.visibility = 'visible';
            }

            gridContainer.appendChild(blockElement);
        });

        // Remove `grid-area` styles to prevent conflicts
        Array.from(gridContainer.children).forEach((block) => {
            block.style.gridArea = ""; // Clear conflicting styles
        });

        // Ensure grid container has correct grid settings
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = 'repeat(12, 1fr)'; // Adjust as per your grid
        gridContainer.style.gridAutoRows = 'minmax(100px, auto)'; // Adjust as needed
        gridContainer.style.gap = '10px'; // Adjust as needed

        if (reinitializeSortable && viewMode === 'draft' && !deleteMode) {
            initializeSortable(); // Re-initialize sortable to ensure the layout is draggable
        } else if (sortableInstance) {
            sortableInstance.destroy();
            sortableInstance = null;
            console.log("[DEBUG] Sortable.js instance destroyed in renderLayout.");
        }

        // Apply spacer visibility after rendering
        applySpacerVisibility();
    };

    // Save layout to the database with status
    const saveLayoutToDatabase = (status) => {
        if (viewMode !== 'draft') return; // Prevent saving in live mode
        if (isSaving) {
            console.log("[DEBUG] Save operation already in progress. Aborting new save request.");
            return;
        }
        isSaving = true; // Set saving flag
        updateButtonStates(); // Disable buttons during save

        const pageId = document.querySelector(".side-panel .active").dataset.page; // Ensure the page ID is retrieved
        if (!pageId) {
            console.error("[DEBUG] Page ID is missing. Save aborted.");
            isSaving = false;
            updateButtonStates(); // Re-enable buttons
            return;
        }

        // Construct the payload with `page_id`, `layout`, and `status`
        const payload = { page_id: pageId, layout: localLayout, status };

        console.log(`[DEBUG] Saving layout with status "${status}" and payload:`, JSON.stringify(payload, null, 2));
        // Add this line to verify the payload
        console.log("[DEBUG] Payload being sent:", payload);

        fetch("/api/save-layout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload), // Send the payload including `page_id` and `status`
        })
            .then((res) => {
                console.log(`[DEBUG] Save response status: ${res.status}`);
                return res.json();
            })
            .then((data) => {
                console.log("[DEBUG] Server Response After Save:", JSON.stringify(data, null, 2));

                // Clear undo and redo history after a successful save
                layoutHistory = [JSON.parse(JSON.stringify(localLayout))]; // Reset history to current state
                redoHistoryStack = [];
                deleteHistory = [];
                deleteRedoHistory = [];
                updateHistoryButtonsState(); // Update undo and redo button states

                unsavedChanges = false; // Mark changes as saved

                if (status === 'live') {
                    hasPushedLive = true; // Indicate that live content has been pushed
                }

                isSaving = false; // Reset saving flag
                updateButtonStates(); // Re-enable buttons
            })
            .catch((err) => {
                console.error("[DEBUG] Error saving layout:", err);
                isSaving = false; // Reset saving flag
                updateButtonStates(); // Re-enable buttons
            });
    };

    // Add a new block to the DOM and update memory
    const addBlock = () => {
        if (viewMode !== 'draft') return; // Prevent adding blocks in live mode
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

        // Determine if the block is a spacer
        const isSpacer = blockType.startsWith('block-spacer');

        // Set contenteditable based on block type
        const contentEditable = isSpacer ? "false" : "true";

        // Set inner content without "New"
        const displayText = blockType.replace("-", " ").toUpperCase();

        block.innerHTML = `<div class="block-content" contenteditable="${contentEditable}">${displayText}</div>`;

        // Apply spacer visibility based on viewMode
        if (isSpacer && viewMode === 'live') {
            block.style.visibility = 'hidden'; // Hide spacer content but retain grid space
        } else {
            block.style.visibility = 'visible';
        }

        gridContainer.appendChild(block);
        console.log("[DEBUG] Added new block:", block);

        updateLocalLayoutFromDOM(); // Update in-memory layout with the new block
        saveLayoutState(); // Save the current state to history
        unsavedChanges = true; // Mark changes as unsaved
        hasPushedLive = false; // Reset after changes
        updateButtonStates(); // Update button states
        initializeSortable(); // Re-initialize sortable to include the new block
    };

    // Event listeners
    addBlockButton.addEventListener("click", addBlock);
    saveDraftButton.addEventListener("click", () => {
        if (viewMode !== 'draft') return; // Prevent saving in live mode
        console.log("[DEBUG] Save Draft button clicked.");
        saveLayoutToDatabase("draft");
    });
    pushLiveButton.addEventListener("click", () => {
        if (viewMode !== 'draft') return; // Prevent pushing live in live mode
        if (unsavedChanges) {
            alert("Please save your changes before pushing live.");
            return;
        }
        if (isSaving) {
            console.log("[DEBUG] Save operation in progress. Please wait.");
            return;
        }
        console.log("[DEBUG] Push Live button clicked.");
        hasPushedLive = true; // Indicate that live content has been pushed
        updateButtonStates(); // Disable buttons
        saveLayoutToDatabase("live");
    });
    undoButton.addEventListener("click", () => {
        console.log("[DEBUG] Undo button clicked.");
        undoLayoutChange();
    });
    redoButton.addEventListener("click", () => {
        console.log("[DEBUG] Redo button clicked.");
        redoLayoutChange();
    });
    deleteModeButton.addEventListener("click", () => {
        console.log("[DEBUG] Delete Mode button clicked.");
        toggleDeleteMode();
    });

    // Function to handle view toggling and update button text
    const handleViewToggle = () => {
        if (viewMode === 'draft') {
            viewMode = 'live';
            viewToggleButton.textContent = 'View Draft';
            // Disable editing features
            addBlockButton.disabled = true;
            saveDraftButton.disabled = true;
            pushLiveButton.disabled = true;
            deleteModeButton.disabled = true;
            blockTypeControl.disabled = true;
            customDropdownToggle.disabled = true; // Disable dropdown in live view
            undoButton.disabled = true;
            redoButton.disabled = true;
            viewToggleButton.disabled = false; // Ensure the button is enabled here
            // Exit delete mode if active
            if (deleteMode) {
                toggleDeleteMode();
            }
            // Destroy sortable instance if it exists
            if (sortableInstance) {
                sortableInstance.destroy();
                sortableInstance = null;
                console.log("[DEBUG] Sortable.js instance destroyed for live view.");
            }
            fetchLayout(false); // Fetch live layout from server
        } else {
            viewMode = 'draft';
            viewToggleButton.textContent = 'View Live';
            // Enable editing features
            addBlockButton.disabled = false;
            deleteModeButton.disabled = false;
            blockTypeControl.disabled = false;
            customDropdownToggle.disabled = false; // Enable dropdown in draft view
            hasPushedLive = false; // Reset after switching views
            updateButtonStates(); // Update buttons based on current state
            updateHistoryButtonsState(); // Update undo and redo buttons
            // Render the draft from localLayout to preserve unsaved changes
            renderLayout(localLayout, true);
        }

        // Apply or remove spacer visibility based on viewMode and deleteMode
        applySpacerVisibility();
    };

    // Function to apply spacer visibility based on current view mode
    const applySpacerVisibility = () => {
        const spacerBlocks = gridContainer.querySelectorAll(".grid-item[class*='block-spacer']");
        spacerBlocks.forEach((block) => {
            if (viewMode === 'live') {
                block.style.visibility = 'hidden'; // Hide spacers in live view
            } else {
                block.style.visibility = 'visible'; // Show spacers in draft view
            }
        });
    };

    // **Update the primary event listener to call handleViewToggle**
    viewToggleButton.removeEventListener("click", () => {}); // Ensure no other listeners
    viewToggleButton.addEventListener("click", handleViewToggle);

    // Event listener for content changes in blocks
    gridContainer.addEventListener('input', (event) => {
        if (event.target.classList.contains('block-content')) {
            unsavedChanges = true; // Mark changes as unsaved
            hasPushedLive = false; // Reset after changes
            updateButtonStates(); // Update button states
            // Save state for undo/redo
            updateLocalLayoutFromDOM();
            saveLayoutState();
        }
    });

    // Handle the beforeunload event to warn the user about unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (unsavedChanges) {
            // Cancel the event as stated by the standard.
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // Custom Dropdown Handling
    const customDropdownToggle = document.getElementById("customBlockTypeDropdown");
    const customDropdownMenu = document.querySelector(".dropdown-menu");

    if (!customDropdownToggle || !customDropdownMenu) {
        console.error("[DEBUG] Custom dropdown elements are missing.");
    } else {
        // Toggle dropdown visibility
        customDropdownToggle.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent click from bubbling up
            const isOpen = customDropdownMenu.style.display === "block";
            customDropdownMenu.style.display = isOpen ? "none" : "block";
            customDropdownToggle.setAttribute("aria-expanded", !isOpen);
        });

        // Handle selection of dropdown items
        customDropdownMenu.querySelectorAll("li").forEach(item => {
            item.addEventListener("click", (e) => {
                e.stopPropagation(); // Prevent click from bubbling up
                if (item.classList.contains("dropdown-submenu")) {
                    // Submenu is handled via CSS hover
                    return;
                }
                const selectedValue = item.getAttribute("data-value");
                const selectedText = item.textContent.trim();
                selectedBlockType = selectedValue;

                // Update the dropdown toggle button's text with a single Unicode arrow
                customDropdownToggle.innerHTML = `${selectedText} &#9662;`; // ▼

                // Update the hidden select's value
                blockTypeControl.value = selectedValue;

                // Close the dropdown menu
                customDropdownMenu.style.display = "none";
                customDropdownToggle.setAttribute("aria-expanded", "false");
            });
        });

        // Close the dropdown when clicking outside
        document.addEventListener("click", () => {
            customDropdownMenu.style.display = "none";
            customDropdownToggle.setAttribute("aria-expanded", "false");
        });
    }

    // Function to fetch blocks based on selected type
    const fetchBlocks = async (blockType) => {
        try {
            // Replace 'contentPreview' with 'gridContainer'
            gridContainer.innerHTML = '<p>Loading blocks...</p>';
            const response = await fetch(`/api/blocks?type=${blockType}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const blocks = await response.json();
            displayBlocks(blocks);
        } catch (error) {
            console.error('Fetch error:', error);
            gridContainer.innerHTML = '<p>Error loading blocks.</p>';
        }
    };

    // Function to display blocks in the preview area
    const displayBlocks = (blocks) => {
        gridContainer.innerHTML = ''; // Clear existing content
        if (blocks.length === 0) {
            gridContainer.innerHTML = '<p>No blocks available.</p>';
            return;
        }
        blocks.forEach(block => {
            const blockElement = document.createElement('div');
            blockElement.classList.add('block');
            blockElement.textContent = block.name; // Adjust based on your data structure
            gridContainer.appendChild(blockElement);
        });
    };

    // Event listener for Add Block button
    addBlockButton.addEventListener('click', () => {
        if (!selectedBlockType) {
            alert('Please select a block type first.');
            return;
        }
        // Implement add block functionality
        console.log(`Adding block of type: ${selectedBlockType}`);
        // Example: Send a POST request to add a block
        fetch('/api/blocks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type: selectedBlockType })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Block added:', data);
            fetchBlocks(selectedBlockType); // Refresh the block list
        })
        .catch(error => console.error('Error adding block:', error));
    });

    // Initial fetch and setup
    fetchLayout(true);
});
