# M5Burner

A utility used to flash [M5 Stack devices](https://m5stack.com/) with M5Stack's own firmware (some require an account to download them) or community firmware made by others.

Changes in this version:
- Newer Electron build (31.0.1 (?) -> 31.7.6)
- Newer version of [esptool.py](https://github.com/espressif/esptool) (4.7-dev -> 4.8.2)

## Compile instructions:

1. Clone this repo and install dependencies
```bash
git clone https://github.com/matu6968/m5burner.git
cd m5burner
yarn install
```
2. Recompile native dependencies
```bash
yarn post-package
```
3. Test the app if it works
```bash
electron app.js
```
If you are getting an error saying 
```bash
A JavaScript error occurred in the main process
Uncaught Exception:
Error: This module <usb-detection-module-location> was compiled against a different Node.js version using
NODE_MODULE_VERSION 127. This version of Node.js requires
NODE_MODULE_VERSION 125. Please try re-compiling or re-installing
the module (for instance, using `npm rebuild` or `npm install`).
```
then recompile the dependencies again using electron-rebuild, or if you are getting a weirder error of:
```bash
A JavaScript error occurred in the main process
Uncaught Exception:
Error: This module <usb-detection-module-location> was compiled against a different Node.js version using
NODE_MODULE_VERSION 127. This version of Node.js requires
NODE_MODULE_VERSION 130. Please try re-compiling or re-installing
the module (for instance, using `npm rebuild` or `npm install`).
```
then first downgrade electron to the oldest version, run the app to see if it works and then upgrade it to the latest version:
```bash
yarn global add electron@31.0.1
electron app.js
yarn global add electron@31.7.6
electron app.js # this should now launch the app
```
4. Compile the additional dependencies and package the app
```bash
yarn package
```
## License
Everything but package.js and other files (see LICENSE) belong to M5Stack due to it being decompiled from the official [M5Burner Linux x64 app](https://docs.m5stack.com/en/download), while package.js is MIT licensed.
If M5Stack dosen't mind about decompilation of their app then it will be licensed under MIT too. 
