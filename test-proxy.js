/* eslint-disable */
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/planned/FY2025-2026/export',
  method: 'GET'
};

const req = http.request(options, res => {
  let size = 0;
  res.on('data', d => size += d.length);
  res.on('end', () => console.log('Status:', res.statusCode, 'Size:', size));
});

req.on('error', e => console.error(e));
req.end();
