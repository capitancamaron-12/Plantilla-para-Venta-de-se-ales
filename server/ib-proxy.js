import WebSocket from 'ws';

const PORT = Number(process.env.IB_PROXY_PORT) || 24679;
const upstreamUrl = process.env.IB_GATEWAY_WS_URL || null;
const tickIntervalMs = Number(process.env.IB_PROXY_TICK_MS) || 1000;

console.log(`[ib-proxy] starting on port ${PORT}`);
if (upstreamUrl) console.log(`[ib-proxy] upstream: ${upstreamUrl}`);

const wss = new WebSocket.Server({ port: PORT });

function makeCandle(timeSec, price) {
  const open = price;
  const close = +(price + (Math.random() - 0.5) * 0.005).toFixed(5);
  const high = Math.max(open, close) + Math.random() * 0.0015;
  const low = Math.min(open, close) - Math.random() * 0.0015;
  return { time: timeSec, open, high, low, close };
}

function makeSnapshot(count = 60) {
  const now = Math.floor(Date.now() / 1000);
  const data = [];
  let price = 1.05;
  for (let i = count - 1; i >= 0; i--) {
    const t = now - i * 60;
    const c = makeCandle(t, price);
    data.push(c);
    price = c.close;
  }
  return data;
}

wss.on('connection', (ws) => {
  console.log('[ib-proxy] client connected');

  let upstream = null;
  let interval = null;

  function cleanup() {
    if (upstream) {
      try { upstream.close(); } catch (_) {}
      upstream = null;
    }
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  if (upstreamUrl) {
    try {
      upstream = new WebSocket(upstreamUrl);
      upstream.on('open', () => console.log('[ib-proxy] connected to upstream'));
      upstream.on('message', (msg) => {
        try { ws.send(msg); } catch (_) {}
      });
      upstream.on('close', () => console.log('[ib-proxy] upstream closed'));
      upstream.on('error', (err) => console.error('[ib-proxy] upstream error', err));

      ws.on('message', (msg) => {
        try { upstream && upstream.send(msg); } catch (_) {}
      });
    } catch (e) {
      console.error('[ib-proxy] upstream connect failed', e);
    }
  } else {
    // send a snapshot then start emitting mock candles
    const snapshot = makeSnapshot(180);
    try {
      ws.send(JSON.stringify({ type: 'snapshot', data: snapshot }));
    } catch (_) {}

    // emit incremental candles based on last snapshot
    let history = snapshot.slice();
    interval = setInterval(() => {
      const last = history[history.length - 1];
      const nextTime = last.time + 60;
      const next = makeCandle(nextTime, last.close);
      history.push(next);
      if (history.length > 1000) history.shift();
      try { ws.send(JSON.stringify(next)); } catch (_) {}
    }, tickIntervalMs);
  }

  ws.on('close', () => {
    console.log('[ib-proxy] client disconnected');
    cleanup();
  });

  ws.on('error', (err) => {
    console.error('[ib-proxy] client error', err);
    cleanup();
  });
});

wss.on('listening', () => console.log(`[ib-proxy] listening ws://localhost:${PORT}`));
wss.on('error', (err) => console.error('[ib-proxy] server error', err));

process.on('SIGINT', () => {
  console.log('[ib-proxy] shutting down');
  wss.close(() => process.exit(0));
});
