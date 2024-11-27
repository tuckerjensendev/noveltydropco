// secondToolbar.js

document.addEventListener("DOMContentLoaded", () => {
    console.log("[DEBUG] secondaryToolbar.js loaded and DOMContentLoaded triggered.");

    /**
     * *******************************
     * **Constants and DOM Elements**
     * *******************************
     */
    const secondToolbarRow = document.querySelector('.toolbar-row.second-row');

    // **Button References**
    const toggleGridOverlayButton = document.getElementById("toggleGridOverlayButton");
    const addImageButton = document.getElementById("addImageButton");
    const imageLinkButton = document.getElementById("imageLinkButton");
    const addTextButton = document.getElementById("addTextButton");
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
    const addTextDropdown = document.getElementById("addTextDropdown"); // Dropdown menu
    const addTextDropdownButton = document.getElementById("addTextButton"); // Add Text button

    // **List of Buttons for Iteration**
    const secondRowButtons = [
        toggleGridOverlayButton,
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
        pushLiveButton : document.getElementById("pushLiveButton")
    };

    // List of grid size classes
    const gridSizeClasses = ['grid-overlay-small', 'grid-overlay-medium', 'grid-overlay-large'];

    /**
     * *******************************
     * **Validation of Critical DOM Elements**
     * *******************************
     */
    // Validate the presence of the second toolbar row
    if (!secondToolbarRow) {
        console.error("[DEBUG] Second toolbar row not found. secondaryToolbar.js aborted.");
        return;
    }
    console.log("[DEBUG] Second toolbar row found.");

    const missingButtons = secondRowButtons.filter(button => !button);
    if (missingButtons.length > 0) {
        console.error(`[DEBUG] Missing buttons in second toolbar row: ${missingButtons.map(btn => btn.id).join(', ')}. secondaryToolbar.js aborted.`);
        return;
    }
    console.log("[DEBUG] All second row toolbar buttons are present.");

    /**
     * *******************************
     * **Shared Mutex Access**
     * *******************************
     */
    // Access the shared mutex from contentWorkshop.js
    const mutex = window.sharedMutex;
    if (!mutex) {
        console.error("[DEBUG] Shared mutex not found on window. Ensure contentWorkshop.js exposes the mutex.");
        return;
    }
    console.log("[DEBUG] Shared mutex accessed successfully.");

    /**
     * *******************************
     * **State Variables**
     * *******************************
     */
    let deleteMode = false; // Track delete mode state
    let isAnyBlockUnlocked = false; // Track if any block is unlocked

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
    // secondaryToolbar.js

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

        console.log(
            `[DEBUG] Button states updated. Second row buttons ${
                shouldDisableSecondRow ? "disabled" : "enabled"
            }, Top row buttons ${
                isAnyBlockUnlocked ? "disabled (excluding Delete Toggle)" : "enabled"
            }.`
        );
    };


    /**
     * *******************************
     * **Event Listeners**
     * *******************************
     */

    /**
     * **Add Text Button Dropdown Functionality**
     */
    // Ensure the dropdown menu is hidden initially
    addTextDropdown.style.display = "none";

    // Toggle dropdown visibility when the Add Text button is clicked
    addTextDropdownButton.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent click from propagating
        const isVisible = addTextDropdown.style.display === "block";
        addTextDropdown.style.display = isVisible ? "none" : "block";
        addTextDropdownButton.setAttribute("aria-expanded", !isVisible);
    });

    // Handle selection of dropdown items
    addTextDropdown.querySelectorAll(".dropdown-item").forEach(item => {
        item.addEventListener("click", async (e) => {
            e.stopPropagation(); // Prevent click from propagating
            const selectedValue = item.getAttribute("data-value"); // e.g., "p", "h1", "h2"
    
            if (!selectedValue) {
                console.warn("[DEBUG] No data-value attribute found on selected dropdown item.");
                return;
            }
    
            console.log(`[DEBUG] Selected text type: ${selectedValue}`);
    
            // Insert the selected element into the currently unlocked block
            const unlockedBlock = document.querySelector('.grid-item.unlocked-border');
            if (!unlockedBlock) {
                alert("No unlocked block found to add text.");
                return;
            }
    
            const blockContent = unlockedBlock.querySelector('.block-content');
            if (!blockContent) {
                console.error("[DEBUG] block-content div not found in the unlocked block.");
                return;
            }
    
            // Create the new element
            const newElement = document.createElement(selectedValue);
            newElement.textContent = "New Text"; // Placeholder text; can be edited later
            newElement.classList.add("deletable", "editable-text"); // Add deletable and styling classes
    
            // Set contentEditable to true before appending
            newElement.contentEditable = "true";
    
            // Create a draggable container for the new element
            const draggableContainer = document.createElement('div');
            draggableContainer.classList.add('draggable-element');
            draggableContainer.style.position = 'absolute'; // Position absolutely within the block
            draggableContainer.style.top = '0px'; // Initial position
            draggableContainer.style.left = '0px'; // Initial position
    
            // **Add Initial Position Attributes and Styles**
            draggableContainer.setAttribute('data-x', '0');
            draggableContainer.setAttribute('data-y', '0');
            draggableContainer.style.transform = 'translate(0px, 0px)';
    
            draggableContainer.appendChild(newElement);
    
            // Append the draggable container to the block-content
            blockContent.appendChild(draggableContainer);
    
            // Automatically focus the new element for immediate editing
            newElement.focus();
    
            // Dispatch a custom event to notify contentWorkshop.js about the change
            const textAddedEvent = new CustomEvent('textAdded', {
                detail: {
                    blockId: unlockedBlock.dataset.blockId || null,
                    element: newElement.outerHTML
                }
            });
            window.dispatchEvent(textAddedEvent);
    
            // Close the dropdown
            addTextDropdown.style.display = "none";
            addTextDropdownButton.setAttribute("aria-expanded", "false");
    
            console.log(`[DEBUG] Inserted new <${selectedValue}> element into the unlocked block.`);
        });
    });
    

    // Close the dropdown when clicking outside
    document.addEventListener("click", () => {
        addTextDropdown.style.display = "none";
        addTextDropdownButton.setAttribute("aria-expanded", "false");
    });

    /**
     * **Toggle Grid Overlay Button**
     */
    toggleGridOverlayButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Toggle Grid Overlay button clicked.");

            // Find the currently unlocked block
            const unlockedBlock = document.querySelector('.grid-item.unlocked-border');
            if (!unlockedBlock) {
                console.warn("[DEBUG] No unlocked block found. Grid Overlay toggle aborted.");
                alert("No unlocked block found to toggle the grid overlay.");
                return;
            }

            // Sync gridOverlayActive state with the DOM
            gridOverlayActive = unlockedBlock.classList.contains('grid-overlay-active');

            if (!gridOverlayActive) {
                // Activate grid overlay and start with the first custom size
                gridOverlaySizeIndex = 0; // Reset to the first grid size
                unlockedBlock.classList.add('grid-overlay-active', gridSizeClasses[gridOverlaySizeIndex]);
                gridOverlayActive = true;
                console.log(`[DEBUG] Grid overlay added to the unlocked block with size: ${gridSizeClasses[gridOverlaySizeIndex]}`);
            } else {
                // Cycle grid size or turn off if at the last size
                unlockedBlock.classList.remove(...gridSizeClasses);

                gridOverlaySizeIndex = (gridOverlaySizeIndex + 1) % (gridSizeClasses.length + 1); // +1 to include "off" state

                if (gridOverlaySizeIndex === gridSizeClasses.length) {
                    // Turn off the grid overlay
                    unlockedBlock.classList.remove('grid-overlay-active');
                    gridOverlayActive = false;
                    console.log("[DEBUG] Grid overlay turned off.");
                } else {
                    // Apply the next grid size
                    unlockedBlock.classList.add(gridSizeClasses[gridOverlaySizeIndex]);
                    console.log(`[DEBUG] Grid overlay size updated to: ${gridSizeClasses[gridOverlaySizeIndex]}`);
                }
            }
        } catch (error) {
            console.error("[DEBUG] Error in Toggle Grid Overlay button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Other Toolbar Buttons Event Listeners**
     * (Add Image, Image Link, etc.)
     * Ensure these do not interfere with the Add Text functionality
     */

    // Example for Add Image Button
    addImageButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Add Image button clicked.");
            // TODO: Implement add image functionality
        } catch (error) {
            console.error("[DEBUG] Error in Add Image button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Image Link Button**
     */
    imageLinkButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Image Link button clicked.");
            // TODO: Implement image link functionality
        } catch (error) {
            console.error("[DEBUG] Error in Image Link button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Add Text Button**
     */
    addTextButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Add Text button clicked.");
            // This button now only toggles the dropdown, actual functionality is handled by the dropdown items
        } catch (error) {
            console.error("[DEBUG] Error in Add Text button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Text Link Button**
     */
    textLinkButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Text Link button clicked.");
            // TODO: Implement text link functionality
        } catch (error) {
            console.error("[DEBUG] Error in Text Link button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Resize Image Button**
     */
    resizeImageButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Resize Image button clicked.");
            // TODO: Implement resize image functionality
        } catch (error) {
            console.error("[DEBUG] Error in Resize Image button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Crop Image Button**
     */
    cropImageButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Crop Image button clicked.");
            // TODO: Implement crop image functionality
        } catch (error) {
            console.error("[DEBUG] Error in Crop Image button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Add Gallery Button**
     */
    addGalleryButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Add Gallery button clicked.");
            // TODO: Implement add gallery functionality
        } catch (error) {
            console.error("[DEBUG] Error in Add Gallery button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Add Sponsored Ad Button**
     */
    addSponsoredAdButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Add Sponsored Ad button clicked.");
            // TODO: Implement add sponsored ad functionality
        } catch (error) {
            console.error("[DEBUG] Error in Add Sponsored Ad button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Color Picker Button**
     */
    colorPickerButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Color Picker button clicked.");
            // TODO: Implement color picker functionality
        } catch (error) {
            console.error("[DEBUG] Error in Color Picker button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Layer Control Button**
     */
    layerControlButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Layer Control button clicked.");
            // TODO: Implement layer control functionality
        } catch (error) {
            console.error("[DEBUG] Error in Layer Control button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Duplicate Content Button**
     */
    duplicateContentButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Duplicate Content button clicked.");
            // TODO: Implement duplicate content functionality
        } catch (error) {
            console.error("[DEBUG] Error in Duplicate Content button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Lock Element Button**
     */
    lockElementButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Lock Element button clicked.");
            // This should toggle the lock state of the currently unlocked block
            const unlockedBlock = document.querySelector('.grid-item.unlocked-border');
            if (unlockedBlock) {
                // Assuming there's a function to toggle lock, e.g., toggleBlockLock
                toggleBlockLock(unlockedBlock);
            } else {
                alert("No unlocked block found to lock.");
            }
        } catch (error) {
            console.error("[DEBUG] Error in Lock Element button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Embed HTML Button**
     */
    embedHTMLButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Embed HTML button clicked.");
            // TODO: Implement embed HTML functionality
        } catch (error) {
            console.error("[DEBUG] Error in Embed HTML button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Animation Effects Button**
     */
    animationEffectsButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Animation Effects button clicked.");
            // TODO: Implement animation effects functionality
        } catch (error) {
            console.error("[DEBUG] Error in Animation Effects button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Alignment Tools Button**
     */
    alignmentToolsButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Alignment Tools button clicked.");
            // TODO: Implement alignment tools functionality
        } catch (error) {
            console.error("[DEBUG] Error in Alignment Tools button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Font Styling Button**
     */
    fontStylingButton.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Font Styling button clicked.");
            // TODO: Implement font styling functionality
        } catch (error) {
            console.error("[DEBUG] Error in Font Styling button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Event Listener for 'deleteModeChanged' and 'blockLockChanged'**
     * Listens for custom events dispatched from contentWorkshop.js
     * and updates the button states dynamically.
     */
    // Listen for deleteModeChanged event
    window.addEventListener('deleteModeChanged', (e) => {
        deleteMode = e.detail.deleteMode;
        console.log(`[DEBUG] 'deleteModeChanged' event triggered. Delete Mode is now: ${deleteMode}`);
        updateButtonStates();
    });

    // Listen for blockLockChanged event
    window.addEventListener('blockLockChanged', (e) => {
        const { blockId, isLocked } = e.detail;
        console.log(`[DEBUG] 'blockLockChanged' event triggered for blockId: ${blockId}, isLocked: ${isLocked}`);

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
    console.log("[DEBUG] Button state management setup complete.");
});
