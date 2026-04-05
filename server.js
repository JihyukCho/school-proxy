const WebSocket = require("ws");
const puppeteer = require("puppeteer");

const wss = new WebSocket.Server({ port: 8080 });

console.log("WS running on ws://localhost:8080");

wss.on("connection", async (ws) => {

    const browser = await puppeteer.launch({
        headless: "new",
        defaultViewport: { width: 1280, height: 720 }
    });

    const page = await browser.newPage();
    await page.goto("https://example.com");

    // 🎥 화면 스트리밍
    const stream = async () => {
        if (ws.readyState !== 1) return;

        const screenshot = await page.screenshot({
            encoding: "base64"
        });

        ws.send(JSON.stringify({
            type: "frame",
            data: screenshot
        }));

        setTimeout(stream, 100); // FPS 조절 (100ms = ~10fps)
    };

    stream();

    // 🎮 입력 처리
    ws.on("message", async (msg) => {
        try {
            const data = JSON.parse(msg);

            if (data.type === "click") {
                await page.mouse.click(data.x, data.y);
            }

            if (data.type === "move") {
                await page.mouse.move(data.x, data.y);
            }

            if (data.type === "scroll") {
                await page.mouse.wheel({ deltaY: data.delta });
            }

            if (data.type === "key") {
                await page.keyboard.type(data.key);
            }

        } catch (e) {}
    });

    ws.on("close", async () => {
        await browser.close();
    });
});
