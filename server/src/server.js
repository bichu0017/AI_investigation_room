const http = require('http');
const app = require('./app');
const { connectMongo } = require('./config/db');

const port = Number(process.env.PORT || 5000);
const server = http.createServer(app);

async function startServer() {
  try {
    await connectMongo();
    server.listen(port, () => {
      console.log(`AI Mystery Room server running on port ${port}`);
    });
  } catch (error) {
    console.error('Unable to start AI Mystery Room server:', error);
    process.exitCode = 1;
  }
}

startServer();

module.exports = server;
