const https = require('https');

function fetchOgImage(urlStr) {
  return new Promise((resolve, reject) => {
    https.get(urlStr, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
        if (match) {
          resolve(match[1]);
        } else {
          resolve(null);
        }
      });
    }).on('error', err => reject(err));
  });
}

async function main() {
  const urls = [
    'https://www.vecteezy.com/photo/60568941-a-person-riding-a-go-kart-at-night',
    'https://www.huntleyequestrian.com/blogs/press/is-horse-riding-a-sport',
    'https://www.gunforglory.in/air-rifle-vs-air-pistol/'
  ];
  for (const url of urls) {
    try {
      const img = await fetchOgImage(url);
      console.log(url + ' => ' + img);
    } catch (e) {
      console.error(url + ' => Error');
    }
  }
}

main();
