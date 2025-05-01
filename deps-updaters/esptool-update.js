const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Constants
const TEMP_DIR = path.resolve('.temp-esptool');
const ESPTOOL_REPO = 'https://github.com/espressif/esptool.git';
const ESPTOOL_DEST = path.resolve('../deps/tool');

// Helper function to clean up directories
function cleanDirectory(dir) {
    if (fs.existsSync(dir)) {
        console.log(`Cleaning up ${dir}...`);
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

// Helper function to get git commit hash
function getGitCommitHash(dir) {
    try {
        return execSync('git rev-parse HEAD', { cwd: dir }).toString().trim();
    } catch (error) {
        console.error('Failed to get git commit hash:', error);
        return null;
    }
}

// Helper function to get esptool version
function getEsptoolVersion(dir) {
    const initPath = path.join(dir, 'esptool', '__init__.py');
    try {
        const content = fs.readFileSync(initPath, 'utf8');
        const versionMatch = content.match(/__version__\s*=\s*['"]([^'"]+)['"]/);
        return versionMatch ? versionMatch[1] : null;
    } catch (error) {
        console.error('Failed to read esptool version:', error);
        return null;
    }
}

// Main update function
async function updateEsptool() {
    console.log('Starting esptool update process...');

    // Clean up any existing temporary directory
    cleanDirectory(TEMP_DIR);

    try {
        // Create temporary directory
        fs.mkdirSync(TEMP_DIR, { recursive: true });

        // Clone esptool repository
        console.log('Cloning esptool repository...');
        execSync(`git clone ${ESPTOOL_REPO} ${TEMP_DIR}`, { stdio: 'inherit' });

        // Get commit hash before copying
        const commitHash = getGitCommitHash(TEMP_DIR);
        const version = getEsptoolVersion(TEMP_DIR);

        // Copy esptool.py
        console.log('Updating esptool.py...');
        fs.copyFileSync(
            path.join(TEMP_DIR, 'esptool.py'),
            path.join(ESPTOOL_DEST, 'esptool.py')
        );

        // Clean existing esptool directory if it exists
        cleanDirectory(path.join(ESPTOOL_DEST, 'esptool'));

        // Copy esptool directory
        console.log('Updating esptool package...');
        fs.cpSync(
            path.join(TEMP_DIR, 'esptool'),
            path.join(ESPTOOL_DEST, 'esptool'),
            { recursive: true }
        );

        // Print update information
        console.log('\nesptool update completed successfully! 🎉');
        if (version) {
            console.log(`Updated to version: ${version}`);
        }
        if (commitHash) {
            console.log(`Git commit: ${commitHash}`);
        }

    } catch (error) {
        console.error('Failed to update esptool:', error);
        process.exit(1);
    } finally {
        // Clean up temporary directory
        cleanDirectory(TEMP_DIR);
    }
}

// Run the update
updateEsptool().catch(error => {
    console.error('Update process failed:', error);
    process.exit(1);
});
