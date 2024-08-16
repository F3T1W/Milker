const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),  // Файл preload.js для взаимодействия между main и renderer процессами
            nodeIntegration: false,  // Включаем контекстную изоляцию
            contextIsolation: true,  // Включаем защиту от контекста
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
    await loginAndDownload(creatorName);
});

async function loginAndDownload(username) {
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ],
        timeout: 0  // Отключаем общий таймаут для браузера
    });
    const page = await browser.newPage();

    // Отключение детектирования Puppeteer
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
    });

    // Установка пользовательского агента
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    try {
        console.log('Загружаю страницу крейтора');
        await page.goto(`https://www.patreon.com/${username}`, { timeout: 0 });

        console.log('Загрузка завершена, собираю ссылки...');
        
        const imageLinks = await page.evaluate(() => {
            const images = Array.from(document.querySelectorAll('img'));
            return images.map(img => img.src);
        });

        console.log(imageLinks);

        // Проверяем, существует ли папка 'download'. Если нет, создаем её.
        const downloadPath = path.join(__dirname, 'download');
        if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath);
        }

        // Загружаем каждое изображение
        for (const [index, url] of imageLinks.entries()) {
            const imagePath = path.join(downloadPath, `image_${index}.jpg`);
            await downloadImage(url, imagePath);
            console.log(`Изображение сохранено: ${imagePath}`);
        }

        console.log('Все изображения загружены.');
    } catch (error) {
        console.error('Произошла ошибка во время навигации:', error);
    } finally {
        await browser.close();
    }
}

async function downloadImage(url, filepath) {
    try {
        const response = await axios({
            url,
            responseType: 'stream',
        });

        response.data.pipe(fs.createWriteStream(filepath));

        return new Promise((resolve, reject) => {
            response.data.on('end', resolve);
            response.data.on('error', reject);
        });
    } catch (error) {
        console.error(`Ошибка при загрузке изображения ${url}:`, error);
    }
}