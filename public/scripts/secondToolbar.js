// secondToolbar.js

document.addEventListener("DOMContentLoaded", () => {
    logDebug("secondToolbar.js loaded and DOMContentLoaded triggered.");

    /**
     * *******************************
     * **Constants and DOM Elements**
     * *******************************
     */
    const secondToolbarRow = document.querySelector('.toolbar-row.second-row');

    // **Button References**
    const gridOverlayDropdown = document.getElementById("gridOverlayDropdown");
    const GridOverlayButton = document.getElementById("GridOverlayButton");
    const snapToGridButton = document.getElementById("snapToGridButton");
    const addTextDropdown = document.getElementById("addTextDropdown");
    const addTextButton = document.getElementById("addTextButton"); 
    const addImageButton = document.getElementById("addImageButton");
    const addImageModal = document.getElementById("addImageModal");
    const closeModalButton = document.querySelector(".close-modal");
    const imageLinkButton = document.getElementById("imageLinkButton");
    const textLinkButton = document.getElementById("textLinkButton");
    const resizeImageButton = document.getElementById("resizeImageButton");
    const cropImageButton = document.getElementById("cropImageButton");
    const addGalleryButton = document.getElementById("addGalleryButton");
    const addSponsoredAdButton = document.getElementById("addSponsoredAdButton");
    const colorPickerButton = document.getElementById("colorPickerButton");
    const layerControlButton = document.getElementById("layerControlButton");
    const duplicateContentButton = document.getElementById("duplicateContentButton");
    const lockElementButton = document.getElementById("lockElementButton");
    const embedHTMLButton = document.getElementById("embedHTMLButton");
    const animationEffectsButton = document.getElementById("animationEffectsButton");
    const alignmentToolsButton = document.getElementById("alignmentToolsButton");
    const fontStylingButton = document.getElementById("fontStylingButton");

    // **List of Buttons for Iteration**
    const secondRowButtons = [
        GridOverlayButton,
        addImageButton,
        imageLinkButton,
        addTextButton,
        textLinkButton,
        resizeImageButton,
        cropImageButton,
        addGalleryButton,
        addSponsoredAdButton,
        colorPickerButton,
        layerControlButton,
        duplicateContentButton,
        lockElementButton,
        embedHTMLButton,
        animationEffectsButton,
        alignmentToolsButton,
        fontStylingButton,
    ];

    const topRowButtons = {
        liveViewButton: document.getElementById('viewToggleButton'),
        copyLiveButton: document.getElementById('copyLiveButton'),
        clearContentButton: document.getElementById('clearContentButton'),
        blockTypeDropdown: document.getElementById('blockTypeControl'),
        addBlockButton: document.getElementById('addBlockButton'),
        deleteModeButton: document.getElementById('deleteModeButton'), // Delete Toggle Button
        pushLiveButton: document.getElementById("pushLiveButton")
    };

    /**
     * *******************************
     * **Validation of Critical DOM Elements**
     * *******************************
     */
    // Validate the presence of the second toolbar row
    if (!secondToolbarRow) {
        console.error("Second toolbar row not found. secondToolbar.js aborted.");
        return;
    }
    logDebug("Second toolbar row found.");

    // Validate the presence of all second row buttons
    const missingButtons = secondRowButtons.filter(button => !button);
    if (missingButtons.length > 0) {
        console.error(`Missing buttons in second toolbar row: ${missingButtons.map(btn => btn.id).join(', ')}. secondToolbar.js aborted.`);
        return;
    }
    logDebug("All second row toolbar buttons are present.");

    /**
     * *******************************
     * **Shared Mutex Access**
     * *******************************
     */
    // Access the shared mutex from contentWorkshop.js
    const mutex = window.sharedMutex;
    if (!mutex) {
        console.error("Shared mutex not found on window. Ensure contentWorkshop.js exposes the mutex.");
        return;
    }
    logDebug("Shared mutex accessed successfully.");

    /**
     * *******************************
     * **State Variables**
     * *******************************
     */
    let deleteMode = false; // Track delete mode state
    let isAnyBlockUnlocked = false; // Track if any block is unlocked

    // Initialize global state variables for grid and snapping
    window.gridUnitWidth = 0;
    window.gridUnitHeight = 0;
    window.isSnapEnabled = false;

    /**
     * *******************************
     * **Utility Functions**
     * *******************************
     */

    /**
     * **Function to Update Button States Based on Current State**
     * This function dynamically enables or disables buttons in the second toolbar row
     * based on the presence of an unlocked block and delete mode state.
     */
    const updateButtonStates = () => {
        const shouldDisableSecondRow = deleteMode && isAnyBlockUnlocked;

        // Disable Second Row Buttons Only if Both deleteMode and isAnyBlockUnlocked are True
        secondRowButtons.forEach((button) => {
            button.disabled = shouldDisableSecondRow;
        });

        // Disable Top Row Buttons Based on isAnyBlockUnlocked, Excluding deleteModeButton
        Object.entries(topRowButtons).forEach(([key, button]) => {
            if (key !== 'deleteModeButton') { // Exclude Delete Toggle Button
                button.disabled = isAnyBlockUnlocked;
            }
            // Else: Do not modify the disabled state of deleteModeButton
        });

        logDebug(
            `Button states updated. Second row buttons ${
                shouldDisableSecondRow ? "disabled" : "enabled"
            }, Top row buttons ${
                isAnyBlockUnlocked ? "disabled (excluding Delete Toggle)" : "enabled"
            }.`
        );
    };

    //**************************************************************
    //**************************************************************
    //         <****SECOND ROW TOOLBAR EVENT LISTENERS****>
    //**************************************************************


    //**************************
    // ADD TEXT BUTTON FUNCTIONS FOR DROPDOWN MENU, TEXT OPTIONS, STYLE AND INITIAL PLACEMENT
    //**************************

    // **Add Text Dropdown Functionality**
    addTextDropdown.style.display = "none";

    // **Single Event Listener for Add Text Button**
    addTextButton.addEventListener("click", async (e) => {
        e.stopPropagation(); // Prevent click from propagating
        await mutex.lock();
        try {
            logDebug("Add Text button clicked.");

            // Toggle dropdown visibility
            const isVisible = addTextDropdown.style.display === "block";
            addTextDropdown.style.display = isVisible ? "none" : "block";
            addTextButton.setAttribute("aria-expanded", !isVisible);
        } catch (error) {
            console.error("Error in Add Text button:", error);
        } finally {
            mutex.unlock();
        }
    });

    // Handle selection of dropdown items for Add Text
    addTextDropdown.querySelectorAll(".dropdown-item").forEach((item) => {
        item.addEventListener("click", async (e) => {
            e.stopPropagation(); // Prevent click from propagating
            const selectedValue = item.getAttribute("data-value"); // e.g., "p", "h1", "h2"

            if (!selectedValue) {
                console.warn("No data-value attribute found on selected dropdown item.");
                return;
            }

            logDebug(`Selected text type: ${selectedValue}`);

            // Insert the selected element into the currently unlocked block
            const unlockedBlock = document.querySelector(".grid-item.unlocked-border");
            if (!unlockedBlock) {
                alert("No unlocked block found to add text.");
                return;
            }

            const blockContent = unlockedBlock.querySelector(".block-content");
            if (!blockContent) {
                console.error("block-content div not found in the unlocked block.");
                return;
            }

            // Create the new element
            const newElement = document.createElement(selectedValue);
            newElement.textContent = "New Text"; // Placeholder text; can be edited later
            newElement.classList.add("deletable", "editable-text"); // Add deletable and styling classes

            // Set contentEditable to true before appending
            newElement.contentEditable = "true";

            // Create a draggable container for the new element
            const draggableContainer = document.createElement("div");
            draggableContainer.classList.add(
                "draggable-element",
                "block-label-draggable"
            ); // Same initial positioning style as block label

            // Position the draggable container absolutely within the block
            draggableContainer.style.position = "absolute";
            draggableContainer.style.top = "50%"; // Vertically centered
            draggableContainer.style.left = "50%"; // Horizontally centered
            draggableContainer.style.transform = `translate(-50%, -50%)`; // Perfect centering

            // **Set Initial Position Attributes for Compatibility with move()**
            draggableContainer.setAttribute('data-x', '0');
            draggableContainer.setAttribute('data-y', '0');

            draggableContainer.appendChild(newElement);

            // Append the draggable container to the block-content
            blockContent.appendChild(draggableContainer);

            // Automatically focus the new element for immediate editing
            newElement.focus();

            // Dispatch a custom event to notify contentWorkshop.js about the change
            const textAddedEvent = new CustomEvent("textAdded", {
                detail: {
                    blockId: unlockedBlock.dataset.blockId || null,
                    element: newElement.outerHTML,
                },
            });
            window.dispatchEvent(textAddedEvent);

            // Close the dropdown
            addTextDropdown.style.display = "none";
            addTextButton.setAttribute("aria-expanded", "false");

            logDebug(`Inserted new <${selectedValue}> element into the unlocked block.`);
        });
    });

    // Close the Add Text dropdown when clicking outside
    document.addEventListener("click", () => {
        addTextDropdown.style.display = "none";
        addTextButton.setAttribute("aria-expanded", "false");
    });



    //**************************
    // GRID OVERLAY FUNCTIONS FOR DROPDOWN MENU, GRID SIZE AND DYNAMIC PLACEMENT IN BLOCK
    //**************************

    // **Initialize Snap to Grid Button as Disabled by Default**
    const initializeSnapToGridButton = () => {
        if (snapToGridButton) {
            snapToGridButton.disabled = true;
            snapToGridButton.classList.add("disabled"); // Optional: Add a disabled class for styling
            snapToGridButton.setAttribute("aria-disabled", "true");
            logDebug("Snap to Grid button initialized as disabled.");
        } else {
            console.error("Snap to Grid button not found. Ensure it exists in the DOM.");
        }
    };

    initializeSnapToGridButton(); // Call the initialization function on load

    // Toggle dropdown visibility when the Grid Overlay button is clicked
    GridOverlayButton.addEventListener("click", (e) => {
        e.stopPropagation();
        mutex.lock().then(() => {
            try {
                const isVisible = gridOverlayDropdown.style.display === "block";
                gridOverlayDropdown.style.display = isVisible ? "none" : "block";
                GridOverlayButton.setAttribute("aria-expanded", !isVisible);
            } catch (error) {
                console.error("Error toggling Grid Overlay dropdown:", error);
            } finally {
                mutex.unlock();
            }
        });
    });

    // Close the grid overlay dropdown when clicking outside
    document.addEventListener("click", () => {
        gridOverlayDropdown.style.display = "none";
        GridOverlayButton.setAttribute("aria-expanded", "false");
    });

    // Handle grid size
    gridOverlayDropdown.querySelectorAll(".dropdown-item").forEach((item) => {
        item.addEventListener("click", (e) => {
            e.stopPropagation();

            // Handle Snap to Grid toggle separately
            if (item.id === "snapToGridButton") {
                toggleSnapToGrid(item);
                return;
            }

            // Handle Grid: OFF/ON toggle
            if (item.getAttribute("data-grid-size") === "1") {
                toggleGridOverlay(item);
                return;
            }

            gridOverlayDropdown.style.display = "none";
            GridOverlayButton.setAttribute("aria-expanded", "false");
        });
    });


    /* Grid Overlay Functionality */
    const toggleGridOverlay = (button) => {
        window.gridOverlayActive = !window.gridOverlayActive;

        // Update button appearance and text
        if (window.gridOverlayActive) {
            button.classList.add("active");
            button.textContent = "Grid: ON";

            // Enable the Snap to Grid button
            if (snapToGridButton) {
                snapToGridButton.disabled = false;
                snapToGridButton.classList.remove("disabled"); // Remove disabled styling
                snapToGridButton.setAttribute("aria-disabled", "false");
                logDebug("Snap to Grid button enabled.");
            }

            // Apply grid overlay to the currently unlocked block
            const unlockedBlock = document.querySelector(".grid-item.unlocked-border");
            if (!unlockedBlock) {
                alert("No unlocked block found to toggle grid overlay.");
                return;
            }

            const blockStyles = window.getComputedStyle(unlockedBlock);
            const blockWidth = parseFloat(blockStyles.width);
            const blockHeight = parseFloat(blockStyles.height);

            const columns = 10; // Default column count for Grid
            const gridUnitWidth = Math.floor(blockWidth / columns);
            const rows = Math.floor(blockHeight / gridUnitWidth);
            const gridUnitHeight = blockHeight / rows;

            // Calculate half grid units
            const halfGridUnitWidth = gridUnitWidth / 2;
            const halfGridUnitHeight = gridUnitHeight / 2;

            // Update global state
            window.gridUnitWidth = gridUnitWidth;
            window.gridUnitHeight = gridUnitHeight;

            // Apply grid overlay styles with both full and half grid lines
            unlockedBlock.style.backgroundImage = 
                'linear-gradient(to right, rgba(0, 0, 0, 0.5) 1px, transparent 1px),' + // Full vertical lines
                'linear-gradient(to right, rgba(0, 0, 0, 0.3) 0.5px, transparent 0.5px),' + // Half vertical lines
                'linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 1px, transparent 1px),' + // Full horizontal lines
                'linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0.5px, transparent 0.5px)'; // Half horizontal lines

            unlockedBlock.style.backgroundSize = 
                `${gridUnitWidth}px ${gridUnitHeight}px,` + // Full vertical
                `${halfGridUnitWidth}px ${halfGridUnitHeight}px,` + // Half vertical
                `${gridUnitWidth}px ${gridUnitHeight}px,` + // Full horizontal
                `${halfGridUnitWidth}px ${halfGridUnitHeight}px`; // Half horizontal

            unlockedBlock.style.backgroundRepeat = "repeat, repeat, repeat, repeat";
            unlockedBlock.style.backgroundPosition = "0 0, 0 0, 0 0, 0 0";

            logDebug(
                `Grid overlay turned ON: unit width: ${gridUnitWidth}px, unit height: ${gridUnitHeight}px, ` +
                `half unit width: ${halfGridUnitWidth}px, half unit height: ${halfGridUnitHeight}px.`
            );
        } else {
            button.classList.remove("active");
            button.textContent = "Grid: OFF";

            // Disable the Snap to Grid button and turn it off if it's active
            if (snapToGridButton) {
                if (window.isSnapEnabled) {
                    toggleSnapToGrid(snapToGridButton); // Turn off Snap
                }
                snapToGridButton.disabled = true;
                snapToGridButton.classList.add("disabled"); // Add disabled styling
                snapToGridButton.setAttribute("aria-disabled", "true");
                logDebug("Snap to Grid button disabled and turned off.");
            }

            // Remove grid overlay
            const unlockedBlock = document.querySelector(".grid-item.unlocked-border");
            if (unlockedBlock) {
                unlockedBlock.style.backgroundImage = "none";
                unlockedBlock.style.backgroundSize = "none";
                unlockedBlock.style.backgroundRepeat = "none";
                unlockedBlock.style.backgroundPosition = "none";

                // Reset global grid unit sizes
                window.gridUnitWidth = 0;
                window.gridUnitHeight = 0;

                logDebug("Grid overlay turned OFF.");
            }
        }
    };

    /* Toggle Snap to Grid Button */
    const toggleSnapToGrid = (button) => {
        // Only allow toggling if the button is enabled
        if (button.disabled) {
            logDebug("Attempted to toggle Snap to Grid while button is disabled.");
            return;
        }

        window.isSnapEnabled = !window.isSnapEnabled;

        // Update button appearance to reflect active state
        if (window.isSnapEnabled) {
            button.classList.add("active");
            button.textContent = "Snap: ON";
        } else {
            button.classList.remove("active");
            button.textContent = "Snap: OFF";
        }

        logDebug(`Snap to Grid is now ${window.isSnapEnabled ? "enabled" : "disabled"}.`);
    };


    //**************************
    // Other Toolbar Button Event Listeners**
    // These listeners are placeholders for additional functionalities.
    // Ensure that these functions do not interfere with grid overlay logic.
    //**************************


    if (!addImageButton || !addImageModal || !closeModalButton) {
        console.error("Modal or button elements not found.");
        return;
    }

    // Open modal
    addImageButton.addEventListener("click", () => {
        console.log("Opening modal...");
        addImageModal.classList.remove("hidden"); // Show modal
    });

    // Close modal
    closeModalButton.addEventListener("click", () => {
        console.log("Closing modal...");
        addImageModal.classList.add("hidden"); // Hide modal
    });

    // Close modal when clicking outside modal content
    addImageModal.addEventListener("click", (event) => {
        if (event.target === addImageModal) {
            console.log("Closing modal by clicking outside...");
            addImageModal.classList.add("hidden");
        }
    });



    // Image Link Button
    imageLinkButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            logDebug("Image Link button clicked.");
            // TODO: Implement image link functionality
        } catch (error) {
            console.error("Error in Image Link button:", error);
        } finally {
            mutex.unlock();
        }
    });

    // Text Link Button
    textLinkButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            logDebug("Text Link button clicked.");
            // TODO: Implement text link functionality
        } catch (error) {
            console.error("Error in Text Link button:", error);
        } finally {
            mutex.unlock();
        }
    });

    // Resize Image Button
    resizeImageButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            logDebug("Resize Image button clicked.");
            // TODO: Implement resize image functionality
        } catch (error) {
            console.error("Error in Resize Image button:", error);
        } finally {
            mutex.unlock();
        }
    });

    // Crop Image Button
    cropImageButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            logDebug("Crop Image button clicked.");
            // TODO: Implement crop image functionality
        } catch (error) {
            console.error("Error in Crop Image button:", error);
        } finally {
            mutex.unlock();
        }
    });

    // Add Gallery Button
    addGalleryButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            logDebug("Add Gallery button clicked.");
            // TODO: Implement add gallery functionality
        } catch (error) {
            console.error("Error in Add Gallery button:", error);
        } finally {
            mutex.unlock();
        }
    });

    // Add Sponsored Ad Button
    addSponsoredAdButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            logDebug("Add Sponsored Ad button clicked.");
            // TODO: Implement add sponsored ad functionality
        } catch (error) {
            console.error("Error in Add Sponsored Ad button:", error);
        } finally {
            mutex.unlock();
        }
    });

    // Color Picker Button
    colorPickerButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            logDebug("Color Picker button clicked.");
            // TODO: Implement color picker functionality
        } catch (error) {
            console.error("Error in Color Picker button:", error);
        } finally {
            mutex.unlock();
        }
    });

    // Layer Control Button
    layerControlButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            logDebug("Layer Control button clicked.");
            // TODO: Implement layer control functionality
        } catch (error) {
            console.error("Error in Layer Control button:", error);
        } finally {
            mutex.unlock();
        }
    });

    // Duplicate Content Button
    duplicateContentButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            logDebug("Duplicate Content button clicked.");
            // TODO: Implement duplicate content functionality
        } catch (error) {
            console.error("Error in Duplicate Content button:", error);
        } finally {
            mutex.unlock();
        }
    });

    // Embed HTML Button
    embedHTMLButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            logDebug("Embed HTML button clicked.");
            // TODO: Implement embed HTML functionality
        } catch (error) {
            console.error("Error in Embed HTML button:", error);
        } finally {
            mutex.unlock();
        }
    });

    // Animation Effects Button
    animationEffectsButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            logDebug("Animation Effects button clicked.");
            // TODO: Implement animation effects functionality
        } catch (error) {
            console.error("Error in Animation Effects button:", error);
        } finally {
            mutex.unlock();
        }
    });

    // Alignment Tools Button
    alignmentToolsButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            logDebug("Alignment Tools button clicked.");
            // TODO: Implement alignment tools functionality
        } catch (error) {
            console.error("Error in Alignment Tools button:", error);
        } finally {
            mutex.unlock();
        }
    });

    // Font Styling Button
    fontStylingButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            logDebug("Font Styling button clicked.");
            // TODO: Implement font styling functionality
        } catch (error) {
            console.error("Error in Font Styling button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Handle Custom Events for Delete Mode and Block Lock Changes**
     * Listens for custom events dispatched from contentWorkshop.js
     * and updates the button states dynamically.
     */
    // Listen for deleteModeChanged event
    window.addEventListener('deleteModeChanged', (e) => {
        deleteMode = e.detail.deleteMode;
        logDebug(`'deleteModeChanged' event triggered. Delete Mode is now: ${deleteMode}`);
        updateButtonStates();
    });

    // Listen for blockLockChanged event
    window.addEventListener('blockLockChanged', (e) => {
        const { blockId, isLocked } = e.detail;
        logDebug(`'blockLockChanged' event triggered for blockId: ${blockId}, isLocked: ${isLocked}`);

        // Update isAnyBlockUnlocked based on current DOM state
        isAnyBlockUnlocked = document.querySelector(".grid-item.unlocked-border") !== null;

        updateButtonStates();
    });

    /**
     * *******************************
     * **Initialization**
     * *******************************
     */

    // Disable all second row buttons initially if deleteMode is active and a block is unlocked
    updateButtonStates();
    logDebug("Button state management setup complete.");
});
