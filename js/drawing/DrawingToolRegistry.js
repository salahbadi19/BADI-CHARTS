/**
 * DrawingToolRegistry.js
 *
 * Central registry for drawing tools. This is the SINGLE entry point for
 * registering drawing tools — both the built-in ones AND any custom / 3rd-party
 * tools you want to add programmatically or import from a library.
 *
 * ## How to add a custom drawing tool
 *
 * ### Option A: programmatically (in your app code)
 *
 *   ```js
 *   import { DrawingToolRegistry } from './js/drawing/DrawingToolRegistry.js';
 *   import { MyTrendLine } from './my-lib/MyTrendLine.js';
 *
 *   DrawingToolRegistry.register('mytrendline', {
 *     label: 'My Custom Trend Line',
 *     icon: '╱',
 *     category: 'Custom Tools',
 *     factory: (opts) => new MyTrendLine(opts)
 *   });
 *
 *   // Then refresh the toolbar:
 *   engine.toolbar._rebuildDrawingMenu();
 *   ```
 *
 * ### Option B: from an external library / source
 *
 *   ```js
 *   // Dynamically import a drawing tool library:
 *   const mod = await import('https://example.com/badicharts-drawing-tools/index.js');
 *   mod.default.forEach(tool => DrawingToolRegistry.register(tool.id, tool));
 *   engine.toolbar._rebuildDrawingMenu();
 *   ```
 *
 * ### Option C: from a JSON config + factory map
 *
 *   ```js
 *   const TOOLS_JSON = [
 *     { id: 'box', label: 'Box', icon: '▭', category: 'Shapes', class: 'Rectangle' }
 *   ];
 *   const CLASS_MAP = { Rectangle: Rectangle, Triangle: Triangle, ... };
 *   DrawingToolRegistry.loadFromJson(TOOLS_JSON, CLASS_MAP);
 *   ```
 *
 * The default install ships with NO tools registered (clean slate).
 * The user adds exactly the tools they need, when they need them.
 */

export class DrawingToolRegistry {
    constructor() {
        /** @type {Map<string, {label:string, icon:string, category:string, factory:Function}>} */
        this._tools = new Map();
        /** @type {Map<string, Set<Function>>} subscribers to 'change' events */
        this._subscribers = new Set();
    }

    /**
     * Register a single drawing tool.
     * @param {string} id — unique tool id (e.g. 'trendline')
     * @param {object} def — { label, icon, category, factory }
     *   - label: human-readable name (shown in the toolbar menu)
     *   - icon: a short symbol/emoji shown next to the label
     *   - category: groups tools in the menu (e.g. 'Trend & Lines')
     *   - factory: (opts) => DrawingBase — called to instantiate the drawing
     */
    register(id, def) {
        if (!def || typeof def.factory !== 'function') {
            console.warn('[DrawingToolRegistry] Cannot register tool "' + id + '" — missing factory');
            return;
        }
        this._tools.set(id, {
            label: def.label || id,
            icon: def.icon || '·',
            category: def.category || 'Custom',
            factory: def.factory
        });
        this._notify();
    }

    /**
     * Register multiple tools at once.
     * @param {Object<string, {label,icon,category,factory}>} tools
     */
    registerAll(tools) {
        for (const id in tools) this.register(id, tools[id]);
    }

    /**
     * Unregister a tool by id.
     */
    unregister(id) {
        if (this._tools.delete(id)) this._notify();
    }

    /**
     * Remove ALL registered tools (clean slate).
     */
    clear() {
        this._tools.clear();
        this._notify();
    }

    /**
     * Get a single tool definition by id (returns undefined if not registered).
     */
    get(id) {
        return this._tools.get(id);
    }

    /**
     * Check if a tool is registered.
     */
    has(id) {
        return this._tools.has(id);
    }

    /**
     * Get the tool factory (returns a function or undefined).
     */
    factory(id) {
        return this._tools.get(id)?.factory;
    }

    /**
     * Get all registered tool ids.
     */
    ids() {
        return [...this._tools.keys()];
    }

    /**
     * Get all registered tools grouped by category, for menu rendering.
     * Returns: [{ name: 'Category', tools: [{id, label, icon}, ...] }, ...]
     */
    categories() {
        const byCat = new Map();
        for (const [id, def] of this._tools) {
            if (!byCat.has(def.category)) byCat.set(def.category, []);
            byCat.get(def.category).push({ id, label: def.label, icon: def.icon });
        }
        return [...byCat.entries()].map(([name, tools]) => ({ name, tools }));
    }

    /**
     * Subscribe to registry changes (register/unregister/clear).
     * @param {Function} fn — called with no args on every change
     */
    subscribe(fn) {
        this._subscribers.add(fn);
        return () => this._subscribers.delete(fn);
    }

    _notify() {
        this._subscribers.forEach(fn => fn());
    }

    /**
     * Load tools from a JSON config + class map.
     * Useful for loading from external sources at runtime.
     *
     * @param {Array<{id,label,icon,category,class}>} json
     * @param {Object<string, Function>} classMap — class name → constructor
     */
    loadFromJson(json, classMap) {
        for (const t of json) {
            const Cls = classMap[t.class];
            if (!Cls) {
                console.warn('[DrawingToolRegistry] Class not found for tool "' + t.id + '"');
                continue;
            }
            this.register(t.id, {
                label: t.label,
                icon: t.icon,
                category: t.category,
                factory: (opts) => new Cls(opts)
            });
        }
    }
}

// Singleton instance — the SINGLE registry used by the whole chart.
export const drawingToolRegistry = new DrawingToolRegistry();
