const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Constants
const TEMP_DIR = path.resolve('.temp-rich-click');
const RICH_CLICK_REPO = 'https://github.com/ewels/rich-click.git';
const RICH_CLICK_DEST = path.resolve('deps/tool');

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

// Helper function to get rich_click version
function getRichClickVersion(dir) {
    const initPath = path.join(dir, 'src', 'rich_click', '__init__.py');
    try {
        const content = fs.readFileSync(initPath, 'utf8');
        const versionMatch = content.match(/__version__\s*=\s*['"]([^'"]+)['"]/);
        return versionMatch ? versionMatch[1] : null;
    } catch (error) {
        console.error('Failed to read rich_click version:', error);
        return null;
    }
}

// Main update function
async function updateRichClick() {
    console.log('Starting rich_click update process...');

    // Clean up any existing temporary directory
    cleanDirectory(TEMP_DIR);

    try {
        // Create temporary directory
        fs.mkdirSync(TEMP_DIR, { recursive: true });

        // Clone esptool repository
        console.log('Cloning rich_click repository...');
        execSync(`git clone ${RICH_CLICK_REPO} ${TEMP_DIR}`, { stdio: 'inherit' });

        // Get commit hash before copying
        const commitHash = getGitCommitHash(TEMP_DIR);
        const version = getRichClickVersion(TEMP_DIR);

        // Clean existing rich_click directory if it exists
        cleanDirectory(path.join(RICH_CLICK_DEST, 'rich_click'));

        // Copy rich_click directory
        console.log('Updating rich_click package...');
        fs.cpSync(
            path.join(TEMP_DIR, 'src', 'rich_click'),
            path.join(RICH_CLICK_DEST, 'rich_click'),
            { recursive: true }
        );

        // Print update information
        console.log('\nrich_click update completed successfully! 🎉');
        if (version) {
            console.log(`Updated to version: ${version}`);
        }
        if (commitHash) {
            console.log(`Git commit: ${commitHash}`);
        }

    } catch (error) {
        console.error('Failed to update rich_click:', error);
        process.exit(1);
    } finally {
        // Clean up temporary directory
        cleanDirectory(TEMP_DIR);
    }
}

// Run the update
updateRichClick().catch(error => {
    console.error('Update process failed:', error);
    process.exit(1);
});
