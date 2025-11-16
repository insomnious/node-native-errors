const cp = require('child_process');
const fs = require('fs');
const path = require('path');

function processVCVarsOutput(output) {
  const lines = output.split('\r\n');
  lines
    .filter(line => line.indexOf('=') !== -1)
    .forEach(line => {
      const [key, ...value] = line.split('=');
      process.env[key] = value.join(' ');
    });
}

function run(exe, args, cb) {
  let lastErr;

  let output = '';

  const proc = cp.spawn(exe, args, { shell: true });
  proc
    .on('close', code => {
      if (lastErr === undefined) {
        cb(null, output);
      } else {
        cb(lastErr);
      }
    })
    .on('error', err => {
      lastErr = err;
    });

  proc.stdout.on('data', data => output += data.toString());
  proc.stderr.on('data', data => console.error(data.toString()));
}

function runVCVars(exe, cb) {
  run('cmd.exe', ['/C', `""${exe}" && set"`], (err, output) => {
    if (output !== undefined) {
      processVCVarsOutput(output);
    }
    cb(err);
  });
}

function vcvars(cb) {
  let {vsInstallDir, VS140COMNTOOLS} = process.env;
  let candidates = [
    path.join(process.env['ProgramFiles(x86)'], 'Microsoft Visual Studio', '2022', 'BuildTools','VC', 'Auxiliary', 'Build', 'vcvars64.bat'),
    path.join(process.env['ProgramFiles(x86)'], 'Microsoft Visual Studio', '2022', 'Community','VC', 'Auxiliary', 'Build', 'vcvars64.bat'),
    path.join(process.env['ProgramFiles(x86)'], 'Microsoft Visual Studio', '2022', 'Enterprise','VC', 'Auxiliary', 'Build', 'vcvars64.bat'),
    path.join(process.env['ProgramFiles(x86)'], 'Microsoft Visual Studio', '2022', 'Professional','VC', 'Auxiliary', 'Build', 'vcvars64.bat'),
    path.join(process.env['ProgramFiles(x86)'], 'Microsoft Visual Studio', '2017', 'BuildTools','VC', 'Auxiliary', 'Build', 'vcvars64.bat'),
    path.join(process.env['ProgramFiles(x86)'], 'Microsoft Visual Studio', '2017', 'Community','VC', 'Auxiliary', 'Build', 'vcvars64.bat'),
    path.join(process.env['ProgramFiles(x86)'], 'Microsoft Visual Studio', '2017', 'Enterprise','VC', 'Auxiliary', 'Build', 'vcvars64.bat'),
    path.join(process.env['ProgramFiles(x86)'], 'Microsoft Visual Studio', '2017', 'Professional','VC', 'Auxiliary', 'Build', 'vcvars64.bat'),
    path.join(process.env['ProgramFiles(x86)'], 'Microsoft Visual Studio 14.0',  'VC', 'bin', 'amd64', 'vcvars64.bat')
  ]
  if (VS140COMNTOOLS !== undefined) {
    candidates.unshift(path.resolve(VS140COMNTOOLS, '..', '..', 'VC', 'bin', 'amd64', 'vcvars64.bat'));
  }
  if (vsInstallDir !== undefined) {
    candidates.unshift(path.join(vsInstallDir,'VC', 'Auxiliary', 'Build', 'vcvars64.bat'));
  }

  let vcvarsPaths = [];

  for (const candidate of candidates) {
    try {
      fs.statSync(candidate);
      vcvarsPaths.push(candidate);
    } catch { } // Node 10 syntax
  }
  if (vcvarsPaths.length == 0) {
    cb('Could not find a suitable version of visual studio ' +
    'installed.  Please set \n$Env:vsInstallDir, $Env:VS140COMNTOOLS, or ' + 
    'install a supported version.  Checked\n the following locations:\n\t' +
    candidates.join('\n\t'));
    return;
  }

  runVCVars(vcvarsPaths.shift(), cb);
}

vcvars(err => {
  if (err === null) {
    process.chdir('./Detours');
    run('nmake', [], (err, output) => {
      if (err !== null) {
        console.error('build failed', err);
        process.exit(1);
      }
      console.log('done')
      process.exit(0);
    });
  } else {
    console.error(err);
    process.exit(1);
  }
});

