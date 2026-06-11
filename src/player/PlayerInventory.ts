import { Player } from "./Player";
import { PlayerAction } from "./PlayerAction";

export class PlayerInventory {

    public slotCount: number = 40;

    public container: HTMLDivElement;
    public closeButton: HTMLButtonElement;
    public inventorySlotElements: HTMLDivElement[] = [];

    constructor(public player: Player) {
        this.container = document.createElement("div");
        this.container.classList.add("player-inventory-container");
        document.body.appendChild(this.container);

        let title = document.createElement("div");
        title.classList.add("player-inventory-title");
        title.textContent = "Inventory";
        this.container.appendChild(title);

        this.closeButton = document.createElement("button");
        this.closeButton.classList.add("player-inventory-close-button");
        this.closeButton.textContent = "x";
        this.container.appendChild(this.closeButton);
        this.closeButton.addEventListener("click", () => {
            this.hide();
            this.player.lockPointer();
        });

        for (let i = 0; i < this.slotCount; i++) {
            let slot = document.createElement("div");
            slot.classList.add("player-inventory-slot");
            this.inventorySlotElements.push(slot);

            let icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            icon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            icon.setAttribute("width", "100%");
            icon.setAttribute("height", "100%");
            icon.setAttribute("viewBox", "0 0 16 16");
            slot.appendChild(icon);

            let canvasContainer = document.createElement("div");
            canvasContainer.classList.add("player-inventory-canvas-container");
            canvasContainer.setAttribute("width", "100%");
            canvasContainer.setAttribute("height", "100%");
            slot.appendChild(canvasContainer);
        }

        for (let i = 0; i < this.slotCount; i++) {
            this.container.appendChild(this.inventorySlotElements[i]);
        }
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

    public linkAction(slotIndex: number, action: PlayerAction): void {
        this.actions[slotIndex] = action;
        let svgIconContainer = this.actionSlotElements[slotIndex].querySelector("svg")!;
        let canvasContainer = this.actionSlotElements[slotIndex].querySelector<HTMLDivElement>(".player-action-canvas-container")!;
        if (action.svgIcon) {
            svgIconContainer.innerHTML = action.svgIcon;
            svgIconContainer.style.display = "block";
            canvasContainer.style.display = "none";
        }
        else if (action.canvasIcon) {
            canvasContainer.innerHTML = "";
            canvasContainer.appendChild(action.canvasIcon);
            canvasContainer.style.display = "block";
            svgIconContainer.style.display = "none";
        }
    }
    */

    public show(): void {
        this.container.style.display = "block";
        this.player.unlockPointer();
    }

    public hide(): void {
        this.container.style.display = "none";
    }
}