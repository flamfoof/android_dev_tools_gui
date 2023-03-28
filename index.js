const electron = require('electron');
const { app, BrowserWindow, dialog } = electron;
const path = require('path');
const fs = require('fs');
const { exec } = require("child_process");

let mainWindow;
var deviceIP;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 1200,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    });

    mainWindow.loadFile('index.html');
});

electron.ipcMain.on('inputSubmitted', (event, arg) => {
    mainWindow.webContents.send('update-textbox', arg);
});
electron.ipcMain.on('openFileDialog', openFileDialog);
electron.ipcMain.on('connectDevice', (event, arg) => {
    connectDevice(arg);
});
electron.ipcMain.on('disconnectDevice', disconnectDevice);
electron.ipcMain.on('checkDevices', checkDevices);
electron.ipcMain.on('installApk', (event, arg) => {
    installApk(arg);
});
electron.ipcMain.on('startApk', (event, arg) => {
    console.log("start")
    startApk(arg);
});
electron.ipcMain.on('stopApk', (event, arg) => {
    console.log("stop")
    stopApk(arg);
});
electron.ipcMain.on('clearApk', (event, arg) => {
    console.log("clear")
    clearApk(arg);
});
electron.ipcMain.on('uninstallApk', (event, arg) => {
    console.log("uninstall")
    uninstallApk(arg);
});
electron.ipcMain.on('typeTextAction', (event, arg) => {
    console.log("type cation!" + arg)
    typeTextAction(arg);
});
electron.ipcMain.on('backspaceAction', backspaceAction);

setInterval(checkDevices, 5000);

async function checkDevices() {
    var defaultMessage;
    var deviceModel;

    exec(`adb devices`, (error, stdout, stderr) => {
        if (error) {
            mainWindow.webContents.send('updateDeviceUnitStatus', `No devices found :(`);
            return;
        }
        if (stderr) {
            mainWindow.webContents.send('updateDeviceUnitStatus', `No devices found :(`);
            return;
        }
        // console.log("defaulted?")
        defaultMessage = stdout;
        

        exec(`adb shell ip addr show wlan0 | findstr /r /c:"inet.*[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*" | for /f "tokens=2" %a in ('more') do @echo %a`, (error, stdout, stderr) => {
            if (error) {
                mainWindow.webContents.send('updateDeviceUnitStatus', `No devices found :(`);
                return;
            }
            if (stderr) {
                mainWindow.webContents.send('updateDeviceUnitStatus', `No devices found :(`);
                return;
            }
            // console.log("got ip")
            deviceIP = stdout.slice(0, stdout.indexOf('/'));
    
            exec(`adb -s ${deviceIP} shell getprop ro.product.model  `, (error, stdout, stderr) => {
                if (error) {
                    mainWindow.webContents.send('updateDeviceUnitStatus', `No devices found :(`);
                    return;
                }
                if (stderr) {
                    mainWindow.webContents.send('updateDeviceUnitStatus', `No devices found :(`);
                    return;
                }
        
                deviceModel = stdout;
                // console.log("Got model")

                if(deviceIP != null || deviceModel != null) {
                    mainWindow.webContents.send('updateDeviceUnitStatus', `Connected to: ${deviceModel} as "${deviceIP}"`);
                } else {
                    mainWindow.webContents.send('updateDeviceUnitStatus', `${defaultMessage}`);
                }
            });
        });
    });  
}

async function connectDevice(deviceIPAddress) {
    exec(`adb connect ${deviceIPAddress}`, (error, stdout, stderr) => {
        if (error) {
            mainWindow.webContents.send('updateDeviceStatus', `${error}`);
            return;
        }
        if (stderr) {
            mainWindow.webContents.send('updateDeviceStatus', `${stderr}`);
            return;
        }
        mainWindow.webContents.send('updateDeviceStatus', `${stdout}`);
        deviceIP = deviceIPAddress
        checkDevices();
    });
}

async function disconnectDevice() {
    exec(`adb disconnect`, (error, stdout, stderr) => {
        if (error) {
            mainWindow.webContents.send('updateDeviceStatus', `${error}`);
            return;
        }
        if (stderr) {
            mainWindow.webContents.send('updateDeviceStatus', `${stderr}`);
            return;
        }
        mainWindow.webContents.send('updateDeviceStatus', `${stdout}`);
        deviceIP = null;
        checkDevices();
    });
}

async function installApk(apkPath) {
    console.log("Starting install: " + apkPath)
    exec(`adb install "${apkPath}"`, (error, stdout, stderr) => {
        if (error) {
            mainWindow.webContents.send('updateInstallStatus', `${error}`);
            return;
        }
        if (stderr) {
            mainWindow.webContents.send('updateInstallStatus', `${stderr}`);
            return;
        }
        mainWindow.webContents.send('updateInstallStatus', `${stdout}`);
    });
}

function openFileDialog() {
    dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'APK Files', extensions: ['apk'] }]
    }).then((result) => {
        if (!result.canceled) {
            let apkPath = result.filePaths[0];
            mainWindow.webContents.send('updateDirectory', apkPath);
        }
    }).catch((err) => {
        mainWindow.webContents.send('updateInstallStatus', `Error opening file dialog: ${err.message}`);
    });
}

async function startApk(apkPackage) {
    exec(`adb shell monkey -p "${apkPackage}" -c android.intent.category.LEANBACK_LAUNCHER 1`, (error, stdout, stderr) => {
        if (error||stderr) {
            exec(`adb shell monkey -p "${apkPackage}" -c android.intent.category.LAUNCHER 1`, (error, stdout, stderr) => {
                if (error||stderr) {
                    mainWindow.webContents.send('updateInstallStatus', `${stderr}`);
                    return;
                }
                mainWindow.webContents.send('updateInstallStatus', `${stdout}`);
            });
            mainWindow.webContents.send('updateInstallStatus', `${stderr}`);
            return;
        }
        mainWindow.webContents.send('updateInstallStatus', `${stdout}`);
    });
}

async function stopApk(apkPackage) {
    exec(`adb shell am force-stop ${apkPackage}"`, (error, stdout, stderr) => {
        if (error) {
            mainWindow.webContents.send('updateInstallStatus', `${error}`);
            return;
        }
        if (stderr) {
            mainWindow.webContents.send('updateInstallStatus', `${stderr}`);
            return;
        }
        mainWindow.webContents.send('updateInstallStatus', `${stdout}`);
    });
}

async function clearApk(apkPackage) {
    exec(`adb shell pm clear ${apkPackage}`, (error, stdout, stderr) => {
        if (error) {
            mainWindow.webContents.send('updateInstallStatus', `${error}`);
            return;
        }
        if (stderr) {
            mainWindow.webContents.send('updateInstallStatus', `${stderr}`);
            return;
        }
        mainWindow.webContents.send('updateInstallStatus', `${stdout}`);
    });
}

async function uninstallApk(apkPackage) {
    exec(`adb uninstall ${apkPackage}`, (error, stdout, stderr) => {
        if (error) {
            mainWindow.webContents.send('updateInstallStatus', `${error}`);
            return;
        }
        if (stderr) {
            mainWindow.webContents.send('updateInstallStatus', `${stderr}`);
            return;
        }
        mainWindow.webContents.send('updateInstallStatus', `${stdout}`);
    });
}

async function typeTextAction(inputText) {
    console.log(inputText)
    exec(`adb shell input text ${inputText}`, (error, stdout, stderr) => {
    });
    mainWindow.webContents.send('updateTypeInputField');
}

async function backspaceAction() {
    exec(`adb shell input keyevent 67`, (error, stdout, stderr) => {
    });
}