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
            let slot = document.createElement("div");
            slot.classList.add("player-action-slot");
            this.actionSlotElements.push(slot);

            let icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            icon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            icon.setAttribute("width", "100%");
            icon.setAttribute("height", "100%");
            icon.setAttribute("viewBox", "0 0 16 16");
            slot.appendChild(icon);

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
        let slot = this.actionSlotElements[slotIndex].querySelector("svg")!;
        slot.innerHTML = action.svgIcon;
    }
}