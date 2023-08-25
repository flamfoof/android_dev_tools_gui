/* eslint-disable require-jsdoc */
const electron = require("electron")
const { app, BrowserWindow, dialog } = electron
const cp = require("child_process")
const fs = require("fs")
const { dirname, resolve, join } = require("path")

let mainWindow
let deviceIP
let serverRunning = true
let config = {}
let typedTextLength = 20
let pathToAdb = join(__dirname, "static/tools/adb")

setInterval(checkDevices, 5000)

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
    console.log("lol")
    console.log(resolve(`${pathToAdb}`))

    mainWindow.loadFile("index.html").finally(() => {
        refreshConfig()
    })
})

electron.ipcMain.on("openFileDialog", openFileDialog)
electron.ipcMain.on("connectDevice", (event, arg) => {
    connectDevice(arg)
})
electron.ipcMain.on("disconnectDevice", disconnectDevice)
electron.ipcMain.on("stopAdb", stopAdb)
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
    typeTextAction(arg)
})
electron.ipcMain.on("gohome", (event, arg) => {
    gohome()
})
electron.ipcMain.on("goback", (event, arg) => {
    goback()
})
electron.ipcMain.on("clearTextAction", clearTextAction)
electron.ipcMain.on("refreshConfig", refreshConfig)
electron.ipcMain.on("updateConfig", (event, arg) => {
    updateConfig(arg[0], arg[1])
})

async function checkDevices() {
    let defaultMessage
    let deviceModel

    if (!serverRunning) {
        return
    }

    const getConnectedDevice = cp.spawn(`${pathToAdb}`, ["devices"])

    getConnectedDevice.stderr.on("data", (data) => {
        mainWindow.webContents.send("updateDeviceUnitStatus", `No devices found :(`)
    })

    getConnectedDevice.stdout.on("data", (data) => {
        defaultMessage = data.toString()
        forceDeviceUpdateStatus(defaultMessage, deviceIP, deviceModel)
        const getDeviceIP = cp.spawn(`${pathToAdb}`, "shell ip addr show wlan0".split(" "))

        getDeviceIP.stderr.on("data", (data) => {
            deviceIP = null
        })

        getDeviceIP.stdout.on("data", (data) => {
            try {
                deviceIP = data.toString().split("inet ")[1].split("/")[0]
            } catch (e) {
                console.log("There are no valid IP addresses")
            }

            const getDeviceModel = cp.spawn(`${pathToAdb}`, `-s ${deviceIP} shell getprop ro.product.model`.split(" "))

            getDeviceModel.stdout.on("data", (data) => {
                deviceModel = data.toString()
                forceDeviceUpdateStatus(defaultMessage, deviceIP, deviceModel)
            })
        })
    })
}

function forceDeviceUpdateStatus(defaultMessage, deviceIP, deviceModel) {
    if (deviceIP != null && deviceModel != null) {
        const deviceProp = {
            ip: deviceIP,
            model: deviceModel
        }

        mainWindow.webContents.send("updateDeviceUnitStatus", deviceProp)
        mainWindow.webContents.send("updateDeviceUnitStatus", `Connected to: ${deviceModel} as "${deviceIP}"`)
    } else {
        mainWindow.webContents.send("updateDeviceUnitStatus", `${defaultMessage}`)
    }
}

async function connectDevice(deviceIPAddress) {
    const connect = cp.spawn(`${pathToAdb}`, `connect ${deviceIPAddress}`.split(" "))
    serverRunning = true

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
    const disconnect = cp.spawn(`${pathToAdb}`, `disconnect`.split(" "))
    disconnect.stderr.on("data", (data) => {
        mainWindow.webContents.send("updateDeviceStatus", `${data}`)
    })
    disconnect.stdout.on("data", (data) => {
        mainWindow.webContents.send("updateDeviceStatus", `${data}`)
        deviceIP = null
        checkDevices()
    })
}

async function stopAdb() {
    const adbKill = cp.spawn(`${pathToAdb}`, `kill-server`.split(" "))
    adbKill.stderr.on("data", (data) => {
        mainWindow.webContents.send("updateDeviceStatus", `${data}`)
    })
    adbKill.on("close", () => {
        mainWindow.webContents.send("updateDeviceStatus", `Adb is dead`)
        deviceIP = null
        serverRunning = false
        checkDevices()
    })
    adbKill.stdout.on("data", (data) => {
        mainWindow.webContents.send("updateDeviceUnitStatus", `${data}`)
        mainWindow.webContents.send("updateDeviceStatus", `Adb is dead`)
        deviceIP = null
        serverRunning = false
        checkDevices()
    })
}
async function gohome() {
    const adbKill = cp.spawn(`${pathToAdb}`, `shell input keyevent KEYCODE_HOME`.split(" "))

}
async function goback() {
    const adbKill = cp.spawn(`${pathToAdb}`, `shell input keyevent KEYCODE_BACK`.split(" "))

}

async function installApk(apkPath) {
    const install = cp.spawn(`${pathToAdb}`, ["install", apkPath])
    let fail = false

    install.stderr.on("data", (data) => {
        mainWindow.webContents.send("updateInstallStatus", `Failed to install because of reasons...\n${data}`)
        console.log("catastrophic failure")
        fail = true

        new electron.Notification({
            title: "APK Install Failed",
            body: "Your APK failed to install. Please try again."
        }).show()

        install.kill("SIGINT")
    })

    install.stdout.on("data", (data) => {
        if (fail) return

        mainWindow.webContents.send("updateInstallStatus", `${data}`)
        if (data.includes("Success")) {
            new electron.Notification({
                title: "APK Installed",
                body: "Your APK has been installed successfully!"
            }).show()
        }
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
    let activityText = ""
    const start = cp.spawn(
        `${pathToAdb}`,
        `shell monkey -p ${apkPackage} -c android.intent.category.LEANBACK_LAUNCHER 1`.split(" ")
    )
    start.stderr.on("data", (data) => {
        if (!success) {
            activityText = ""
            const altStart = cp.spawn(
                `${pathToAdb}`,
                `shell monkey -p ${apkPackage} -c android.intent.category.LAUNCHER 1`.split(" ")
            )
            altStart.stderr.on("data", (data) => {
                if (!success) {
                    activityText += `${data}`
                    mainWindow.webContents.send("updateInstallStatus", `${activityText}`)
                }
            })

            altStart.stdout.on("data", (data) => {
                activityText += `${data}`
                mainWindow.webContents.send("updateInstallStatus", `${activityText}`)
                success = true
            })
        }
    })
    start.stdout.on("data", (data) => {
        activityText += `${data}`
        mainWindow.webContents.send("updateInstallStatus", `${activityText}`)
        success = true
        if (data.includes("aborted")) {
            success = false
            start.stderr.push("aborted")
        }
    })
}

async function stopApk(apkPackage) {
    const stop = cp.spawn(`${pathToAdb}`, `shell am force-stop ${apkPackage}`.split(" "))
    stop.stderr.on("data", (data) => {
        mainWindow.webContents.send("updateInstallStatus", `${data}`)
    })
    stop.stdout.on("data", (data) => {
        mainWindow.webContents.send("updateInstallStatus", `${data}`)
    })
}

async function clearApk(apkPackage) {
    const clear = cp.spawn(`${pathToAdb}`, `shell pm clear ${apkPackage}`.split(" "))
    clear.stderr.on("data", (data) => {
        mainWindow.webContents.send("updateInstallStatus", `${data}`)
    })
    clear.stdout.on("data", (data) => {
        mainWindow.webContents.send("updateInstallStatus", `${data}`)
    })
}

async function uninstallApk(apkPackage) {
    const uninstall = cp.spawn(`${pathToAdb}`, `uninstall ${apkPackage}`.split(" "))
    uninstall.stderr.on("data", (data) => {
        mainWindow.webContents.send("updateInstallStatus", `${data}`)
    })
    uninstall.stdout.on("data", (data) => {
        mainWindow.webContents.send("updateInstallStatus", `${data}`)
    })
}

async function refreshConfig(configData) {
    console.log(`${__dirname}/config.json`)
    config = JSON.parse(fs.readFileSync(`${__dirname}/config.json`))
    mainWindow.webContents.send("refreshConfigField", config)
}

async function updateConfig(action, configData) {
    try {
        fs.writeFileSync(`${__dirname}/config.json`, JSON.stringify(configData, null, 2))
        console.log(`Config file saved to ${__dirname}/config.json`)
    } catch (err) {
        console.error(`Error writing config file: ${err.message}`)
    }

    return "Invalid Action"
}

async function typeTextAction(inputText) {
    if (inputText == "") {
        cp.spawn(`${pathToAdb}`, `shell input keyevent 66`.split(" "))
    } else {
        // if(inputText.length > )
        //     typedTextLength = inputText.length
        cp.spawn(`${pathToAdb}`, `shell input text "${inputText}"`.split(" "))
    }

    mainWindow.webContents.send("updateTypeInputField")
}

async function clearTextAction() {
    // cp.spawn(`${pathToAdb}`, `shell input text \'\'`)
    const clearAction = `shell input keyevent 123 67`.split(" ")
    for (let i = 0; i < typedTextLength; i++) {
        clearAction.push("67")
    }
    // cp.spawn(`${pathToAdb}`, `shell input text \'\'`)
    cp.spawn(`${pathToAdb}`, clearAction)
}
