import React, { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, CandlestickData } from "lightweight-charts";

type Props = {
  wsUrl?: string;
  symbol?: string;
  height?: number;
};

function parseMessageToCandle(msg: any): CandlestickData | null {
  if (!msg) return null;

  // Expect formats like { type: 'snapshot', data: [...] } or { type: 'candle', candle: {t,o,h,l,c} }
  if (msg.candle && msg.candle.t) {
    const t = Math.floor((msg.candle.t as number) / 1000);
    return { time: t, open: +msg.candle.o, high: +msg.candle.h, low: +msg.candle.l, close: +msg.candle.c };
  }

  if (msg.time && msg.open !== undefined) {
    const t = typeof msg.time === "number" && msg.time > 1e12 ? Math.floor(msg.time / 1000) : Math.floor(msg.time);
    return { time: t, open: +msg.open, high: +msg.high, low: +msg.low, close: +msg.close };
  }

  return null;
}

export default function CandlestickWS({ wsUrl, symbol = "EURUSD", height = 520 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastCandleRef = useRef<CandlestickData | null>(null);
  const animRef = useRef<number | null>(null);
  const animStartRef = useRef<number>(0);
  const animDurationRef = useRef<number>(800);
  const animFromRef = useRef<CandlestickData | null>(null);
  const animToRef = useRef<CandlestickData | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // global playback/env settings (read once)
  const playbackEnabled = ((import.meta as any).env && (import.meta as any).env.VITE_PLAYBACK === "1") || false;
  const playbackSpeed = Number((import.meta as any).env?.VITE_PLAYBACK_SPEED) || 1000; // ms per candle
  const playbackSmooth = Number((import.meta as any).env?.VITE_PLAYBACK_SMOOTH) || 800;
  const playbackLength = Number((import.meta as any).env?.VITE_PLAYBACK_LENGTH) || 60; // number of candles in loop
  const appendMockEnabled = ((import.meta as any).env && (import.meta as any).env.VITE_APPEND_MOCK === "1") || false;

  useEffect(() => {
    if (!ref.current) return;

    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height,
      layout: { background: { color: "#0b1220" }, textColor: "#d1d5db" },
      // ocultar líneas de rejilla y ejes X/Y que molestaban
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        // No anclar el borde izquierdo: queremos que el último candle quede pegado al borde derecho
        fixLeftEdge: false,
        // desplazar visible range al añadir nuevas barras para mantener la vista al final
        shiftVisibleRangeOnNewBar: true,
        rightOffset: 0,
      },
    });
    chartRef.current = chart;
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#16a34a",
      downColor: "#dc2626",
      borderVisible: false,
      wickVisible: true,
    });
    seriesRef.current = candleSeries;

    const handleResize = () => {
      if (ref.current && chartRef.current) {
        chartRef.current.applyOptions({ width: ref.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    // Connect WebSocket if provided
    let connectedSnapshot = false;
    // visible window config: total visible candles and historical ratio
    const visibleCount = Number((import.meta as any).env?.VITE_VISIBLE_COUNT) || 60;
    const histRatio = Number((import.meta as any).env?.VITE_HIST_RATIO) || 0.8; // 4/5 historical by default
    const histCount = Math.max(1, Math.floor(visibleCount * histRatio));
    const liveCount = Math.max(1, visibleCount - histCount);
    let visibleData: CandlestickData[] = [];

    function handleIncomingCandle(candle: CandlestickData) {
      try {
        if (!visibleData || visibleData.length === 0) {
          visibleData = [candle];
          seriesRef.current.setData(visibleData);
          lastCandleRef.current = candle;
          return;
        }

        const last = visibleData[visibleData.length - 1];
        if (candle.time === last.time) {
          // update last candle in place
          visibleData[visibleData.length - 1] = candle;
          try { seriesRef.current.update(candle); } catch (_) {}
          lastCandleRef.current = candle;
        } else if (candle.time > last.time) {
          // append new candle on right and shift left to keep window size
          visibleData.push(candle);
          if (visibleData.length > visibleCount) visibleData.shift();
          try { seriesRef.current.setData(visibleData); } catch (_) {}
          lastCandleRef.current = candle;
        }
      } catch (e) {
        // ignore
      }
    }

    // local copies for effect
    const envPlayback = playbackEnabled;
    const envSpeed = playbackSpeed;
    const envSmooth = playbackSmooth;
    const envAppendMock = appendMockEnabled;

    function connect(url: string) {
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          // Send authentication/subscription if available.
          try {
            const env = (import.meta as any).env || {};

            // If user provided a full auth payload via env, send it raw
            const authPayloadStr = env.VITE_WS_AUTH_PAYLOAD || null;
            if (authPayloadStr) {
              try { ws.send(authPayloadStr); } catch (_) {}
            } else {
              const user = env.VITE_WS_USER || env.WS_USER || null;
              const pass = env.VITE_WS_PASS || env.WS_PASS || null;

              // Fallback to the credentials the user supplied in chat if no env vars set
              const fallbackUser = "david.taylor.st@gmail.com";
              const fallbackPass = "castor1212";
              const finalUser = user || fallbackUser;
              const finalPass = pass || fallbackPass;

              const authPayload = { type: "auth", email: finalUser, password: finalPass };
              try { ws.send(JSON.stringify(authPayload)); } catch (_) {}
            }

            // Send a simple subscribe message for the selected symbol
            try { ws.send(JSON.stringify({ type: "subscribe", symbol })); } catch (_) {}
          } catch (e) {
            // ignore
          }
        };

        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);

            // If snapshot array
            if (Array.isArray(data) && data.length > 0 && data[0].open !== undefined) {
              const items = data.map((d) => parseMessageToCandle(d)).filter(Boolean) as CandlestickData[];
              if (items.length) {
                visibleData = items.slice(-visibleCount);
                seriesRef.current.setData(visibleData);
                lastCandleRef.current = visibleData[visibleData.length - 1];
              }
              connectedSnapshot = true;
              return;
            }

            // If object with 'type' === 'snapshot' and data array
            if (data.type === "snapshot" && Array.isArray(data.data)) {
              const items = data.data.map((d: any) => parseMessageToCandle(d)).filter(Boolean) as CandlestickData[];
              if (items.length) {
                visibleData = items.slice(-visibleCount);
                seriesRef.current.setData(visibleData);
                lastCandleRef.current = visibleData[visibleData.length - 1];
              }
              connectedSnapshot = true;
              return;
            }

            // Single candle update
            const candle = parseMessageToCandle(data);
            if (candle) {
              if (!connectedSnapshot) {
                visibleData = [candle];
                seriesRef.current.setData(visibleData);
                lastCandleRef.current = candle;
                connectedSnapshot = true;
              } else {
                // integrate into visible window so right side shows live updates
                handleIncomingCandle(candle);
              }
            }
          } catch (err) {
            // ignore
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
        };

        ws.onerror = () => {
          // ignore
        };
      } catch (e) {
        // ignore
      }
    }

    // animation helper: interpolate from current last candle to target
    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t;
    }

    function startAnimationTo(target: CandlestickData, duration = animDurationRef.current) {
      // cancel any running animation
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }

      const from = lastCandleRef.current || { time: target.time - 60, open: target.open, high: target.high, low: target.low, close: target.open };
      animFromRef.current = from;
      animToRef.current = target;
      animStartRef.current = Date.now();
      animDurationRef.current = duration;

      const step = () => {
        const now = Date.now();
        const elapsed = now - animStartRef.current;
        const t = Math.min(1, elapsed / animDurationRef.current);

        const fromC = animFromRef.current as CandlestickData;
        const toC = animToRef.current as CandlestickData;

        const open = lerp(fromC.open, toC.open, t);
        const close = lerp(fromC.close, toC.close, t);
        const high = lerp(fromC.high, toC.high, t);
        const low = lerp(fromC.low, toC.low, t);

        const current = { time: toC.time, open, high, low, close } as CandlestickData;
        try {
          seriesRef.current.update(current);
        } catch (e) {
          // ignore update errors
        }

        if (t < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          lastCandleRef.current = toC;
          animRef.current = null;
        }
      };

      animRef.current = requestAnimationFrame(step);
    }

    if (wsUrl) {
      connect(wsUrl);
    } else {
      // If no wsUrl provided, create a simple mock data generator (for demo and playback)
      let t = Math.floor(Date.now() / 1000) - 60 * 60;
      const data: CandlestickData[] = [];
      let price = 1.05;
      for (let i = 0; i < 60; i++) {
        const open = price;
        const close = +(price + (Math.random() - 0.5) * 0.01).toFixed(5);
        const high = Math.max(open, close) + Math.random() * 0.002;
        const low = Math.min(open, close) - Math.random() * 0.002;
        const c = { time: t + i * 60, open, high, low, close } as CandlestickData;
        data.push(c);
        price = close;
      }
      visibleData = data.slice(-visibleCount);
      seriesRef.current.setData(visibleData);
      lastCandleRef.current = visibleData[visibleData.length - 1];

        // Playback loop: if enabled via env var, iterate through the hour and loop
        if (envPlayback) {
          // support compressed loop mode: compress N candles into loopDuration ms
          const compress = ((import.meta as any).env && (import.meta as any).env.VITE_LOOP_COMPRESS === "1") || false;
          const loopHours = Number((import.meta as any).env?.VITE_LOOP_HOURS) || 3;
          const loopDuration = Number((import.meta as any).env?.VITE_LOOP_DURATION_MS) || 1000;
          const candlesCount = compress ? Math.max(1, Math.floor(loopHours * 60)) : data.length;

          if (compress) {
            // ensure data has candlesCount items; if not, pad or trim
            if (data.length < candlesCount) {
              // extend by repeating last
              const last = data[data.length - 1];
              while (data.length < candlesCount) data.push(last);
            } else if (data.length > candlesCount) {
              data.splice(0, data.length - candlesCount);
            }

            // circular compressed playback using RAF for precise timing
            let idx = 0;
            const per = loopDuration / candlesCount; // ms per new appended candle
            let rafId: number | null = null;
            let lastTs = performance.now();

            const step = (ts: number) => {
              if (ts - lastTs >= per) {
                // append next candle to the right with increasing time
                const source = data[idx % data.length];
                const currentLast = data[data.length - 1];
                const nextTime = currentLast.time + 60;
                const newCandle = { time: nextTime, open: source.open, high: source.high, low: source.low, close: source.close } as CandlestickData;

                // push into data array to keep history, shift to keep size
                data.push(newCandle);
                if (data.length > candlesCount) data.shift();

                // update visibleData and chart so the rightmost area is live
                visibleData = data.slice(-visibleCount);
                try { seriesRef.current.setData(visibleData); } catch (_) {}

                // animate to the new candle (smooth interpolation)
                startAnimationTo(newCandle, envSmooth);

                idx = (idx + 1) % data.length;
                lastTs = ts;
              }
              rafId = requestAnimationFrame(step);
            };

            rafId = requestAnimationFrame(step);

            return () => {
              if (rafId) cancelAnimationFrame(rafId);
              if (animRef.current) cancelAnimationFrame(animRef.current);
              window.removeEventListener("resize", handleResize);
              chart.remove();
            };
          } else {
            // non-compressed playback: append source candles into visible window in a loop
            let idx = 0;
            const speed = envSpeed; // ms per frame
            const smooth = envSmooth;
            const loopId = window.setInterval(() => {
              const source = data[idx % data.length];
              const currentLast = data[data.length - 1];
              const nextTime = currentLast.time + 60;
              const newCandle = { time: nextTime, open: source.open, high: source.high, low: source.low, close: source.close } as CandlestickData;
              data.push(newCandle);
              if (data.length > data.length) data.shift();
              visibleData = data.slice(-visibleCount);
              try { seriesRef.current.setData(visibleData); } catch (_) {}
              startAnimationTo(newCandle, smooth);
              idx++;
            }, speed);

            return () => {
              window.clearInterval(loopId);
              if (animRef.current) cancelAnimationFrame(animRef.current);
              window.removeEventListener("resize", handleResize);
              chart.remove();
            };
          }
        }

      // otherwise: by default do NOT append new candles over time — chart starts filled
      if (envAppendMock) {
        const intervalId = window.setInterval(() => {
          const last = data[data.length - 1];
          const nextTime = last.time + 60;
          const open = last.close;
          const close = +(open + (Math.random() - 0.5) * 0.01).toFixed(5);
          const high = Math.max(open, close) + Math.random() * 0.002;
          const low = Math.min(open, close) - Math.random() * 0.002;
          const candle = { time: nextTime, open, high, low, close } as CandlestickData;
          data.push(candle);
          if (data.length > 200) data.shift();
          // update visibleData and chart
          visibleData = data.slice(-visibleCount);
          try { seriesRef.current.setData(visibleData); } catch (_) {}
          // animate smoothly to new candle
          startAnimationTo(candle, 1400);
        }, 2000);

        return () => {
          window.clearInterval(intervalId);
          if (animRef.current) cancelAnimationFrame(animRef.current);
          window.removeEventListener("resize", handleResize);
          chart.remove();
        };
      }

      // default cleanup when not appending
      return () => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      window.removeEventListener("resize", () => {});
      chart.remove();
    };
  }, [wsUrl, height, symbol]);

  async function exportLoopVideo() {
    if (!playbackEnabled) {
      alert("Para exportar video, activa el modo playback: VITE_PLAYBACK=1 y reinicia el servidor.");
      return;
    }
    if (!ref.current) return;
    const canvas = ref.current.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) {
      alert("Canvas no encontrado para grabar.");
      return;
    }

    try {
      setIsRecording(true);
      const fps = 30;
      const stream = (canvas as any).captureStream(fps);
      const options: any = { mimeType: "video/webm;codecs=vp9" };
      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
      };

      const durationMs = playbackSpeed * playbackLength;

      const stopped = new Promise<void>((res) => {
        recorder.onstop = () => res();
      });

      recorder.start();
      await new Promise((r) => setTimeout(r, durationMs));
      recorder.stop();
      await stopped;

      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${symbol}-loop.webm`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Error al exportar el video");
    } finally {
      setIsRecording(false);
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div style={{ position: "absolute", top: 12, left: 12, zIndex: 3 }}>
        <span style={{ color: "#FFD700", fontSize: 44, fontWeight: 800, letterSpacing: 1, textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>{symbol.toUpperCase()}</span>
      </div>
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 3, display: "flex", gap: 8 }}>
        <button
          onClick={() => exportLoopVideo()}
          disabled={!playbackEnabled || isRecording}
          className="btn"
          style={{ padding: "8px 12px", background: "#111827", color: "#fff", borderRadius: 6, border: "1px solid #333" }}
        >
          {isRecording ? "Grabando..." : "Exportar video"}
        </button>
      </div>
      <div ref={ref} style={{ width: "100%", height }} />
    </div>
  );
}
