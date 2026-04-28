import { Game } from './Game';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app root element')
}

const canvas = document.createElement('canvas')
canvas.id = 'render-canvas'
app.appendChild(canvas);

const game = new Game(canvas);
game.start();
