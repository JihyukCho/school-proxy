const express = require('express');
const WebSocket = require('ws');
const net = require('net');
const fetch = require('node-fetch');

const app = express();

/* =========================
   1. HTTP (UI + Proxy)
========================= */

// 홈 (UI)
app.get('/', (req, res) => {
  res.send(`
    <html>
    <body style="margin:0;font-family:Arial">
      <div style="background:#111;color:white;padding:10px">
        <input id="url" style="width:300px" placeholder="https://example.com">
        <button onclick="go()">Go</button>
      </div>
      <script>
        async function go(){
          let url=document.getElementById("url").value;
          if(!url.startsWith("http")) url="https://"+url;

          const res=await fetch("/proxy?url="+encodeURIComponent(url));
          const html=await res.text();

          document.open();
          document.write(html);
          document.close();
        }
      </script>
    </body>
    </html>
  `);
});

// 🔥 핵심: 웹 프록시
app.get('/proxy', async (req, res) => {
  try {
    const target = req.query.url;
    if (!target) return res.send("No URL");

    const response = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    let html = await response.text();
    const base = new URL(target);

    // 링크 rewrite
    html = html.replace(
      /(src|href|action)=["']([^"']+)["']/gi,
      (match, attr, path) => {
        try {
          const abs = new URL(path, base).href;
          return `${attr}="/proxy?url=${encodeURIComponent(abs)}"`;
        } catch {
          return match;
        }
      }
    );

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(html);

  } catch (err) {
    res.send("Error: " + err.message);
  }
});

/* =========================
   2. 서버 시작
========================= */

const server = app.listen(process.env.PORT || 8080, () => {
  console.log("Server running");
});

/* =========================
   3. WebSocket (Minecraft bridge)
========================= */

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  let tcpSocket = null;
  let connected = false;

  ws.on('message', (message) => {
    try {
      if (!connected) {
        const data = JSON.parse(message.toString());

        tcpSocket = net.connect(data.port || 25565, data.host, () => {
          connected = true;
        });

        tcpSocket.on('data', (chunk) => {
          ws.send(chunk);
        });

        tcpSocket.on('close', () => ws.close());
        tcpSocket.on('error', () => ws.close());

      } else {
        tcpSocket.write(message);
      }

    } catch (err) {
      ws.close();
    }
  });

  ws.on('close', () => {
    if (tcpSocket) tcpSocket.end();
  });
});
