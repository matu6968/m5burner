const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { version } = require('../package.json');

// Files to include in update package
const UPDATE_FILES = [
  'packages/**/*',
  'node_modules/**/*',
  'assets/**/*',
  // Add other files needed for updates
];

function createUpdatePackage(platform, arch) {
  const filename = `m5burner-${version}-${platform}-${arch}.zip`;
  const output = fs.createWriteStream(path.join('dist', 'updates', filename));
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`Created update package: ${filename}`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add update files
    UPDATE_FILES.forEach(pattern => {
      archive.glob(pattern);
    });

    archive.finalize();
  });
}

async function main() {
  // Create updates directory
  if (!fs.existsSync('dist/updates')) {
    fs.mkdirSync('dist/updates', { recursive: true });
  }

  // Create packages for each platform
  await Promise.all([
    createUpdatePackage('win', 'x64'),
    createUpdatePackage('linux', 'x64'),
    createUpdatePackage('mac', 'arm64'),
    createUpdatePackage('mac', 'x64')
  ]);

  // Create version.json
  const versionInfo = {
    version,
    required: false,
    notes: "Update notes here",
    minVersion: "3.0.0"
  };

  fs.writeFileSync(
    path.join('dist', 'updates', 'version.json'),
    JSON.stringify(versionInfo, null, 2)
  );
}

main().catch(console.error); 