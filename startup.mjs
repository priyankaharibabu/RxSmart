import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = __dirname;
const backendDir = join(projectRoot, 'rxsmart', 'backend');
const frontendDir = join(projectRoot, 'rxsmart', 'frontend');

console.log('\n========================================');
console.log('RxSmart System Startup');
console.log('========================================\n');

// Install backend deps
console.log('[1/4] Installing backend dependencies...');
const npmInstall = spawn('npm', ['install', 'googleapis'], { 
  cwd: backendDir,
  stdio: 'inherit',
  shell: true
});

npmInstall.on('close', (code) => {
  if (code !== 0) {
    console.error('Error installing dependencies');
    process.exit(1);
  }
  
  console.log('✓ Backend dependencies installed\n');
  
  // Start backend
  console.log('[2/4] Starting backend server on port 5001...');
  spawn('node', ['server.js'], { 
    cwd: backendDir,
    stdio: 'inherit',
    shell: true
  });
  
  console.log('✓ Backend started\n');
  
  // Wait 2 seconds then start frontend
  setTimeout(() => {
    console.log('[3/4] Starting frontend server on port 5173...');
    spawn('npm', ['run', 'dev'], { 
      cwd: frontendDir,
      stdio: 'inherit',
      shell: true
    });
    
    console.log('✓ Frontend started\n');
    
    // Wait 2 seconds then open browser
    setTimeout(() => {
      console.log('[4/4] Opening browser...');
      console.log('\n========================================');
      console.log('✓ System started successfully!');
      console.log('========================================\n');
      console.log('Frontend: http://localhost:5173/patient');
      console.log('Backend:  http://localhost:5001\n');
      
      open('http://localhost:5173/patient');
    }, 2000);
  }, 2000);
});
