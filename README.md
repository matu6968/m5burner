# M5Burner

A utility used to flash [M5 Stack devices](https://m5stack.com/) with M5Stack's own firmware (some require an account to download them) or community firmware made by others.

Changes in this version:
- Newer Electron build (16.0.7 -> 35.0.0-beta.7)
- Newer version of [esptool.py](https://github.com/espressif/esptool) (4.7-dev -> 4.8.1)
- Migrate to newer [node-usb](https://github.com/node-usb/node-usb) library from the legacy [node-usb-detection](https://github.com/MadLittleMods/node-usb-detection) and [node-usb-native](https://github.com/VSChina/serialport.node) libraries

## Compile instructions:

1. Clone this repo (+ submodules) and install dependencies
```bash
git clone --recurse-submodules https://github.com/matu6968/m5burner.git 
cd m5burner
yarn install
yarn install appdmg # only needed for making .dmg files and MacOS compatible only dependency
pip install pyinstaller
```
2. Recompile native dependencies
```bash
yarn postpackage
```
3. Test the app if it works (this checks if node modules are properly compiled)
```bash
yarn test
```
4. Compile the additional dependencies and package the app (untested on Mac OS platforms, so make an issue if there is a problem)
```bash
yarn package
```
## License
Due to the client having independent changes from the official version, it is under the MIT license.

### ⚠️ Warning: This does not cover images and icons used within this repository which are still M5Stack property.

For 3rd party libraries: see LICENSE-3rd-party

## USB Device Access Setup

Due to the migration of the client to use the node-usb library, several system changes may be required to use the new client depending on your system:

### Linux
Add the following udev rules to `/etc/udev/rules.d/99-usb-serial.rules`:

# CP210x devices
SUBSYSTEM=="usb", ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea60", MODE="0666"
# CH340/CH341 devices
SUBSYSTEM=="usb", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", MODE="0666"
# CH342 devices
SUBSYSTEM=="usb", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="55D2", MODE="0666"
# CH343 devices
SUBSYSTEM=="usb", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="55D3", MODE="0666"
# CH9102 devices
SUBSYSTEM=="usb", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="55D4", MODE="0666"
# FTDI devices
SUBSYSTEM=="usb", ATTRS{idVendor}=="0403", MODE="0666"
# ESP32-S3/-C6 devices with internal USB-CDC adapters
SUBSYSTEM=="usb", ATTRS{idVendor}=="303a", MODE="0666"

Then reload the rules:
```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### Windows
No additional setup required, but users need to have the appropriate USB-Serial drivers installed for the specific serial chipset on the device:

CH340, CH341 drivers: https://www.wch-ic.com/downloads/CH341SER_EXE.html (most common on ESP based devices)

CP2102 drivers: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers

CH342, CH343, CH9102 drivers: https://www.wch.cn/downloads/CH343SER_ZIP.html

FTDI drivers: https://ftdichip.com/drivers/vcp-drivers/

ESP32-S3/-C6 USB-CDC driver setup (guide to use with libusb): https://docs.espressif.com/projects/esp-idf/en/v5.4/esp32s3/api-guides/dfu.html?#api-guide-dfu-flash-win

### macOS
No additional setup required.
