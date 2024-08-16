const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }
})


contextBridge.exposeInMainWorld('electron', {
  downloadContent: (creatorName) => ipcRenderer.send('download-content', creatorName)
});