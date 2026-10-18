/**
 * BadiCharts API — Programmatic Control Guide
 * ============================================
 *
 * This file documents the public API for controlling BadiCharts
 * programmatically via JavaScript. It's not a runtime module — it's
 * reference documentation you can read to understand the API.
 *
 * SETUP:
 *   const chart = BadiCharts.create('#container', { symbol: 'BTCUSDT' });
 *   chart.init();
 *
 * DRAWING TOOLS:
 *   // Register a custom drawing tool:
 *   BadiCharts.registerTool('mytool', {
 *     label: 'My Tool', icon: '★', category: 'Custom',
 *     factory: (opts) => new MyToolClass(opts)
 *   });
 *   // List all registered tools:
 *   drawingToolRegistry.ids();
 *
 * BACKGROUND:
 *   BadiCharts.setBackground({ type: 'image', src: 'logo.png', opacity: 0.2 });
 *   BadiCharts.setBackground({ type: 'video', src: 'bg.mp4', opacity: 0.1 });
 *   BadiCharts.setBackground({ type: 'svg', src: '<svg>...</svg>', opacity: 0.3 });
 *   BadiCharts.clearBackground();
 *
 * CHART TYPE:
 *   BadiCharts.setChartType('candles');
 *   BadiCharts.setChartType('hollow');
 *   BadiCharts.setChartType('heikinAshi');
 *   BadiCharts.setChartType('kagi');
 *   BadiCharts.setChartType('patternDetection');
 *   BadiCharts.setChartType('animatedCandles');
 *
 * INDICATORS:
 *   BadiCharts.addIndicator('SMA', { period: 20, color: '#12C4F0' });
 *   BadiCharts.addIndicator('EMA', { period: 9, color: '#FF9800' });
 *   BadiCharts.addIndicator('Volume');
 *   BadiCharts.addIndicator('VolumeProfile');
 *
 * THEME:
 *   BadiCharts.toggleTheme();
 *
 * LIVE FEED:
 *   BadiCharts.toggleLive();  // start/stop simulated ticks
 *
 * ENGINE ACCESS (advanced):
 *   const engine = BadiCharts.engine;  // direct ChartEngine instance
 *   engine.fitAll();
 *   engine.zoomBy(1.25);
 *   engine.setActiveTool('trendline');
 *   engine.dataFeed.generateHistory(2000);
 */

// This file is documentation only — no runtime code.
export const API_DOCS = true;
