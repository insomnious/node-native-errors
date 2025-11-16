const path = require('path');
const util = require('util');
const cp = require('child_process');
const fs = require('fs');

async function spawn(command, args, options) {

  const proc = cp.spawn(command, args, {
    ...(options || {}),
    stdio: ['inherit', 'inherit', 'inherit'],
    shell: true,
  });

  return new Promise((resolve, reject) => {
    proc.on('close', code => {
      if (code === 0) {
	resolve();
      } else {
	let err = new Error(`process failed`);
	err.code = code;
	reject(err);
      }
    });
  });
}

// Find binary in multiple locations for yarn/pnpm compatibility
function findBin(name) {
  const exeExt = process.platform === 'win32' ? '.cmd' : '';
  const localBin = path.join(__dirname, 'node_modules', '.bin', name + exeExt);
  const hoistedBin = path.join(__dirname, '..', '..', '.bin', name + exeExt);

  if (fs.existsSync(localBin)) {
    return localBin;
  } else if (fs.existsSync(hoistedBin)) {
    return hoistedBin;
  } else {
    // Fallback to npx which should resolve correctly
    return name;
  }
}

async function main() {
	// git clone --recurse-submodules -j8 https://github.com/Microsoft/Detours || echo \"detours already cloned\"
  try {
    await spawn('git', ['clone', '--recurse-submodules', '-j8', 'https://github.com/Microsoft/Detours']);
  } catch (err) {
    if (err.code === 128) {
      console.log('clone failed', err.message);
    } else {
      return 1;
    }
  }

  await spawn('node', ['build_detours.js']);
  await spawn(findBin('autogypi'), []);
  await spawn(findBin('node-gyp'), ['configure', 'build']);
  return 0;
}

if (process.platform === 'win32') {
  return main();
} else {
  return 0;
}

