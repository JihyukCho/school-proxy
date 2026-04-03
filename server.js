const WebSocket = require('ws');
const fetch = require('node-fetch');

const port = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port });

console.log(`🚀 WebSocket Proxy server started - Port ${port}`);

wss.on('connection', (ws) => {
    console.log('✅ Client connected');

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'navigate') {
                const targetUrl = data.url;
                console.log(`📡 Request: ${targetUrl}`);

                const response = await fetch(targetUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                let html = await response.text();

                // URL rewriting
                const baseUrl = new URL(targetUrl);
                html = html.replace(
                    /(src|href|action)=(["'])([^"']*?)(["'])/gi,
                    (match, attr, q1, path, q2) => {
                        if (path.startsWith('http') || path.startsWith('//') || path.startsWith('data:')) return match;
                        try {
                            const abs = new URL(path, baseUrl).href;
                            return `${attr}=${q1}${abs}${q2}`;
                        } catch (e) {
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
            ws.send(JSON.stringify({ 
                type: 'error', 
                message: err.message 
            }));
        }
    });
});