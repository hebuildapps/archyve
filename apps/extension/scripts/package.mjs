import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionRoot = path.resolve(__dirname, '..');
const distDir = path.join(extensionRoot, 'dist');
const distEdgeDir = path.join(distDir, 'edge');
const distChromeDir = path.join(distDir, 'chrome');
const distFirefoxDir = path.join(distDir, 'firefox');
const packagesDir = path.join(extensionRoot, 'packages');

// Read manifest template
const manifestPath = path.join(extensionRoot, 'manifest.json');
const baseManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Common assets
const staticFiles = ['options.html', 'welcome.html', 'popup.html'];

// Ensure directories exist
fs.mkdirSync(distEdgeDir, { recursive: true });
fs.mkdirSync(distChromeDir, { recursive: true });
fs.mkdirSync(distFirefoxDir, { recursive: true });
fs.mkdirSync(packagesDir, { recursive: true });

function copyStaticAssets(targetDir) {
  for (const file of staticFiles) {
    const src = path.join(extensionRoot, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(targetDir, file));
    }
  }

  // Copy assets folder (icons)
  const assetsSrc = path.join(extensionRoot, 'assets');
  const assetsDest = path.join(targetDir, 'assets');
  if (fs.existsSync(assetsSrc)) {
    fs.cpSync(assetsSrc, assetsDest, { recursive: true });
  }
}

function copyCompiledJs(targetDir) {
  const files = [
    'background.js',
    'background.js.map',
    'content.js',
    'content.js.map',
    'options.js',
    'options.js.map',
    'welcome.js',
    'welcome.js.map',
    'popup.js',
    'popup.js.map'
  ];
  for (const file of files) {
    const src = path.join(distDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(targetDir, file));
    }
  }
}

// 1. Edge Dist & Manifest
const edgeManifest = { ...baseManifest };
fs.writeFileSync(
  path.join(distEdgeDir, 'manifest.json'),
  JSON.stringify(edgeManifest, null, 2)
);
copyStaticAssets(distEdgeDir);
copyCompiledJs(distEdgeDir);

// 2. Chrome Dist & Manifest
const chromeManifest = { ...baseManifest };
fs.writeFileSync(
  path.join(distChromeDir, 'manifest.json'),
  JSON.stringify(chromeManifest, null, 2)
);
copyStaticAssets(distChromeDir);
copyCompiledJs(distChromeDir);

// 3. Firefox Dist & Manifest
const firefoxManifest = {
  ...baseManifest,
  background: {
    scripts: ['background.js']
  },
  browser_specific_settings: {
    gecko: {
      id: 'archyve-v2@extension.local',
      strict_min_version: '109.0'
    }
  }
};
fs.writeFileSync(
  path.join(distFirefoxDir, 'manifest.json'),
  JSON.stringify(firefoxManifest, null, 2)
);
copyStaticAssets(distFirefoxDir);
copyCompiledJs(distFirefoxDir);

console.log('✓ Prepared unpacked folders:');
console.log('   - Edge: dist/edge');
console.log('   - Chrome: dist/chrome');
console.log('   - Firefox: dist/firefox');

// 4. Create zip packages using cross-platform zip / PowerShell fallback
function createZip(sourceDir, zipName) {
  const outputPath = path.join(packagesDir, zipName);
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }
  try {
    execSync(`cd "${sourceDir}" && zip -r -q "${outputPath}" ./*`);
    console.log(`✓ Generated ${zipName} (${outputPath})`);
  } catch (err) {
    try {
      execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${sourceDir}/*' -DestinationPath '${outputPath}' -Force"`);
      console.log(`✓ Generated ${zipName} via PowerShell (${outputPath})`);
    } catch (psErr) {
      console.warn(`Packaging failed for ${zipName}:`, psErr.message);
    }
  }
}

createZip(distEdgeDir, 'archyve-v2-edge.zip');
createZip(distChromeDir, 'archyve-v2-chrome.zip');
createZip(distFirefoxDir, 'archyve-v2-firefox.zip');
console.log('✓ All packaging complete!');
