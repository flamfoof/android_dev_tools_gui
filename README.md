Android Dev Tools GUI

This is an Electron app made in Node JS. I have compiled a list of useful adb tools that are integrated into this app as a GUI.

This was built mostly in mind for Android, Android TV and Fire TV.

It requires that you have your ADB environments being correctly set up, otherwise that is all.

It has the following features
- Android Connection/Disconnection
- Installing APKs
- Start/Stop/Clearing Cache/Uninstall
- Keyboard text input to Screen

Instructions
1. Install npm packages with ```npm install```
2. Build electron app with ```electron .```
3. Build for platform by:
  Windows - ```electron-packager . MyAppName --platform=win32 --arch=x64 --icon=path/to/icon.ico --out=path/to/output/folder --overwrite```
  Mac - ```electron-packager . --overwrite --platform=darwin --arch=x64 --prune=true --out=release-builds ```

Hope you all like the tool I made and I hope it is useful to everyone!
