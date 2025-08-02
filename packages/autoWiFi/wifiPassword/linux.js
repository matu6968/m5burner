const { exec } = require('child_process')
const fs = require('fs');

module.exports = function getPassword(ssid) {
  return new Promise(resolve => {
    // Helper function to execute a command and return its output and exit code
    const runCommand = (command) => {
      return new Promise(cmdResolve => {
        let output = ''
        const proc = exec(command)
        proc.stdout.on('data', chunk => {
          output += chunk.toString()
        })
        proc.on('exit', code => {
          cmdResolve({ output, code })
        })
        proc.on('error', err => {
          // Treat command execution errors (e.g., command not found) as a failure
          console.error(`Error executing command "${command}":`, err.message);
          cmdResolve({ output: '', code: 1 });
        });
      })
    }

    // Attempt 1: Read from .nmconnection file using native Node.js fs module
    const filePath = `/etc/NetworkManager/system-connections/${ssid}.nmconnection`;
    fs.promises.readFile(filePath, { encoding: 'utf8' })
      .then(fileContent => {
        const match = fileContent.match(/^\s*(?:psk|password)=(.+)\s*$/m);
        if (match && match[1]) {
          resolve(match[1].trim());
          return;
        }
        // If password not found in file, try next method
        return runCommand(`nmcli device wifi show-password`);
      })
      .catch(err => {
        // If file not found or other error, try next method
        console.warn(`Error reading ${filePath}:`, err.message);
        return runCommand(`nmcli device wifi show-password`);
      })
      .then(result => {
        if (!result) {
          // If no result from previous step, try next method
          return runCommand(`nmcli connection show "${ssid}" --show-secrets`);
        }
        
        const { output, code } = result;
        if (code === 0) {
          const match = output.match(/^Password:\s*(.+)$/m);
          if (match && match[1]) {
            resolve(match[1].trim());
            return;
          }
        }
        // If not found or command failed, try next method
        return runCommand(`nmcli connection show "${ssid}" --show-secrets`);
      })
      .then(result => {
        if (!result) {
          // If no result from previous step, resolve with empty string
          resolve('');
          return;
        }
        
        const { output, code } = result;
        if (code === 0) {
          const match = output.match(/^802-11-wireless-security\.psk:\s*(.+)$/m);
          if (match && match[1]) {
            resolve(match[1].trim());
            return;
          }
        }
        // If all attempts fail
        resolve('');
      })
      .catch(err => {
        // Catch any unexpected errors in the promise chain
        console.error("An unexpected error occurred while getting WiFi password:", err);
        resolve('');
      });
  });
};