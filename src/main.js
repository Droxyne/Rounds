import '@fontsource/barlow-condensed/latin-800.css';
import '@fontsource/barlow-condensed/latin-700.css';
import './style.css';
import { Game } from './game.js';
const game = new Game(document.querySelector('#renderCanvas'));
game.init().catch(error => {
  console.error('BLACKLINE initialization failed:', error);
  game.ui.error('The renderer could not start: ' + (error.message || String(error)) + ' Try enabling WebGL or updating your browser.');
});
