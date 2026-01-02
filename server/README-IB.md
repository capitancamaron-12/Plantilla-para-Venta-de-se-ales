IB Proxy (local)
=================

This lightweight proxy exposes a WebSocket server that the frontend can connect to for candlestick data during development.

Usage
-----

- Start the proxy (defaults to port 24679):

```bash
node server/ib-proxy.js
```

- Environment variables:

- `IB_PROXY_PORT` — port to listen on (default `24679`)
- `IB_GATEWAY_WS_URL` — optional upstream WebSocket URL (if you have a bridge or feed to connect to)
- `IB_PROXY_TICK_MS` — mock tick interval in ms (default `1000`)

Integration with Interactive Brokers
-----------------------------------

Interactive Brokers does not provide a browser-friendly public WebSocket for market data. Typical approaches:

1. Run IB Gateway / TWS locally and create a bridge that speaks the IB protocol and exposes a local WebSocket. Set `IB_GATEWAY_WS_URL` to that local bridge URL.
2. Use IB REST/streaming endpoints from a server process and proxy updates to the frontend via this proxy.

This proxy provides a simple mock feed by default so you can develop the frontend without IB access.
