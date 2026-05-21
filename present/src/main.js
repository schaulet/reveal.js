const { app, BrowserWindow, globalShortcut, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const pptxConverter = require('./pptx-converter');

// Current window reference
let currentWindow = null;

// Determine reveal.js path - works both in dev and packaged mode
function getRevealJsPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bundle');
  }
  return path.join(__dirname, 'bundle');
}

function getTemplatePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bundle', 'templates');
  }
  return path.join(__dirname, 'bundle', 'templates');
}

// Create application menu
function createMenu() {
  const isMac = process.platform === 'darwin';
  
  const template = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    // File menu
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Nouveau',
          accelerator: 'CmdOrCtrl+N',
          click: () => newPresentation()
        },
        {
          label: 'Ouvrir...',
          accelerator: 'CmdOrCtrl+O',
          click: () => openFile()
        },
        {
          label: 'Ouvrir Recent...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => openRecentFile()
        },
        { type: 'separator' },
        {
          label: 'Importer PowerPoint (.pptx)...',
          click: () => importPPTX()
        },
        { type: 'separator' },
        {
          label: 'Enregistrer',
          accelerator: 'CmdOrCtrl+S',
          click: () => savePresentation()
        },
        {
          label: 'Enregistrer sous...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => savePresentationAs()
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    // Edit menu
    {
      label: 'Édition',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    // Presentation menu
    {
      label: 'Présentation',
      submenu: [
        {
          label: 'Lancer le diaporama',
          accelerator: 'F5',
          click: () => launchPresentation()
        },
        {
          label: 'Plein écran',
          accelerator: 'F11',
          click: () => toggleFullscreen()
        },
        { type: 'separator' },
        {
          label: 'Première diapositive',
          accelerator: 'Home',
          click: () => navigateSlide('first')
        },
        {
          label: 'Dernière diapositive',
          accelerator: 'End',
          click: () => navigateSlide('last')
        },
        { type: 'separator' },
        {
          label: 'Diapositive précédente',
          accelerator: 'Left',
          click: () => navigateSlide('prev')
        },
        {
          label: 'Diapositive suivante',
          accelerator: 'Right',
          click: () => navigateSlide('next')
        }
      ]
    },
    // View menu
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    // Window menu
    {
      label: 'Fenêtre',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    // Help menu
    {
      label: 'Aide',
      submenu: [
        {
          label: 'À propos de Reveal Presenter',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'À propos',
              message: 'Reveal Presenter',
              detail: 'Visionneuse de présentations reveal.js\nVersion 0.1.0'
            });
          }
        }
      ]
    }
  ];

  return Menu.buildFromTemplate(template);
}

// Menu actions
async function newPresentation() {
  const templatePath = path.join(getTemplatePath(), 'blank.md');
  if (fs.existsSync(templatePath)) {
    const content = fs.readFileSync(templatePath, 'utf-8');
    currentWindow?.webContents.send('load-markdown', content);
  }
}

async function openFile() {
  const result = await dialog.showOpenDialog(currentWindow, {
    title: 'Ouvrir une présentation',
    filters: [
      { name: 'Présentations', extensions: ['html', 'md', 'markdown'] },
      { name: 'Tous les fichiers', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    loadPresentation(result.filePaths[0]);
  }
}

async function openRecentFile() {
  // For now, same as open file
  openFile();
}

async function importPPTX() {
  const result = await dialog.showOpenDialog(currentWindow, {
    title: 'Importer un fichier PowerPoint',
    filters: [
      { name: 'PowerPoint', extensions: ['pptx'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const pptxPath = result.filePaths[0];
    
    try {
      // Show progress
      currentWindow?.webContents.send('import-progress', 'Conversion en cours...');
      
      // Convert PPTX to reveal.js markdown
      const markdown = await pptxConverter.convertPPTX(pptxPath);
      
      // Send converted markdown to renderer
      currentWindow?.webContents.send('load-markdown', markdown);
      
      dialog.showMessageBox(currentWindow, {
        type: 'info',
        title: 'Importation réussie',
        message: 'Le fichier PowerPoint a été converti avec succès.'
      });
    } catch (err) {
      console.error('PPTX conversion error:', err);
      dialog.showMessageBox(currentWindow, {
        type: 'error',
        title: 'Erreur de conversion',
        message: 'Impossible de convertir le fichier PowerPoint.',
        detail: err.message
      });
    }
  }
}

async function savePresentation() {
  // Request markdown from renderer
  currentWindow?.webContents.send('request-save');
}

async function savePresentationAs() {
  const result = await dialog.showSaveDialog(currentWindow, {
    title: 'Enregistrer la présentation',
    defaultPath: 'presentation.html',
    filters: [
      { name: 'HTML', extensions: ['html'] },
      { name: 'Markdown', extensions: ['md'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    currentWindow?.webContents.send('save-as', result.filePath);
  }
}

function launchPresentation() {
  currentWindow?.webContents.send('launch-presentation');
}

function toggleFullscreen() {
  if (currentWindow) {
    currentWindow.setFullScreen(!currentWindow.isFullScreen());
  }
}

function navigateSlide(direction) {
  currentWindow?.webContents.send('navigate-slide', direction);
}

function loadPresentation(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.md' || ext === '.markdown') {
    const content = fs.readFileSync(filePath, 'utf-8');
    currentWindow?.webContents.send('load-markdown', content);
  } else {
    currentWindow?.loadFile(filePath);
  }
}

// IPC handlers for renderer communication
ipcMain.handle('get-resource-path', () => {
  return getRevealJsPath();
});

ipcMain.handle('save-file', async (event, { filePath, content }) => {
  fs.writeFileSync(filePath, content, 'utf-8');
  return true;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  return await dialog.showSaveDialog(currentWindow, options);
});

function createWindow(loadEditor = false) {
  const revealJsPath = getRevealJsPath();
  
  currentWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    title: loadEditor ? 'Reveal.js Editor' : 'Reveal.js Presenter',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    backgroundColor: '#000000'
  });

  // Load the demo or editor
  const htmlFile = loadEditor ? 'editor.html' : 'index.html';
  currentWindow.loadFile(path.join(revealJsPath, htmlFile));

  // Global shortcut for fullscreen (F11)
  globalShortcut.register('F11', () => toggleFullscreen());
  
  // Also listen in renderer
  currentWindow.on('blur', () => {
    globalShortcut.unregisterAll();
  });
  
  currentWindow.on('focus', () => {
    globalShortcut.register('F11', () => toggleFullscreen());
  });

  currentWindow.on('closed', () => {
    globalShortcut.unregisterAll();
    currentWindow = null;
  });

  console.log('Reveal.js Presenter started');
  console.log('Loading from:', path.join(revealJsPath, htmlFile));
}

// App initialization
app.whenReady().then(() => {
  // Set the menu
  Menu.setApplicationMenu(createMenu());
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});