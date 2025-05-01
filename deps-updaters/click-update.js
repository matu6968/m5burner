const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Constants
const TEMP_DIR = path.resolve('.temp-click');
const CLICK_REPO = 'https://github.com/pallets/click.git';
const CLICK_DEST = path.resolve('../deps/tool');

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

// Helper function to get click version
function getClickVersion(dir) {
    const initPath = path.join(dir, 'pyproject.toml');
    try {
        const content = fs.readFileSync(initPath, 'utf8');
        const versionMatch = content.match(/version\s*=\s*['"]([^'"]+)['"]/);
        return versionMatch ? versionMatch[1] : null;
    } catch (error) {
        console.error('Failed to read click version:', error);
        return null;
    }
}

// Main update function
async function updateClick() {
    console.log('Starting click update process...');

    // Clean up any existing temporary directory
    cleanDirectory(TEMP_DIR);

    try {
        // Create temporary directory
        fs.mkdirSync(TEMP_DIR, { recursive: true });

        // Clone click repository
        console.log('Cloning click repository...');
        execSync(`git clone ${CLICK_REPO} ${TEMP_DIR}`, { stdio: 'inherit' });

        // Get commit hash before copying
        const commitHash = getGitCommitHash(TEMP_DIR);
        const version = getClickVersion(TEMP_DIR);

        // Clean existing click directory if it exists
        cleanDirectory(path.join(CLICK_DEST, 'click'));

        // Copy rich_click directory
        console.log('Updating click package...');
        fs.cpSync(
            path.join(TEMP_DIR, 'src', 'click'),
            path.join(CLICK_DEST, 'click'),
            { recursive: true }
        );

        // Print update information
        console.log('\nclick update completed successfully! 🎉');
        if (version) {
            console.log(`Updated to version: ${version}`);
        }
        if (commitHash) {
            console.log(`Git commit: ${commitHash}`);
        }

    } catch (error) {
        console.error('Failed to update click:', error);
        process.exit(1);
    } finally {
        // Clean up temporary directory
        cleanDirectory(TEMP_DIR);
    }
}

// Run the update
updateClick().catch(error => {
    console.error('Update process failed:', error);
    process.exit(1);
});
