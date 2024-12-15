const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define paths and constants
const ARCH = process.arch; // Get architecture (e.g., arm64, x64)
const BASE_FOLDER = `m5stack-${ARCH}`;
const ELECTRON_BUILD_CMD = 'electron-builder';
const PYINSTALLER_CMD = 'pyinstaller --onefile esp-idf-nvs-partition-gen/esp_idf_nvs_partition_gen/nvs_partition_gen.py --distpath esp-idf-nvs-partition-gen/esp_idf_nvs_partition_gen/dist';
const ELECTRON_OUTPUT = `dist/linux-${ARCH}-unpacked`;
const BUILD_DIR = path.resolve('deps_package');
const OUTPUT_DIR = path.resolve(BASE_FOLDER);
const BIN_DIR = path.join(OUTPUT_DIR, 'bin');
const PACKAGES_DIR = path.join(OUTPUT_DIR, 'packages');
const TOOL_DIR = path.join(PACKAGES_DIR, 'tool');
const PYINSTALLER_BINARY = path.resolve('esp-idf-nvs-partition-gen/esp_idf_nvs_partition_gen/dist/nvs_partition_gen');
const FILE_TO_COPY = path.resolve(BUILD_DIR, '../assets/M5Burner');

// Helper function to run shell commands
function runCommand(command) {
    console.log(`Running command: ${command}`);
    try {
        execSync(command, { stdio: 'inherit' });
    } catch (err) {
        console.error(`Error running command: ${command}`, err);
        process.exit(1);
    }
}

// Clean up existing folder
function cleanUp(folder) {
    if (fs.existsSync(folder)) {
        console.log(`Deleting existing folder: ${folder}`);
        fs.rmSync(folder, { recursive: true, force: true });
    }
}

// Create a folder if it doesn't exist
function createFolder(folder) {
    if (!fs.existsSync(folder)) {
        console.log(`Creating folder: ${folder}`);
        fs.mkdirSync(folder, { recursive: true });
    }
}

// Main script
(function main() {
    console.log('Starting the build and packaging process...');

    // Step 1: Run electron-builder
    console.log('Running Electron Builder...');
    runCommand(ELECTRON_BUILD_CMD);

    // Step 2: Compile ESP NVS Partition Generator Utility with PyInstaller
    console.log('Compiling ESP NVS tool with PyInstaller...');
    runCommand(PYINSTALLER_CMD);

    // Step 3: Clean up existing architecture folder
    cleanUp(OUTPUT_DIR);

    // Step 4: Create required folder structure
    createFolder(OUTPUT_DIR);
    createFolder(BIN_DIR);
    createFolder(PACKAGES_DIR);
    createFolder(TOOL_DIR);

    // Step 5: Copy Electron Builder output to bin folder
    console.log(`Copying Electron Builder output from ${ELECTRON_OUTPUT} to ${BIN_DIR}...`);
    if (!fs.existsSync(ELECTRON_OUTPUT)) {
        console.error(`Electron output folder not found: ${ELECTRON_OUTPUT}`);
        process.exit(1);
    }
    fs.cpSync(ELECTRON_OUTPUT, BIN_DIR, { recursive: true });

    // Step 6: Copy dependency directory files to packages folder
    console.log(`Copying dependencies (esptool.py) from build directory (${BUILD_DIR}) to ${PACKAGES_DIR}...`);
    if (fs.existsSync(BUILD_DIR)) {
        fs.cpSync(BUILD_DIR, PACKAGES_DIR, { recursive: true });
    } else {
        console.warn(`Build directory not found: ${BUILD_DIR}`);
    }

    // Step 7: Copy arm64 compiled NVS Partition Generator Utility to tool folder inside packages
    console.log(`Copying ESP NVS tool binary to ${TOOL_DIR}...`);
    if (fs.existsSync(PYINSTALLER_BINARY)) {
        const renamedBinaryPath = path.join(TOOL_DIR, 'nvs');
        fs.copyFileSync(PYINSTALLER_BINARY, renamedBinaryPath);
        console.log(`Renamed and copied binary to: ${renamedBinaryPath}`);
    } else {
        console.error(`ESP NVS tool binary not found: ${PYINSTALLER_BINARY}`);
        process.exit(1);
    }

    // Step 8: Copy the M5Burner startup script from the build directory to the root of the architecture folder
    console.log(`Copying M5Burner startup script from build directory to root of ${OUTPUT_DIR}...`);
    if (fs.existsSync(FILE_TO_COPY)) {
        const destinationPath = path.join(OUTPUT_DIR, path.basename(FILE_TO_COPY));
        fs.copyFileSync(FILE_TO_COPY, destinationPath);
        console.log(`Copied file to: ${destinationPath}`);
    } else {
        console.warn(`File to copy not found: ${FILE_TO_COPY}`);
    }

    // Step 9: Clean up PyInstaller output folder
    const pyinstallerOutputFolder = path.dirname(PYINSTALLER_BINARY);
    if (fs.existsSync(pyinstallerOutputFolder)) {
        console.log(`Cleaning up PyInstaller output folder: ${pyinstallerOutputFolder}`);
        cleanUp(pyinstallerOutputFolder);
    }

    console.log('Build and packaging process completed successfully.');
})();


