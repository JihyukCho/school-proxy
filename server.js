const express = require('express');
const fetch = require('node-fetch');

const app = express();

app.get('/', (req, res) => {
  res.send(`
    <html>
    <body style="margin:0">
      <div style="background:#111;color:white;padding:10px">
        <input id="url" style="width:300px" placeholder="https://example.com">
        <button onclick="go()">Go</button>
      </div>
      <div id="content"></div>

      <script>
        async function go() {
          const url = document.getElementById('url').value;

          const res = await fetch('/proxy?url=' + encodeURIComponent(url));
          const html = await res.text();

          document.open();
          document.write(html);
          document.close();
        }
      </script>
    </body>
    </html>
  `);
});

app.get('/proxy', async (req, res) => {
  try {
    const target = req.query.url;
    const response = await fetch(target);

    let html = await response.text();
    const base = new URL(target);

    html = html.replace(
      /(src|href|action)=["']([^"']+)["']/gi,
      (m, attr, path) => {
        try {
          const abs = new URL(path, base).href;
          return `${attr}="/proxy?url=${encodeURIComponent(abs)}"`;
        } catch {
          return m;
        }
      }
    );

    res.send(html);

  } catch (err) {
    res.send("Error: " + err.message);
  }
});

app.listen(process.env.PORT || 3000);
