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

                // SSL 인증서 검증 무시 (학교 테스트용으로 안전하게 사용)
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

                const response = await fetch(targetUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                let html = await response.text();

                // URL rewriting (링크, 이미지, CSS 등이 깨지지 않게)
                const baseUrl = new URL(targetUrl);
                html = html.replace(
                    /(src|href|action)=(["'])([^"']*?)(["'])/gi,
                    (match, attr, q1, path, q2) => {
                        if (path.startsWith('http') || path.startsWith('//') || path.startsWith('data:')) {
                            return match;
                        }
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
            console.error(err);
            ws.send(JSON.stringify({ 
                type: 'error', 
                message: err.message 
            }));
        }
    });
});
