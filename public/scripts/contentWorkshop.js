document.addEventListener("DOMContentLoaded", () => {
    const gridContainer = document.getElementById("contentPreview");
    const blockTypeControl = document.getElementById("blockTypeControl");
    const addBlockButton = document.getElementById("addBlockButton");
    const saveButton = document.getElementById("saveButton");

    // Add the toggle lock button
    const toggleLockButton = document.createElement("button");
    toggleLockButton.id = "toggleLockButton";
    toggleLockButton.textContent = "🔓 Unlock"; // Default to locked
    document.getElementById("sharedToolbar").appendChild(toggleLockButton);

    // Create Sortable instance, locked by default
    let sortableInstance = Sortable.create(gridContainer, {
        animation: 150,
        handle: ".grid-item",
        disabled: true, // Disable drag-and-drop by default
        onEnd: () => console.log("Reordered!")
    });

    let isLocked = true; // Default state is locked

    // Add a new block with selected type
    addBlockButton.addEventListener("click", () => {
        const blockType = blockTypeControl.value;
        const block = document.createElement("div");
    
        // Apply selected CSS class
        block.className = `grid-item ${blockType}`;
    
        // Only add contenteditable if it's not a spacer
        if (!blockType.includes("spacer")) {
            block.innerHTML = `<div class="block-content" contenteditable="true">New ${blockType.replace('-', ' ').toUpperCase()}</div>`;
        }
    
        gridContainer.appendChild(block);
    });

    saveButton.addEventListener("click", () => {
        const blocksToSave = [];
        gridContainer.querySelectorAll(".grid-item").forEach((block) => {
            const content = block.querySelector(".block-content")?.innerHTML || ""; // Handle spacers
            blocksToSave.push({
                content,
                row: block.style.gridRowStart || 1,
                col: block.style.gridColumnStart || 1,
                type: block.classList[1], // Get type from class
            });
        });

        fetch("/api/save-layout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(blocksToSave),
        })
        .then((res) => res.json())
        .then((data) => console.log("Layout saved:", data))
        .catch((err) => console.error("Error saving layout:", err));
    });

    // Toggle lock/unlock functionality
    toggleLockButton.addEventListener("click", () => {
        if (isLocked) {
            // Unlock: Enable Sortable
            sortableInstance.option("disabled", false);
            toggleLockButton.textContent = "🔒 Lock";
        } else {
            // Lock: Disable Sortable
            sortableInstance.option("disabled", true);
            toggleLockButton.textContent = "🔓 Unlock";
        }
        isLocked = !isLocked;
    });
});
