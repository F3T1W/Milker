const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('download-btn');
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const url = document.getElementById('patreon-url').value;
            if (url) {
                ipcRenderer.send('download-content', url);
            } else {
                alert("Please enter a valid Patreon URL.");
            }
        });
    } else {
        console.error("Button with ID 'download-btn' not found.");
    }
});