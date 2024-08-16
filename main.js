const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const puppeteer = require('puppeteer');

let globalPatreonUrl = '';

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile('index.html');
    mainWindow.maximize();
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('download-content', async (event, creatorName) => {
    console.log(`Received creator name: ${creatorName}`);
    globalPatreonUrl = `https://www.patreon.com/${creatorName}`;
});