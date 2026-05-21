const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electron', {
  // Storage
  getResourcePath: () => ipcRenderer.invoke('get-resource-path'),
  
  // File operations
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', { filePath, content }),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // Event listeners
  onLoadMarkdown: (callback) => {
    ipcRenderer.on('load-markdown', (event, content) => callback(content));
  },
  onImportPPTX: (callback) => {
    ipcRenderer.on('import-pptx', (event, filePath) => callback(filePath));
  },
  onRequestSave: (callback) => {
    ipcRenderer.on('request-save', () => callback());
  },
  onSaveAs: (callback) => {
    ipcRenderer.on('save-as', (event, filePath) => callback(filePath));
  },
  onLaunchPresentation: (callback) => {
    ipcRenderer.on('launch-presentation', () => callback());
  },
  onNavigateSlide: (callback) => {
    ipcRenderer.on('navigate-slide', (event, direction) => callback(direction));
  }
});