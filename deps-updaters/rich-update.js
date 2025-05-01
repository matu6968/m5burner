const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Constants
const TEMP_DIR = path.resolve('.temp-rich');
const RICH_REPO = 'https://github.com/Textualize/rich.git';
const RICH_DEST = path.resolve('../deps/tool');

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

// Helper function to get rich version
function getRichVersion(dir) {
    const initPath = path.join(dir, 'pyproject.toml');
    try {
        const content = fs.readFileSync(initPath, 'utf8');
        const versionMatch = content.match(/version\s*=\s*['"]([^'"]+)['"]/);
        return versionMatch ? versionMatch[1] : null;
    } catch (error) {
        console.error('Failed to read rich version:', error);
        return null;
    }
}

// Main update function
async function updateRich() {
    console.log('Starting rich update process...');

    // Clean up any existing temporary directory
    cleanDirectory(TEMP_DIR);

    try {
        // Create temporary directory
        fs.mkdirSync(TEMP_DIR, { recursive: true });

        // Clone rich repository
        console.log('Cloning rich repository...');
        execSync(`git clone ${RICH_REPO} ${TEMP_DIR}`, { stdio: 'inherit' });

        // Get commit hash before copying
        const commitHash = getGitCommitHash(TEMP_DIR);
        const version = getRichVersion(TEMP_DIR);

        // Clean existing rich directory if it exists
        cleanDirectory(path.join(RICH_DEST, 'rich'));

        // Copy rich directory
        console.log('Updating rich package...');
        fs.cpSync(
            path.join(TEMP_DIR, 'rich'),
            path.join(RICH_DEST, 'rich'),
            { recursive: true }
        );

        // Print update information
        console.log('\nrich update completed successfully! 🎉');
        if (version) {
            console.log(`Updated to version: ${version}`);
        }
        if (commitHash) {
            console.log(`Git commit: ${commitHash}`);
        }

    } catch (error) {
        console.error('Failed to update rich:', error);
        process.exit(1);
    } finally {
        // Clean up temporary directory
        cleanDirectory(TEMP_DIR);
    }
}

// Run the update
updateRich().catch(error => {
    console.error('Update process failed:', error);
    process.exit(1);
});
