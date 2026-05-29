const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const dbPath = path.join(__dirname, '../public/games-database.json');
let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const checkIframe = (urlStr) => {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlStr);
      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 }, (res) => {
        const xFrame = res.headers['x-frame-options'];
        const csp = res.headers['content-security-policy'];
        
        if (res.statusCode >= 400) {
          resolve({ ok: false, reason: `Status ${res.statusCode}` });
          return;
        }

        if (xFrame) {
          const val = xFrame.toLowerCase();
          if (val === 'deny' || val === 'sameorigin') {
            resolve({ ok: false, reason: `X-Frame-Options: ${xFrame}` });
            return;
          }
        }
        
        if (csp) {
          const val = csp.toLowerCase();
          if (val.includes('frame-ancestors \'none\'') || val.includes('frame-ancestors \'self\'')) {
            resolve({ ok: false, reason: `CSP frame-ancestors` });
            return;
          }
        }
        
        resolve({ ok: true });
      });
      
      req.on('error', (err) => resolve({ ok: false, reason: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, reason: 'Timeout' }); });
      req.end();
    } catch(e) {
      resolve({ ok: false, reason: 'Invalid URL' });
    }
  });
};

async function main() {
  const workingGames = [];
  console.log(`Checking ${db.length} games for iframe compatibility...`);
  
  for (const game of db) {
    process.stdout.write(`Checking ${game.name}... `);
    const result = await checkIframe(game.play_url);
    if (result.ok) {
      console.log('✅ OK');
      workingGames.push(game);
    } else {
      console.log(`❌ Failed: ${result.reason}`);
    }
  }
  
  console.log(`\nFound ${workingGames.length} working games out of ${db.length}.`);
  // Overwrite database with only working games
  fs.writeFileSync(dbPath, JSON.stringify(workingGames, null, 2));
}

main();
