document.addEventListener("DOMContentLoaded", () => {
    const gridContainer = document.getElementById("contentPreview");
    const blockTypeControl = document.getElementById("blockTypeControl");
    const addBlockButton = document.getElementById("addBlockButton");
    const saveButton = document.getElementById("saveButton");

    Sortable.create(gridContainer, {
        animation: 150,
        handle: ".grid-item",
        onEnd: () => console.log("Reordered!")
    });

    // Add a new block with selected type
    addBlockButton.addEventListener("click", () => {
        const blockType = blockTypeControl.value;
        const block = document.createElement("div");
        block.className = `grid-item ${blockType}`; // Apply selected CSS class
        block.innerHTML = `<div class="block-content" contenteditable="true">New ${blockType.replace('-', ' ').toUpperCase()}</div>`;
        
        gridContainer.appendChild(block);
    });

    saveButton.addEventListener("click", () => {
        const blocksToSave = [];
        gridContainer.querySelectorAll(".grid-item").forEach((block) => {
            const content = block.querySelector(".block-content").innerHTML;
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
});
