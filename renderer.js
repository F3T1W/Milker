document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('downloadButton').addEventListener('click', () => {
        const username = document.getElementById('usernameInput').value;
        window.electron.downloadContent(username);
    });
});