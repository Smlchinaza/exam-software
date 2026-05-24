const fs = require('fs');
const path = require('path');

async function saveBufferToPath(buffer, destPath) {
  const fullPath = path.join(__dirname, '..', destPath);
  const dir = path.dirname(fullPath);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(fullPath, buffer);
  return destPath.replace(/\\/g, '/');
}

module.exports = {
  saveBufferToPath
};
