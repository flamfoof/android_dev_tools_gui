/* eslint-disable require-jsdoc */
const electron = require("electron")
const { app, BrowserWindow, dialog } = electron
const cp = require("child_process")

let mainWindow
let deviceIP

app.on("ready", () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 1200,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    })

    mainWindow.loadFile("index.html")
})

electron.ipcMain.on("inputSubmitted", (event, arg) => {
    mainWindow.webContents.send("update-textbox", arg)
})
electron.ipcMain.on("openFileDialog", openFileDialog)
electron.ipcMain.on("connectDevice", (event, arg) => {
    connectDevice(arg)
})
electron.ipcMain.on("disconnectDevice", disconnectDevice)
electron.ipcMain.on("checkDevices", checkDevices)
electron.ipcMain.on("installApk", (event, arg) => {
    installApk(arg)
})
electron.ipcMain.on("startApk", (event, arg) => {
    console.log("start")
    startApk(arg)
})
electron.ipcMain.on("stopApk", (event, arg) => {
    console.log("stop")
    stopApk(arg)
})
electron.ipcMain.on("clearApk", (event, arg) => {
    console.log("clear")
    clearApk(arg)
})
electron.ipcMain.on("uninstallApk", (event, arg) => {
    console.log("uninstall")
    uninstallApk(arg)
})
electron.ipcMain.on("typeTextAction", (event, arg) => {
    console.log("type action!" + arg)
    typeTextAction(arg)
})
electron.ipcMain.on("backspaceAction", backspaceAction)

setInterval(checkDevices, 5000)

async function checkDevices() {
    let defaultMessage
    let deviceModel
    const getConnectedDevice = cp.spawn(`adb`, ["devices"])

    getConnectedDevice.stderr.on("data", (data) => {
        mainWindow.webContents.send("updateDeviceUnitStatus", `No devices found :(`)
    })

    getConnectedDevice.stdout.on("data", (data) => {
        defaultMessage = data.toString()
        forceDeviceUpdateStatus(defaultMessage, deviceIP, deviceModel)
        const getDeviceIP = cp.spawn(`adb`, "shell ip addr show wlan0".split(" "))

        getDeviceIP.stderr.on("data", (data) => {
            deviceIP = null;
        })

        getDeviceIP.stdout.on("data", (data) => {
            try {
                deviceIP = data.toString().split("inet ")[1].split("/")[0]
            } catch (e) {
                console.log("There are no valid IP addresses")
            }

            const getDeviceModel = cp.spawn(`adb`, `-s ${deviceIP} shell getprop ro.product.model`.split(" "))

            getDeviceModel.stdout.on("data", (data) => {
                deviceModel = data.toString()
                forceDeviceUpdateStatus(defaultMessage, deviceIP, deviceModel)
            })
        })
    })
}

function forceDeviceUpdateStatus(defaultMessage, deviceIP, deviceModel) {
    if (deviceIP != null && deviceModel != null) {
        mainWindow.webContents.send("updateDeviceUnitStatus", `Connected to: ${deviceModel} as "${deviceIP}"`)
    } else {
        mainWindow.webContents.send("updateDeviceUnitStatus", `${defaultMessage}`)
    }
}

async function connectDevice(deviceIPAddress) {
    const connect = cp.spawn(`adb`, `connect ${deviceIPAddress}`.split(" "))
    connect.stderr.on("data", (data) => {
        mainWindow.webContents.send("updateDeviceStatus", `${data}`)
    })
    connect.stdout.on("data", (data) => {
        mainWindow.webContents.send("updateDeviceStatus", `${data}`)
        deviceIP = deviceIPAddress
        checkDevices()
    })
}

async function disconnectDevice() {
    const disconnect = cp.spawn(`adb`, `disconnect`.split(" "))
    disconnect.stderr.on("data", (data) => {
        mainWindow.webContents.send("updateDeviceStatus", `${data}`)
    })
    disconnect.stdout.on("data", (data) => {
        mainWindow.webContents.send("updateDeviceStatus", `${data}`)
        deviceIP = null
        checkDevices()
    })
}

async function installApk(apkPath) {
    const install = cp.spawn(`adb`, `install ${apkPath}`.split(" "))
    install.stderr.on("data", (data) => {
        mainWindow.webContents.send("updateInstallStatus", `${data}`)
    })
    install.stdout.on("data", (data) => {
        mainWindow.webContents.send("updateInstallStatus", `${data}`)
    })
}

function openFileDialog() {
    dialog
        .showOpenDialog(mainWindow, {
            properties: ["openFile"],
            filters: [
                {
                    name: "APK Files",
                    extensions: ["apk"]
                }
            ]
        })
        .then((result) => {
            if (!result.canceled) {
                const apkPath = result.filePaths[0]
                mainWindow.webContents.send("updateDirectory", apkPath)
            }
        })
        .catch((err) => {
            mainWindow.webContents.send("updateInstallStatus", `Error opening file dialog: ${err.message}`)
        })
}

async function startApk(apkPackage) {
    let success = false
    const start = cp.spawn(
        `adb`,
        `shell monkey -p ${apkPackage} -c android.intent.category.LEANBACK_LAUNCHER 1`.split(" ")
    )
    start.stderr.on("data", (data) => {
        if (!success) {
            const altStart = cp.spawn(
                `adb`,
                `shell monkey -p ${apkPackage} -c android.intent.category.LAUNCHER 1`.split(" ")
            )
            altStart.stderr.on("data", (data) => {
                if (!success) mainWindow.webContents.send("updateInstallStatus", `${data}`)
            })

            altStart.stdout.on("data", (data) => {
                mainWindow.webContents.send("updateInstallStatus", `${data}`)
                success = true
            })
        }
    })
    start.stdout.on("data", (data) => {
        mainWindow.webContents.send("updateInstallStatus", `${data}`)
        success = true
        if (data.includes("aborted")) {
            success = false
            start.stderr.push("aborted")
        }
    })
}

async function stopApk(apkPackage) {
    const stop = cp.spawn(`adb`, `shell am force-stop ${apkPackage}`.split(" "))
    stop.stderr.on("data", (data) => {
        mainWindow.webContents.send("updateInstallStatus", `${data}`)
    })
    stop.stdout.on("data", (data) => {
        mainWindow.webContents.send("updateInstallStatus", `${data}`)
    })
}

async function clearApk(apkPackage) {
    const clear = cp.spawn(`adb`, `shell pm clear ${apkPackage}`.split(" "))
    clear.stderr.on("data", (data) => {
        mainWindow.webContents.send("updateInstallStatus", `${data}`)
    })
    clear.stdout.on("data", (data) => {
        mainWindow.webContents.send("updateInstallStatus", `${data}`)
    })
}

async function uninstallApk(apkPackage) {
    const uninstall = cp.spawn(`adb`, `uninstall ${apkPackage}`.split(" "))
    uninstall.stderr.on("data", (data) => {
        mainWindow.webContents.send("updateInstallStatus", `${data}`)
    })
    uninstall.stdout.on("data", (data) => {
        mainWindow.webContents.send("updateInstallStatus", `${data}`)
    })
}

async function typeTextAction(inputText) {
    cp.spawn(`adb`, `shell input text ${inputText}`.split(" "))
    mainWindow.webContents.send("updateTypeInputField")
}

async function backspaceAction() {
    cp.spawn(`adb`, `shell input keyevent 67`.split(" "))
}
