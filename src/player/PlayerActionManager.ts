import { Player } from "./Player";
import { PlayerAction } from "./PlayerAction";

export class PlayerActionManager {

    public slotCount: number = 10;

    public container: HTMLDivElement;
    public actions: PlayerAction[] = [];
    public actionSlotElements: HTMLDivElement[] = [];

    constructor(public player: Player) {
        this.container = document.createElement("div");
        this.container.classList.add("player-action-container");
        document.body.appendChild(this.container);

        for (let i = 0; i < this.slotCount; i++) {
            let slotIndex = i;

            let slot = document.createElement("div");
            slot.classList.add("player-action-slot");
            this.actionSlotElements.push(slot);
            slot.addEventListener("pointerup", (e) => {
                let draggedInventoryItem = this.player.playerInventory.draggedItem;
                if (draggedInventoryItem) {
                    if (draggedInventoryItem.playerAction) {
                        this.linkAction(slotIndex, draggedInventoryItem.playerAction);
                    }
                    this.player.playerInventory.draggedItem = undefined;
                }
            });

            let iconContainer = document.createElement("div");
            iconContainer.classList.add("icon-container");
            slot.appendChild(iconContainer);

            let index = document.createElement("div");
            index.classList.add("player-action-slot-index");
            index.textContent = i.toString();
            slot.appendChild(index);
        }

        for (let i = 1; i < this.slotCount; i++) {
            this.container.appendChild(this.actionSlotElements[i]);
        }
        this.container.appendChild(this.actionSlotElements[0]);
    }

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
        let iconContainer = this.actionSlotElements[slotIndex].querySelector<HTMLDivElement>(".icon-container")!;
        if (action && action.svgIcon) {
            iconContainer.innerHTML = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'>" + action.svgIcon + "</svg>";
            iconContainer.style.display = "block";
        }
        else if (action && action.canvasIcon) {
            iconContainer.innerHTML = "<img src='" + action.canvasIcon + "'/>";
            iconContainer.style.display = "block";
        }
        else {
            iconContainer.style.display = "none";
        }
    }
}