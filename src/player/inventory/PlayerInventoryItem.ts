import { Game } from "../../Game";
import { BlockType } from "../../voxel-engine/BlockType";
import { Player } from "../Player";
import { PlayerAction } from "../PlayerAction";
import { PlayerActionBlock } from "../PlayerActionBlock";
import { PlayerInventory } from "./PlayerInventory";

export class PlayerInventoryItem {
       
    public name: string = "inventory-item";
    public displayName: string = "Inventory Item";
    public count: number = 1;
    public svgIcon: string = "";
    public canvasIcon: string = "";
    public playerAction: PlayerAction | undefined = undefined;

    public get game(): Game {
        return this.player.game;
    }

    public get playerInventory(): PlayerInventory {
        return this.player.playerInventory;
    }

    public constructor(public player: Player) {
        this.svgIcon = `<path fill-rule="evenodd" d="M4.475 5.458c-.284 0-.514-.237-.47-.517C4.28 3.24 5.576 2 7.825 2c2.25 0 3.767 1.36 3.767 3.215 0 1.344-.665 2.288-1.79 2.973-1.1.659-1.414 1.118-1.414 2.01v.03a.5.5 0 0 1-.5.5h-.77a.5.5 0 0 1-.5-.495l-.003-.2c-.043-1.221.477-2.001 1.645-2.712 1.03-.632 1.397-1.135 1.397-2.028 0-.979-.758-1.698-1.926-1.698-1.009 0-1.71.529-1.938 1.402-.066.254-.278.461-.54.461h-.777ZM7.496 14c.622 0 1.095-.474 1.095-1.09 0-.618-.473-1.092-1.095-1.092-.606 0-1.087.474-1.087 1.091S6.89 14 7.496 14"/>`;
    }
}

export class PlayerInventoryItemFactory {

    private static async CreateBlock(blockType: BlockType, player: Player): Promise<PlayerInventoryItem> {
        let playerInventoryItem = new PlayerInventoryItem(player);
        playerInventoryItem.canvasIcon = await player.game.miniatureFactory.makeBlockIconString(blockType) ?? "";
        playerInventoryItem.svgIcon = "";
        playerInventoryItem.name = "block-" + BlockType[blockType];
            playerInventoryItem.displayName = BlockType[blockType];
        playerInventoryItem.playerAction = await PlayerActionBlock.Create(player, blockType);
        return playerInventoryItem;
    }

    public static async CreateItemByName(itemName: string, player: Player): Promise<PlayerInventoryItem> {
        if (itemName.startsWith("block-")) {
            let blockTypeName = itemName.substring("block-".length);
            let blockType = BlockType[blockTypeName as keyof typeof BlockType];
            return await PlayerInventoryItemFactory.CreateBlock(blockType, player);
        }
        return new PlayerInventoryItem(player);
    }
}