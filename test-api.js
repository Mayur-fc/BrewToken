const http = require('http');

const tests = [
  { name: 'GET /api/products', method: 'GET', path: '/api/products' },
  { name: 'POST /api/admin/login', method: 'POST', path: '/api/admin/login', body: { username: 'admin', password: 'admin123' } },
];

let completed = 0;

tests.forEach(test => {
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: test.path,
    method: test.method,
    headers: { 'Content-Type': 'application/json' },
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`\n✅ ${test.name}`);
      console.log(`Status: ${res.statusCode}`);
      try {
        console.log('Response:', JSON.parse(data));
      } catch {
        console.log('Response:', data);
      }
      completed++;
      if (completed === tests.length) process.exit(0);
    });
  });

  req.on('error', (err) => {
    console.error(`❌ ${test.name}: ${err.message}`);
    completed++;
    if (completed === tests.length) process.exit(1);
  });

  if (test.body) req.write(JSON.stringify(test.body));
  req.end();
});
