import { app, BrowserWindow, shell, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let mainWindow = null;
let apiProcess = null;

function waitForServer(url, timeoutMs = 15000) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          resolve(true);
        } else if (Date.now() - startTime < timeoutMs) {
          setTimeout(check, 500);
        } else {
          resolve(false);
        }
      }).on('error', () => {
        if (Date.now() - startTime < timeoutMs) {
          setTimeout(check, 500);
        } else {
          resolve(false);
        }
      });
    };
    check();
  });
}

function startBackendServer() {
  const apiPath = path.join(rootDir, 'api', 'index.js');
  try {
    apiProcess = spawn('node', [apiPath], {
      cwd: rootDir,
      env: { ...process.env, PORT: '5000' },
      stdio: 'ignore',
      detached: false
    });
    console.log('[Electron] Backend API server started on port 5000');
  } catch (err) {
    console.error('[Electron] Failed to launch backend API server:', err);
  }
}

async function createWindow() {
  startBackendServer();

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 720,
    title: 'Deuce Adventure Park OS',
    icon: path.join(rootDir, 'public', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    autoHideMenuBar: false,
    show: false
  });

  // Application Menu setup
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { label: 'Reload App', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { label: 'Toggle Full Screen', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { type: 'separator' },
        { label: 'Exit', accelerator: 'Alt+F4', role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'toggleDevTools' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  mainWindow.maximize();

  // Try connecting to Vite dev server or load preview / fallback to dist
  const devUrl = 'http://localhost:3000';
  const isDevRunning = await waitForServer(devUrl, 3000);

  if (isDevRunning) {
    console.log('[Electron] Loading from local web server:', devUrl);
    mainWindow.loadURL(devUrl);
  } else {
    const distPath = path.join(rootDir, 'dist', 'index.html');
    console.log('[Electron] Loading from dist index file:', distPath);
    mainWindow.loadFile(distPath).catch(() => {
      // Fallback to local preview URL if available
      mainWindow.loadURL(devUrl);
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (apiProcess) {
      try { apiProcess.kill(); } catch (e) {}
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (apiProcess) {
    try { apiProcess.kill(); } catch (e) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
