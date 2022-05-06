const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const fs = require('fs');
const path = require('path');

log.info('App starting...');

const resourcePath = app.isPackaged ? process.resourcesPath : path.join(__dirname, 'resources');
log.info(`Resource path : ${resourcePath}`);
const config = JSON.parse(fs.readFileSync(path.join(resourcePath, 'config.json')));
log.info(`Config : \n${JSON.stringify(config)}`);

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
        let retries = 5;
        const intervalId = setInterval(() => {
            log.info(`Interval retry: ${retries}`);
            if (retries > 0) {
                log.info(`Check for updates`);
                retries--;
                autoUpdater.checkForUpdates();
            } else {
                log.info(`Clear check for updates`);
                clearInterval(intervalId);
            }
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

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoInstallOnAppQuit = false;

autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'medispring',
    repo: 'electron-update-scheduler'
});

autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('checking_for_update');
});

autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update_available');
});

autoUpdater.on('update-downloaded', () => {
    // if available, send the groupId to ws and if elligible for update then propagate the event
    const isValid = configIsValid(config);
    log.info(`Config is valid ? : ${isValid}`);
    mainWindow.webContents.send('update-downloaded_config_is_valid', { configIsValid: isValid });
    if (isValid) {
        log.info(`GroupId : ${config.taktikCredential.groupId}`);
        mainWindow.webContents.send('update-downloaded_group_id', { groupId: config.taktikCredential.groupId });
        if (config.taktikCredential.groupId === 'to-update') {
            log.info(`Send update`);
            mainWindow.webContents.send('update-downloaded_to-update');
        } else {
            log.info(`Send don't update`);
            mainWindow.webContents.send('update-downloaded_no-update');
        }
    }
    mainWindow.webContents.send('update_downloaded');
});