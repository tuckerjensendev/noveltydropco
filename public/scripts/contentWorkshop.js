// contentWorkshop.js

document.addEventListener("DOMContentLoaded", () => {
    console.log("[DEBUG] contentWorkshop.js loaded and DOMContentLoaded triggered.");

    /**
     * *******************************
     * **DOM Elements**
     * *******************************
     */
    const gridPreviewContainer = document.getElementById("contentPreview");
    const gridDisplayContainer = document.getElementById("contentDisplay");
    const blockTypeControl = document.getElementById("blockTypeControl");
    const addBlockButton = document.getElementById("addBlockButton");
    const saveDraftButton = document.getElementById("saveDraftButton");
    const pushLiveButton = document.getElementById("pushLiveButton");
    const undoButton = document.getElementById("undoButton");
    const redoButton = document.getElementById("redoButton");
    const clearContentButton = document.getElementById("clearContentButton"); // Ensure ID matches HTML
    const deleteModeButton = document.getElementById("deleteModeButton");
    const viewToggleButton = document.getElementById("viewToggleButton"); // New toggle button
    const copyLiveButton = document.getElementById("copyLiveButton");
    const toolbar = document.getElementById('sharedToolbar'); // Floating toolbar reference
    const secondToolbarRow = document.querySelector('.toolbar-row.second-row');
    const mainContent = document.querySelector('.main-content'); // Main content section
    const lockSVGPath = "/images/svg/lock-locked.svg"; // Path to locked SVG
    const unlockSVGPath = "/images/svg/lock-unlocked.svg"; // Path to unlocked SVG

    // **Dropdown Elements**
    const customDropdownToggle = document.getElementById("customBlockTypeDropdown");
    const customDropdownMenu = document.querySelector(".dropdown-menu");

    /**
     * *******************************
     * **Validation of Critical DOM Elements**
     * *******************************
     */
    if (!blockTypeControl || !addBlockButton || !saveDraftButton || !pushLiveButton || !undoButton || !redoButton || !clearContentButton || !deleteModeButton || !viewToggleButton || !copyLiveButton || !toolbar || !mainContent) {
        console.error("[DEBUG] One or more critical DOM elements are missing. Script aborted.");
        return;
    }
    console.log("[DEBUG] All critical DOM elements are present.");

    /**
     * *******************************
     * **State Variables**
     * *******************************
     */
    let sortableInstance;
    let localLayout = []; // In-memory layout for unsaved updates
    let layoutHistory = []; // Stack for undo functionality for non-deletion actions
    let redoHistoryStack = []; // Stack for redo functionality for non-deletion actions
    let deleteHistory = []; // Stack for undo functionality for deletions
    let deleteRedoHistory = []; // Stack for redo functionality for deletions
    let deleteMode = false; // Track delete mode state
    let viewMode = 'draft'; // Always start in 'draft' mode
    let gridContainer = gridPreviewContainer; // Assign gridContainer to 'contentPreview'
    let unsavedChanges = false; // Track unsaved changes
    let deletionsDuringDeleteMode = false; // Track deletions during delete mode
    let isSaving = false; // Flag to prevent multiple concurrent saves
    let hasPushedLive = false; // Track if Push Live has been clicked

    let selectedBlockType = null; // Declare the variable

    // **Per-action flags to prevent race conditions**
    let isAddingBlock = false;
    let isUndoing = false;
    let isRedoing = false;
    let isTogglingDeleteMode = false;
    let isTogglingView = false;
    let isSortLocked = false;
    let toolbarTab;
    let currentlyUnlockedBlock = null; // Track the currently unlocked block

    /**
     * *******************************
     * **Enhanced Mutex Implementation**
     * *******************************
     */
    class Mutex {
        constructor() {
            this.queue = [];
            this.locked = false;
        }

        /**
         * Acquires the mutex lock.
         * Returns a Promise that resolves when the lock is acquired.
         */
        lock() {
            return new Promise(resolve => {
                if (this.locked) {
                    console.log("[DEBUG] Mutex is currently locked. Adding to queue.");
                    this.queue.push(resolve);
                } else {
                    this.locked = true;
                    console.log("[DEBUG] Mutex is now locked.");
                    resolve();
                }
            });
        }

        /**
         * Releases the mutex lock.
         * If there are queued requests, the next one is resolved.
         */
        unlock() {
            if (!this.locked) {
                console.warn("[DEBUG] Attempted to unlock a mutex that is not locked.");
                return;
            }

            if (this.queue.length > 0) {
                const nextResolve = this.queue.shift();
                console.log("[DEBUG] Passing lock to the next requester in the queue.");
                nextResolve();
            } else {
                this.locked = false;
                console.log("[DEBUG] Mutex is now unlocked.");
            }
        }
    }

    const mutex = new Mutex(); // Instantiate the global mutex

    /**
     * *******************************
     * **Initialization**
     * *******************************
     */

    // **Initialize viewMode and gridContainer**
    if (!gridPreviewContainer) {
        // No draft exists
        console.log("[DEBUG] No 'contentPreview' found. Displaying 'NO DRAFT SAVED'.");
        displayNoSavedDraftMessage();
        // Do not assign gridContainer to 'contentDisplay' to prevent live fetch
        gridContainer = null;
    } else {
        console.log("[DEBUG] 'contentPreview' found. Initializing in 'draft' mode.");
        viewMode = 'draft';
        gridContainer = gridPreviewContainer;
    }

    /**
     * *******************************
     * **Toolbar Configuration**
     * *******************************
     */

    // **Floating Toolbar Enhancement**
    mainContent.addEventListener('scroll', () => {
        if (mainContent.scrollTop > 0) {
            toolbar.style.zIndex = '10'; // Place toolbar on top
            toolbar.classList.add('scrolled');
        } else {
            toolbar.style.zIndex = ''; // Reset z-index when not scrolled
            toolbar.classList.remove('scrolled');
        }
    });

    // **Toolbar Tab Functionality**
    const createToolbarTab = () => {
        if (toolbarTab) {
            console.warn("[DEBUG] Toolbar tab already exists. Skipping creation.");
            return; // Avoid re-creating the toolbar tab
        }

        toolbarTab = document.createElement('div');
        toolbarTab.id = 'toolbarTab';
        toolbarTab.className = 'toolbar-tab';
        toolbarTab.innerHTML = '<span>&#x25B2;</span>'; // Upward arrow icon
        toolbarTab.enabled = viewMode === 'draft'; // Enable only in draft mode

        // Add no-hover class if disabled
        if (!toolbarTab.enabled) {
            toolbarTab.classList.add('no-hover');
        }

        toolbar.appendChild(toolbarTab);

        // Add click event to toggle the toolbar expansion
        toolbarTab.addEventListener('click', () => {
            if (!toolbarTab.enabled) {
                console.log("[DEBUG] Toolbar tab click ignored because it is disabled.");
                return; // Prevent interaction when disabled
            }
            const isExpanded = secondToolbarRow.style.display !== 'none';
            secondToolbarRow.style.display = isExpanded ? 'none' : 'flex';
            toolbarTab.innerHTML = isExpanded ? '<span>&#x25B2;</span>' : '<span>&#x25BC;</span>'; // Update arrow direction
            toolbarTab.classList.toggle('expanded', !isExpanded); // Add/remove 'expanded' class for styling
        });
    };

    // Initialize toolbar tab and ensure the second row is hidden initially
    if (toolbar && secondToolbarRow) {
        secondToolbarRow.style.display = 'none'; // Hide second row initially
        createToolbarTab(); // Create and attach the tab
    } else {
        console.error("[DEBUG] Toolbar or second toolbar row is missing.");
    }

    /**
     * *******************************
     * **Button Initialization**
     * *******************************
     */

    // **Set Initial Button Text and States**
    if (viewMode === 'draft') {
        viewToggleButton.textContent = 'View Live';
    } else {
        viewToggleButton.textContent = 'View Draft';
    }

    // Disable undo, redo, and save buttons initially
    undoButton.disabled = true;
    redoButton.disabled = true;
    saveDraftButton.disabled = true;
    pushLiveButton.disabled = true; // Disable Push Live initially since no unsaved changes

    // Initialize clearContentButton state
    clearContentButton.disabled = localLayout.length === 0 || isSaving || viewMode === 'live' || currentlyUnlockedBlock !== null;

    /**
     * *******************************
     * **Utility Functions**
     * *******************************
     */

    // **Functions to Update Button States**

    // Function to update the state of Undo and Redo buttons
    const updateHistoryButtonsState = () => {
        // Update undo button
        undoButton.disabled = deleteMode ? deleteHistory.length === 0 : layoutHistory.length <= 1;
        // Update redo button
        redoButton.disabled = deleteMode ? deleteRedoHistory.length === 0 : redoHistoryStack.length === 0;
        console.log(`[DEBUG] Undo button is now ${undoButton.disabled ? "disabled" : "enabled"}.`);
        console.log(`[DEBUG] Redo button is now ${redoButton.disabled ? "disabled" : "enabled"}.`);
    };

    // Function to update the state of all buttons dynamically
    const updateButtonStates = () => {
        // Save Draft Button
        saveDraftButton.disabled = !unsavedChanges || isSaving || viewMode === 'live';

        // Push Live Button: Disabled if unsaved changes, saving, already pushed live, live view, or a block is unlocked
        pushLiveButton.disabled = unsavedChanges || isSaving || hasPushedLive || viewMode === 'live' || currentlyUnlockedBlock !== null;

        // Copy Live Button: Disabled if a block is unlocked or not in draft mode
        copyLiveButton.disabled = currentlyUnlockedBlock !== null || viewMode !== 'draft';

        // Main Toolbar Buttons: Disabled if a block is unlocked
        viewToggleButton.disabled = currentlyUnlockedBlock !== null || isSaving;
        blockTypeControl.disabled = currentlyUnlockedBlock !== null || isSaving || viewMode === 'live';
        addBlockButton.disabled = currentlyUnlockedBlock !== null || deleteMode || isSaving || viewMode === 'live';
        deleteModeButton.disabled = currentlyUnlockedBlock !== null || isSaving || viewMode !== 'draft';

        // Select Block Type Dropdown
        if (customDropdownToggle) {
            customDropdownToggle.disabled = currentlyUnlockedBlock !== null || isSaving || viewMode === 'live';
        }

        // Clear Content Button: Enabled if there is content to clear, not saving, in draft mode, and no padlocks unlocked
        clearContentButton.disabled = localLayout.length === 0 || isSaving || viewMode === 'live' || currentlyUnlockedBlock !== null;

        // Undo and Redo buttons are handled separately
        updateHistoryButtonsState();

        console.log(`[DEBUG] Button states updated:
            Save Draft: ${saveDraftButton.disabled ? 'disabled' : 'enabled'},
            Push Live: ${pushLiveButton.disabled ? 'disabled' : 'enabled'},
            Copy Live: ${copyLiveButton.disabled ? 'disabled' : 'enabled'},
            Clear Content: ${clearContentButton.disabled ? 'disabled' : 'enabled'}.`);
    };

    // **Utility Functions to Control Body Scroll**
    const disableBodyScroll = () => {
        document.body.style.overflow = "hidden";
        console.log("[DEBUG] Body scrolling disabled.");
    };
    
    const enableBodyScroll = () => {
        document.body.style.overflow = "";
        console.log("[DEBUG] Body scrolling enabled.");
    };

    /**
     * *******************************
     * **Padlock Functionality**
     * *******************************
     */

    // **Padlock Functionality for Blocks**
    const toggleBlockLock = (blockElement) => {
        const lockOverlay = blockElement.querySelector(".lock-overlay");
        const contentEditableElement = blockElement.querySelector(".block-content");
    
        if (!lockOverlay) {
            console.error("[DEBUG] Lock overlay element not found.");
            return;
        }
    
        const isLocked = lockOverlay.dataset.locked === "true";
    
        if (isLocked) {
            // Unlock the block
            lockOverlay.dataset.locked = "false";
            blockElement.setAttribute("data-unlocked", "true"); // Set persistent editing state
            lockOverlay.innerHTML = `<img src="${unlockSVGPath}" alt="Unlocked" class="lock-icon" />`;
            contentEditableElement.contentEditable = "true";
            blockElement.classList.remove('default-border');
            blockElement.classList.add('unlocked-border'); // Add unlocked border
            currentlyUnlockedBlock = blockElement; // Track the currently unlocked block
            console.log("[DEBUG] Block unlocked.");
    
            // **Disable Sortable.js when a block is unlocked**
            if (sortableInstance) {
                sortableInstance.destroy();
                sortableInstance = null;
                console.log("[DEBUG] Sortable.js instance destroyed due to unlocked block.");
            }
        } else {
            // Lock the block
            lockOverlay.dataset.locked = "true";
            blockElement.removeAttribute("data-unlocked"); // Remove persistent editing state
            lockOverlay.innerHTML = `<img src="${lockSVGPath}" alt="Locked" class="lock-icon" />`;
            contentEditableElement.contentEditable = "false";
    
            // Reset currently unlocked block if this block was previously unlocked
            if (currentlyUnlockedBlock === blockElement) {
                currentlyUnlockedBlock = null;
                console.log("[DEBUG] Locked previously unlocked block. Reset currentlyUnlockedBlock.");
            }
    
            blockElement.classList.remove('unlocked-border');
            blockElement.classList.add('default-border'); // Re-add default border

            console.log("[DEBUG] Block locked.");
    
            // **Re-enable Sortable.js if no other blocks are unlocked**
            if (!currentlyUnlockedBlock && !deleteMode && !isSortLocked && viewMode === 'draft') {
                initializeSortable();
                console.log("[DEBUG] Sortable.js re-initialized after locking block.");
            }
        }

        // **Update button states after toggling lock**
        updateButtonStates();
    };

    // **Ensure Only One Block is Unlocked at a Time**
    const enforceSingleUnlock = (blockElement) => {
        if (currentlyUnlockedBlock && currentlyUnlockedBlock !== blockElement) {
            console.log("[DEBUG] Another block is already unlocked.");

            // Show the popup and scroll to the unlocked block
            alert("Please lock the currently unlocked block before unlocking another.");
            
            // Smoothly scroll to the unlocked block without causing layout shifts
            const containerRect = gridContainer.getBoundingClientRect();
            const blockRect = currentlyUnlockedBlock.getBoundingClientRect();

            const offsetTop = blockRect.top - containerRect.top + gridContainer.scrollTop;
            gridContainer.scrollTo({
                top: offsetTop - 10, // Adjust the offset to account for headers or spacing
                behavior: "smooth",
            });

            return false; // Indicate that the action should not proceed
        }

        // Allow unlocking this block
        return true;
    };

    /**
     * *******************************
     * **Sortable.js Initialization**
     * *******************************
     */

    // **Initialize Sortable.js**
    const initializeSortable = () => {
        console.log("[DEBUG] Initializing Sortable.js...");

        // Destroy any existing Sortable.js instance to avoid duplicates
        if (sortableInstance) {
            sortableInstance.destroy();
            sortableInstance = null; // Explicitly reset to null
            console.log("[DEBUG] Previous Sortable.js instance destroyed.");
        }

        // Skip initialization in 'live' view or delete mode
        if (viewMode === 'live' || deleteMode || isSortLocked || currentlyUnlockedBlock !== null) {
            console.log("[DEBUG] View mode is 'live', delete mode is active, sort is locked, or a block is unlocked; skipping Sortable.js initialization.");
            return;
        }

        // Remove `grid-area` styles for proper sorting
        Array.from(gridContainer.children).forEach((block) => {
            block.style.gridArea = ""; // Clear conflicting styles
        });

        // Ensure gridContainer is scrollable, and body cannot scroll
        gridContainer.style.overflowY = "auto";
        gridContainer.style.overflowX = "hidden"; // Prevent horizontal scrolling
        document.body.style.overflow = "hidden"; // Prevent body from scrolling

        // Variables for scrolling logic
        let scrollInterval; // Timer for continuous scrolling
        const edgeThreshold = 190; // Increased distance from edges to trigger scroll
        const upperEdgeThreshold = 190; // Increased distance from bottom edge to trigger scroll
        const scrollSpeed = 10; // Increased speed of scrolling in px per tick
        let isScrolling = false; // Flag to track active scrolling
        let lastClientY = 0; // Store the last Y position

        // Start scrolling if near the edges
        const startScrolling = (clientY) => {
            const rect = gridContainer.getBoundingClientRect();
            lastClientY = clientY;

            if (isScrolling) return; // Prevent multiple intervals
            isScrolling = true;

            scrollInterval = setInterval(() => {
                const currentRect = gridContainer.getBoundingClientRect();

                // Check if cursor is near the top
                if (lastClientY < currentRect.top + edgeThreshold) {
                    const boost = Math.max(1, (currentRect.top + edgeThreshold - lastClientY) / edgeThreshold);
                    gridContainer.scrollTop -= scrollSpeed * boost; // Scroll up with acceleration
                    console.log(`[DEBUG] Scrolling gridContainer up. Speed: ${scrollSpeed * boost}`);
                }
                // Check if cursor is near the bottom
                else if (lastClientY > currentRect.bottom - upperEdgeThreshold) {
                    const boost = Math.max(1, (lastClientY - (currentRect.bottom - upperEdgeThreshold)) / edgeThreshold);
                    gridContainer.scrollTop += scrollSpeed * boost; // Scroll down with acceleration
                    console.log(`[DEBUG] Scrolling gridContainer down. Speed: ${scrollSpeed * boost}`);
                } else {
                    stopScrolling(); // Stop if no longer near edges
                }
            }, 16); // Run the check every ~16ms for smooth scrolling (60fps).
        };

        // Stop scrolling
        const stopScrolling = () => {
            clearInterval(scrollInterval);
            isScrolling = false;
            console.log("[DEBUG] Scrolling stopped.");
        };

        // Initialize Sortable.js
        sortableInstance = Sortable.create(gridContainer, {
            animation: 150,
            handle: ".grid-item",
            scroll: false, // Disable Sortable's built-in scrolling
            ghostClass: 'ghost', // Apply 'ghost' class during dragging
            onStart: (evt) => {
                disableBodyScroll();
                console.log("[DEBUG] Dragging started.");
                // Add 'active-dragged' class to the dragged element
                evt.item.classList.add('active-dragged');
                startScrolling(evt.originalEvent.clientY); // Start scrolling based on initial position
            },
            onMove: (evt) => {
                const clientY = evt.originalEvent.clientY;
                lastClientY = clientY; // Update the Y position during dragging
                startScrolling(clientY); // Continuously check position and adjust scrolling
            },
            onEnd: (event) => {
                enableBodyScroll();
                stopScrolling();
                console.log("[DEBUG] Drag event ended.");
                console.log(`[DEBUG] Old Index: ${event.oldIndex}, New Index: ${event.newIndex}`);

                // Remove 'active-dragged' class from the dragged element
                event.item.classList.remove('active-dragged');

                // Check if the order of blocks changed
                if (event.oldIndex !== event.newIndex) {
                    updateLocalLayoutFromDOM(); // Update in-memory layout after sorting
                    saveLayoutState(); // Save current state to history
                    unsavedChanges = true; // Mark changes as unsaved
                    hasPushedLive = false; // Reset after changes
                    updateButtonStates(); // Update button states
                    console.log("[DEBUG] Block order changed and layout updated.");
                } else {
                    console.log("[DEBUG] Block order unchanged.");
                }
            },
        });

        console.log("[DEBUG] Sortable.js initialized successfully.");
    };

    /**
     * *******************************
     * **Delete Mode Functionality**
     * *******************************
     */

    // **Toggle Delete Mode**
    const toggleDeleteMode = () => {
        if (viewMode !== 'draft') return; // Prevent delete mode in live mode
        deleteMode = !deleteMode;
        console.log(`[DEBUG] Delete mode ${deleteMode ? "enabled" : "disabled"}.`);
        gridContainer.classList.toggle("delete-mode", deleteMode);

        // Toggle 'delete-border' class on all blocks
        Array.from(gridContainer.children).forEach((block) => {
            block.classList.toggle("delete-border", deleteMode);
            // Ensure blocks revert to 'default-border' if not unlocked and not in delete mode
            if (!deleteMode && !block.classList.contains('unlocked-border')) {
                block.classList.add('default-border');
            }
        });

        // **Add/Remove Red Border on Delete Mode Button**
        if (deleteMode) {
            deleteModeButton.classList.add('delete-mode-active');
        } else {
            deleteModeButton.classList.remove('delete-mode-active');
        }

        // Disable all buttons except undo and redo when delete mode is active
        addBlockButton.disabled = deleteMode;
        saveDraftButton.disabled = deleteMode;
        pushLiveButton.disabled = deleteMode;
        copyLiveButton.disabled = deleteMode;
        clearContentButton.disabled = deleteMode;
        blockTypeControl.disabled = deleteMode;
        if (customDropdownToggle) {
            customDropdownToggle.disabled = deleteMode || (viewMode === 'live'); // Ensure dropdown is disabled if deleteMode or live view
        }
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
            saveDraftButton.disabled = unsavedChanges || isSaving || viewMode === 'live';
            pushLiveButton.disabled = unsavedChanges || isSaving || hasPushedLive || viewMode === 'live';
            copyLiveButton.disabled = false;
            clearContentButton.disabled = false;
            blockTypeControl.disabled = false;
            if (customDropdownToggle) {
                customDropdownToggle.disabled = viewMode === 'live'; // Enable only if not live
            }
            viewToggleButton.disabled = false; // Re-enable "View Live" button

            // If deletions occurred during delete mode
            if (deletionsDuringDeleteMode) {
                unsavedChanges = true; // Mark changes as unsaved
                hasPushedLive = false; // Reset after changes
                deletionsDuringDeleteMode = false; // Reset the flag

                // **Reset layoutHistory to contain only the current layout after deletions**
                layoutHistory = [JSON.parse(JSON.stringify(localLayout))];
                redoHistoryStack = [];
                console.log("[DEBUG] Layout history reset after exiting delete mode.");
            }

            updateButtonStates(); // Update button states

            // Re-initialize sortable if in draft mode and delete mode is off
            if (viewMode === 'draft') {
                initializeSortable();
            }
        }

        // Highlight blocks in delete mode
        Array.from(gridContainer.children).forEach((block) => {
            // Borders are managed via CSS classes; no need to set inline styles
            // Optionally, you can add/remove a class for cursor changes
            if (deleteMode) {
                block.style.cursor = "pointer";
            } else {
                block.style.cursor = "default";
            }
        });

        // Update undo and redo buttons
        updateHistoryButtonsState();
    };

    /**
     * *******************************
     * **History Management**
     * *******************************
     */

    // **Save Layout State to the History Stack**
    const saveLayoutState = () => {
        if (viewMode !== 'draft') return; // Prevent saving state in live mode
        console.log("[DEBUG] Saving current layout state to history...");
        layoutHistory.push(JSON.parse(JSON.stringify(localLayout))); // Save a deep copy
        redoHistoryStack = []; // Clear redo history on new action
        console.log("[DEBUG] Layout history updated. Current history length:", layoutHistory.length);
        updateHistoryButtonsState(); // Update undo and redo button states
    };

    // **Update In-Memory Layout from the DOM**
    const updateLocalLayoutFromDOM = () => {
        if (viewMode !== 'draft') return; // Prevent updating layout in live mode
        console.log("[DEBUG] Updating local layout from DOM...");
        const blocks = Array.from(gridContainer.querySelectorAll(".grid-item")).filter(block => !block.classList.contains('no-saved-draft'));
        localLayout = blocks.map((block, index) => {
            const computedStyle = window.getComputedStyle(block);
            const rowSpan = parseInt(computedStyle.getPropertyValue("grid-row").split("span")[1]?.trim() || 1);
            const colSpan = parseInt(computedStyle.getPropertyValue("grid-column").split("span")[1]?.trim() || 1);

            return {
                block_id: block.dataset.blockId || null,
                type: block.classList[1],
                content: block.querySelector(".block-content")?.innerHTML || "",
                row: index + 1, // Rows based on index
                col: 1, // Column set to 1
                width: colSpan,
                height: rowSpan,
                style: block.style.cssText || null,
                page_id: document.querySelector(".side-panel .active").dataset.page,
                locked: block.querySelector(".lock-overlay").dataset.locked === "false" ? false : true,
            };
        });
        console.log("[DEBUG] Updated local layout:", JSON.stringify(localLayout, null, 2));
    };

    // **Undo the Last Action (Add, Delete, Move, Edit)**
    const undoLayoutChange = () => {
        if (viewMode !== 'draft') return; // Prevent undo in live mode
        if (deleteMode && deleteHistory.length > 0) {
            // Handle undo for deletions
            const lastDeleted = deleteHistory.pop(); // Get the last deleted block
            console.log("[DEBUG] Undoing last deletion.");

            // Push the undone action to redo history
            deleteRedoHistory.push(lastDeleted);

            const newBlock = lastDeleted.blockElement.cloneNode(true);

            // Ensure the new block has the necessary classes
            newBlock.classList.add('default-border');

            // **Insert the block back at its original index**
            if (lastDeleted.index >= gridContainer.children.length) {
                gridContainer.appendChild(newBlock);
                console.log(`[DEBUG] Inserted block at the end (index ${lastDeleted.index}).`);
            } else {
                gridContainer.insertBefore(newBlock, gridContainer.children[lastDeleted.index]);
                console.log(`[DEBUG] Inserted block at index ${lastDeleted.index}.`);
            }

            // Add click listener for lock toggle
            const lockOverlay = newBlock.querySelector(".lock-overlay");
            lockOverlay.addEventListener("click", (event) => {
                event.stopPropagation();
                if (enforceSingleUnlock(newBlock)) {
                    toggleBlockLock(newBlock);
                }
            });

            // Update local layout and sortable
            updateLocalLayoutFromDOM();
            initializeSortable();
            // Note: Do not set unsavedChanges here since deletions during delete mode are handled separately

            // Spacer visibility is handled by CSS
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

    // **Redo the Last Undone Action (Add, Delete, Move, Edit)**
    const redoLayoutChange = () => {
        if (viewMode !== 'draft') return; // Prevent redo in live mode
        if (deleteMode && deleteRedoHistory.length > 0) {
            // Handle redo for deletions
            const lastRedo = deleteRedoHistory.pop(); // Get the last redo action
            console.log("[DEBUG] Redoing last deletion.");

            // Push the action back to deleteHistory
            deleteHistory.push(lastRedo);

            // **Remove the block from its original index**
            const blockToRemove = gridContainer.children[lastRedo.index];
            if (blockToRemove) {
                blockToRemove.remove();
                console.log(`[DEBUG] Removed block from index ${lastRedo.index}.`);
            } else {
                console.log(`[DEBUG] No block found at index ${lastRedo.index} to remove.`);
            }

            // Update local layout and sortable
            updateLocalLayoutFromDOM();
            initializeSortable();
            // Note: Do not set unsavedChanges here since deletions during delete mode are handled separately

            // Spacer visibility is handled by CSS
        } else if (!deleteMode && redoHistoryStack.length > 0) {
            // Handle redo for layout changes
            const nextState = redoHistoryStack.pop();
            layoutHistory.push(nextState); // Add the next state to layoutHistory
            console.log("[DEBUG] Redoing layout change. Moving to next state:", JSON.stringify(nextState, null, 2));
            renderLayout(nextState);
            unsavedChanges = true; // Mark changes as unsaved
            hasPushedLive = false; // Reset after switching views
            updateButtonStates(); // Update button states
        } else {
            console.log("[DEBUG] No more redo steps available.");
        }
        updateHistoryButtonsState(); // Update undo and redo button states
    };

    /**
     * *******************************
     * **Save Layout to Database**
     * *******************************
     */

    // **Save Layout to the Database with Status**
    const saveLayoutToDatabase = async (status) => {
        if (viewMode !== 'draft') return; // Prevent saving in live mode
        if (isSaving) {
            console.log("[DEBUG] Save operation already in progress. Aborting new save request.");
            return;
        }
        isSaving = true; // Set saving flag
        updateButtonStates(); // Disable buttons

        const pageId = document.querySelector(".side-panel .active")?.dataset.page; // Ensure the page ID is retrieved
        if (!pageId) {
            console.error("[DEBUG] Page ID is missing. Save aborted.");
            isSaving = false;
            updateButtonStates(); // Re-enable buttons
            return;
        }

        // **Lock all unlocked blocks before saving**
        console.log("[DEBUG] Locking all unlocked blocks before saving draft.");
        const allBlocks = gridContainer.querySelectorAll(".grid-item");
        allBlocks.forEach((blockElement) => {
            const lockOverlay = blockElement.querySelector(".lock-overlay");
            if (lockOverlay && lockOverlay.dataset.locked === "false") {
                toggleBlockLock(blockElement); // Use existing toggleBlockLock function
            }
        });

        // **Ensure `localLayout` is Updated Before Saving**
        updateLocalLayoutFromDOM(); // Synchronize `localLayout` with the current DOM

        // Construct the payload with `page_id`, `layout`, and `status`
        const payload = { page_id: pageId, layout: localLayout, status };

        console.log(`[DEBUG] Saving layout with status "${status}" and payload:`, JSON.stringify(payload, null, 2));
        console.log("[DEBUG] Payload being sent:", payload);

        try {
            const res = await fetch("/api/save-layout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload), // Send the payload including `page_id` and `status`
            });

            console.log(`[DEBUG] Save response status: ${res.status}`);
            const data = await res.json();
            console.log("[DEBUG] Server Response After Save:", JSON.stringify(data, null, 2));

            if (res.ok) {
                updateHistoryButtonsState(); // Update undo and redo button states

                unsavedChanges = false; // Mark changes as saved

                if (status === 'live') {
                    hasPushedLive = true; // Indicate that live content has been pushed
                }

                console.log("[DEBUG] Layout saved successfully.");

                // **Check for Empty Layout and Update Content Preview**
                if (localLayout.length === 0) {
                    console.log("[DEBUG] Layout is empty. Rendering 'NO DRAFT SAVED' message.");
                    renderBlocksToDOM([]); // Pass empty layout to trigger the message
                } else {
                    console.log("[DEBUG] Layout has blocks. Hiding 'NO DRAFT SAVED' message.");
                    const noDraftMessageContainer = document.querySelector(".no-saved-draft-container");
                    if (noDraftMessageContainer) {
                        noDraftMessageContainer.remove(); // Ensure the message is hidden
                    }
                }

                // **Re-enable Sortable.js if applicable after saving**
                if (!hasPushedLive && !deleteMode && !isSortLocked && viewMode === 'draft' && currentlyUnlockedBlock === null) {
                    initializeSortable();
                    console.log("[DEBUG] Sortable.js re-initialized after saving.");
                }
            } else {
                console.error("[DEBUG] Save failed with status:", res.status);
                alert("Failed to save the layout. Please try again.");
            }
        } catch (err) {
            console.error("[DEBUG] Error saving layout:", err);
            alert("An error occurred while saving the layout.");
        } finally {
            isSaving = false; // Reset saving flag
            updateButtonStates(); // Re-enable buttons
        }
    };

    /**
     * *******************************
     * **Rendering Functions**
     * *******************************
     */

    // **Function to Handle Rendering Blocks to the DOM**
    const renderBlocksToDOM = (blocks) => {
        // **Hide "NO DRAFT SAVED" Message Initially**
        const existingNoDraftMessage = gridContainer.querySelector(".no-saved-draft-container");
        if (existingNoDraftMessage) {
            existingNoDraftMessage.remove(); // Remove any existing message container
        }

        // Clear existing blocks
        gridContainer.innerHTML = "";

        currentlyUnlockedBlock = null; // Reset the currently unlocked block on render

        if (blocks.length === 0 && viewMode === "draft") {
            // **Render "NO DRAFT SAVED" Message as an Overlay**
            const noDraftMessageContainer = document.createElement("div");
            noDraftMessageContainer.classList.add("no-saved-draft-container"); // Container for centering
            noDraftMessageContainer.innerHTML = `
                <h1 class="no-saved-draft">NO DRAFT SAVED</h1>
            `;
            gridContainer.appendChild(noDraftMessageContainer);
            console.log("[DEBUG] Rendered 'NO DRAFT SAVED' message.");
            return; // Exit the function as there's nothing else to render
        }

        blocks.forEach((block) => {
            const blockElement = document.createElement("div");
            blockElement.className = `grid-item ${block.type} default-border`; // Include default-border
            blockElement.dataset.blockId = block.block_id;
            blockElement.dataset.row = block.row;
            blockElement.dataset.col = block.col;
            blockElement.dataset.width = block.width;
            blockElement.dataset.height = block.height;

            const isSpacer = block.type.startsWith("block-spacer");
            blockElement.classList.toggle("spacer-block", isSpacer);

            // **Include block.locked in the isEditable condition**
            const isEditable = viewMode === "draft" && !deleteMode && !isSpacer && block.locked === false;
            blockElement.innerHTML = `
                <div class="block-content" contenteditable="${isEditable}">${block.content || ""}</div>
                <div class="lock-overlay" data-locked="${block.locked === false ? "false" : "true"}">
                    <img src="${block.locked === false ? unlockSVGPath : lockSVGPath}" alt="${block.locked === false ? "Unlocked" : "Locked"}" class="lock-icon" />
                </div>
            `;

            // **Apply 'unlocked-border' if the block is unlocked**
            if (block.locked === false) {
                blockElement.classList.remove('default-border');
                blockElement.classList.add('unlocked-border');
                currentlyUnlockedBlock = blockElement; // Track the currently unlocked block
                console.log("[DEBUG] Block is unlocked on render:", block.block_id);
            }

            gridContainer.appendChild(blockElement);

            // Add click listener for lock toggle
            const lockOverlay = blockElement.querySelector(".lock-overlay");
            lockOverlay.addEventListener("click", (event) => {
                event.stopPropagation();
                // Call enforceSingleUnlock and proceed only if it returns true
                if (enforceSingleUnlock(blockElement)) {
                    toggleBlockLock(blockElement);
                }
            });

            // **Apply 'delete-border' if delete mode is active**
            if (deleteMode) {
                blockElement.classList.add('delete-border');
                console.log("[DEBUG] 'delete-border' class applied to block during rendering.");
            }
        });

        // **Initialize Sortable.js Only If No Blocks Are Unlocked and Blocks Exist**
        if (!currentlyUnlockedBlock && viewMode === 'draft' && !deleteMode && !isSortLocked && blocks.length > 0) {
            initializeSortable();
            console.log("[DEBUG] Sortable.js initialized after rendering all blocks as locked.");
        } else {
            console.log("[DEBUG] Sortable.js not initialized because a block is unlocked, no blocks exist, or other conditions not met.");
        }
    };

    // **Display "NO DRAFT SAVED" Message**
    const displayNoSavedDraftMessage = () => {
        if (gridPreviewContainer) {
            // **Ensure Only One Message Container Exists**
            const existingNoDraftMessage = gridPreviewContainer.querySelector(".no-saved-draft-container");
            if (existingNoDraftMessage) {
                console.log("[DEBUG] 'NO DRAFT SAVED' message already exists. Not adding another.");
                return;
            }

            // **Create and Append the Message Container**
            const noDraftMessageContainer = document.createElement("div");
            noDraftMessageContainer.classList.add("no-saved-draft-container"); // Container for centering
            noDraftMessageContainer.innerHTML = `
                <h1 class="no-saved-draft">NO DRAFT SAVED</h1>
            `;
            gridPreviewContainer.appendChild(noDraftMessageContainer);
            console.log("[DEBUG] Displayed 'NO DRAFT SAVED' message due to fetch error.");
        } else {
            // If gridPreviewContainer is null, optionally handle differently
            console.log("[DEBUG] gridPreviewContainer is null. Cannot display 'NO DRAFT SAVED' message.");
        }
    };

    // **Fetch Layout and Initialize Sortable.js**
    const fetchLayout = async (reinitializeSortable = false) => {
        if (!gridContainer) {
            console.log("[DEBUG] gridContainer is null. No fetch performed.");
            return;
        }

        const pageId = document.querySelector(".side-panel .active")?.dataset.page;
        if (!pageId) {
            console.error("[DEBUG] Page ID is missing. Fetch aborted.");
            return;
        }
        console.log(`[DEBUG] Fetching layout for page ID: ${pageId} with status: ${viewMode}`);

        try {
            const res = await fetch(`/api/content/${pageId}?status=${viewMode}`);
            console.log(`[DEBUG] Fetch response status: ${res.status}`);

            if (res.status === 404 && viewMode === 'draft') {
                // No draft exists
                console.log("[DEBUG] No draft exists for this page.");
                displayNoSavedDraftMessage();
                return;
            }

            if (!res.ok) {
                throw new Error(`Fetch failed with status: ${res.status}`);
            }

            let blocks = await res.json();

            console.log("[DEBUG] Fetched blocks:", JSON.stringify(blocks, null, 2));

            // Render fetched blocks
            renderBlocksToDOM(blocks);

            // Initialize Sortable.js only if conditions are met
            if (reinitializeSortable && viewMode === "draft" && !deleteMode && !isSortLocked && currentlyUnlockedBlock === null && blocks.length > 0) {
                console.log("[DEBUG] Reinitializing Sortable.js after fetching layout...");
                initializeSortable();
            }

            if (viewMode === "draft") {
                updateLocalLayoutFromDOM();
                saveLayoutState(); // Save the initial fetched state
                unsavedChanges = false;
                hasPushedLive = false;
                updateButtonStates();
            }
        } catch (err) {
            console.error("[DEBUG] Error fetching layout:", err);

            // **Handle Errors When Fetching Draft (e.g., Draft Doesn't Exist)**
            if (viewMode === "draft") {
                displayNoSavedDraftMessage();
            }
        }
    };

    // **Render Layout from a Given State**
    const renderLayout = (layout, reinitializeSortable = true) => {
        if (!gridContainer) {
            console.log("[DEBUG] gridContainer is null. Cannot render layout.");
            return;
        }

        renderBlocksToDOM(layout); // Use the helper

        if (reinitializeSortable && viewMode === "draft" && !deleteMode && !isSortLocked && !currentlyUnlockedBlock && layout.length > 0) {
            initializeSortable();
        } else if (sortableInstance) {
            sortableInstance.destroy();
            sortableInstance = null;
            console.log("[DEBUG] Sortable.js instance destroyed in renderLayout.");
        }
    };

    /**
     * *******************************
     * **Block Management**
     * *******************************
     */

    // **Add Block Button Configuration**
    if (addBlockButton) {
        // Update the innerHTML of the button to include a "+" symbol
        addBlockButton.innerHTML = `<span class="add-block-icon">+</span> Add`;
    } else {
        console.error("[DEBUG] Add Block button not found.");
    }

    // **Add Block Function**
    const addBlock = () => {
        if (viewMode !== 'draft') return; // Prevent adding blocks in live mode
        console.log("[DEBUG] Add Block button clicked.");

        const blockType = blockTypeControl.value;

        const newBlock = {
            type: blockType,
            content: blockType.replace("-", " ").toUpperCase(),
            row: 1, // Default row positioning
            col: 1, // Default column positioning
            style: '', // Leave style empty for external CSS to handle
        };

        // Add the block to the local layout
        localLayout.push(newBlock);

        // Add the block to the DOM
        const blockElement = document.createElement("div");
        blockElement.className = `grid-item ${newBlock.type} default-border`;
        blockElement.dataset.blockId = newBlock.block_id || null; // Use null if block_id doesn't exist
        blockElement.innerHTML = `
            <div class="block-content">${newBlock.content}</div>
            <div class="lock-overlay" data-locked="true">
                <img src="${lockSVGPath}" alt="Locked" class="lock-icon" />
            </div>
        `;
        gridContainer.appendChild(blockElement);

        // Remove "NO DRAFT SAVED" message if present
        const noDraftMessageContainer = gridContainer.querySelector(".no-saved-draft-container");
        if (noDraftMessageContainer) {
            noDraftMessageContainer.remove();
            console.log("[DEBUG] 'NO DRAFT SAVED' message removed after adding a block.");
        }

        // Add click listener for lock toggle
        const lockOverlay = blockElement.querySelector(".lock-overlay");
        lockOverlay.addEventListener("click", (event) => {
            event.stopPropagation();
            if (enforceSingleUnlock(blockElement)) {
                toggleBlockLock(blockElement);
            }
        });

        // Auto-scroll to the new block
        const containerRect = gridContainer.getBoundingClientRect();
        const blockRect = blockElement.getBoundingClientRect();
        gridContainer.scrollTo({
            top: gridContainer.scrollTop + (blockRect.top - containerRect.top) - containerRect.height / 2 + blockRect.height / 2,
            behavior: "smooth",
        });

        // Mark changes as unsaved
        unsavedChanges = true;
        hasPushedLive = false;
        updateButtonStates();

        // **Save the new layout state to history**
        saveLayoutState();

        console.log("[DEBUG] Block added to the layout and DOM updated.");
    };

    // **Delete a Block When in Delete Mode**
    const deleteBlock = (event) => {
        if (!deleteMode) return;

        const blockElement = event.target.closest(".grid-item");
        if (blockElement) {
            console.log(`[DEBUG] Block clicked for deletion: ${blockElement.dataset.blockId}`);

            // **Check if the block to be deleted is the currently unlocked block**
            if (currentlyUnlockedBlock === blockElement) {
                currentlyUnlockedBlock = null;
                console.log("[DEBUG] Deleted block was unlocked. Resetting currentlyUnlockedBlock.");
            }

            // **Store the original index of the block before deletion**
            const blocks = Array.from(gridContainer.children).filter(child => !child.classList.contains('no-saved-draft'));
            const blockIndex = blocks.indexOf(blockElement);

            // Save the block state before deletion to delete history for undo purposes
            deleteHistory.push({
                blockElement: blockElement.cloneNode(true),
                index: blockIndex, // Store the original index
            });
            // Clear redo history for delete mode
            deleteRedoHistory = [];
            updateHistoryButtonsState(); // Update buttons

            blockElement.remove(); // Remove the block from the DOM
            updateLocalLayoutFromDOM(); // Update the layout after removing the block
            deletionsDuringDeleteMode = true; // Mark that deletions have occurred
        }
    };

    /**
     * *******************************
     * **Event Listeners**
     * *******************************
     */

    // **Clear Content Button Event Listener**
    clearContentButton.addEventListener("click", async () => {
        await mutex.lock(); // Prevent race conditions
        try {
            const userConfirmed = confirm("Are you sure you want to clear all content?");
            if (!userConfirmed) {
                console.log("[DEBUG] Clear Content action canceled by the user.");
                return;
            }
            clearContent(); // Call the clearContent function
        } finally {
            mutex.unlock(); // Release the mutex
        }
    });


    // **Add Block Button Event Listener**
    addBlockButton.addEventListener("click", async () => {
        await mutex.lock(); // Acquire the mutex
        try {
            if (isAddingBlock) {
                console.log("[DEBUG] Add Block action is already in progress. Ignoring additional click.");
                return; // Prevent race condition
            }
            if (!selectedBlockType) {
                alert('Please select a block type first.');
                return;
            }

            isAddingBlock = true; // Set the flag
            console.log("[DEBUG] Add Block button clicked.");

            // Add the block to the DOM (no server interaction)
            try {
                addBlock(); // No need to make addBlock async
            } catch (error) {
                console.error("[DEBUG] Error in addBlock:", error);
            }
        } finally {
            isAddingBlock = false; // Reset the flag after operation completes
            mutex.unlock(); // Release the mutex
        }
    });

    // **Save Draft Button Event Listener**
    saveDraftButton.addEventListener("click", async () => {
        await mutex.lock(); // Acquire the mutex
        try {
            if (viewMode !== 'draft') return; // Prevent saving in live mode
            if (isSaving) {
                console.log("[DEBUG] Save operation already in progress. Please wait.");
                return; // Prevent multiple saves
            }
            console.log("[DEBUG] Save Draft button clicked.");
            await saveLayoutToDatabase("draft");
        } finally {
            mutex.unlock(); // Release the mutex
        }
    });

    // **Push Live Button Event Listener**
    pushLiveButton.addEventListener("click", async () => {
        await mutex.lock(); // Acquire the mutex
        try {
            if (viewMode !== 'draft') return; // Prevent pushing live in live mode
            if (unsavedChanges) {
                alert("Please save your changes before pushing live.");
                return;
            }
            if (isSaving) {
                console.log("[DEBUG] Save operation in progress. Please wait.");
                return; // Prevent multiple pushes
            }

            // Show a confirmation popup
            const userConfirmed = confirm("Warning: Once this content is pushed live, it cannot be undone. Do you wish to proceed?");
            if (!userConfirmed) {
                console.log("[DEBUG] Push Live action canceled by the user.");
                return; // Exit if the user cancels the action
            }

            console.log("[DEBUG] Push Live button clicked.");

            // Save the layout as "live"
            await saveLayoutToDatabase("live"); // 'hasPushedLive' is set inside saveLayoutToDatabase

            // Clear the draft and render "NO DRAFT SAVED" immediately
            localLayout = []; // Clear the draft layout in memory
            layoutHistory = [JSON.parse(JSON.stringify(localLayout))]; // Reset history to empty layout
            redoHistoryStack = []; // Clear redo history
            renderLayout(localLayout); // Render the cleared layout, triggering the "NO DRAFT SAVED" message
            console.log("[DEBUG] Rendered 'NO DRAFT SAVED' message after pushing live.");
        } finally {
            mutex.unlock(); // Release the mutex
        }
    });

    // **Undo Button Event Listener**
    undoButton.addEventListener("click", async () => {
        await mutex.lock(); // Acquire the mutex
        try {
            if (isUndoing) {
                console.log("[DEBUG] Undo action is already in progress. Ignoring additional click.");
                return; // Prevent race condition
            }
            if (isSaving) {
                console.log("[DEBUG] Save operation in progress. Preventing undo.");
                return; // Optionally prevent undo during saving
            }
            console.log("[DEBUG] Undo button clicked.");
            isUndoing = true; // Set the flag
            try {
                undoLayoutChange();
            } catch (error) {
                console.error("[DEBUG] Error during undo:", error);
            }
        } finally {
            isUndoing = false; // Reset the flag
            mutex.unlock(); // Release the mutex
        }
    });

    // **Redo Button Event Listener**
    redoButton.addEventListener("click", async () => {
        await mutex.lock(); // Acquire the mutex
        try {
            if (isRedoing) {
                console.log("[DEBUG] Redo action is already in progress. Ignoring additional click.");
                return; // Prevent race condition
            }
            if (isSaving) {
                console.log("[DEBUG] Save operation in progress. Preventing redo.");
                return; // Optionally prevent redo during saving
            }
            console.log("[DEBUG] Redo button clicked.");
            isRedoing = true; // Set the flag
            try {
                redoLayoutChange();
            } catch (error) {
                console.error("[DEBUG] Error during redo:", error);
            }
        } finally {
            isRedoing = false; // Reset the flag
            mutex.unlock(); // Release the mutex
        }
    });

    // **Delete Mode Button Event Listener**
    deleteModeButton.addEventListener("click", async () => {
        await mutex.lock(); // Acquire the mutex
        try {
            if (isTogglingDeleteMode) {
                console.log("[DEBUG] Delete Mode toggle is already in progress. Ignoring additional click.");
                return; // Prevent race condition
            }
            if (isSaving) {
                console.log("[DEBUG] Save operation in progress. Preventing toggling delete mode.");
                return; // Optionally prevent toggling delete mode during saving
            }
            console.log("[DEBUG] Delete Mode button clicked.");
            isTogglingDeleteMode = true; // Set the flag
            try {
                toggleDeleteMode();
            } catch (error) {
                console.error("[DEBUG] Error toggling delete mode:", error);
            }
        } finally {
            isTogglingDeleteMode = false; // Reset the flag
            mutex.unlock(); // Release the mutex
        }
    });

    /**
     * *******************************
     * **View Toggle Functionality**
     * *******************************
     */

    // **Function to Handle View Toggling and Update Button Text**
    const handleViewToggle = async () => {
        await mutex.lock(); // Acquire mutex to prevent race conditions
        try {
            const toggleButtons = (isEnabled) => {
                const elements = [
                    addBlockButton, saveDraftButton, pushLiveButton,
                    deleteModeButton, blockTypeControl,
                    undoButton, redoButton, customDropdownToggle, copyLiveButton
                ];
                elements.forEach(el => {
                    if (el) el.disabled = !isEnabled;
                });
            };

            // Function to toggle visibility and hover effects for padlocks and borders
            const togglePadlocksAndBorders = (isVisible) => {
                const lockOverlays = document.querySelectorAll(".lock-overlay");
                lockOverlays.forEach(lockOverlay => {
                    lockOverlay.style.display = isVisible ? "block" : "none"; // Hide or show padlock SVG
                });

                // Toggle hover effects by adding/removing a class or modifying styles
                if (!isVisible) {
                    gridContainer.classList.add("disable-hover");
                } else {
                    gridContainer.classList.remove("disable-hover");
                }
            };

            if (viewMode === 'draft') {
                // Switch to live view
                viewMode = 'live';
                viewToggleButton.textContent = 'View Draft';

                const pageId = document.querySelector(".side-panel .active")?.dataset.page;
                if (!pageId) {
                    console.error("[DEBUG] Page ID is missing. Cannot fetch live content.");
                    return;
                }

                console.log(`[DEBUG] Switching to live view for page ID: ${pageId}`);

                try {
                    // Fetch live content blocks
                    const res = await fetch(`/api/content/${pageId}?status=live`);
                    if (!res.ok) {
                        throw new Error(`Failed to fetch live content. Status: ${res.status}`);
                    }

                    const liveBlocks = await res.json();
                    console.log("[DEBUG] Fetched live blocks:", liveBlocks);

                    if (liveBlocks.length === 0) {
                        console.log("[DEBUG] No live content available to display.");

                        // **Render "NO CONTENT AVAILABLE" Message for Live View**
                        gridContainer.innerHTML = `
                            <div class="no-saved-draft-container">
                                <h1 class="no-saved-draft">NO CONTENT AVAILABLE</h1>
                            </div>
                        `;

                        toggleButtons(false); // Disable buttons in live mode
                        togglePadlocksAndBorders(false); // Disable padlocks and hover effects
                        updateButtonStates(); // Update button states
                        return;
                    }

                    // Render live blocks to the DOM
                    renderLayout(liveBlocks, false); // No reinitialize sortable in live mode
                    console.log("[DEBUG] Live content rendered successfully.");
                    toggleButtons(false); // Disable buttons in live mode
                    togglePadlocksAndBorders(false); // Disable padlocks and hover effects
                } catch (error) {
                    console.error("[DEBUG] Error fetching live content:", error);
                    alert("Failed to switch to live view.");
                }
            } else {
                // Switch to draft view
                viewMode = 'draft';
                viewToggleButton.textContent = 'View Live';

                console.log("[DEBUG] Switching back to draft view.");

                // Use the memory-saved `localLayout` instead of fetching from the server
                if (localLayout.length === 0) {
                    console.log("[DEBUG] No blocks in localLayout. Rendering 'NO DRAFT SAVED' message.");
                    gridContainer.innerHTML = `
                        <div class="no-saved-draft-container">
                            <h1 class="no-saved-draft">NO DRAFT SAVED</h1>
                        </div>`;
                    toggleButtons(true); // Enable buttons in draft mode
                    togglePadlocksAndBorders(true); // Enable padlocks and hover effects
                    updateButtonStates(); // Update button states
                    return;
                }

                // Render `localLayout` directly
                renderLayout(localLayout, true); // Reinitialize sortable in draft mode

                // **Save the restored layout to history**
                saveLayoutState();

                console.log("[DEBUG] Restored draft layout from memory.");
                toggleButtons(true); // Enable buttons in draft mode
                togglePadlocksAndBorders(true); // Enable padlocks and hover effects
            }

            // **Important Fix**: Update button states after toggling the view
            updateButtonStates();
        } finally {
            mutex.unlock(); // Release mutex
        }
    };

    /**
     * *******************************
     * **Clear Content Button Functionality**
     * *******************************
     */

    // **Attach View Toggle Event Listener**
    viewToggleButton.removeEventListener("click", () => {}); // Ensure no other listeners
    viewToggleButton.addEventListener("click", handleViewToggle);

    // **Clear Content Function**
    const clearContent = () => {
        if (viewMode !== 'draft') return; // Only allow clearing in draft mode

        console.log("[DEBUG] Clear Content button clicked.");
        if (localLayout.length === 0) {
            alert("No content to clear.");
            return;
        }

        // Save current layout to history for undo
        saveLayoutState();

        // Clear all blocks from the container and layout
        localLayout = [];
        renderLayout(localLayout); // Renders an empty layout (triggers "NO DRAFT SAVED" if needed)

        // Mark changes as unsaved
        unsavedChanges = true;
        hasPushedLive = false;

        // Update button states
        updateButtonStates();

        console.log("[DEBUG] All content cleared from the preview.");
    };

    /**
     * *******************************
     * **Copy Live Button Functionality**
     * *******************************
     */

    // **Copy Live Button Functionality**
    copyLiveButton.addEventListener("click", async () => {
        await mutex.lock(); // Prevent race conditions
        try {
            if (viewMode !== 'draft') {
                alert("Switch to draft mode before copying live content.");
                return;
            }

            const pageId = document.querySelector(".side-panel .active")?.dataset.page;
            if (!pageId) {
                console.error("[DEBUG] Page ID is missing. Cannot copy live content.");
                return;
            }

            console.log(`[DEBUG] Copying live content for page ID: ${pageId}`);

            try {
                // Fetch live content blocks
                const res = await fetch(`/api/content/${pageId}?status=live`);
                if (!res.ok) {
                    throw new Error(`Failed to fetch live content. Status: ${res.status}`);
                }

                const liveBlocks = await res.json();
                console.log("[DEBUG] Fetched live blocks:", liveBlocks);

                if (liveBlocks.length === 0) {
                    alert("No live content to copy.");
                    return;
                }

                // Check if draft content exists or unsaved changes are present
                const draftExists = localLayout.length > 0;
                const hasUnsavedChanges = unsavedChanges;

                // Ask for confirmation if draft exists or unsaved changes are present
                if (draftExists || hasUnsavedChanges) {
                    const userConfirmed = confirm("Warning: This action will overwrite any unsaved changes in your draft. Do you wish to proceed?");
                    if (!userConfirmed) {
                        console.log("[DEBUG] Copy Live action canceled by the user.");
                        return; // Exit if the user cancels
                    }
                }

                // Update in-memory layout and render to DOM
                localLayout = liveBlocks; // Replace current local layout with live blocks
                renderLayout(localLayout); // Render blocks in draft mode

                // **Save the new layout state to history**
                saveLayoutState();

                // Mark changes as unsaved and ensure the unsavedChanges flag is updated globally
                unsavedChanges = true; // This is the critical piece
                hasPushedLive = false; // Reset push state
                updateButtonStates(); // Reflect changes in UI

                console.log("[DEBUG] Live content copied to draft and rendered locally. Changes are unsaved.");
                alert("Live content has been copied to draft. Remember to save changes.");
            } catch (error) {
                console.error("[DEBUG] Error copying live content:", error);
                alert("An error occurred while copying live content.");
            }
        } finally {
            mutex.unlock(); // Release the mutex
        }
    });

    /**
     * *******************************
     * **Content Change Listener**
     * *******************************
     */

    // **Event Listener for Content Changes in Blocks**
    if (gridContainer) {
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
    }

    /**
     * *******************************
     * **Before Unload Event**
     * *******************************
     */

    // **Handle the beforeunload Event to Warn the User About Unsaved Changes**
    window.addEventListener('beforeunload', (e) => {
        if (unsavedChanges) {
            // Cancel the event as stated by the standard.
            e.preventDefault();
            // Chrome requires returnValue to be set.
            e.returnValue = '';
        }
    });

    /**
     * *******************************
     * **Dropdown Functionality**
     * *******************************
     */

    // **Dropdown Functionality**
    if (!customDropdownToggle || !customDropdownMenu) {
        console.error("[DEBUG] Custom dropdown elements are missing.");
    } else {
        // Ensure textContent is correct and update the innerHTML
        const dropdownText = customDropdownToggle.textContent.trim() || "Select an option"; // Fallback if textContent is empty
        console.log("[DEBUG] customDropdownToggle textContent:", dropdownText);

        customDropdownToggle.innerHTML = `${dropdownText} <span class="block-dropdown-arrow">&#x25BC;</span>`;

        // Toggle dropdown visibility
        customDropdownToggle.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent click from bubbling up
            const isOpen = customDropdownMenu.style.display === "block";
            customDropdownMenu.style.display = isOpen ? "none" : "block";
            customDropdownToggle.setAttribute("aria-expanded", !isOpen);

            if (!isOpen) {
                // Reset submenu states when the dropdown is opened
                customDropdownMenu.querySelectorAll(".submenu-open").forEach(submenu => {
                    submenu.classList.remove("submenu-open");
                });

                // Reset hover effect for "Spacers"
                customDropdownMenu.querySelectorAll(".submenu-hover").forEach(item => {
                    item.classList.remove("submenu-hover");
                });
            }
        });

        // Handle selection of dropdown items
        customDropdownMenu.querySelectorAll("li").forEach(item => {
            item.addEventListener("click", (e) => {
                e.stopPropagation(); // Prevent click from bubbling up

                // Handle "Spacers" submenu specifically
                if (item.classList.contains("dropdown-submenu")) {
                    const isOpen = item.classList.toggle("submenu-open"); // Toggle 'open' state

                    // Add or remove the hover effect class
                    if (isOpen) {
                        item.classList.add("submenu-hover");
                    } else {
                        item.classList.remove("submenu-hover");
                    }

                    // Keep the main dropdown open if "Spacers" is clicked
                    if (isOpen) {
                        customDropdownMenu.style.display = "block";
                        customDropdownToggle.setAttribute("aria-expanded", "true");
                    }
                    return; // Submenu hover behavior is preserved
                }

                const selectedValue = item.getAttribute("data-value");
                const selectedText = item.textContent.trim();
                selectedBlockType = selectedValue;

                // Update the dropdown toggle button
                customDropdownToggle.innerHTML = `${selectedText} <span class="block-dropdown-arrow">&#x25BC;</span>`;

                // Update the hidden select's value
                blockTypeControl.value = selectedValue;

                // Close the dropdown menu
                customDropdownMenu.style.display = "none";
                customDropdownToggle.setAttribute("aria-expanded", "false");
            });
        });

        // Close the dropdown when clicking outside (exclude "Spacers" clicks)
        document.addEventListener("click", (event) => {
            const isInsideDropdown = customDropdownMenu.contains(event.target) || 
                                     customDropdownToggle.contains(event.target);

            if (!isInsideDropdown) {
                customDropdownMenu.style.display = "none";
                customDropdownToggle.setAttribute("aria-expanded", "false");

                // Reset submenu-open state for "Spacers"
                customDropdownMenu.querySelectorAll(".submenu-open").forEach(submenu => {
                    submenu.classList.remove("submenu-open");
                });

                // Reset hover effect for "Spacers"
                customDropdownMenu.querySelectorAll(".submenu-hover").forEach(item => {
                    item.classList.remove("submenu-hover");
                });
            }
        });
    }

    /**
     * *******************************
     * **Block Display Functions**
     * *******************************
     */

    // **Function to Handle Fetching Blocks Based on Selected Type (Optional)**
    // Not directly related to the issues but retained for completeness
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

    // **Function to Display Blocks in the Preview Area (Optional)**
    // Not directly related to the issues but retained for completeness
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

    /**
     * *******************************
     * **Initial Fetch and Setup**
     * *******************************
     */

    // **Initial Fetch and Setup**
    if (viewMode === 'draft' && gridContainer) {
        fetchLayout(true);
    }
});
