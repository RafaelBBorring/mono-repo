import { renderAuthScreen } from './auth/auth-screen.js';
import { renderDashboard } from './dashboard/dashboard.js';
import { renderWizard } from './character/wizard.js';
import { renderSheet } from './character/sheet.js';
import { renderEditor } from './character/editor.js';
import { renderSystemGuide } from './ui/system-guide.js';

export function resolveRoute(path) {
  if (path === '/') {
    return { render: renderAuthScreen, params: {}, path };
  }

  if (path === '/dashboard') {
    return { render: renderDashboard, params: {}, path };
  }

  if (path === '/character/new') {
    return { render: renderWizard, params: {}, path };
  }

  if (path === '/system') {
    return { render: renderSystemGuide, params: {}, path };
  }

  const editMatch = path.match(/^\/character\/(\d+)\/edit$/);
  if (editMatch) {
    return { render: renderEditor, params: { id: editMatch[1] }, path };
  }

  const sheetMatch = path.match(/^\/character\/(\d+)$/);
  if (sheetMatch) {
    return { render: renderSheet, params: { id: sheetMatch[1] }, path };
  }

  return { render: renderDashboard, params: {}, path: '/dashboard' };
}
