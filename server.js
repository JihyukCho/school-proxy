const express = require('express');
const WebSocket = require('ws');
const net = require('net');

const app = express();

// Health check (required for Render / hosting)
app.get('/', (req, res) => {
  res.send('WebSocket TCP Bridge Running');
});

const server = app.listen(process.env.PORT || 8080, () => {
  console.log('HTTP server running');
});

// Attach WebSocket to HTTP server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  let tcpSocket = null;
  let connected = false;

  ws.on('message', (message, isBinary) => {
    try {
      // First message must be JSON (connection info)
      if (!connected) {
        const data = JSON.parse(message.toString());

        const host = data.host;
        const port = data.port || 25565;

        console.log(`Connecting to ${host}:${port}`);

        tcpSocket = net.connect(port, host, () => {
          connected = true;
          console.log('Connected to target server');
        });

        // TCP → WebSocket (binary)
        tcpSocket.on('data', (chunk) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(chunk);
          }
        });

        tcpSocket.on('close', () => {
          console.log('TCP connection closed');
          ws.close();
        });

        tcpSocket.on('error', (err) => {
          console.error('TCP error:', err.message);
          ws.close();
        });

      } else {
        // After connection → raw binary passthrough
        if (tcpSocket) {
          tcpSocket.write(message);
        }
      }

    } catch (err) {
      console.error('Error:', err.message);
      ws.close();
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (tcpSocket) tcpSocket.end();
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
    if (tcpSocket) tcpSocket.end();
  });
});
