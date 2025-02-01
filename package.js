const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define paths and constants
let ARCH = process.arch;
if (ARCH === 'arm') ARCH = 'armv7l';

// Get platform-specific output paths and settings
const getPlatformConfig = () => {
    const platform = process.platform;
    
    if (platform === 'darwin') {
        return {
            electronOutput: 'dist/mac/M5Burner.app/Contents/Resources/app',
            outputDir: `m5stack-${ARCH}.app`,
            electronBuildCmd: 'electron-builder --mac dmg',
            needsResourcesCopy: true
        };
    } else if (platform === 'win32') {
        return {
            electronOutput: `dist/win-${ARCH}-unpacked`,
            outputDir: `m5stack-${ARCH}`,
            electronBuildCmd: 'electron-builder --win',
            needsResourcesCopy: false
        };
    } else {
        // Linux
        return {
            electronOutput: ARCH === 'x64' ? 'dist/linux-unpacked' : `dist/linux-${ARCH}-unpacked`,
            outputDir: `m5stack-${ARCH}`,
            electronBuildCmd: 'electron-builder --linux',
            needsResourcesCopy: false
        };
    }
};

const platformConfig = getPlatformConfig();
const BASE_FOLDER = platformConfig.outputDir;
const ELECTRON_BUILD_CMD = platformConfig.electronBuildCmd;
const PYINSTALLER_CMD = 'pyinstaller --onefile esp-idf-nvs-partition-gen/esp_idf_nvs_partition_gen/nvs_partition_gen.py --distpath esp-idf-nvs-partition-gen/esp_idf_nvs_partition_gen/dist';
const ELECTRON_OUTPUT = platformConfig.electronOutput;
const BUILD_DIR = path.resolve('deps');
const OUTPUT_DIR = path.resolve(BASE_FOLDER);
const BIN_DIR = path.join(OUTPUT_DIR, 'bin');
const PACKAGES_DIR = path.join(OUTPUT_DIR, 'packages');
const TOOL_DIR = path.join(PACKAGES_DIR, 'tool');
const PYINSTALLER_BINARY = path.resolve('esp-idf-nvs-partition-gen/esp_idf_nvs_partition_gen/dist/nvs_partition_gen');
const FILE_TO_COPY = path.resolve(BUILD_DIR, '../assets/M5Burner');

// macOS specific paths
const MACOS_CONTENTS_DIR = path.join(OUTPUT_DIR, 'Contents');
const MACOS_RESOURCES_DIR = path.join(MACOS_CONTENTS_DIR, 'Resources');
const MACOS_FRAMEWORKS_DIR = path.join(MACOS_CONTENTS_DIR, 'Frameworks');
const MACOS_MACOS_DIR = path.join(MACOS_CONTENTS_DIR, 'MacOS');

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

// New function to handle macOS specific setup
function setupMacOSStructure() {
    if (process.platform !== 'darwin') return;

    console.log('Setting up macOS application structure...');
    
    // Create the standard macOS app bundle structure
    createFolder(MACOS_CONTENTS_DIR);
    createFolder(MACOS_RESOURCES_DIR);
    createFolder(MACOS_FRAMEWORKS_DIR);
    createFolder(MACOS_MACOS_DIR);

    // Copy Info.plist if it exists
    const infoPlistSource = path.resolve('build', 'Info.plist');
    if (fs.existsSync(infoPlistSource)) {
        fs.copyFileSync(infoPlistSource, path.join(MACOS_CONTENTS_DIR, 'Info.plist'));
    }

    // Copy icon file
    const iconSource = path.resolve('assets', 'm5.icns');
    if (fs.existsSync(iconSource)) {
        fs.copyFileSync(iconSource, path.join(MACOS_RESOURCES_DIR, 'm5.icns'));
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
    if (process.platform === 'darwin') {
        setupMacOSStructure();
    } else {
        createFolder(OUTPUT_DIR);
        createFolder(BIN_DIR);
        createFolder(PACKAGES_DIR);
        createFolder(TOOL_DIR);
    }

    // Step 5: Copy Electron Builder output
    console.log(`Copying Electron Builder output from ${ELECTRON_OUTPUT}...`);
    if (!fs.existsSync(ELECTRON_OUTPUT)) {
        console.error(`Electron output folder not found: ${ELECTRON_OUTPUT}`);
        process.exit(1);
    }

    const targetDir = process.platform === 'darwin' ? MACOS_RESOURCES_DIR : BIN_DIR;
    fs.cpSync(ELECTRON_OUTPUT, targetDir, { recursive: true });

    // Step 6: Copy dependency directory files
    const depsTargetDir = process.platform === 'darwin' ? 
        path.join(MACOS_RESOURCES_DIR, 'packages') : PACKAGES_DIR;
    
    console.log(`Copying dependencies from ${BUILD_DIR} to ${depsTargetDir}...`);
    if (fs.existsSync(BUILD_DIR)) {
        fs.cpSync(BUILD_DIR, depsTargetDir, { recursive: true });
    }

    // Step 7: Copy NVS tool
    const toolTargetDir = process.platform === 'darwin' ? 
        path.join(MACOS_RESOURCES_DIR, 'packages', 'tool') : TOOL_DIR;

    console.log(`Copying ESP NVS tool binary to ${toolTargetDir}...`);
    if (fs.existsSync(PYINSTALLER_BINARY)) {
        const renamedBinaryPath = path.join(toolTargetDir, 'nvs');
        fs.copyFileSync(PYINSTALLER_BINARY, renamedBinaryPath);
    }

    // Step 8: For macOS, create DMG
    if (process.platform === 'darwin') {
        console.log('Creating DMG file...');
        runCommand('create-dmg "m5stack-${ARCH}.app" dist/ || true');  // || true because create-dmg returns non-zero on warnings
    }

    console.log('Build and packaging process completed successfully.');
})();


