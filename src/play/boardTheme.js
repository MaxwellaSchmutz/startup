export const boardThemes = [
  { id: 'sage', label: 'Sage', light: '#ebe7d3', dark: '#7b9762' },
  { id: 'walnut', label: 'Walnut', light: '#efdcbc', dark: '#b0835a' },
  { id: 'slate', label: 'Slate', light: '#dfe4ea', dark: '#7c8fa6' },
];

const storageKey = 'boardTheme';

export function getBoardTheme() {
  try {
    const saved = localStorage.getItem(storageKey);
    return boardThemes.some((t) => t.id === saved) ? saved : 'sage';
  } catch {
    return 'sage';
  }
}

export function setBoardTheme(id) {
  document.documentElement.dataset.board = id;
  try {
    localStorage.setItem(storageKey, id);
  } catch {
    return;
  }
}

export function loadBoardTheme() {
  document.documentElement.dataset.board = getBoardTheme();
}
