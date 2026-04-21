import './styles/app.css';
import { createDefaultSystem } from './data/defaultSystem.js';
import { createEditor } from './ui/createEditor.js';

const root = document.getElementById('app');
const system = createDefaultSystem();

createEditor(root, system);
