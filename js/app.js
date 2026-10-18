/**
 * app.js
 * Application entry point. Wires up the chart engine to the DOM.
 *
 * DRAWING TOOLS: the chart engine ships with NO tools registered by
 * default. We register the built-in tools below so the user can draw
 * immediately. To customize, edit this file or override at runtime:
 *
 *   import { drawingToolRegistry } from './js/drawing/DrawingToolRegistry.js';
 *   drawingToolRegistry.clear();  // remove all
 *   drawingToolRegistry.register('mytool', { ... });  // add custom
 */
import { ChartEngine } from './core/ChartEngine.js';
import { drawingToolRegistry } from './drawing/DrawingToolRegistry.js';
import { BUILT_IN_TOOLS } from './drawing/DrawingManager.js';

// Register the built-in drawing tools (TrendLine, Rectangle, Fibonacci, etc.)
// so the user can draw immediately. Remove this line for a clean slate,
// or call drawingToolRegistry.clear() + register() to customize.
if (BUILT_IN_TOOLS && typeof BUILT_IN_TOOLS === 'object') {
    drawingToolRegistry.registerAll(BUILT_IN_TOOLS);
    console.log('Drawing tools registered:', drawingToolRegistry.ids().length);
} else {
    console.error('BUILT_IN_TOOLS is undefined — circular import issue');
}
window.drawingToolRegistry = drawingToolRegistry;

const container = document.getElementById('chart-root');
const engine = new ChartEngine(container, {
    symbol: 'BTCUSDT',
    theme: 'dark'
});

engine.init();

// Keyboard shortcuts for tool selection
window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    const map = {
        'v': 'cursor', 'c': 'crosshair', 't': 'trendline',
        'h': 'hline', 'r': 'rectangle', 'f': 'fib', 'x': 'text'
    };
    if (map[e.key.toLowerCase()]) {
        engine.setActiveTool(map[e.key.toLowerCase()] === 'cursor' ? null : map[e.key.toLowerCase()]);
        if (map[e.key.toLowerCase()] === 'cursor') engine.toolbar.setActiveTool('cursor');
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
        engine.drawingManager.deleteSelected();
        engine.requestRender();
    }
});

// Make available for debugging
window.chartEngine = engine;
console.log('%cBadiCharts v1.0', 'font-size:14px;font-weight:bold;color:#12C4F0');
console.log('Engine available at window.chartEngine');
console.log('Drawing tools registered:', drawingToolRegistry.ids().length);
console.log('Drawing tools registry: window.drawingToolRegistry');
