/* eslint-disable */
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/planned//comparison',
  method: 'GET'
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log('Status:', res.statusCode, data));
});

req.on('error', e => console.error(e));
req.end();
