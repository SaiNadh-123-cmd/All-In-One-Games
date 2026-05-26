import simpleGit from 'simple-git';
import { exec } from 'child_process';
import * as path from 'path';

export async function cloneRepository(cloneCmd: string, destDir: string, onProgress: (msg: string) => void): Promise<boolean> {
  return new Promise((resolve) => {
    onProgress(`Executing: ${cloneCmd} in parent of ${destDir}`);
    // Since git clone creates the folder, we should run it in the parent directory
    const parentDir = path.dirname(destDir);
    
    // Create the parent directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // Usually, "git clone <url>" creates a folder based on repo name.
    // If the command doesn't end with destDir, we should append it to force it to clone into destDir
    const finalCmd = cloneCmd.includes(path.basename(destDir)) ? cloneCmd : `${cloneCmd} "${destDir}"`;

    const child = exec(finalCmd, { cwd: parentDir });

    child.stdout?.on('data', (data) => {
      onProgress(`STDOUT: ${data.toString()}`);
    });

    child.stderr?.on('data', (data) => {
      onProgress(`STDERR: ${data.toString()}`);
    });

    child.on('close', (code) => {
      onProgress(`Clone process exited with code ${code}`);
      resolve(code === 0);
    });
  });
}

export async function buildGame(buildCmd: string, cwd: string, onOutput: (msg: string) => void): Promise<boolean> {
  return new Promise((resolve) => {
    onOutput(`Starting build: ${buildCmd} in ${cwd}`);
    const child = exec(buildCmd, { cwd });

    child.stdout?.on('data', (data) => {
      onOutput(`STDOUT: ${data.toString()}`);
    });

    child.stderr?.on('data', (data) => {
      onOutput(`STDERR: ${data.toString()}`);
    });

    child.on('close', (code) => {
      onOutput(`Build process exited with code ${code}`);
      resolve(code === 0);
    });
  });
}
