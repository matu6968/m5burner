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
# --recurse-submodules is needed to clone esp-idf-nvs-partition-gen submodule
# if you forgot to do so, run git submodule update --init after cloning
cd m5burner
yarn install
pip install pyinstaller
# To install libnotify dependencies for Linux launcher to build depending on distro
sudo apt install libnotify-dev # on Ubuntu/Debian systems
sudo pacman -S libnotify # on Arch Linux systems
sudo dnf install libnotify # on Fedora systems
sudo zypper install libnotify # on openSUSE systems
# for other distros, refer to your distro's package manager for libnotify equivalent
```
2. Recompile native dependencies
```bash
yarn postpackage
```
3. Test the app if it works (this checks if node modules are properly compiled)
```bash
yarn test
```
### If you are on a 32 bit ARM system and getting a no native build was found error, you need to rebuild the native modules for the ARMv7l architecture using the following command:
```bash
yarn rebuild-native-modules-arm
```

4. Compile the additional dependencies and package the app (untested on Mac OS platforms, so make an issue if there is a problem)
```bash
yarn package
```
### Other flags are supported for the build process:

`--new-release` - builds a new release then packages into a archive file depending on the platform
`--pi-apps` - builds a version of the app for Pi-Apps (ideally use the --new-release flag when using this so that you have a new release for uploading on release page if you are a maintainer)
`--time-sync` - delays the time present on appVersion.info by the next 10 minute interval (for example, if the build started at 12:00, and the build ends at 12:06, it will have file output it as 12:00)
`--legacy-release` specify a Electron version to use for the release for this build by it's major version (for example, `--legacy-release 22` will use Electron 22.x.x, ideal for older systems that don't support the latest Electron version)
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
