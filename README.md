<div align="center">

<img src="assets/badicharts-logo-readme.svg" alt="BADI-CHARTS" width="400">

# BADI-CHARTS

**A Professional Trading Chart Library Built in Pure JavaScript**

[![BADI-CHARTS](https://img.shields.io/badge/BADI--CHARTS-v1.0.8-12C4F0?style=for-the-badge&labelColor=0e1117)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-16C784?style=for-the-badge)](#)
[![JavaScript](https://img.shields.io/badge/Pure-JavaScript-EA3943?style=for-the-badge)](#)
[![No Dependencies](https://img.shields.io/badge/Dependencies-Zero-FFC107?style=for-the-badge)](#)
[![Live Demo](https://img.shields.io/badge/Live-Demo-12C4F0?style=for-the-badge)](https://salahbadi19.github.io/BADI-CHARTS/)
[![Telegram Channel](https://img.shields.io/badge/Telegram-Channel-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/qxchart)
[![Telegram Developer](https://img.shields.io/badge/Telegram-Developer-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/qxzero1)

<sub>BADI-CHARTS is a complete, production-ready trading chart engine built entirely in vanilla JavaScript. No frameworks, no build tools, no external dependencies — just open the file and it works. Designed to be embedded in any web application as a standalone library.</sub>

</div>

---

## 🔗 Links

| Link | URL |
|------|-----|
| **🚀 Live Demo** | [https://salahbadi19.github.io/BADI-CHARTS/](https://salahbadi19.github.io/BADI-CHARTS/) |
| **💬 Telegram Channel** | [https://t.me/qxchart](https://t.me/qxchart) |
| **👨‍💻 Telegram Developer** | [https://t.me/qxzero1](https://t.me/qxzero1) |
| **📦 GitHub Repo** | [https://github.com/salahbadi19/BADI-CHARTS](https://github.com/salahbadi19/BADI-CHARTS) |
| **🌐 CDN (jsDelivr)** | `https://cdn.jsdelivr.net/gh/salahbadi19/BADI-CHARTS@v1.0.8/dist/badi-charts.js` |

---

## 👨‍💻 Developer

| | |
|---|---|
| **GitHub** | [@salahbadi19](https://github.com/salahbadi19) |
| **Telegram (Developer)** | [@qxzero1](https://t.me/qxzero1) |
| **Telegram (Channel)** | [@qxchart](https://t.me/qxchart) |

---

## Table of Contents

- [Overview](#overview)
- [What BADI-CHARTS Can Do](#what-badi-charts-can-do)
- [Quick Start](#quick-start)
- [Chart Types](#chart-types)
- [Indicators](#indicators)
- [Drawing Tools](#drawing-tools)
- [Mobile Support](#mobile-support)
- [Customization](#customization)
- [API Reference](#api-reference)
- [Pros & Cons](#pros--cons)
- [License](#license)

---

## Overview

BADI-CHARTS is a full-featured financial charting library that renders everything on an HTML5 `<canvas>` using pure JavaScript. It was built from the ground up to be:

- **Zero-dependency** — no jQuery, no D3, no charting libraries
- **Canvas-based** — all chart rendering (candles, indicators, drawings, axes) happens on a single `<canvas>` element
- **Embeddable** — drop it into any web page with a single `<script>` tag
- **Mobile-first** — touch gestures, responsive layout, compact toolbar
- **Themeable** — dark/light themes with full color customization
- **Extensible** — register custom drawing tools and indicators at runtime

---

## What BADI-CHARTS Can Do

### Chart Rendering
- **39 chart types** including standard candles, hollow candles, Heikin-Ashi, bar charts, line/area/mountain, and advanced types like Kagi, Pattern Detection, BiColor Candles, Order Flow, and Numbered Candles
- **Adaptive rendering** — automatically switches between full candles, high-low bars, and close-line based on zoom level
- **High-DPI canvas** — crisp rendering on retina/4K displays

### Price & Time Axes
- **Responsive price axis** — automatically narrows on mobile (38px) vs desktop (72px)
- **Compact price formatting** on mobile (thousands separator, no decimals)
- **Time axis** with adaptive formatting (minutes, hours, days, months)
- **Countdown timer** — shows time remaining until the current candle closes, color-coded (green/yellow/red), centered inside the price card just below the price tag
- **Double-click to reset** — double-click price axis to auto-fit, time axis to reset zoom

### Indicators
- **Moving Averages**: SMA, EMA, WMA, DoubleEMA, TripleEMA, SMMA, VWMA, HullMA, KAMA, ALMA, MAribbon, EMAribbon
- **Volume**: Volume bars, Volume Profile (with POC/VAH/VAL lines)
- **Signals**: Buy/Sell Signals (arrows above/below candles)
- **Settings modal** — full control over color, width, style, period, opacity per indicator

### Drawing Tools (28 tools)
- **Trend & Lines**: Trend Line, Ray, Horizontal Line, Vertical Line, Arrow, Brush, Polyline
- **Shapes**: Rectangle, Ellipse, Triangle
- **Fibonacci**: Retracement (editable levels), Extension, Channel
- **Patterns**: Parallel Channel, Andrews Pitchfork, Gann Box
- **Positions**: Long Position, Short Position
- **Annotations**: Text, Price Label, Date Range, Measurement
- **Markers**: Arrow Up/Down, Star, Flag, Diamond, Dot Circle
- **Drawing settings card** with HSL color picker, no-fill toggle, clone button
- **Tool registry** — register custom tools at runtime via API

### Mobile Support
- **Touch gestures**: single-finger pan, two-finger pinch zoom, double-tap reset
- **Inertia scrolling** — chart continues moving after finger lift, gradually slows down
- **Compact toolbar** — responsive layout that fits small screens
- **No crosshair on mobile** — mouse-only features are hidden
- **Narrower axes** — more chart space on small screens

### Customization
- **Chart Settings modal** — customize candle colors (body, wick, border) for up/down separately
- **Chart background color** — custom color that persists across theme toggles
- **Background image/video/SVG** — upload any file as chart background with opacity control
- **HSL Color Picker** — full hue/saturation/lightness picker for drawing tools
- **Watermark** — BadiCharts logo in the bottom-left corner (theme-adaptive)
- **Dark/Light themes** with full color customization

---

## Quick Start

### ⚡ Option 1: CDN — One-line embed (easiest)

Just add these 3 lines to any HTML page — no download, no build step:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- 1. Add the CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/salahbadi19/BADI-CHARTS@v1.0.8/dist/badi-charts.css">
</head>
<body>
  <!-- 2. Add a container -->
  <div id="chart-root" style="width:100vw;height:100vh"></div>

  <!-- 3. Add the JS — chart auto-initializes! -->
  <script src="https://cdn.jsdelivr.net/gh/salahbadi19/BADI-CHARTS@v1.0.8/dist/badi-charts.js"></script>
</body>
</html>
```

That's it! The chart auto-initializes with demo data when the page loads.

### 🔧 Option 2: CDN with custom options

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/salahbadi19/BADI-CHARTS@v1.0.8/dist/badi-charts.css">
</head>
<body>
  <div id="my-chart" style="width:100%;height:500px"></div>

  <script src="https://cdn.jsdelivr.net/gh/salahbadi19/BADI-CHARTS@v1.0.8/dist/badi-charts.js"></script>
  <script>
    // Create chart manually with custom options
    const chart = BadiCharts.create('#my-chart', {
      symbol: 'ETHUSDT',
      theme: 'dark'
    });

    // Add an indicator
    chart.indicatorManager.add('SMA', { period: 20, color: '#12C4F0' });

    // Change chart type
    chart.setChartType('heikinAshi');

    // Start live feed
    chart.toggleLive();
  </script>
</body>
</html>
```

### 📦 Option 3: Download and run locally

```bash
git clone https://github.com/salahbadi19/BADI-CHARTS.git
cd BADI-CHARTS
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```

### 🧩 Option 4: Use as ES modules (advanced)

```html
<div id="chart-root" style="width:100vw;height:100vh"></div>
<script type="module">
  import { ChartEngine } from './js/core/ChartEngine.js';
  import { drawingToolRegistry } from './js/drawing/DrawingToolRegistry.js';
  import { BUILT_IN_TOOLS } from './js/drawing/DrawingManager.js';

  drawingToolRegistry.registerAll(BUILT_IN_TOOLS);

  const chart = new ChartEngine(document.getElementById('chart-root'), {
    symbol: 'BTCUSDT',
    theme: 'dark'
  });
  chart.init();
  window.BadiCharts = chart;
</script>
```

### CDN URLs

| File | CDN URL |
|------|---------|
| **JavaScript** | `https://cdn.jsdelivr.net/gh/salahbadi19/BADI-CHARTS@v1.0.8/dist/badi-charts.js` |
| **CSS** | `https://cdn.jsdelivr.net/gh/salahbadi19/BADI-CHARTS@v1.0.8/dist/badi-charts.css` |

> 💡 **Tip:** Always use the latest stable tag (currently @v1.0.8) to avoid CDN cache issues with @main.

---

## 📡 Real Data Example — Binance WebSocket (BTCUSDT)

This example connects directly to **Binance's public WebSocket API** to stream real BTCUSDT 1-minute candles into BADI-CHARTS — no API key needed.

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/salahbadi19/BADI-CHARTS@v1.0.8/dist/badi-charts.css">
</head>
<body>
  <div id="chart" style="width:100vw;height:100vh"></div>

  <script src="https://cdn.jsdelivr.net/gh/salahbadi19/BADI-CHARTS@v1.0.8/dist/badi-charts.js"></script>
  <script>
    // 1. Create the chart (no toolbar, clean embedded mode)
    const chart = BadiCharts.create('#chart', {
      symbol: 'BTCUSDT',
      theme: 'dark',
      autoData: false  // ← important: don't generate fake data
    });

    // 2. Fetch historical 1m candles from Binance REST API
    async function loadHistory() {
      const url = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=500';
      const res = await fetch(url);
      const raw = await res.json();

      // Convert Binance format → BADI-CHARTS format
      const candles = raw.map(k => ({
        time: k[0],        // open time (ms)
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }));

      // Load into the chart
      chart.dataManager.loadFrom(candles);
      chart.viewport.barSpacing = 8;
      chart.viewport.rightOffset = 10;
      chart.viewport.scrollToRight(chart.dataManager.size);
      chart.viewport.updatePriceRange(chart.dataManager);
      chart.statusBar.setBars(chart.dataManager.size);
      chart.indicatorManager.add('Volume', {});
      chart.requestRender();

      console.log('Loaded', candles.length, 'candles from Binance');
    }

    // 3. Connect to Binance WebSocket for live updates
    function connectWebSocket() {
      const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (!msg.k) return;  // not a kline update

        const k = msg.k;
        const candle = {
          time: k.t,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v)
        };

        // Update or append the candle in the chart
        chart.dataManager.updateLast(candle.time, candle.open, candle.high,
                                     candle.low, candle.close, candle.volume);
        chart.viewport.updatePriceRange(chart.dataManager);
        chart.requestRender();
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected — reconnecting in 3s...');
        setTimeout(connectWebSocket, 3000);
      };

      console.log('WebSocket connected to Binance BTCUSDT 1m');
    }

    // 4. Start!
    loadHistory().then(() => {
      connectWebSocket();
    });
  </script>
</body>
</html>
```

### How it works:

| Step | What happens |
|------|-------------|
| **1** | Create chart with `autoData: false` — no fake data |
| **2** | Fetch 500 historical 1m candles from Binance REST API |
| **3** | Connect to Binance WebSocket for real-time updates |
| **4** | Each WebSocket tick updates the last candle live |

> **No API key required!** Binance's public REST + WebSocket APIs are free and open. This example works immediately — just copy the HTML into a file and open it in a browser.

---

## Chart Types

### Standard (10)
| Type | Description |
|------|-------------|
| Candles | Standard Japanese candlestick |
| Hollow Candles | Up = outline, Down = filled |
| Heikin Ashi | Smoothed candles |
| Bar Chart | OHLC bars |
| Line | Close price line |
| Area | Close line with fill below |
| Baseline | Line with fill above/below baseline |
| Step Line | Stepped close line |
| Line + Markers | Close line with dot markers |
| Mountain | Area with gradient fill |

### Special (10)
| Type | Description |
|------|-------------|
| Body Only | Candles without wicks |
| High-Low Bars | High-low bars only (no body) |
| Median Candle | Candle with median line through body |
| Squared Candles | Full-width candles (no gap) |
| Volume Candles | Body width proportional to volume |
| Shadow Candles | Transparent body, wicks only |
| Colored Candles | Gradient-filled bodies |
| Delta Candles | Body = close - previous close |
| Elastic | Volume-weighted candles |
| Range Bars | Price-range based bars |

### Pushed/Hollow (10)
Hollow Up, Hollow Down, Hollow Both, Hollow Colored, Hollow Pushed, Hollow Minimal, Hollow Filled, Hollow Classic, Hollow Wick Only, Hollow Bi-Color

### Advanced (9)
| Type | Description |
|------|-------------|
| Kagi | Line thickness changes at reversal points |
| HA Smoothed | Heikin-Ashi with EMA smoothing |
| Pattern Detection | Candles + Doji/Hammer/Engulfing markers |
| Animated Candles | Last 15 candles grow with smooth animation |
| BiColor Candles | Body split into red/green rectangles (buyer/seller strength) |
| Order Flow | Small rectangles inside candle body (footprint style) |
| Numbered Candles | Close price displayed inside each candle body |

---

## Indicators

### Moving Averages (12)
SMA, EMA, WMA, DoubleEMA, TripleEMA, SMMA, VWMA, HullMA, KAMA, ALMA, MAribbon, EMAribbon

### Volume (3)
| Indicator | Description |
|-----------|-------------|
| Volume | Volume bars (color-coded by candle direction) |
| Volume Profile | Horizontal volume histogram over last 20 candles with POC/VAH/VAL reference lines |
| Buy/Sell Signals | Arrow icons: green up arrow (buy) below candle, red down arrow (sell) above candle |

---

## Drawing Tools

All 28 tools are registered via the `DrawingToolRegistry` and can be customized at runtime.

| Category | Tools |
|----------|-------|
| Trend & Lines | Trend Line, Ray, Horizontal Line, Vertical Line, Arrow, Brush, Polyline |
| Shapes | Rectangle, Ellipse, Triangle |
| Fibonacci | Retracement (editable), Extension, Channel |
| Patterns | Parallel Channel, Andrews Pitchfork, Gann Box |
| Positions | Long Position, Short Position |
| Annotations | Text, Price Label, Date Range, Measurement |
| Markers | Arrow Up, Arrow Down, Star, Flag, Diamond, Dot Circle |

### Custom Tools

Register your own drawing tool at runtime:

```javascript
drawingToolRegistry.register('myTool', {
  label: 'My Custom Tool',
  icon: '★',
  category: 'Custom',
  factory: (opts) => new MyToolClass(opts)
});
```

---

## Mobile Support

| Feature | Description |
|---------|-------------|
| Single-finger pan | Drag to scroll the chart horizontally |
| Two-finger pinch | Zoom in/out anchored at pinch midpoint |
| Double-tap | Reset price scale (no jump to end) |
| Inertia scrolling | Chart continues moving after finger lift, gradually slows |
| Compact toolbar | Responsive buttons, scrollable, brand name hidden |
| Narrow price axis | 38px (small phones) / 42px (phones) vs 72px (desktop) |
| No crosshair | Mouse-only features hidden on touch screens |
| Compact price labels | Thousands separator format (67,250 instead of 67250.31) |

---

## Customization

### Candle Colors
Open the **Chart Settings** modal (⚙ button) to customize:
- Up candle: Body, Wick, Border (separate colors)
- Down candle: Body, Wick, Border (separate colors)
- Chart background color (persists across theme toggles)

### Background
Upload image/video/SVG as chart background:
- 🖼 button opens file picker
- Opacity slider controls visibility
- ⊘ button clears background

### HSL Color Picker
Full hue/saturation/lightness picker for drawing tool colors, with hex input and reset/done buttons.

---

## API Reference

```javascript
// Create a chart
const chart = new ChartEngine(container, { symbol: 'BTCUSDT', theme: 'dark' });
chart.init();

// Chart type
chart.setChartType('candles');        // 'hollow', 'heikinAshi', 'kagi', etc.

// Indicators
chart.indicatorManager.add('SMA', { period: 20, color: '#12C4F0' });
chart.indicatorManager.add('Volume');
chart.indicatorManager.add('VolumeProfile');
chart.indicatorManager.add('BuySellSignals');
chart.indicatorManager.remove(id);

// Drawing tools
chart.setActiveTool('trendline');
chart.setActiveTool('rectangle');
chart.setActiveTool(null);           // back to cursor

// Background
chart.background.set({ type: 'image', src: 'logo.png', opacity: 0.2 });
chart.background.clear();

// Theme
chart.toggleTheme();                  // dark ↔ light

// Live feed
chart.toggleLive();                   // start/stop simulated ticks

// View
chart.fitAll();                       // fit all data in view
chart.zoomBy(1.25);                   // zoom in

// Custom drawing tool
drawingToolRegistry.register('myTool', { ... });
drawingToolRegistry.unregister('myTool');
drawingToolRegistry.clear();
```

---

## Pros & Cons

### Pros (Advantages)

| # | Advantage | Details |
|---|-----------|---------|
| 1 | **Zero dependencies** | No jQuery, D3, or any external library. Pure vanilla JavaScript. |
| 2 | **Canvas-based rendering** | All chart drawing happens on `<canvas>` — fast, crisp, no DOM overhead. |
| 3 | **39 chart types** | From standard candles to Kagi, Order Flow, and Pattern Detection. |
| 4 | **28 drawing tools** | Full toolkit: trend lines, Fibonacci, shapes, markers, positions. |
| 5 | **Mobile-first** | Touch gestures, inertia scrolling, responsive layout, compact toolbar. |
| 6 | **Extensible architecture** | `DrawingToolRegistry` lets you add custom tools at runtime. |
| 7 | **Full color customization** | Body, wick, border, background — all customizable per candle direction. |
| 8 | **Background support** | Image, video, or SVG as chart background with opacity control. |
| 9 | **HSL color picker** | Full color picker for precise color selection. |
| 10 | **Countdown timer** | Shows time remaining until candle close, color-coded, centered inside the price card just below the price tag. |
| 11 | **Dark/Light themes** | Built-in with full color customization. |
| 12 | **No build step** | No npm, webpack, or bundler needed. Just open the file. |
| 13 | **Adaptive rendering** | Automatically switches rendering detail based on zoom level. |
| 14 | **High-DPI support** | Crisp rendering on retina and 4K displays. |
| 15 | **Embeddable** | Single file widget (`badicharts-widget.html`) or library import. |

### Cons (Limitations)

| # | Limitation | Details |
|---|------------|---------|
| 1 | **No real data integration** | Ships with a simulated data feed. You must implement your own WebSocket/REST adapter. |
| 2 | **No built-in save/load** | Drawings and settings are not persisted to localStorage or a server. |
| 3 | **ES modules only** | Uses `import/export` — requires a static server (not `file://`). |
| 4 | **Single timeframe** | No multi-timeframe chart comparison in one view. |
| 5 | **Limited indicator library** | Only Moving Averages and Volume indicators are included (RSI, MACD, etc. exist in code but are hidden from the menu). |
| 6 | **No chart linking** | Multiple chart instances on one page are not synced (no shared crosshair). |
| 7 | **CSS required for UI** | Chart rendering is 100% canvas/JS, but the toolbar and modals use CSS. |
| 8 | **No server-side rendering** | Client-side only — not suitable for SSR frameworks. |
| 9 | **Large codebase** | ~15,000 lines across 100+ files. Could benefit from tree-shaking/bundling. |
| 10 | **No automated tests** | No unit or integration tests included. |
| 11 | **Simulated data only** | The built-in data feed generates random-walk candles, not real market data. |

---

## License

MIT License — free to use, modify, and distribute.

---

## Credits

**BADI-CHARTS** — Built with pure JavaScript, HTML5 Canvas, and a passion for clean financial charting.

Brand colors: `#12C4F0` (cyan) → `#3B6CF5` (blue)
