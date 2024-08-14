const { app, BrowserWindow, ipcMain, shell } = require('electron');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Globals
let globalPatreonUrl = '';  // Global variable to store the Patreon creator URL

const clientId = 'putYourClientId';
const clientSecret = 'putYourClientSecret';
const redirectUri = 'putYourRedirectUri';
const authUrl = `putYourAuthUrl`;

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
            const campaignId = await getCampaignIdFromPatreon(globalPatreonUrl, accessToken);  // Use the globalPatreonUrl
            if (campaignId) {
                const posts = await fetchCreatorPosts(accessToken, campaignId);
                const images = filterAccessibleImages(posts);

                if (images.length > 0) {
                    await downloadImages(images);
                } else {
                    console.log('No images found for download.');
                }
            }
        }
    });

    expressApp.listen(3000, () => {
        console.log('Server is running on http://localhost:3000');
    });
}

ipcMain.on('download-content', async (event, url) => {
    console.log(`Received URL: ${url}`);
    globalPatreonUrl = url;  // Store the creator URL globally
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

async function getCampaignIdFromPatreon(creatorUrl, accessToken) {
  try {
      const response = await axios.get(creatorUrl, {
          headers: {
              Authorization: `Bearer ${accessToken}`
          }
      });

      // Attempt to extract the campaign ID using a regex pattern
      const campaignIdMatch = response.data.match(/\/campaign\/(\d+)\//);
      let campaignId = null;

      if (campaignIdMatch && campaignIdMatch[1]) {
          campaignId = campaignIdMatch[1];
          console.log(`Campaign ID found: ${campaignId}`);
      } else {
          console.error('Campaign ID not found in the page.');
      }

      return campaignId;
  } catch (error) {
      console.error('Error fetching campaign ID:', error.response ? error.response.data : error.message);
      return null;
  }
}

async function fetchCreatorPosts(accessToken, campaignId) {
  try {
      const endpoint = `https://www.patreon.com/api/oauth2/v2/campaigns/${campaignId}/posts`;

      const queryString = new URLSearchParams({
          'fields[post]': 'title,content,url'
      }).toString();

      const response = await axios.get(`${endpoint}?${queryString}`, {
          headers: {
              Authorization: `Bearer ${accessToken}`
          }
      });

      const posts = response.data.data;
      console.log('Fetched Posts:', posts);

      return posts;
  } catch (error) {
      console.error('Error fetching posts:', error.response ? error.response.data : error.message);
      return null;
  }
}

function filterAccessibleImages(posts) {
    const images = [];

    posts.forEach(post => {
        if (post.attributes.image) {
            images.push(post.attributes.image.url);
        }

        if (post.relationships.media) {
            post.relationships.media.data.forEach(mediaItem => {
                if (mediaItem.attributes.download_url) {
                    images.push(mediaItem.attributes.download_url);
                }
            });
        }
    });

    return images;
}

async function downloadImages(images) {
    const downloadsPath = path.join(__dirname, 'downloads');

    if (!fs.existsSync(downloadsPath)) {
        fs.mkdirSync(downloadsPath);
    }

    for (const url of images) {
        const fileName = path.basename(url);
        const filePath = path.join(downloadsPath, fileName);

        const writer = fs.createWriteStream(filePath);

        const response = await axios.get(url, { responseType: 'stream' });

        response.data.pipe(writer);

        writer.on('finish', () => console.log(`Downloaded: ${fileName}`));
        writer.on('error', (err) => console.error(`Error downloading ${fileName}:`, err));
    }
}