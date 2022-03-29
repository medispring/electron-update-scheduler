const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');


const resourcePath = app.isPackaged ? process.resourcesPath : path.join(__dirname, 'resources');
console.log(`Resource path : ${resourcePath}`);
const config = JSON.parse(fs.readFileSync(path.join(resourcePath, 'config.json')));
console.log(`Config : \n${JSON.stringify(config)}`);

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });
    mainWindow.loadFile('index.html');
    mainWindow.on('closed', function() {
        mainWindow = null;
    });
    mainWindow.once('ready-to-show', () => {
        setInterval(() => {
            autoUpdater.checkForUpdatesAndNotify();
        }, 30000);
    });
}

function configIsValid(config) {
    // TakTik credentials FIXME check with a request
    return (
      !!config.taktikCredential &&
      !!config.taktikCredential.groupId &&
      !!config.taktikCredential.groupPassword &&
      // Paths to install
      !!config.beidPath &&
      !!config.couchDbPath &&
      // Replication mode
      !!config.replicationMode &&
      // Cannot do migration
      !!config.migration &&
      !!config.migration.migrationMode
    );
  }

app.on('ready', () => { createWindow(); });

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function() {
    if (mainWindow === null) {
        createWindow();
    }
});

ipcMain.on('app_version', (event) => {
    event.sender.send('app_version', { version: app.getVersion() });
});

ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall();
});

autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'medispring',
    repo: 'electron-update-scheduler'
});

autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('checking_for_update');
});

autoUpdater.on('update-available', () => {
    // if available, send the groupId to ws and if elligible for update then propagate the event
    const isValid = configIsValid(config);
    mainWindow.webContents.send('update_available_config_is_valid', { configIsValid: isValid });
    if (isValid) {
        mainWindow.webContents.send('update_available_group_id', { groupId: config.taktikCredential.groupId });
        if (config.groupId === 'to-update') {
            mainWindow.webContents.send('update_available');
        }
    }
});

autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update_downloaded');
});