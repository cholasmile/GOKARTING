# Deuce Adventure Park OS - Installation & Setup Guide

Deuce Adventure Park OS is designed to be installed and run effortlessly on any Windows machine (or in portable flash-drive mode).

---

## 🚀 Method 1: One-Click Windows Installer (Recommended)

1. **Double-click `INSTALL.bat`** in this folder.
2. The installer will automatically:
   - Check for **Node.js** (and auto-install it via `winget` if missing).
   - Install required dependencies (`npm install`).
   - Compile production-optimized assets (`npm run build`).
   - Ask for target destination (Dedicated AppData folder or Portable mode).
   - Create a **Desktop Shortcut** with custom park icon (`Deuce Adventure Park OS`).
   - Create a **Windows Start Menu Entry** (`Programs > Deuce Park`).
   - Offer to launch the application immediately in standalone App Window mode.

---

## ⚡ Method 2: Launch Directly / Portable Mode

If you already have Node.js installed and just want to launch immediately without installing to the system drive:

1. **Double-click `Launch-App.bat`**.
2. The application will start and open automatically in **Standalone App Window Mode** (borderless window with no browser URL bar or tabs).
3. To stop the application at any time, run **`Stop-App.bat`** or press any key in the launcher console.

---

## 🌐 Method 3: Install as a Progressive Web App (PWA)

1. Launch the app using `Launch-App.bat` or `npm run dev`.
2. Open in Google Chrome, Microsoft Edge, or Brave: `http://localhost:3000`.
3. In the top-right corner of the app screen, click **"Install App on PC"** (or click the install icon in the browser address bar).
4. The app is installed as a native Windows standalone app with offline support, automatic service worker caching, and its own taskbar badge!

---

## 🗑️ How to Uninstall

1. Run **`Uninstall.bat`** or click **"Uninstall Deuce Park"** in the Windows Start Menu.
2. It will cleanly remove all shortcuts, stop active processes, and remove the local files.

---

## 🛠️ Developer Mode

To run in development mode with Hot Module Replacement (HMR):
```bash
npm install
npm run dev
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
