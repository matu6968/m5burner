const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// Define paths and constants
let ARCH = process.arch;
if (ARCH === 'arm') ARCH = 'armv7l';

// Get platform-specific output paths and settings
const getPlatformConfig = () => {
    const platform = process.platform;
    
    if (platform === 'darwin') {
        return {
            electronOutput: ARCH === 'x64' ? 'dist/mac/M5Burner.app/Contents/Resources/app' : `dist/mac-${ARCH}/M5Burner.app/Contents/Resources/app`,
            outputDir: `m5stack-${ARCH}.app`,
            electronBuildCmd: 'electron-builder --mac dmg',
            needsResourcesCopy: true
        };
    } else if (platform === 'win32') {
        return {
            electronOutput: ARCH === 'x64' ? 'dist/win-unpacked' : `dist/win-${ARCH}-unpacked`,
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
const STARTUP_SCRIPT_LINUX = path.resolve(BUILD_DIR, '../assets/M5Burner');
const STARTUP_BINARY_WINDOWS = path.resolve(BUILD_DIR, '../assets/win32-launcher/precompiled/M5Burner.exe');

// macOS specific paths
const MACOS_CONTENTS_DIR = path.join(OUTPUT_DIR, 'Contents');
const MACOS_RESOURCES_DIR = path.join(MACOS_CONTENTS_DIR, 'Resources');
const MACOS_FRAMEWORKS_DIR = path.join(MACOS_CONTENTS_DIR, 'Frameworks');
const MACOS_MACOS_DIR = path.join(MACOS_CONTENTS_DIR, 'MacOS');

// Define Python utilities to compile
const PYTHON_UTILITIES = [
    {
        script: 'esp-idf-nvs-partition-gen/esp_idf_nvs_partition_gen/nvs_partition_gen.py',
        output: 'nvs'
    },
    {
        script: 'deps/tool/esptool.py',
        output: 'esptool'
    },
    {
        script: 'deps/tool/kflash.py',
        output: 'kflash'
    },
    {
        script: 'deps/tool/gen_esp32part.py',
        output: 'gen_esp32part'
    }
];

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

// Helper function to compile Python utilities with PyInstaller
function compilePythonUtilities() {
    if (process.platform !== 'win32') return;

    console.log('Compiling Python utilities with PyInstaller...');
    
    // Install required dependencies first
    console.log('Installing required Python dependencies...');
    try {
        execSync('pip install cryptography', { stdio: 'inherit' });
    } catch (err) {
        console.error('Failed to install cryptography dependency:', err);
        process.exit(1);
    }
    
    PYTHON_UTILITIES.forEach(util => {
        let pyinstallerCmd = `pyinstaller --onefile "${util.script}" --distpath "${path.join('packages', 'tool', 'dist')}" --name "${util.output}" --hidden-import cryptography`;
        
        // Add icon for esptool
        if (util.output === 'esptool') {
            const iconPath = path.resolve('assets', 'esptool.ico');
            if (fs.existsSync(iconPath)) {
                pyinstallerCmd += ` --icon "${iconPath}"`;
            } else {
                console.warn('esptool icon not found at:', iconPath);
            }
        }
        
        console.log(`Compiling ${util.script}...`);
        try {
            execSync(pyinstallerCmd, { stdio: 'inherit' });
        } catch (err) {
            console.error(`Failed to compile ${util.script}:`, err);
            process.exit(1);
        }
    });
}

// Helper function to copy compiled utilities
function copyCompiledUtilities(targetDir) {
    if (process.platform !== 'win32') return;

    console.log('Copying compiled Python utilities...');
    const distDir = path.join('packages', 'tool', 'dist');
    
    // Copy compiled Python executables
    PYTHON_UTILITIES.forEach(util => {
        const exeName = `${util.output}.exe`;
        const sourcePath = path.join(distDir, exeName);
        const targetPath = path.join(targetDir, exeName);
        
        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`Copied ${exeName} to ${targetDir}`);
        } else {
            console.warn(`Compiled utility not found: ${sourcePath}`);
        }
    });

    // Copy additional required binary files
    const additionalBinaries = [
        'burner_nvs.bin',
        'esp32_board_identify.bin'
    ];

    additionalBinaries.forEach(binFile => {
        const sourcePath = path.join(BUILD_DIR, 'tool', binFile);
        const targetPath = path.join(targetDir, binFile);
        
        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`Copied ${binFile} to ${targetDir}`);
        } else {
            console.warn(`Binary file not found: ${sourcePath}`);
        }
    });
}

// Helper function to clean up Python build artifacts
function cleanPythonBuildArtifacts() {
    if (process.platform !== 'win32') return;

    console.log('Cleaning up Python build artifacts...');
    const foldersToClean = ['build', 'dist', '__pycache__'];
    
    foldersToClean.forEach(folder => {
        const folderPath = path.join('packages', 'tool', folder);
        if (fs.existsSync(folderPath)) {
            fs.rmSync(folderPath, { recursive: true, force: true });
        }
    });

    // Clean up .spec files
    PYTHON_UTILITIES.forEach(util => {
        const specFile = path.join('packages', 'tool', `${util.output}.spec`);
        if (fs.existsSync(specFile)) {
            fs.unlinkSync(specFile);
        }
    });
}

// Get the short git commit hash if available
function getGitCommitHash() {
    try {
        const result = spawnSync('git', ['rev-parse', '--short', 'HEAD']);
        if (result.status === 0) {
            return result.stdout.toString().trim();
        }
    } catch (error) {
        console.warn('Git command failed, skipping commit hash');
    }
    return '';
}

// Generate timestamp-based version
function generateTimestampVersion() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}`;
}

// Create zip archive
function createZipArchive(sourceDir, version, gitHash) {
    const platform = process.platform === 'win32' ? 'win' : 
                    process.platform === 'darwin' ? 'mac' : `linux-${ARCH}`;
    
    // Construct zip filename
    let zipName = `M5Burner-${version}-${platform}`;
    if (gitHash) {
        zipName += `-${gitHash}`;
    }
    zipName += '.zip';

    console.log(`Creating zip archive: ${zipName}`);
    
    // Use system zip command
    const zipCommand = process.platform === 'win32' ?
        `powershell Compress-Archive -Path "${sourceDir}/*" -DestinationPath "${zipName}" -Force` :
        `zip -r "${zipName}" "${sourceDir}"/*`;
    
    try {
        execSync(zipCommand);
        console.log(`Successfully created ${zipName}`);
    } catch (error) {
        console.error('Failed to create zip archive:', error);
    }
}

// Main script
(function main() {
    console.log('Starting the build and packaging process...');

    // Step 1: Run electron-builder
    console.log('Running Electron Builder...');
    runCommand(ELECTRON_BUILD_CMD);

    // Step 2: Compile Python utilities on Windows
    if (process.platform === 'win32') {
        cleanPythonBuildArtifacts(); // Clean up any previous builds
        compilePythonUtilities();
    } else {
        // Original PyInstaller command for non-Windows platforms
        console.log('Compiling ESP NVS tool with PyInstaller...');
        runCommand(PYINSTALLER_CMD);
    }

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
        if (process.platform === 'win32') {
            // On Windows, only copy directories that aren't Python-related
            const dirsToExclude = ['esptool', 'intelhex', 'serial', '__pycache__', 'tool'];
            
            // Create the target directory
            createFolder(depsTargetDir);
            
            // Copy only non-excluded directories
            fs.readdirSync(BUILD_DIR).forEach(item => {
                const sourcePath = path.join(BUILD_DIR, item);
                const targetPath = path.join(depsTargetDir, item);
                
                if (fs.statSync(sourcePath).isDirectory() && !dirsToExclude.includes(item)) {
                    // Copy directories that are not in the exclude list
                    fs.cpSync(sourcePath, targetPath, { recursive: true });
                }
            });
        } else {
            // For non-Windows platforms, copy everything as before
            fs.cpSync(BUILD_DIR, depsTargetDir, { recursive: true });
        }
    }

    // Step 7: Handle Python utilities
    const toolTargetDir = process.platform === 'darwin' ? 
        path.join(MACOS_RESOURCES_DIR, 'packages', 'tool') : TOOL_DIR;

    if (process.platform === 'win32') {
        // Copy compiled Python utilities on Windows
        copyCompiledUtilities(toolTargetDir);
        // Clean up build artifacts
        cleanPythonBuildArtifacts();
    } else {
        // Original NVS tool copy for non-Windows platforms
        console.log(`Copying ESP NVS tool binary to ${toolTargetDir}...`);
        if (fs.existsSync(PYINSTALLER_BINARY)) {
            const renamedBinaryPath = path.join(toolTargetDir, 'nvs');
            fs.copyFileSync(PYINSTALLER_BINARY, renamedBinaryPath);
        }
    }

    // Step 8: For macOS, create DMG
    if (process.platform === 'darwin') {
        console.log('Creating DMG file...');
        runCommand('create-dmg "m5stack-${ARCH}.app" dist/ || true');  // || true because create-dmg returns non-zero on warnings
    }

    // Step 9: Copy the M5Burner startup script from the build directory to the root of the architecture folder if running on Windows or Linux
    if (process.platform === 'win32') {
        console.log(`Copying M5Burner startup binary from build directory to root of ${OUTPUT_DIR}...`);
        if (fs.existsSync(STARTUP_BINARY_WINDOWS)) {
            const destinationPath = path.join(OUTPUT_DIR, path.basename(STARTUP_BINARY_WINDOWS));
            fs.copyFileSync(STARTUP_BINARY_WINDOWS, destinationPath);
            console.log(`Copied file to: ${destinationPath}`);
        } else {
            console.warn(`File to copy not found: ${STARTUP_BINARY_WINDOWS}`);
        }
    } else if (process.platform === 'linux') {
        console.log(`Copying M5Burner startup script from build directory to root of ${OUTPUT_DIR}...`);
        if (fs.existsSync(STARTUP_SCRIPT_LINUX)) {
            const destinationPath = path.join(OUTPUT_DIR, path.basename(STARTUP_SCRIPT_LINUX));
            fs.copyFileSync(STARTUP_SCRIPT_LINUX, destinationPath);
            console.log(`Copied file to: ${destinationPath}`);
        } else {
            console.warn(`File to copy not found: ${STARTUP_SCRIPT_LINUX}`);
        }
    } else {
        console.log('You are not running Linux or Windows, skipping startup script/binary copy');
    }
    
    // Generate and write appVersion.info
    const timestampVersion = generateTimestampVersion();
    const appVersionPath = path.join(PACKAGES_DIR, 'appVersion.info');
    
    console.log('Creating appVersion.info...');
    fs.writeFileSync(appVersionPath, timestampVersion);
    
    // Check if --new-release flag is present
    if (process.argv.includes('--new-release')) {
        console.log('Creating release archive...');
        
        // Read version from package.json
        const packageJsonPath = path.resolve('package.json');
        let version;
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            version = packageJson.version;
        } catch (error) {
            console.error('Failed to read package.json:', error);
            process.exit(1);
        }
        
        // Get git commit hash
        const gitHash = getGitCommitHash();
        
        // Create zip archive
        createZipArchive(OUTPUT_DIR, version, gitHash);
    }
    
    console.log('Build and packaging process completed successfully.');
})();


