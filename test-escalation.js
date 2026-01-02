import http from 'http';

async function makeRequest() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/captcha/lockout',
      method: 'POST'
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(data);
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  console.log('Testing ban escalation...\n');
  
  for (let i = 1; i <= 4; i++) {
    console.log(`Request ${i}:`);
    const response = await makeRequest();
    console.log(response);
    console.log('');
    
    if (i < 4) {
      console.log('Waiting 2 seconds...\n');
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  console.log('Done! Check bans with: npm run list-bans');
}

test().catch(console.error);
