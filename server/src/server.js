const http = require('http');
const app = require('./app');

const port = Number(process.env.PORT || 5000);

const server = http.createServer(app);
server.listen(port, () => {
  console.log(`AI Mystery Room server running on http://localhost:${port}`);
});

module.exports = server;
