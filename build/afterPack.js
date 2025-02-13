exports.default = async function(context) {
  const fs = require('fs');
  const path = require('path');

  // List of patterns to remove
  const patternsToRemove = [
    'locales',
    'resources/app/node_modules/**/{CHANGELOG.md,README.md,README,readme.md,readme,test,__tests__,tests}',
    'resources/app/node_modules/**/*.{ts,map,html,markdown,md}',
    'resources/app/node_modules/**/.bin',
    'swiftshader',
  ];

  // Get the output directory
  const outDir = context.appOutDir;

  // Remove files matching patterns
  for (const pattern of patternsToRemove) {
    const fullPath = path.join(outDir, pattern);
    try {
      if (fs.existsSync(fullPath)) {
        if (fs.lstatSync(fullPath).isDirectory()) {
          fs.rmdirSync(fullPath, { recursive: true });
        } else {
          fs.unlinkSync(fullPath);
        }
      }
    } catch (err) {
      console.warn(`Warning: Could not remove ${fullPath}`, err);
    }
  }
};
