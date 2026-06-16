import { Player } from "../Player";
import { PlayerInventoryItem, PlayerInventoryItemFactory } from "./PlayerInventoryItem";

export class PlayerInventory {

    public slotCount: number = 40;

    public container: HTMLDivElement;
    public closeButton: HTMLButtonElement;
    public items: (PlayerInventoryItem | undefined)[] = [];
    public inventorySlotElements: HTMLDivElement[] = [];

    private _draggedItem: PlayerInventoryItem | undefined = undefined;
    public get draggedItem(): PlayerInventoryItem | undefined {
        return this._draggedItem;
    }
    public set draggedItem(value: PlayerInventoryItem | undefined) {
        this._draggedItem = value;
        let iconContainer = this.draggedItemElement.querySelector<HTMLDivElement>("div.icon-container")!;
        if (this._draggedItem && this._draggedItem.svgIcon) {
            iconContainer.innerHTML = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'>" + this._draggedItem.svgIcon + "</svg>";
            iconContainer.style.display = "block";
        }
        else if (this._draggedItem && this._draggedItem.canvasIcon) {
            iconContainer.innerHTML = "<img src='" + this._draggedItem.canvasIcon + "'/>";
            iconContainer.style.display = "block";
        }
        else {
            iconContainer.style.display = "none";
        }

        if (this._draggedItem) {
            document.addEventListener("pointermove", this._updateDraggedItemPositionListener);
        }
        else {
            this.draggedItemElement.style.display = "none";
            document.removeEventListener("pointermove", this._updateDraggedItemPositionListener);
        }
    }
    public draggedItemElement: HTMLDivElement;
    private _updateDraggedItemPositionListener = (e: PointerEvent) => {
        this.draggedItemElement.style.display = "block";
        this.draggedItemElement.style.left = (e.clientX - 25) + "px";
        this.draggedItemElement.style.top = (e.clientY - 25) + "px";
    };

    constructor(public player: Player) {
        this.container = document.createElement("div");
        this.container.classList.add("player-inventory-container");
        document.body.appendChild(this.container);

        let title = document.createElement("div");
        title.classList.add("player-inventory-title");
        title.textContent = "Inventory";
        this.container.appendChild(title);

        // Dragged item element
        this.draggedItemElement = document.createElement("div");
        this.draggedItemElement.classList.add("player-inventory-slot");
        this.draggedItemElement.style.position = "fixed";
        this.draggedItemElement.style.zIndex = "1000";
        this.draggedItemElement.style.pointerEvents = "none";
        document.body.appendChild(this.draggedItemElement);

        let iconContainer = document.createElement("div");
        iconContainer.classList.add("icon-container");
        this.draggedItemElement.appendChild(iconContainer);

        // Close button
        this.closeButton = document.createElement("button");
        this.closeButton.classList.add("player-inventory-close-button");
        this.closeButton.textContent = "x";
        this.container.appendChild(this.closeButton);
        this.closeButton.addEventListener("click", () => {
            this.hide();
            this.player.lockPointer();
        });

        for (let i = 0; i < this.slotCount; i++) {
            let slotIndex = i;

            let slot = document.createElement("div");
            slot.classList.add("player-inventory-slot");
            this.inventorySlotElements.push(slot);
            slot.addEventListener("pointerdown", (e) => {
                let item = this.items[slotIndex];
                if (item) {
                    this.draggedItem = item;
                }
            });
            slot.addEventListener("pointerup", (e) => {
                if (this.draggedItem) {
                    let draggedItemSlotIndex = this.items.indexOf(this.draggedItem);
                    let targetSlotIndex = this.inventorySlotElements.indexOf(e.currentTarget as HTMLDivElement);
                    if (targetSlotIndex >= 0) {
                        let targetItem = this.items[targetSlotIndex];
                        if (!targetItem) {
                            // Move item to empty slot
                            this.items[targetSlotIndex] = this.draggedItem;
                            this.items[draggedItemSlotIndex] = undefined;
                            this.setItem(this.draggedItem, targetSlotIndex);
                            this.setItem(undefined, draggedItemSlotIndex);
                        }
                    }
                    this.draggedItem = undefined;
                }
            });

            let slotLabel = document.createElement("div");
            slotLabel.classList.add("label");
            slotLabel.textContent = "";
            slot.appendChild(slotLabel);

            let iconContainer = document.createElement("div");
            iconContainer.classList.add("icon-container");
            iconContainer.style.display = "none";
            slot.appendChild(iconContainer);
        }

        for (let i = 0; i < this.slotCount; i++) {
            this.container.appendChild(this.inventorySlotElements[i]);
        }

        this.hide();
    }

    /*
    public highlightPlayerAction(playerAction: PlayerAction): void {
        let index = this.actions.indexOf(playerAction);
        if (index >= 0) {
            this.actionSlotElements.forEach(e => e.classList.remove("highlighted"));
            this.actionSlotElements[index].classList.add("highlighted");
        }
    }

    public unlightPlayerAction(playerAction: PlayerAction): void {
        let index = this.actions.indexOf(playerAction);
        if (index >= 0) {
            this.actionSlotElements[index].classList.remove("highlighted");
        }
    }
    */

    public getFirstEmptySlotIndex(): number {
        for (let i = 0; i < this.slotCount; i++) {
            if (!this.items[i]) {
                return i;
            }
        }
        return -1;
    }

    public async addItemByName(itemName: string): Promise<boolean> {
        let existingItemIndex = this.items.findIndex(i => i && i.name === itemName);
        if (existingItemIndex >= 0) {
            this.items[existingItemIndex]!.count++;
            return true;
        }
        let item = await PlayerInventoryItemFactory.CreateItemByName(itemName, this.player);
        let slotIndex = this.getFirstEmptySlotIndex();
        if (slotIndex < 0) {
            return false;
        }
        this.setItem(item, slotIndex);
        return true;
    }

    public setItem(item: PlayerInventoryItem | undefined, slotIndex: number): void {
        this.items[slotIndex] = item;
        let slotLabel = this.inventorySlotElements[slotIndex].querySelector<HTMLDivElement>("div.label")!;
        let iconContainer = this.inventorySlotElements[slotIndex].querySelector<HTMLDivElement>("div.icon-container")!;
        if (item) {
            slotLabel.textContent = item.displayName;
        }
        if (item && item.svgIcon) {
            iconContainer.innerHTML = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'>" + item.svgIcon + "</svg>";
            iconContainer.style.display = "block";
        }
        else if (item && item.canvasIcon) {
            iconContainer.innerHTML = "<img src='" + item.canvasIcon + "'/>";
            iconContainer.style.display = "block";
        }
        else {
            iconContainer.style.display = "none";
            slotLabel.textContent = "";
        }
    }

    public show(): void {
        this.container.style.display = "block";
        this.player.unlockPointer();
    }

    public hide(): void {
        this.container.style.display = "none";
    }
}