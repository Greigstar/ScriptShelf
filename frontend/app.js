const storageKey = 'scriptshelf.tiles';
const panesStorageKey = 'scriptshelf.panes';
const bannerStorageKey = 'scriptshelf.banner';
const colorSchemeStorageKey = 'scriptshelf.colorScheme';
const topRowLocation = 'top-row';
const maxTopRowTiles = 5;
const paneBoard = document.getElementById('pane-board');
const addPaneButton = document.getElementById('add-pane-button');
const quickAccessGrid = document.getElementById('quick-access-grid');
const quickAccessCount = document.getElementById('quick-access-count');
const quickAccessAddButton = document.getElementById('add-quick-access-button');
const library = document.querySelector('.library');
const welcome = document.querySelector('.welcome');
const welcomeLabel = document.getElementById('welcome-label');
const welcomeTitle = document.getElementById('welcome-title');
const tileCount = document.getElementById('tile-count');
const emptyState = document.getElementById('empty-state');
const emptyTitle = document.getElementById('empty-title');
const emptyDescription = document.getElementById('empty-description');
const searchInput = document.getElementById('search-input');
const tileDialog = document.getElementById('tile-dialog');
const tileForm = document.getElementById('tile-form');
const dialogTitle = document.getElementById('dialog-title');
const saveTileButton = document.getElementById('save-tile-button');
const toast = document.getElementById('toast');
const appearanceButton = document.getElementById('appearance-button');
const appearancePanel = document.getElementById('appearance-panel');
const pageBackgroundColor = document.getElementById('page-background-color');
const tileBackgroundColor = document.getElementById('tile-background-color');
const tilePaneSelect = document.getElementById('tile-pane');
const sessionButton = document.getElementById('session-button');
const sessionPanel = document.getElementById('session-panel');
const sessionFileInput = document.getElementById('session-file-input');
const bannerDialog = document.getElementById('banner-dialog');
const bannerForm = document.getElementById('banner-form');
const iconChoices = Array.from(document.querySelectorAll('.icon-choice'));
const minPaneWidthShare = 0.25;
const minPaneCount = 1;
const maxPaneCount = 6;
const defaultPanes = [
  { id: 'pane-1', name: 'Pane 1', backgroundColor: '#f0f5f1', width: 1 },
  { id: 'pane-2', name: 'Pane 2', backgroundColor: '#f5f3ed', width: 1 },
  { id: 'pane-3', name: 'Pane 3', backgroundColor: '#eef2f6', width: 1 }
];
let panes = loadPanes();
let tiles = loadTiles();
let editingTileId = null;
let selectedIcon = '🐍';
let toastTimeout;
const defaultPageBackground = '#f5f7f5';
const colorSchemes = {
  sage: {
    name: 'Sage garden',
    pageBackground: '#f5f7f5',
    paneBackgrounds: ['#e8f1eb', '#f0f5f1', '#e4eee7'],
    tileBackgrounds: ['#ffffff', '#edf5ef', '#f3f7f3', '#e5f0e8']
  },
  ocean: {
    name: 'Coastal blue',
    pageBackground: '#f2f6f8',
    paneBackgrounds: ['#e5eff4', '#edf4f7', '#e1edf2'],
    tileBackgrounds: ['#ffffff', '#eaf3f7', '#f1f6f8', '#e3eff4']
  },
  warm: {
    name: 'Warm earth',
    pageBackground: '#f8f5f0',
    paneBackgrounds: ['#f2e9dd', '#f7f0e6', '#eee5d8'],
    tileBackgrounds: ['#fffdf9', '#f8efe2', '#faf4eb', '#f1e6d7']
  },
  lavender: {
    name: 'Soft lavender',
    pageBackground: '#f6f4f8',
    paneBackgrounds: ['#eee9f4', '#f3eff7', '#e9e4f0'],
    tileBackgrounds: ['#ffffff', '#f1edf7', '#f6f3fa', '#ebe6f3']
  }
};
let activeColorScheme = loadColorScheme();
const defaultBannerSettings = {
  label: 'PYTHON WORKSPACE',
  title: 'Your scripts,\nall in one place.',
  width: 100,
  height: 110,
  scale: 100
};
let bannerSettings = loadBannerSettings();

function normalizePanes(value) {
  if (!Array.isArray(value) || value.length < minPaneCount || value.length > maxPaneCount) {
    throw new Error(`A ScriptShelf layout must contain between ${minPaneCount} and ${maxPaneCount} panes.`);
  }

  const paneIds = new Set();
  const normalized = value.map((pane, index) => {
    if (
      !pane ||
      typeof pane.id !== 'string' ||
      !/^pane-[a-z\d-]+$/i.test(pane.id) ||
      paneIds.has(pane.id) ||
      typeof pane.name !== 'string' ||
      !pane.name.trim() ||
      pane.name.length > 30 ||
      !isHexColor(pane.backgroundColor) ||
      typeof pane.width !== 'number' ||
      !Number.isFinite(pane.width) ||
      pane.width <= 0
    ) {
      throw new Error(`Pane ${index + 1} in the layout is invalid.`);
    }
    paneIds.add(pane.id);
    return {
      id: pane.id,
      name: pane.name.trim(),
      backgroundColor: pane.backgroundColor,
      width: pane.width
    };
  });

  const largestWidth = Math.max(...normalized.map(pane => pane.width));
  const scaledWidths = normalized.map(pane => pane.width / largestWidth);
  const totalWidth = scaledWidths.reduce((total, width) => total + width, 0);
  const weights = scaledWidths.map(width => width / totalWidth);
  const minWidthShare = getMinimumPaneWidthShare(normalized.length);
  const widths = Array(normalized.length);
  let remainingWidth = 1;
  let activeIndexes = normalized.map((_, index) => index);

  while (activeIndexes.length > 0) {
    const activeWeight = activeIndexes.reduce((total, index) => total + weights[index], 0);
    const undersizedIndexes = activeIndexes.filter(index => weights[index] / activeWeight * remainingWidth < minWidthShare);
    if (undersizedIndexes.length === 0) {
      activeIndexes.forEach(index => { widths[index] = weights[index] / activeWeight * remainingWidth; });
      break;
    }
    undersizedIndexes.forEach(index => {
      widths[index] = minWidthShare;
      remainingWidth -= minWidthShare;
      activeIndexes = activeIndexes.filter(activeIndex => activeIndex !== index);
    });
  }

  return normalized.map((pane, index) => ({ ...pane, width: widths[index] }));
}

function getMinimumPaneWidthShare(paneCount) {
  return Math.min(minPaneWidthShare, 0.75 / paneCount);
}

function loadPanes() {
  try {
    const savedPanes = localStorage.getItem(panesStorageKey);
    return savedPanes ? normalizePanes(JSON.parse(savedPanes)) : normalizePanes(defaultPanes);
  } catch (error) {
    console.error('Could not load the saved pane layout.', error);
    window.setTimeout(() => showToast('Saved pane settings could not be loaded. Defaults are being used.'), 0);
    return normalizePanes(defaultPanes);
  }
}

function savePanes(nextPanes, shouldRender = true) {
  try {
    const normalizedPanes = normalizePanes(nextPanes);
    localStorage.setItem(panesStorageKey, JSON.stringify(normalizedPanes));
    panes = normalizedPanes;
    if (shouldRender) renderTiles();
    return true;
  } catch (error) {
    console.error('Could not save the pane layout.', error);
    showToast('Could not save pane settings. Check your browser storage settings and try again.');
    return false;
  }
}

function loadTiles() {
  try {
    const savedTiles = localStorage.getItem(storageKey);
    if (!savedTiles) return [];

    const parsedTiles = JSON.parse(savedTiles);
    if (!Array.isArray(parsedTiles)) throw new Error('Saved tiles are not a list.');

    const loadedTiles = parsedTiles.filter(tile => {
      if (
        !tile ||
        typeof tile.id !== 'string' ||
        typeof tile.name !== 'string' ||
        typeof tile.link !== 'string' ||
        typeof tile.description !== 'string' ||
        typeof tile.icon !== 'string' ||
        (tile.backgroundColor !== undefined && !isHexColor(tile.backgroundColor)) ||
        (tile.topRow !== undefined && typeof tile.topRow !== 'boolean')
      ) return false;

      try {
        makeScriptHref(tile.link);
        tile.paneId = panes.some(pane => pane.id === tile.paneId) ? tile.paneId : panes[0].id;
        tile.topRow = tile.topRow === true;
        return true;
      } catch (error) {
        console.warn('Skipped a saved tile with an invalid script link.', error);
        return false;
      }
    });
    const topRowIds = new Set(loadedTiles.filter(tile => tile.topRow).slice(0, maxTopRowTiles).map(tile => tile.id));
    if (loadedTiles.filter(tile => tile.topRow).length > maxTopRowTiles) {
      console.warn(`Only the first ${maxTopRowTiles} saved top-row tiles were kept in Quick Access.`);
      loadedTiles.forEach(tile => { tile.topRow = topRowIds.has(tile.id); });
    }
    return loadedTiles;
  } catch (error) {
    console.error('Could not load saved script tiles.', error);
    window.setTimeout(() => showToast('Saved tiles could not be loaded. You can still create new ones.'), 0);
    return [];
  }
}

function saveTiles(nextTiles) {
  if (nextTiles.filter(tile => tile.topRow === true).length > maxTopRowTiles) {
    showToast(`Quick Access can hold up to ${maxTopRowTiles} tiles.`);
    return false;
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(nextTiles));
    tiles = nextTiles;
    renderTiles();
    return true;
  } catch (error) {
    console.error('Could not save script tiles.', error);
    showToast('Could not save this tile. Check your browser storage settings and try again.');
    return false;
  }
}

function isHexColor(value) {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
}

function loadColorScheme() {
  try {
    const savedScheme = localStorage.getItem(colorSchemeStorageKey);
    if (savedScheme === null) return null;
    if (!Object.prototype.hasOwnProperty.call(colorSchemes, savedScheme)) {
      throw new Error('Saved color scheme is invalid.');
    }
    return savedScheme;
  } catch (error) {
    console.error('Could not load the saved global color scheme.', error);
    window.setTimeout(() => showToast('The saved global color scheme could not be loaded.'), 0);
    return null;
  }
}

function saveColorSchemeSelection(schemeId) {
  try {
    if (schemeId === null) {
      localStorage.removeItem(colorSchemeStorageKey);
    } else {
      if (!Object.prototype.hasOwnProperty.call(colorSchemes, schemeId)) {
        throw new Error('Choose a valid color scheme.');
      }
      localStorage.setItem(colorSchemeStorageKey, schemeId);
    }
    activeColorScheme = schemeId;
    document.getElementById('color-scheme-select').value = schemeId || '';
    return true;
  } catch (error) {
    console.error('Could not save the global color scheme.', error);
    document.getElementById('color-scheme-select').value = activeColorScheme || '';
    showToast(error instanceof Error && error.message === 'Choose a valid color scheme.'
      ? error.message
      : 'Could not save the global color scheme. Check your browser storage settings and try again.');
    return false;
  }
}

function applyColorScheme(schemeId) {
  const scheme = colorSchemes[schemeId];
  if (!scheme) {
    showToast('Choose a valid color scheme.');
    return false;
  }

  const previousPageBackground = pageBackgroundColor.value;
  const previousPanes = panes;
  const previousTiles = tiles;
  const nextPanes = panes.map((pane, index) => ({
    ...pane,
    backgroundColor: scheme.paneBackgrounds[index % scheme.paneBackgrounds.length]
  }));
  const nextTiles = tiles.map((tile, index) => ({
    ...tile,
    backgroundColor: scheme.tileBackgrounds[index % scheme.tileBackgrounds.length]
  }));

  if (!savePageBackground(scheme.pageBackground)) return false;
  if (!savePanes(nextPanes, false)) {
    savePageBackground(previousPageBackground);
    return false;
  }
  if (!saveTiles(nextTiles)) {
    savePanes(previousPanes, false);
    savePageBackground(previousPageBackground);
    return false;
  }
  if (!saveColorSchemeSelection(schemeId)) {
    saveTiles(previousTiles);
    savePanes(previousPanes, false);
    savePageBackground(previousPageBackground);
    return false;
  }

  showToast(`${scheme.name} colors applied to the portal, panes, and ${tiles.length} ${tiles.length === 1 ? 'tile' : 'tiles'}.`);
  return true;
}

function normalizeBannerSettings(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof value.label !== 'string' ||
    !value.label.trim() ||
    value.label.length > 50 ||
    typeof value.title !== 'string' ||
    !value.title.trim() ||
    value.title.length > 100 ||
    !Number.isInteger(value.width) ||
    value.width < 60 ||
    value.width > 100 ||
    !Number.isInteger(value.height) ||
    value.height < 90 ||
    value.height > 500 ||
    !Number.isInteger(value.scale) ||
    value.scale < 75 ||
    value.scale > 125
  ) {
    throw new Error('Banner text or size settings are invalid.');
  }

  return {
    label: value.label.trim(),
    title: value.title.trim(),
    width: value.width,
    height: value.height,
    scale: value.scale
  };
}

function loadBannerSettings() {
  try {
    const savedSettings = localStorage.getItem(bannerStorageKey);
    if (!savedSettings) return { ...defaultBannerSettings };
    const parsedSettings = JSON.parse(savedSettings);
    const normalizedSettings = normalizeBannerSettings(parsedSettings);
    if (JSON.stringify(parsedSettings) !== JSON.stringify(normalizedSettings)) {
      try {
        localStorage.setItem(bannerStorageKey, JSON.stringify(normalizedSettings));
      } catch (error) {
        console.error('Could not remove legacy banner settings from browser storage.', error);
        window.setTimeout(() => showToast('Banner settings loaded, but legacy banner data could not be removed from browser storage.'), 0);
      }
    }
    return normalizedSettings;
  } catch (error) {
    console.error('Could not load the saved banner settings.', error);
    window.setTimeout(() => showToast('Saved banner settings could not be loaded. Defaults are being used.'), 0);
    return { ...defaultBannerSettings };
  }
}

function applyBannerSettings(settings) {
  welcome.style.setProperty('--welcome-width', `${settings.width}%`);
  welcome.style.setProperty('--welcome-height', `${settings.height}px`);
  welcome.style.setProperty('--welcome-content-scale', String(settings.scale / 100));
  welcomeLabel.textContent = settings.label;
  welcomeTitle.replaceChildren();
  const titleLines = settings.title.split(/\r?\n/);
  welcomeTitle.appendChild(document.createTextNode(titleLines.shift()));
  const remainingTitle = titleLines.join(' ').trim();
  if (remainingTitle) {
    const lineBreak = document.createElement('br');
    const accent = document.createElement('span');
    accent.textContent = remainingTitle;
    welcomeTitle.append(lineBreak, accent);
  }
}

function saveBannerSettings(nextSettings) {
  try {
    const normalizedSettings = normalizeBannerSettings(nextSettings);
    localStorage.setItem(bannerStorageKey, JSON.stringify(normalizedSettings));
    bannerSettings = normalizedSettings;
    applyBannerSettings(bannerSettings);
    return true;
  } catch (error) {
    console.error('Could not save the banner settings.', error);
    showToast(error instanceof Error && error.message === 'Banner text or size settings are invalid.'
      ? error.message
      : 'Could not save the banner settings. Check your browser storage settings and try again.');
    return false;
  }
}

function readBannerForm() {
  return {
    label: document.getElementById('banner-label').value,
    title: document.getElementById('banner-title').value,
    width: Number(document.getElementById('banner-width').value),
    height: Number(document.getElementById('banner-height').value),
    scale: Number(document.getElementById('banner-scale').value)
  };
}

function updateBannerPreview() {
  const settings = readBannerForm();
  document.getElementById('banner-width-value').value = `${settings.width}%`;
  document.getElementById('banner-height-value').value = `${settings.height} px`;
  document.getElementById('banner-scale-value').value = `${settings.scale}%`;
  applyBannerSettings(settings);
}

function openBannerDialog() {
  document.getElementById('banner-label').value = bannerSettings.label;
  document.getElementById('banner-title').value = bannerSettings.title;
  document.getElementById('banner-width').value = String(bannerSettings.width);
  document.getElementById('banner-height').value = String(bannerSettings.height);
  document.getElementById('banner-scale').value = String(bannerSettings.scale);
  updateBannerPreview();
  bannerDialog.showModal();
}

function closeBannerDialog() {
  bannerDialog.close();
}

function loadPageBackground() {
  try {
    const savedColor = localStorage.getItem('scriptshelf.pageBackground');
    if (!savedColor) return defaultPageBackground;
    if (!isHexColor(savedColor)) throw new Error('Saved portal background is invalid.');
    return savedColor;
  } catch (error) {
    console.error('Could not load the saved portal background.', error);
    window.setTimeout(() => showToast('The saved portal background could not be loaded.'), 0);
    return defaultPageBackground;
  }
}

function applyPageBackground(color) {
  document.documentElement.style.setProperty('--canvas', color);
  const isDark = getColorLuminance(color) < 0.45;
  document.documentElement.style.setProperty('--canvas-ink', isDark ? '#f3f6f3' : '#182e28');
  document.documentElement.style.setProperty('--canvas-muted', isDark ? '#c3cec5' : '#9aa49d');
  document.documentElement.style.setProperty('--canvas-line', isDark ? 'rgba(255, 255, 255, .18)' : '#e8ede9');
  document.querySelector('meta[name="theme-color"]').content = color;
  pageBackgroundColor.value = color;
}

function getColorLuminance(color) {
  const channels = color.slice(1).match(/.{2}/g).map(channel => parseInt(channel, 16) / 255);
  const [red, green, blue] = channels.map(channel =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function savePageBackground(color) {
  if (!isHexColor(color)) {
    showToast('Choose a valid background color.');
    return false;
  }

  try {
    localStorage.setItem('scriptshelf.pageBackground', color);
    applyPageBackground(color);
    return true;
  } catch (error) {
    console.error('Could not save the portal background.', error);
    showToast('Could not save the portal background. Check your browser storage settings and try again.');
    return false;
  }
}

function exportSession() {
  const session = {
    version: 1,
    savedAt: new Date().toISOString(),
    pageBackground: pageBackgroundColor.value,
    colorScheme: activeColorScheme,
    banner: bannerSettings,
    panes,
    tiles
  };
  const file = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
  const downloadUrl = URL.createObjectURL(file);
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = `scriptshelf-session-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  showToast(`Session saved with ${tiles.length} ${tiles.length === 1 ? 'tile' : 'tiles'}.`);
}

function validateSession(session) {
  if (
    !session ||
    typeof session !== 'object' ||
    session.version !== 1 ||
    !Array.isArray(session.tiles) ||
    !isHexColor(session.pageBackground)
  ) {
    throw new Error('This file is not a valid ScriptShelf session backup.');
  }

  if (
    session.colorScheme !== undefined &&
    session.colorScheme !== null &&
    !Object.prototype.hasOwnProperty.call(colorSchemes, session.colorScheme)
  ) {
    throw new Error('This session contains an invalid global color scheme.');
  }

  const importedPanes = session.panes === undefined ? panes : normalizePanes(session.panes);
  const importedTiles = session.tiles.map((tile, index) => {
    if (
      !tile ||
      typeof tile !== 'object' ||
      typeof tile.id !== 'string' ||
      !tile.id.trim() ||
      typeof tile.name !== 'string' ||
      !tile.name.trim() ||
      tile.name.length > 60 ||
      typeof tile.link !== 'string' ||
      !tile.link.trim() ||
      tile.link.length > 2048 ||
      typeof tile.description !== 'string' ||
      tile.description.length > 180 ||
      typeof tile.icon !== 'string' ||
      !tile.icon.trim() ||
      tile.icon.length > 16 ||
      (tile.backgroundColor !== undefined && !isHexColor(tile.backgroundColor)) ||
      (tile.topRow !== undefined && typeof tile.topRow !== 'boolean') ||
      (tile.paneId !== undefined && !importedPanes.some(pane => pane.id === tile.paneId))
    ) {
      throw new Error(`Tile ${index + 1} in the session file is invalid.`);
    }

    return {
      id: tile.id,
      name: tile.name.trim(),
      link: makeScriptHref(tile.link),
      description: tile.description.trim(),
      icon: tile.icon,
      backgroundColor: tile.backgroundColor || '#ffffff',
      paneId: importedPanes.some(pane => pane.id === tile.paneId) ? tile.paneId : importedPanes[0].id,
      topRow: tile.topRow === true
    };
  });

  if (importedTiles.filter(tile => tile.topRow).length > maxTopRowTiles) {
    throw new Error(`A session can contain up to ${maxTopRowTiles} Quick Access tiles.`);
  }
  return {
    pageBackground: session.pageBackground,
    colorScheme: session.colorScheme === undefined ? activeColorScheme : session.colorScheme,
    hasColorScheme: session.colorScheme !== undefined,
    banner: session.banner === undefined ? bannerSettings : normalizeBannerSettings(session.banner),
    hasBanner: session.banner !== undefined,
    panes: importedPanes,
    tiles: importedTiles
  };
}

async function importSession(file) {
  let parsedSession;
  try {
    parsedSession = JSON.parse(await file.text());
  } catch (error) {
    console.error('Could not read the ScriptShelf session file.', error);
    showToast('Could not read that file. Choose a valid ScriptShelf JSON backup.');
    return;
  }

  let importedSession;
  try {
    importedSession = validateSession(parsedSession);
  } catch (error) {
    console.error('The ScriptShelf session file is invalid.', error);
    showToast(error.message);
    return;
  }

  const mergedTiles = new Map(tiles.map(tile => [
    tile.id,
    importedSession.panes.some(pane => pane.id === tile.paneId)
      ? tile
      : { ...tile, paneId: importedSession.panes[0].id }
  ]));
  importedSession.tiles.forEach(tile => mergedTiles.set(tile.id, tile));
  const previousPageBackground = pageBackgroundColor.value;
  const previousPanes = panes;
  const previousTiles = tiles;
  const previousColorScheme = activeColorScheme;
  if (!savePageBackground(importedSession.pageBackground)) return;
  if (!savePanes(importedSession.panes, false)) {
    savePageBackground(previousPageBackground);
    return;
  }
  if (!saveTiles(Array.from(mergedTiles.values()))) {
    savePanes(previousPanes, false);
    savePageBackground(previousPageBackground);
    return;
  }
  if (importedSession.hasColorScheme && !saveColorSchemeSelection(importedSession.colorScheme)) {
    saveTiles(previousTiles);
    savePanes(previousPanes, false);
    savePageBackground(previousPageBackground);
    return;
  }
  if (importedSession.hasBanner && !saveBannerSettings(importedSession.banner)) {
    saveTiles(previousTiles);
    savePanes(previousPanes, false);
    savePageBackground(previousPageBackground);
    if (importedSession.hasColorScheme) saveColorSchemeSelection(previousColorScheme);
    return;
  }

  showToast(`Session loaded. ${importedSession.tiles.length} ${importedSession.tiles.length === 1 ? 'tile' : 'tiles'} merged with your library.`);
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeScriptHref(link) {
  const value = link.trim();
  if (/^[a-z]:[\\/]/i.test(value)) {
    return makeVSCodeHref(value);
  }

  if (/^file:/i.test(value)) {
    let fileUrl;
    try {
      fileUrl = new URL(value);
    } catch (error) {
      throw new Error('Enter a valid web URL or script path.');
    }

    if (fileUrl.hostname || !/^\/[a-z]:\//i.test(fileUrl.pathname)) {
      throw new Error('Use a Windows drive path for local scripts.');
    }

    return makeVSCodeHref(decodeURIComponent(fileUrl.pathname.slice(1)));
  }

  if (/^\\\\/.test(value)) {
    throw new Error('Network paths are not supported. Use a web URL or a local Windows drive path.');
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^https?:|^vscode:/i.test(value)) {
    throw new Error('Use an HTTP, HTTPS, or Windows script path.');
  }

  return value;
}

function makeVSCodeHref(path) {
  const [drive, ...segments] = path.replace(/\\/g, '/').split('/');
  return `vscode://file/${drive}${segments.map(segment => `/${encodeURIComponent(segment)}`).join('')}`;
}

function applyPaneLayout() {
  const columns = [];
  panes.forEach((pane, index) => {
    columns.push(`minmax(180px, ${pane.width}fr)`);
    if (index < panes.length - 1) columns.push('10px');
  });
  paneBoard.style.gridTemplateColumns = columns.join(' ');
  const splitters = paneBoard.querySelectorAll('.pane-splitter');
  splitters.forEach((splitter, index) => {
    const pairWidth = panes[index].width + panes[index + 1].width;
    const minShare = Math.min(getMinimumPaneWidthShare(panes.length), pairWidth / 2);
    splitter.setAttribute('aria-valuemin', String(Math.round(minShare * 100)));
    splitter.setAttribute('aria-valuemax', String(Math.round((pairWidth - minShare) * 100)));
    splitter.setAttribute('aria-valuenow', String(Math.round(panes[index].width * 100)));
  });
  panes.forEach((pane, index) => {
    const paneElement = paneBoard.querySelector(`[data-pane-id="${pane.id}"]`);
    if (!paneElement) return;
    paneElement.style.setProperty('--pane-background', pane.backgroundColor);
    paneElement.style.setProperty('--pane-ink', getColorLuminance(pane.backgroundColor) < 0.45 ? '#f3f6f3' : '#293d33');
  });
  addPaneButton.disabled = panes.length >= maxPaneCount;
  addPaneButton.setAttribute('aria-label', panes.length >= maxPaneCount
    ? `Maximum of ${maxPaneCount} panes reached`
    : `Add pane (${panes.length} of ${maxPaneCount})`);
}

function updatePaneSettings(paneId, update) {
  const nextPanes = panes.map(pane => pane.id === paneId ? { ...pane, ...update } : pane);
  if (savePanes(nextPanes, false)) applyPaneLayout();
}

function addPane() {
  if (panes.length >= maxPaneCount) {
    showToast(`You can have up to ${maxPaneCount} panes.`);
    return;
  }

  const usedNames = new Set(panes.map(pane => pane.name));
  let paneNumber = 1;
  while (usedNames.has(`Pane ${paneNumber}`)) paneNumber += 1;
  const scheme = activeColorScheme ? colorSchemes[activeColorScheme] : null;
  const currentPaneCount = panes.length;
  const nextPanes = [
    ...panes.map(pane => ({ ...pane, width: pane.width * currentPaneCount / (currentPaneCount + 1) })),
    {
      id: `pane-${createId()}`,
      name: `Pane ${paneNumber}`,
      backgroundColor: scheme
        ? scheme.paneBackgrounds[currentPaneCount % scheme.paneBackgrounds.length]
        : '#f0f5f1',
      width: 1 / (currentPaneCount + 1)
    }
  ];

  if (savePanes(nextPanes)) showToast(`Pane ${paneNumber} added.`);
}

function removePane(paneId) {
  if (panes.length <= minPaneCount) {
    showToast(`Keep at least ${minPaneCount} pane.`);
    return;
  }

  const removedPaneIndex = panes.findIndex(pane => pane.id === paneId);
  if (removedPaneIndex < 0) return;

  const removedPane = panes[removedPaneIndex];
  const shouldRemove = window.confirm(
    `Are you sure you want to remove "${removedPane.name}"? Its items will move to the adjacent pane.`
  );
  if (!shouldRemove) return;

  const targetPane = panes[removedPaneIndex + 1] || panes[removedPaneIndex - 1];
  const previousPanes = panes;
  const nextPanes = panes
    .filter(pane => pane.id !== paneId)
    .map(pane => ({ ...pane, width: pane.width / (1 - removedPane.width) }));
  const nextTiles = tiles.map(tile => tile.paneId === paneId ? { ...tile, paneId: targetPane.id } : tile);

  if (!savePanes(nextPanes, false)) return;
  if (!saveTiles(nextTiles)) {
    savePanes(previousPanes);
    return;
  }
  showToast(`Pane removed. Its items were moved to ${targetPane.name}.`);
}

function createPane(pane, paneTiles, query) {
  const section = document.createElement('section');
  section.className = 'script-pane';
  section.dataset.paneId = pane.id;
  section.setAttribute('aria-label', pane.name);
  section.style.setProperty('--pane-background', pane.backgroundColor);
  section.style.setProperty('--pane-ink', getColorLuminance(pane.backgroundColor) < 0.45 ? '#f3f6f3' : '#293d33');

  const header = document.createElement('div');
  header.className = 'pane-header';

  const name = document.createElement('input');
  name.className = 'pane-name-input';
  name.type = 'text';
  name.value = pane.name;
  name.maxLength = 30;
  name.setAttribute('aria-label', `Pane ${panes.indexOf(pane) + 1} name`);
  name.addEventListener('change', () => {
    const nextName = name.value.trim();
    if (!nextName) {
      name.value = pane.name;
      showToast('Pane names cannot be empty.');
      return;
    }
    updatePaneSettings(pane.id, { name: nextName });
    section.setAttribute('aria-label', nextName);
  });

  const color = document.createElement('input');
  color.className = 'pane-color-input';
  color.type = 'color';
  color.value = pane.backgroundColor;
  color.setAttribute('aria-label', `${pane.name} background color`);
  color.addEventListener('input', () => {
    const ink = getColorLuminance(color.value) < 0.45 ? '#f3f6f3' : '#293d33';
    section.style.setProperty('--pane-background', color.value);
    section.style.setProperty('--pane-ink', ink);
    updatePaneSettings(pane.id, { backgroundColor: color.value });
  });

  const addButton = document.createElement('button');
  addButton.className = 'pane-add-button';
  addButton.type = 'button';
  addButton.textContent = '+';
  addButton.setAttribute('aria-label', `Add an item to ${pane.name}`);
  addButton.addEventListener('click', () => openTileDialog(null, pane.id));

  const removeButton = document.createElement('button');
  removeButton.className = 'pane-remove-button';
  removeButton.type = 'button';
  removeButton.textContent = '×';
  removeButton.disabled = panes.length <= minPaneCount;
  removeButton.setAttribute('aria-label', `Remove ${pane.name}`);
  removeButton.addEventListener('click', () => removePane(pane.id));
  header.append(name, color, addButton, removeButton);

  const grid = document.createElement('div');
  grid.className = 'pane-tile-grid';
  const matchingTiles = paneTiles.filter(tile =>
    !tile.topRow && `${tile.name} ${tile.description}`.toLowerCase().includes(query)
  );
  matchingTiles.forEach(tile => grid.appendChild(createTileCard(tile)));
  section.append(header, grid);
  if (matchingTiles.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'pane-empty';
    hint.textContent = query ? 'No matching scripts.' : 'Add an item to this pane.';
    section.appendChild(hint);
  }
  return section;
}

function createPaneSplitter(index) {
  const splitter = document.createElement('div');
  splitter.className = 'pane-splitter';
  splitter.role = 'separator';
  splitter.tabIndex = 0;
  splitter.setAttribute('aria-orientation', 'vertical');
  splitter.setAttribute('aria-label', `Resize ${panes[index].name} and ${panes[index + 1].name}`);
  splitter.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    splitter.setPointerCapture(event.pointerId);
    splitter.dataset.startX = String(event.clientX);
    splitter.dataset.startLeftWidth = String(panes[index].width);
    splitter.dataset.pairWidth = String(panes[index].width + panes[index + 1].width);
  });
  splitter.addEventListener('pointermove', event => {
    if (!splitter.hasPointerCapture(event.pointerId) || splitter.dataset.startX === undefined) return;
    const usableWidth = paneBoard.scrollWidth - (panes.length - 1) * 10;
    const pairWidth = Number(splitter.dataset.pairWidth);
    const minShare = Math.min(getMinimumPaneWidthShare(panes.length), pairWidth / 2);
    const startWidth = Number(splitter.dataset.startLeftWidth);
    const change = (event.clientX - Number(splitter.dataset.startX)) / usableWidth;
    const leftWidth = Math.max(minShare, Math.min(pairWidth - minShare, startWidth + change));
    panes[index].width = leftWidth;
    panes[index + 1].width = pairWidth - leftWidth;
    applyPaneLayout();
  });
  splitter.addEventListener('pointerup', event => {
    if (!splitter.hasPointerCapture(event.pointerId)) return;
    splitter.releasePointerCapture(event.pointerId);
    delete splitter.dataset.startX;
    savePanes(panes);
  });
  splitter.addEventListener('pointercancel', event => {
    if (!splitter.hasPointerCapture(event.pointerId)) return;
    splitter.releasePointerCapture(event.pointerId);
    delete splitter.dataset.startX;
    savePanes(panes);
  });
  splitter.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const pairWidth = panes[index].width + panes[index + 1].width;
    const change = event.key === 'ArrowRight' ? 0.02 : -0.02;
    const minShare = Math.min(getMinimumPaneWidthShare(panes.length), pairWidth / 2);
    const leftWidth = Math.max(minShare, Math.min(pairWidth - minShare, panes[index].width + change));
    const nextPanes = panes.map((pane, paneIndex) => {
      if (paneIndex === index) return { ...pane, width: leftWidth };
      if (paneIndex === index + 1) return { ...pane, width: pairWidth - leftWidth };
      return pane;
    });
    savePanes(nextPanes);
  });
  return splitter;
}

function renderTiles() {
  const query = searchInput.value.trim().toLowerCase();
  tileCount.textContent = String(tiles.length);
  renderQuickAccess(query);
  paneBoard.replaceChildren();
  paneBoard.hidden = false;
  emptyState.hidden = tiles.length > 0;
  if (tiles.length === 0) {
    emptyTitle.textContent = 'A fresh start.';
    emptyDescription.textContent = 'Your favorite scripts deserve a place of their own. Add your first item to get started.';
    document.getElementById('empty-add-button').hidden = false;
  }

  panes.forEach((pane, index) => {
    paneBoard.appendChild(createPane(pane, tiles.filter(tile => tile.paneId === pane.id), query));
    if (index < panes.length - 1) paneBoard.appendChild(createPaneSplitter(index));
  });
  applyPaneLayout();
}

function renderQuickAccess(query) {
  const topTiles = tiles.filter(tile =>
    tile.topRow && `${tile.name} ${tile.description}`.toLowerCase().includes(query)
  );
  quickAccessGrid.replaceChildren();
  quickAccessCount.textContent = `${tiles.filter(tile => tile.topRow).length}/${maxTopRowTiles}`;
  quickAccessAddButton.disabled = tiles.filter(tile => tile.topRow).length >= maxTopRowTiles;

  for (let index = 0; index < maxTopRowTiles; index += 1) {
    const tile = topTiles[index];
    if (tile) {
      quickAccessGrid.appendChild(createTileCard(tile, true));
      continue;
    }

    const slot = document.createElement('button');
    slot.className = 'quick-access-slot';
    slot.type = 'button';
    slot.disabled = tiles.filter(item => item.topRow).length >= maxTopRowTiles;
    slot.setAttribute('aria-label', `Add Quick Access tile ${index + 1} of ${maxTopRowTiles}`);
    const plus = document.createElement('span');
    plus.setAttribute('aria-hidden', 'true');
    plus.textContent = '+';
    const label = document.createElement('span');
    label.textContent = 'Add a tile';
    slot.append(plus, label);
    slot.addEventListener('click', () => openTileDialog(null, panes[0].id, true));
    quickAccessGrid.appendChild(slot);
  }
}

function createTileCard(tile, isQuickAccessTile = false) {
  const card = document.createElement('article');
  card.className = `script-card${isQuickAccessTile ? ' quick-access-card' : ''}`;
  card.draggable = true;
  card.dataset.tileId = tile.id;
  card.title = 'Drag this item to move it between panes or change its order.';
  if (isHexColor(tile.backgroundColor)) {
    card.style.setProperty('--tile-background', tile.backgroundColor);
    const isDark = getColorLuminance(tile.backgroundColor) < 0.45;
    card.style.setProperty('--tile-ink', isDark ? '#f3f6f3' : '#293d33');
    card.style.setProperty('--tile-muted', isDark ? '#d0d9d1' : '#829087');
    card.style.setProperty('--tile-border', isDark ? 'rgba(255, 255, 255, .2)' : '#e8ede9');
    card.style.setProperty('--tile-divider', isDark ? 'rgba(255, 255, 255, .18)' : '#eff2ef');
    card.style.setProperty('--tile-icon-bg', isDark ? 'rgba(255, 255, 255, .12)' : '#f7faf7');
    card.style.setProperty('--tile-link', isDark ? '#c7f0d0' : '#4f8060');
  }

  const cardTop = document.createElement('div');
  cardTop.className = 'card-top';

  const icon = document.createElement('span');
  icon.className = 'card-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = tile.icon;

  const actions = document.createElement('div');
  actions.className = 'card-actions';
  actions.appendChild(createPaneColorMenu(tile));
  actions.append(
    createActionButton('Move up', () => moveTileWithinPane(tile, -1)),
    createActionButton('Move down', () => moveTileWithinPane(tile, 1)),
    createActionButton('Edit', () => openTileDialog(tile)),
    createActionButton('Remove', () => removeTile(tile))
  );
  cardTop.append(icon, actions);

  const name = document.createElement('h3');
  name.className = 'card-title';
  name.textContent = tile.name;

  const description = document.createElement('p');
  description.className = 'card-description';
  description.textContent = tile.description || 'A handy script in your library.';

  const divider = document.createElement('div');
  divider.className = 'card-divider';

  const link = document.createElement('a');
  link.className = 'card-link';
  link.href = makeScriptHref(tile.link);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  const opensInEditor = link.href.startsWith('vscode:');
  link.textContent = opensInEditor ? 'Open in VS Code' : 'Open link';
  link.setAttribute('aria-label', `${opensInEditor ? 'Open in VS Code' : 'Open link'}: ${tile.name}`);
  link.appendChild(createArrowIcon());

  card.append(cardTop, name, description, divider, link);
  return card;
}

function createPaneColorMenu(tile) {
  const colorSelect = document.createElement('select');
  colorSelect.className = 'card-action card-color-trigger';
  colorSelect.title = 'Copy colors from another tile';
  colorSelect.setAttribute('aria-label', `Copy colors from another tile for ${tile.name}`);
  colorSelect.disabled = tiles.length < 2;

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '◉';
  placeholder.selected = true;
  placeholder.disabled = true;
  colorSelect.appendChild(placeholder);

  tiles.filter(sourceTile => sourceTile.id !== tile.id).forEach(sourceTile => {
    const option = document.createElement('option');
    option.value = sourceTile.id;
    option.textContent = sourceTile.name;
    colorSelect.appendChild(option);
  });

  colorSelect.addEventListener('change', () => {
    const currentSourceTile = tiles.find(item => item.id === colorSelect.value);
    if (!currentSourceTile) return;
    const nextTiles = tiles.map(item => item.id === tile.id
      ? { ...item, backgroundColor: currentSourceTile.backgroundColor || '#ffffff' }
      : item
    );
    if (saveTiles(nextTiles)) showToast(`Colors copied from ${currentSourceTile.name}.`);
  });

  return colorSelect;
}

function createActionButton(label, onClick) {
  const button = document.createElement('button');
  const symbols = { 'Move up': '↑', 'Move down': '↓', Edit: '✎', Remove: '×' };
  button.className = `card-action card-action-${label.toLowerCase().replace(/ /g, '-')}`;
  button.type = 'button';
  button.dataset.icon = symbols[label];
  button.title = label;
  button.setAttribute('aria-label', `${label} tile`);
  button.addEventListener('click', onClick);
  return button;
}

function moveTileWithinPane(tile, direction) {
  const siblingTiles = tiles.filter(item => tile.topRow
    ? item.topRow
    : !item.topRow && item.paneId === tile.paneId
  );
  const tileIndex = siblingTiles.findIndex(item => item.id === tile.id);
  const targetTile = siblingTiles[tileIndex + direction];
  if (!targetTile) return;

  const nextTiles = [...tiles];
  const sourceIndex = nextTiles.findIndex(item => item.id === tile.id);
  const targetIndex = nextTiles.findIndex(item => item.id === targetTile.id);
  [nextTiles[sourceIndex], nextTiles[targetIndex]] = [nextTiles[targetIndex], nextTiles[sourceIndex]];
  if (saveTiles(nextTiles)) showToast(`"${tile.name}" moved ${direction < 0 ? 'up' : 'down'}.`);
}

function moveTileToDropPosition(tileId, destinationId, targetTileId, insertAfter) {
  const movingTile = tiles.find(tile => tile.id === tileId);
  const isQuickAccess = destinationId === topRowLocation;
  if (!movingTile || (!isQuickAccess && !panes.some(pane => pane.id === destinationId)) || tileId === targetTileId) return;

  if (isQuickAccess && !movingTile.topRow && tiles.filter(tile => tile.topRow).length >= maxTopRowTiles) {
    showToast(`Quick Access can hold up to ${maxTopRowTiles} tiles.`);
    return;
  }

  const nextTiles = tiles.filter(tile => tile.id !== tileId);
  const destinationPane = isQuickAccess ? null : panes.find(pane => pane.id === destinationId);
  const movedTile = {
    ...movingTile,
    paneId: destinationPane ? destinationPane.id : movingTile.paneId,
    topRow: isQuickAccess
  };
  const isInDestination = tile => isQuickAccess
    ? tile.topRow
    : !tile.topRow && tile.paneId === destinationId;
  const targetIndex = targetTileId
    ? nextTiles.findIndex(tile => tile.id === targetTileId && isInDestination(tile))
    : -1;
  const lastPaneIndex = nextTiles.reduce(
    (lastIndex, tile, index) => isInDestination(tile) ? index : lastIndex,
    -1
  );
  const insertionIndex = targetIndex >= 0
    ? targetIndex + Number(insertAfter)
    : lastPaneIndex + 1;

  nextTiles.splice(insertionIndex, 0, movedTile);
  if (saveTiles(nextTiles)) {
    if (movingTile.topRow === isQuickAccess && (!destinationPane || movingTile.paneId === destinationPane.id)) {
      showToast(`"${movingTile.name}" reordered.`);
    } else {
      showToast(isQuickAccess
        ? `"${movingTile.name}" moved to Quick Access.`
        : `"${movingTile.name}" moved to ${destinationPane.name}.`);
    }
  }
}

function createArrowIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M4 10h11m-5-5 5 5-5 5');
  svg.appendChild(path);
  return svg;
}

function openTileDialog(tile = null, paneId = panes[0].id, topRow = false) {
  editingTileId = tile ? tile.id : null;
  tileForm.reset();
  selectedIcon = tile ? tile.icon : '🐍';
  updateSelectedIcon();
  tilePaneSelect.replaceChildren();
  panes.forEach(pane => {
    const option = document.createElement('option');
    option.value = pane.id;
    option.textContent = pane.name;
    tilePaneSelect.appendChild(option);
  });
  const quickAccessOption = document.createElement('option');
  quickAccessOption.value = topRowLocation;
  quickAccessOption.textContent = 'Quick Access (top row)';
  quickAccessOption.disabled = tiles.filter(item => item.topRow && item.id !== editingTileId).length >= maxTopRowTiles;
  tilePaneSelect.appendChild(quickAccessOption);

  if (tile) {
    dialogTitle.textContent = 'Edit script';
    saveTileButton.textContent = 'Save changes';
    tileForm.elements.name.value = tile.name;
    tileForm.elements.link.value = tile.link;
    tileForm.elements.description.value = tile.description;
    tileBackgroundColor.value = isHexColor(tile.backgroundColor) ? tile.backgroundColor : '#ffffff';
    tilePaneSelect.value = tile.topRow
      ? topRowLocation
      : panes.some(pane => pane.id === tile.paneId) ? tile.paneId : panes[0].id;
  } else {
    dialogTitle.textContent = 'Add an item';
    saveTileButton.textContent = 'Save tile';
    tileBackgroundColor.value = activeColorScheme ? colorSchemes[activeColorScheme].tileBackgrounds[0] : '#ffffff';
    tilePaneSelect.value = topRow
      ? topRowLocation
      : panes.some(pane => pane.id === paneId) ? paneId : panes[0].id;
  }

  tileDialog.showModal();
  tileForm.elements.name.focus();
}

function closeTileDialog() {
  tileDialog.close();
  tileForm.reset();
  editingTileId = null;
  selectedIcon = '🐍';
  updateSelectedIcon();
}

function updateSelectedIcon() {
  iconChoices.forEach(button => {
    const isSelected = button.dataset.icon === selectedIcon;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });
}

function removeTile(tile) {
  const shouldRemove = window.confirm(`Remove "${tile.name}" from your library?`);
  if (!shouldRemove) return;

  const nextTiles = tiles.filter(item => item.id !== tile.id);
  if (saveTiles(nextTiles)) showToast('Tile removed from your library.');
}

function showToast(message) {
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimeout = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

document.getElementById('add-tile-button').addEventListener('click', () => openTileDialog());
document.getElementById('empty-add-button').addEventListener('click', () => openTileDialog());
quickAccessAddButton.addEventListener('click', () => openTileDialog(null, panes[0].id, true));
addPaneButton.addEventListener('click', addPane);
document.getElementById('close-dialog-button').addEventListener('click', closeTileDialog);
document.getElementById('cancel-dialog-button').addEventListener('click', closeTileDialog);
searchInput.addEventListener('input', renderTiles);
document.getElementById('edit-banner-button').addEventListener('click', openBannerDialog);
document.getElementById('close-banner-dialog-button').addEventListener('click', closeBannerDialog);
document.getElementById('cancel-banner-button').addEventListener('click', closeBannerDialog);
document.getElementById('reset-banner-button').addEventListener('click', () => {
  document.getElementById('banner-label').value = defaultBannerSettings.label;
  document.getElementById('banner-title').value = defaultBannerSettings.title;
  document.getElementById('banner-width').value = String(defaultBannerSettings.width);
  document.getElementById('banner-height').value = String(defaultBannerSettings.height);
  document.getElementById('banner-scale').value = String(defaultBannerSettings.scale);
  updateBannerPreview();
});
bannerForm.addEventListener('input', updateBannerPreview);
bannerForm.addEventListener('submit', event => {
  event.preventDefault();
  const nextSettings = readBannerForm();
  if (saveBannerSettings(nextSettings)) {
    bannerDialog.close();
    showToast('Banner settings saved.');
  }
});
bannerDialog.addEventListener('close', () => {
  applyBannerSettings(bannerSettings);
});
bannerDialog.addEventListener('click', event => {
  if (event.target === bannerDialog) closeBannerDialog();
});

let draggingTileId = null;
library.addEventListener('dragstart', event => {
  const card = event.target.closest('.script-card');
  if (!card || event.target.closest('a, button, input')) {
    event.preventDefault();
    return;
  }
  draggingTileId = card.dataset.tileId;
  card.classList.add('is-dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', draggingTileId);
});

library.addEventListener('dragover', event => {
  const pane = event.target.closest('.script-pane');
  const quickAccess = event.target.closest('#quick-access-grid');
  if (!draggingTileId || (!pane && !quickAccess)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  library.querySelectorAll('.script-pane, .quick-access-grid, .script-card').forEach(element => {
    element.classList.remove('is-drop-target', 'drop-before', 'drop-after');
  });
  const targetCard = event.target.closest('.script-card');
  if (targetCard && targetCard.dataset.tileId !== draggingTileId) {
    const insertAfter = event.clientY > targetCard.getBoundingClientRect().top + targetCard.offsetHeight / 2;
    targetCard.classList.add(insertAfter ? 'drop-after' : 'drop-before');
  } else {
    (pane || quickAccess).classList.add('is-drop-target');
  }
});

library.addEventListener('drop', event => {
  const pane = event.target.closest('.script-pane');
  const quickAccess = event.target.closest('#quick-access-grid');
  if (!draggingTileId || (!pane && !quickAccess)) return;
  event.preventDefault();
  const targetCard = event.target.closest('.script-card');
  const insertAfter = targetCard
    ? event.clientY > targetCard.getBoundingClientRect().top + targetCard.offsetHeight / 2
    : false;
  moveTileToDropPosition(
    draggingTileId,
    quickAccess ? topRowLocation : pane.dataset.paneId,
    targetCard && targetCard.dataset.tileId,
    insertAfter
  );
  draggingTileId = null;
});

library.addEventListener('dragend', () => {
  draggingTileId = null;
  library.querySelectorAll('.script-pane, .quick-access-grid, .script-card').forEach(element => {
    element.classList.remove('is-dragging', 'is-drop-target', 'drop-before', 'drop-after');
  });
});

iconChoices.forEach(button => {
  button.addEventListener('click', () => {
    selectedIcon = button.dataset.icon;
    updateSelectedIcon();
  });
});

tileForm.addEventListener('submit', event => {
  event.preventDefault();

  const formData = new FormData(tileForm);
  const name = String(formData.get('name') || '').trim();
  const link = String(formData.get('link') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const backgroundColor = String(formData.get('backgroundColor') || '#ffffff');
  const destination = String(formData.get('paneId') || '');
  const topRow = destination === topRowLocation;
  const existingTile = tiles.find(tile => tile.id === editingTileId);
  const paneId = topRow
    ? (existingTile?.paneId || panes[0].id)
    : destination;

  if (!name || !link) return;
  if (topRow && tiles.filter(tile => tile.topRow && tile.id !== editingTileId).length >= maxTopRowTiles) {
    showToast(`Quick Access can hold up to ${maxTopRowTiles} tiles.`);
    return;
  }
  if (!isHexColor(backgroundColor) || !panes.some(pane => pane.id === paneId)) {
    showToast('Choose a valid tile color and pane.');
    return;
  }

  let safeLink;
  try {
    safeLink = makeScriptHref(link);
  } catch (error) {
    showToast(error.message);
    tileForm.elements.link.focus();
    return;
  }

  const tile = {
    id: editingTileId || createId(),
    name,
    link: safeLink,
    description,
    icon: selectedIcon,
    backgroundColor,
    paneId,
    topRow
  };
  const nextTiles = existingTile
    ? tiles.map(item => item.id === editingTileId ? tile : item)
    : [tile, ...tiles];

  if (saveTiles(nextTiles)) {
    closeTileDialog();
    showToast(existingTile ? 'Tile updated.' : 'Tile added to your library.');
  }
});

tileDialog.addEventListener('click', event => {
  if (event.target === tileDialog) closeTileDialog();
});

function setAppearancePanelOpen(isOpen) {
  appearancePanel.hidden = !isOpen;
  appearanceButton.setAttribute('aria-expanded', String(isOpen));
}

appearanceButton.addEventListener('click', () => {
  setSessionPanelOpen(false);
  setAppearancePanelOpen(appearancePanel.hidden);
});
document.getElementById('close-appearance-button').addEventListener('click', () => setAppearancePanelOpen(false));
document.getElementById('reset-background-color').addEventListener('click', () => savePageBackground(defaultPageBackground));
pageBackgroundColor.addEventListener('input', () => savePageBackground(pageBackgroundColor.value));
document.getElementById('apply-color-scheme').addEventListener('click', () => {
  const schemeSelect = document.getElementById('color-scheme-select');
  if (!schemeSelect.value) {
    showToast('Choose a color scheme to apply.');
    return;
  }
  if (applyColorScheme(schemeSelect.value)) {
    setAppearancePanelOpen(false);
  } else {
    schemeSelect.value = activeColorScheme || '';
  }
});

function setSessionPanelOpen(isOpen) {
  sessionPanel.hidden = !isOpen;
  sessionButton.setAttribute('aria-expanded', String(isOpen));
}

sessionButton.addEventListener('click', () => {
  setAppearancePanelOpen(false);
  setSessionPanelOpen(sessionPanel.hidden);
});
document.getElementById('close-session-button').addEventListener('click', () => setSessionPanelOpen(false));
document.getElementById('export-session-button').addEventListener('click', () => {
  exportSession();
  setSessionPanelOpen(false);
});
document.getElementById('import-session-button').addEventListener('click', () => sessionFileInput.click());
sessionFileInput.addEventListener('change', async () => {
  const [file] = sessionFileInput.files;
  if (file) await importSession(file);
  sessionFileInput.value = '';
  setSessionPanelOpen(false);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !tileDialog.open) {
    if (!appearancePanel.hidden) {
      setAppearancePanelOpen(false);
      appearanceButton.focus();
      return;
    }
    if (!sessionPanel.hidden) {
      setSessionPanelOpen(false);
      sessionButton.focus();
      return;
    }
  }

  if (event.key === '/' && !tileDialog.open && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
});

document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest('.appearance-menu')) setAppearancePanelOpen(false);
  if (!event.target.closest('.session-menu')) setSessionPanelOpen(false);
});

applyPageBackground(loadPageBackground());
document.getElementById('color-scheme-select').value = activeColorScheme || '';
applyBannerSettings(bannerSettings);
renderTiles();
