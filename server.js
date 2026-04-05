const express = require('express');
const WebSocket = require('ws');
const fetch = require('node-fetch');

const app = express();

// 🔥 health check
app.get('/', (req, res) => {
  res.send('WebSocket Proxy Running');
});

// 🔥 Render 포트 사용
const server = app.listen(process.env.PORT || 8080, () => {
  console.log(`🚀 Server started`);
});

// 🔥 WebSocket 연결 (중요)
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('✅ Client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'navigate') {
        const targetUrl = data.url;
        console.log(`📡 Request: ${targetUrl}`);

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0'
          }
        });

        let html = await response.text();

        const baseUrl = new URL(targetUrl);

        html = html.replace(
          /(src|href|action)=(["'])([^"']*?)(["'])/gi,
          (match, attr, q1, path, q2) => {
            if (
              path.startsWith('http') ||
              path.startsWith('//') ||
              path.startsWith('data:')
            ) return match;

            try {
              return `${attr}=${q1}${new URL(path, baseUrl).href}${q2}`;
            } catch {
              return match;
            }
          }
        );

        ws.send(JSON.stringify({
          type: 'html',
          url: targetUrl,
          content: html
        }));
      }

    } catch (err) {
      console.error(err);
      ws.send(JSON.stringify({
        type: 'error',
        message: err.message
      }));
    }
  });
});
