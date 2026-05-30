const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const dbPath = path.join(__dirname, '../public/games-database.json');
const thumbsDir = path.join(__dirname, '../public/thumbnails');

if (!fs.existsSync(thumbsDir)) {
  fs.mkdirSync(thumbsDir);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Status ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

async function main() {
  for (const game of db) {
    if (!game.thumbnail || game.thumbnail.startsWith('/placeholder.png') || game.thumbnail.startsWith('http')) {
      const ext = '.png';
      const destFile = `${game.id}${ext}`;
      const destPath = path.join(thumbsDir, destFile);
      
      console.log(`Downloading ${game.thumbnail}...`);
      try {
        if (!game.thumbnail.startsWith('http')) throw new Error('Not HTTP');
        await download(game.thumbnail, destPath);
        game.thumbnail = `/thumbnails/${destFile}`;
        console.log(`Success: ${game.id}`);
      } catch (e) {
        console.log(`Failed for ${game.id}, falling back to Favicon...`);
        try {
          const domain = new URL(game.play_url).hostname;
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
          await download(faviconUrl, destPath);
          game.thumbnail = `/thumbnails/${destFile}`;
          console.log(`Favicon Success: ${game.id}`);
        } catch (err2) {
           console.log(`Favicon Failed for ${game.id}`);
        }
      }
    }
  }
  
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  console.log('Finished downloading thumbnails!');
}

main();
