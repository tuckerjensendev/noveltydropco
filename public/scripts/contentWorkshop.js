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

    let isLocked = true; // Default state is locked
    let sortableInstance;

    const initializeSortable = () => {
        if (sortableInstance) {
            sortableInstance.destroy(); // Destroy existing Sortable instance
        }
        sortableInstance = Sortable.create(gridContainer, {
            animation: 150,
            handle: ".grid-item",
            disabled: isLocked, // Lock state controls drag-and-drop
            onEnd: () => {
                console.log("Reordered!");
            },
        });
        console.log("Sortable initialized. Locked:", isLocked);
    };

    const fetchLayout = () => {
        const pageId = document.querySelector(".side-panel .active").dataset.page;
        console.log("Fetching layout for page:", pageId);

        fetch(`/api/content/${pageId}`)
            .then((res) => res.json())
            .then((blocks) => {
                console.log("Fetched blocks:", blocks);
                gridContainer.innerHTML = ""; // Clear existing blocks
                blocks.forEach((block) => {
                    const blockElement = document.createElement("div");
                    blockElement.className = `grid-item ${block.type}`;
                    blockElement.style.gridRow = `${block.row} / span ${block.height}`;
                    blockElement.style.gridColumn = `${block.col} / span ${block.width}`;

                    // Apply inline styles
                    if (block.style) blockElement.style.cssText += block.style;
                    if (block.font_color) blockElement.style.color = block.font_color;
                    if (block.bg_color) blockElement.style.backgroundColor = block.bg_color;
                    if (block.text_align) blockElement.style.textAlign = block.text_align;

                    if (block.content) {
                        blockElement.innerHTML = `<div class="block-content" contenteditable="true">${block.content}</div>`;
                    }
                    gridContainer.appendChild(blockElement);
                });

                initializeSortable(); // Reinitialize Sortable after rendering
            })
            .catch((err) => console.error("Error fetching layout:", err));
    };

    fetchLayout(); // Call it on page load

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
        initializeSortable(); // Reinitialize Sortable after adding
    });

    saveButton.addEventListener("click", () => {
        const blocksToSave = [];
        const pageId = document.querySelector(".side-panel .active").dataset.page;

        gridContainer.querySelectorAll(".grid-item").forEach((block) => {
            const content = block.querySelector(".block-content")?.innerHTML || "";

            const offsetTop = block.offsetTop - gridContainer.offsetTop;
            const offsetLeft = block.offsetLeft - gridContainer.offsetLeft;

            const gridRowHeight = parseFloat(gridContainer.style.gridAutoRows.replace("px", "")) || 100;
            const gridColumnWidth = gridContainer.offsetWidth / 12;

            const rowStart = Math.round(offsetTop / gridRowHeight) + 1;
            const colStart = Math.round(offsetLeft / gridColumnWidth) + 1;

            const computedStyle = window.getComputedStyle(block);
            const gridRow = computedStyle.getPropertyValue("grid-row");
            const gridColumn = computedStyle.getPropertyValue("grid-column");

            const rowSpan = gridRow.includes("span")
                ? parseInt(gridRow.split("span")[1]?.trim())
                : parseInt(gridRow.split("/")[1]?.trim()) || 1;
            const colSpan = gridColumn.includes("span")
                ? parseInt(gridColumn.split("span")[1]?.trim())
                : parseInt(gridColumn.split("/")[1]?.trim()) || 1;

            const width = colSpan > 0 ? colSpan : 1;
            const height = rowSpan > 0 ? rowSpan : 1;

            const inlineStyle = block.style.cssText;

            blocksToSave.push({
                content,
                page_id: pageId,
                type: block.classList[1],
                row: rowStart,
                col: colStart,
                width,
                height,
                style: inlineStyle || null,
            });
        });

        console.log("Payload to save:", blocksToSave);

        fetch("/api/save-layout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(blocksToSave),
        })
            .then((res) => res.json())
            .then((data) => {
                console.log("Layout saved:", data);
                fetchLayout(); // Re-fetch layout after save
            })
            .catch((err) => console.error("Error saving layout:", err));
    });

    toggleLockButton.addEventListener("click", () => {
        isLocked = !isLocked;
        toggleLockButton.textContent = isLocked ? "🔓 Unlock" : "🔒 Lock";
        if (sortableInstance) sortableInstance.option("disabled", isLocked);
        console.log("Lock state toggled. Locked:", isLocked);
    });
});
