// secondToolbar.js

document.addEventListener("DOMContentLoaded", () => {
    console.log("[DEBUG] secondToolbar.js loaded and DOMContentLoaded triggered.");

    /**
     * *******************************
     * **DOM Elements**
     * *******************************
     */
    const secondToolbarRow = document.querySelector('.toolbar-row.second-row');

    // Validate the presence of the second toolbar row
    if (!secondToolbarRow) {
        console.error("[DEBUG] Second toolbar row not found. secondToolbar.js aborted.");
        return;
    }
    console.log("[DEBUG] Second toolbar row found.");

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
    const clearContentButtonSecondRow = document.getElementById("clearContentButton"); // Assuming same ID as in first row

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
        clearContentButtonSecondRow
    ];

    /**
     * *******************************
     * **Validation of Critical DOM Elements**
     * *******************************
     */
    const missingButtons = secondRowButtons.filter(button => !button);
    if (missingButtons.length > 0) {
        console.error(`[DEBUG] Missing buttons in second toolbar row: ${missingButtons.map(btn => btn.id).join(', ')}. secondToolbar.js aborted.`);
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
    // State variables will be received from the 'appStateChanged' event

    let currentViewMode = 'draft'; // Default initial state
    let currentDeleteMode = false;
    let currentIsSaving = false;

    // Track if grid overlay is active on the currently unlocked block
    let gridOverlayActive = false;

    /**
     * *******************************
     * **Event Listeners for Second Row Buttons**
     * *******************************
     */

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

            // Toggle grid overlay state
            if (gridOverlayActive) {
                // Remove grid overlay
                unlockedBlock.classList.remove('grid-overlay-active');
                gridOverlayActive = false;
                console.log("[DEBUG] Grid overlay removed from the unlocked block.");
            } else {
                // Add grid overlay
                unlockedBlock.classList.add('grid-overlay-active');
                gridOverlayActive = true;
                console.log("[DEBUG] Grid overlay added to the unlocked block.");
            }
        } catch (error) {
            console.error("[DEBUG] Error in Toggle Grid Overlay button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * **Add Image Button**
     */
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
            // TODO: Implement add text functionality
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
            // TODO: Implement lock element functionality
            // This should toggle the lock state of the currently unlocked block
            const unlockedBlock = document.querySelector('.grid-item.unlocked-border');
            if (unlockedBlock) {
                // Assuming there's a function to toggle lock, e.g., toggleBlockLock
                toggleBlockLock(unlockedBlock);
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
     * **Clear Content Button (Second Row)**
     */
    clearContentButtonSecondRow.addEventListener("click", async () => {
        await mutex.lock();
        try {
            console.log("[DEBUG] Clear Content (Second Row) button clicked.");
            // TODO: Implement clear content functionality specific to the second row
        } catch (error) {
            console.error("[DEBUG] Error in Clear Content (Second Row) button:", error);
        } finally {
            mutex.unlock();
        }
    });

    /**
     * *******************************
     * **Universal Logic for Button States**
     * *******************************
     */

    /**
     * **Function to Update Button States Based on Global States**
     * This function ensures that buttons in the second toolbar row are enabled or disabled
     * based on the application's current state (e.g., live view, delete mode, saving).
     * 
     * @param {Object} state - The current application state.
     * @param {string} state.viewMode - Current view mode ('draft' or 'live').
     * @param {boolean} state.deleteMode - Whether delete mode is active.
     * @param {boolean} state.isSaving - Whether a save operation is in progress.
     */
    const updateSecondRowButtonStates = (state) => {
        const { viewMode, deleteMode, isSaving } = state;

        // Determine if any block is unlocked
        const isAnyBlockUnlocked = document.querySelector('.grid-item.unlocked-border') !== null;

        // Determine overall disabling condition
        const shouldEnable = isAnyBlockUnlocked && viewMode === 'draft' && !deleteMode && !isSaving;

        // Iterate over each button and set its disabled state accordingly
        secondRowButtons.forEach(button => {
            button.disabled = !shouldEnable;
        });

        console.log(`[DEBUG] Second row button states updated. Enabled: ${shouldEnable}`);
    };

    /**
     * **Event Listener for 'appStateChanged'**
     * Listens for the custom 'appStateChanged' event dispatched from contentWorkshop.js
     * and updates the second toolbar's button states based on the received state.
     */
    window.addEventListener('blockLockChanged', (e) => {
        const { blockId, isLocked } = e.detail;
        console.log(`[DEBUG] 'blockLockChanged' event received for block ID: ${blockId}, Locked: ${isLocked}`);
    
        const block = document.querySelector(`.grid-item[data-block-id="${blockId}"]`);
    
        if (block) {
            if (isLocked) {
                block.classList.remove('grid-overlay-active');
                gridOverlayActive = false;
                console.log("[DEBUG] Grid overlay removed from locked block.");
            }
        }
    
        // Update button states
        updateTopRowButtonStates();
        updateSecondRowButtonStates();
    });
    

    console.log("[DEBUG] secondToolbar.js setup complete.");
});
