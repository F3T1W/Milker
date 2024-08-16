const { app, BrowserWindow, ipcMain, shell } = require('electron');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

let globalPatreonUrl = '';

const clientId = 'aHG0LuyuP5nXfUp5K4f9CeJ8uZnrhN1DACEgCjxvQlaGUWmvgQaGADDpSBJUWARM';
const clientSecret = 'NP6j86OCXPDjbOV1UEg2FiWm2f5WNPlRolT3hDqOWk73t2nNoIc_4kXokJKe53tc';
const redirectUri = 'http://localhost:3000/callback';
const authUrl = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=identity%20campaigns.posts`;

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
    startServer();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

function startServer() {
    const expressApp = express();

    expressApp.get('/callback', async (req, res) => {
        const authCode = req.query.code;
        console.log(`Authorization Code: ${authCode}`);
        res.send('Authorization successful! You can close this window.');

        const accessToken = await exchangeCodeForToken(authCode);
        if (accessToken) {
            downloadContent(accessToken);
        }
    });

    expressApp.listen(3000, () => {
        console.log('Server is running on http://localhost:3000');
    });
}

ipcMain.on('download-content', async (event, creatorName) => {
    console.log(`Received creator name: ${creatorName}`);
    globalPatreonUrl = `https://www.patreon.com/${creatorName}`;
    shell.openExternal(authUrl);
});

const qs = require('qs');

async function exchangeCodeForToken(authCode) {
    try {
        const params = {
            code: authCode,
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
        };

        const response = await axios.post(
            'https://www.patreon.com/api/oauth2/token',
            qs.stringify(params), 
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const accessToken = response.data.access_token;
        console.log('Access Token:', accessToken);

        return accessToken;
    } catch (error) {
        console.error('Error exchanging code for token:', error.response ? error.response.data : error.message);
        return null;
    }
}

async function downloadContent(accessToken) {
    const { browser, page } = await startBrowser();

    // Navigate to the creator's posts page and intercept API responses
    await page.goto(globalPatreonUrl + '/posts', { waitUntil: 'networkidle2' });

    page.on('response', async (response) => {
        if (response.url().includes('https://www.patreon.com/api/posts')) {
            const json = await response.json();
            const posts = json.data;

            // Ensure the directory exists
            const downloadDir = path.join(__dirname, 'jija');
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir);
            }

            // Download images from each post
            for (const post of posts) {
                const imgUrl = post.attributes.image?.url || post.attributes.post_file?.url;
                if (imgUrl) {
                    downloadImage(imgUrl, downloadDir);
                }
            }
        }
    });

    await browser.close();
}

async function startBrowser() {
    const browser = await puppeteer.launch({ headless: false, userDataDir: './chromedata' });
    const page = await browser.newPage();
    return { browser, page };
}

async function downloadImage(url, directory) {
    try {
        const response = await axios.get(url, { responseType: 'stream' });
        const filePath = path.join(directory, path.basename(url));
        response.data.pipe(fs.createWriteStream(filePath));
        console.log(`Downloaded: ${filePath}`);
    } catch (error) {
        console.error('Error downloading image:', error.message);
    }
}