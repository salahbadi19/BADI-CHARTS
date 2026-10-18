#!/usr/bin/env node
/**
 * build.js — Bundles all ES modules + CSS into a single IIFE file.
 *
 * Produces:
 *   dist/badi-charts.js   — single JS file (IIFE, no ES module imports)
 *   dist/badi-charts.css  — single CSS file (all styles combined)
 *
 * Usage: node build.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// ============================================================
// 1. BUNDLE CSS
// ============================================================
const cssFiles = [
  'css/main.css',
  'css/chart.css',
  'css/toolbar.css',
  'css/themes.css',
  'css/colorpicker.css',
  'css/indicator-modal.css',
  'css/chart-settings-modal.css'
];

let cssContent = '/* BADI-CHARTS v1.0 — Bundled CSS */\n\n';
for (const f of cssFiles) {
  const fp = path.join(ROOT, f);
  if (fs.existsSync(fp)) {
    cssContent += `/* === ${f} === */\n` + fs.readFileSync(fp, 'utf8') + '\n\n';
  } else {
    console.warn('  [CSS] Not found:', f);
  }
}

// ============================================================
// 2. BUNDLE JS (ES modules → IIFE)
// ============================================================
// We need to resolve ES module imports and concatenate into a single file.
// Strategy:
//   a. Read each JS file.
//   b. Strip 'import' and 'export' statements.
//   c. Concatenate in dependency order.
//   d. Wrap in an IIFE that exposes window.BadiCharts.

const jsFiles = [
  // Utils (no deps)
  'js/utils/MathUtils.js',
  'js/utils/ColorUtils.js',
  'js/utils/DomUtils.js',
  'js/utils/Performance.js',
  // Data
  'js/data/Candle.js',
  'js/data/DataManager.js',
  'js/data/DataFeed.js',
  // Scale
  'js/scale/PriceScale.js',
  'js/scale/TimeScale.js',
  // Series
  'js/series/SeriesBase.js',
  'js/series/CandleSeries.js',
  'js/series/VolumeSeries.js',
  'js/series/ChartTypeManager.js',
  'js/series/AdvancedChartTypes.js',
  // Core
  'js/core/Canvas.js',
  'js/core/Viewport.js',
  'js/core/AnimationLoop.js',
  'js/core/PaneManager.js',
  'js/core/EventManager.js',
  'js/core/ChartEngine.js',
  // Indicators
  'js/indicators/IndicatorBase.js',
  // Overlay indicators
  'js/indicators/overlays/SMA.js',
  'js/indicators/overlays/EMA.js',
  'js/indicators/overlays/WMA.js',
  'js/indicators/overlays/DoubleEMA.js',
  'js/indicators/overlays/TripleEMA.js',
  'js/indicators/overlays/SMMA.js',
  'js/indicators/overlays/VWMA.js',
  'js/indicators/overlays/HullMA.js',
  'js/indicators/overlays/KAMA.js',
  'js/indicators/overlays/ALMA.js',
  'js/indicators/overlays/VWAP.js',
  'js/indicators/overlays/AnchoredVWAP.js',
  'js/indicators/overlays/BollingerBands.js',
  'js/indicators/overlays/KeltnerChannel.js',
  'js/indicators/overlays/DonchianChannel.js',
  'js/indicators/overlays/SuperTrend.js',
  'js/indicators/overlays/ParabolicSAR.js',
  'js/indicators/overlays/IchimokuCloud.js',
  'js/indicators/overlays/ZigZag.js',
  'js/indicators/overlays/PivotPoints.js',
  'js/indicators/overlays/LinearRegression.js',
  'js/indicators/overlays/MAribbon.js',
  'js/indicators/overlays/EnvChannel.js',
  'js/indicators/overlays/EMAribbon.js',
  'js/indicators/overlays/WilliamsFractals.js',
  'js/indicators/overlays/HeikinAshi.js',
  'js/indicators/overlays/BuySellSignals.js',
  // Pane indicators
  'js/indicators/panes/RSI.js',
  'js/indicators/panes/MACD.js',
  'js/indicators/panes/Stochastic.js',
  'js/indicators/panes/StochRSI.js',
  'js/indicators/panes/CCI.js',
  'js/indicators/panes/ATR.js',
  'js/indicators/panes/ADX.js',
  'js/indicators/panes/WilliamsR.js',
  'js/indicators/panes/MFI.js',
  'js/indicators/panes/ROC.js',
  'js/indicators/panes/Momentum.js',
  'js/indicators/panes/OBV.js',
  'js/indicators/panes/Volume.js',
  'js/indicators/panes/ChaikinOsc.js',
  'js/indicators/panes/CMF.js',
  'js/indicators/panes/TRIX.js',
  'js/indicators/panes/DPO.js',
  'js/indicators/panes/KST.js',
  'js/indicators/panes/AO.js',
  'js/indicators/panes/AC.js',
  'js/indicators/panes/PPO.js',
  'js/indicators/panes/PVO.js',
  'js/indicators/panes/TSI.js',
  'js/indicators/panes/UltimateOsc.js',
  'js/indicators/panes/VolumeProfile.js',
  'js/indicators/IndicatorManager.js',
  // Drawing
  'js/drawing/DrawingBase.js',
  'js/drawing/TrendLine.js',
  'js/drawing/RayLine.js',
  'js/drawing/HorizontalLine.js',
  'js/drawing/VerticalLine.js',
  'js/drawing/Arrow.js',
  'js/drawing/Brush.js',
  'js/drawing/Polyline.js',
  'js/drawing/Rectangle.js',
  'js/drawing/Ellipse.js',
  'js/drawing/Triangle.js',
  'js/drawing/Fibonacci.js',
  'js/drawing/FibExtension.js',
  'js/drawing/FibChannel.js',
  'js/drawing/TextDrawing.js',
  'js/drawing/ParallelChannel.js',
  'js/drawing/Pitchfork.js',
  'js/drawing/GannBox.js',
  'js/drawing/LongPosition.js',
  'js/drawing/ShortPosition.js',
  'js/drawing/Measurement.js',
  'js/drawing/PriceLabel.js',
  'js/drawing/DateRange.js',
  'js/drawing/ArrowMarker.js',
  'js/drawing/DrawingManager.js',
  'js/drawing/DrawingToolRegistry.js',
  // UI
  'js/ui/Crosshair.js',
  'js/ui/StatusBar.js',
  'js/ui/Toolbar.js',
  'js/ui/Theme.js',
  'js/ui/Watermark.js',
  'js/ui/BackgroundManager.js',
  'js/ui/ColorPicker.js',
  'js/ui/DrawingSettingsCard.js',
  'js/ui/IndicatorSettingsModal.js',
];

function stripImportsExports(code) {
  let result = code;
  // Remove import statements (single and multi-line)
  result = result.replace(/^\s*import\s+.*$/gm, '');
  result = result.replace(/^\s*import\s+.*?from\s+['"].*?['"];?\s*$/gm, '');
  // Remove 'export' keyword (keep the declaration)
  result = result.replace(/^\s*export\s+/gm, '');
  // Remove 'export default' — just leave the value
  result = result.replace(/^\s*export\s+default\s+/gm, '');
  return result;
}

let jsContent = `/* BADI-CHARTS v1.0 — Bundled JavaScript (IIFE) */
/* This file is auto-generated by build.js. Do not edit directly. */
/* Source: https://github.com/salahbadi19/BADI-CHARTS */

(function(global) {
'use strict';

`;

let fileCount = 0;
let skipped = 0;

for (const f of jsFiles) {
  const fp = path.join(ROOT, f);
  if (!fs.existsSync(fp)) {
    skipped++;
    continue;
  }
  const code = fs.readFileSync(fp, 'utf8');
  const stripped = stripImportsExports(code);
  jsContent += `/* === ${f} === */\n${stripped}\n\n`;
  fileCount++;
}

// Add the bootstrap code that normally lives in app.js
jsContent += `
/* === Bootstrap === */
// drawingToolRegistry is already declared by DrawingToolRegistry.js
// Just register the built-in tools if BUILT_IN_TOOLS exists.
if (typeof BUILT_IN_TOOLS !== 'undefined' && typeof drawingToolRegistry !== 'undefined') {
  drawingToolRegistry.registerAll(BUILT_IN_TOOLS);
}

// Public API
global.BadiCharts = {
  // Create a new chart instance
  create: function(selector, opts) {
    var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) { console.error('BadiCharts: container not found:', selector); return null; }
    var options = opts || {};
    // When using CDN embed via BadiCharts.create(), default to:
    //   - NO toolbar (clean embedded chart)
    //   - NO status bar
    //   - autoData = true (generate demo data so the chart isn't empty)
    // User can override: BadiCharts.create('#el', { toolbar: true })
    if (options.toolbar === undefined) options.toolbar = false;
    if (options.statusBar === undefined) options.statusBar = false;
    if (options.autoData === undefined) options.autoData = true;
    var engine = new ChartEngine(el, options);
    engine.init();
    return engine;
  },
  // Register a custom drawing tool
  registerTool: function(id, def) { drawingToolRegistry.register(id, def); },
  // Unregister a tool
  unregisterTool: function(id) { drawingToolRegistry.unregister(id); },
  // Clear all tools
  clearTools: function() { drawingToolRegistry.clear(); },
  // List registered tools
  listTools: function() { return drawingToolRegistry.ids(); },
  // Get the tool registry (for advanced use)
  registry: drawingToolRegistry,
  // Version
  version: '1.0.0'
};

// Auto-init if a container with id="chart-root" or data-badi-charts exists
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    var auto = document.querySelector('[data-badi-charts]') || document.getElementById('chart-root');
    if (auto) {
      var opts = {};
      if (auto.getAttribute('data-symbol')) opts.symbol = auto.getAttribute('data-symbol');
      if (auto.getAttribute('data-theme')) opts.theme = auto.getAttribute('data-theme');
      // Auto-init via CDN bundle: NO toolbar, NO status bar (clean embedded chart).
      // User can pass { toolbar: true } via BadiCharts.create() to enable.
      opts.toolbar = false;
      opts.statusBar = false;
      opts.autoData = true;
      global.BadiCharts.create(auto, opts);
    }
  });
}

})(typeof window !== 'undefined' ? window : this);
`;

// ============================================================
// 3. WRITE OUTPUT FILES
// ============================================================
if (!fs.existsSync(DIST)) {
  fs.mkdirSync(DIST, { recursive: true });
}

fs.writeFileSync(path.join(DIST, 'badi-charts.js'), jsContent, 'utf8');
fs.writeFileSync(path.join(DIST, 'badi-charts.css'), cssContent, 'utf8');

console.log('BADI-CHARTS build complete:');
console.log('  dist/badi-charts.js  —', jsContent.length, 'bytes');
console.log('  dist/badi-charts.css —', cssContent.length, 'bytes');
console.log('  JS files bundled:', fileCount, '| Skipped:', skipped);
