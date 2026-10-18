/**
 * IndicatorBase.js
 * Base class for all indicators.
 *
 * Subclasses implement:
 *   - calculate(dm) — compute buffers from candle data; called when data changes
 *   - draw(ctx, viewport, dm, pane, theme) — render
 *   - defaultOptions() — return default options object
 *
 * Two types:
 *   - OVERLAY: renders on the main price pane (e.g. MA, Bollinger)
 *   - PANE: renders in its own separate pane below (e.g. RSI, MACD)
 */
export class IndicatorBase {
    constructor(options = {}) {
        this.id = options.id || (IndicatorBase._idCounter++);
        this.name = options.name || 'Indicator';
        this.type = 'overlay'; // 'overlay' | 'pane'
        this.visible = options.visible !== false;
        this.options = { ...this.defaultOptions(), ...options };
        this.buffers = {};
        this._lastDataVersion = -1;
        this.color = options.color || '#12C4F0';
        this.color2 = options.color2 || '#EA3943';
        this.color3 = options.color3 || '#16C784';
        this.lineWidth = options.lineWidth || 1.5;
        this.zIndex = options.zIndex || 50;
        this.paneId = options.paneId || null;
    }

    defaultOptions() { return {}; }
    calculate(dm) {}

    ensureCalculated(dm) {
        // FIX: Key the recalc check off `dm.version` (a counter bumped on EVERY
        // data mutation) instead of `dm.size`.
        //
        // The previous `dm.size` check had two failure modes:
        //   1. Live tick on the current bar — `DataManager.updateLast()` mutates
        //      the last candle in place WITHOUT changing `dm.size`, so this
        //      check would pass (skip recalc) and the indicator line would lag
        //      the live candle by one tick (or, after the first live tick,
        //      freeze indefinitely).
        //   2. Stale buffer length when data shrinks — when `loadFrom()` reduces
        //      `dm.size` (e.g. symbol switch / timeframe change), the cached
        //      indicator buffers retained their old (larger) length, and the
        //      right edge of the chart would draw into the stale, zero-filled
        //      tail — visible as a vertical "crash" of the line at the last
        //      few candles.
        //
        // Using `dm.version` (which is also bumped by `updateLast`'s mutate
        // branch and by `loadFrom`) closes both holes: `calculate(dm)` is now
        // invoked on every data change, and because `calculate` allocates a new
        // buffer from `dm.raw()` (which now returns size-truncated subarrays),
        // the buffer length always matches the current `dm.size`.
        if (this._lastDataVersion !== dm.version) {
            this.calculate(dm);
            this._lastDataVersion = dm.version;
        }
    }

    draw(ctx, viewport, dm, pane, theme) {}

    /**
     * Compute the visible min/max of this indicator's buffers (for pane autoscale).
     */
    visibleRange(viewport, dm) {
        return { min: Infinity, max: -Infinity };
    }

    // ---- Math helpers ----
    _sma(src, period) {
        const out = new Float64Array(src.length);
        let sum = 0;
        for (let i = 0; i < src.length; i++) {
            sum += src[i];
            if (i >= period) sum -= src[i - period];
            out[i] = i >= period - 1 ? sum / period : NaN;
        }
        return out;
    }
    _ema(src, period) {
        const out = new Float64Array(src.length);
        const k = 2 / (period + 1);
        let prev = NaN;
        for (let i = 0; i < src.length; i++) {
            if (i < period - 1) { out[i] = NaN; if (i === 0) prev = src[i]; continue; }
            if (i === period - 1) {
                let sum = 0;
                for (let j = 0; j < period; j++) sum += src[j];
                prev = sum / period;
                out[i] = prev;
                continue;
            }
            prev = src[i] * k + prev * (1 - k);
            out[i] = prev;
        }
        return out;
    }
    _rma(src, period) {
        const out = new Float64Array(src.length);
        let sum = 0;
        for (let i = 0; i < src.length; i++) {
            if (i < period) {
                sum += src[i];
                out[i] = i === period - 1 ? sum / period : NaN;
            } else {
                out[i] = (out[i - 1] * (period - 1) + src[i]) / period;
            }
        }
        return out;
    }
    _wma(src, period) {
        const out = new Float64Array(src.length);
        const denom = period * (period + 1) / 2;
        for (let i = period - 1; i < src.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) sum += src[i - j] * (period - j);
            out[i] = sum / denom;
        }
        return out;
    }
    /**
     * SMA that tolerates leading NaN values in `src`. The first `period`
     * *finite* values form the seed; out[i] is NaN until then. Useful when
     * feeding the output of another indicator (which has a warm-up window)
     * into a moving average — the base `_sma` would otherwise contaminate
     * its running sum with NaN and stay NaN forever.
     */
    _smaRobust(src, period) {
        const n = src.length;
        const out = new Float64Array(n);
        let sum = 0, count = 0;
        for (let i = 0; i < n; i++) {
            const v = src[i];
            if (!isFinite(v)) { out[i] = NaN; continue; }
            sum += v;
            count++;
            if (count < period) {
                out[i] = NaN;
            } else if (count === period) {
                out[i] = sum / period;
            } else {
                // Subtract the (period-th most recent finite value).
                // Because the source may contain NaN holes, we cannot use a
                // fixed offset; instead, scan back to find the value to drop.
                // For performance, fall back to recomputing the sum when needed.
                // (Per-bar cost is O(period) which is fine for typical n<=2000.)
                let dropIdx = i, dropped = 0;
                while (dropped < period && dropIdx >= 0) {
                    if (isFinite(src[dropIdx])) dropped++;
                    if (dropped < period) dropIdx--;
                }
                if (dropped === period && dropIdx >= 0) sum -= src[dropIdx];
                out[i] = sum / period;
            }
        }
        return out;
    }
    _stdev(src, period) {
        const out = new Float64Array(src.length);
        for (let i = period - 1; i < src.length; i++) {
            let sum = 0;
            for (let j = i - period + 1; j <= i; j++) sum += src[j];
            const mean = sum / period;
            let sq = 0;
            for (let j = i - period + 1; j <= i; j++) sq += (src[j] - mean) ** 2;
            out[i] = Math.sqrt(sq / period);
        }
        return out;
    }
    _highest(src, period) {
        const out = new Float64Array(src.length);
        for (let i = 0; i < src.length; i++) {
            let h = -Infinity;
            for (let j = Math.max(0, i - period + 1); j <= i; j++) h = Math.max(h, src[j]);
            out[i] = i >= period - 1 ? h : NaN;
        }
        return out;
    }
    _lowest(src, period) {
        const out = new Float64Array(src.length);
        for (let i = 0; i < src.length; i++) {
            let l = Infinity;
            for (let j = Math.max(0, i - period + 1); j <= i; j++) l = Math.min(l, src[j]);
            out[i] = i >= period - 1 ? l : NaN;
        }
        return out;
    }

    // ---- Drawing helpers ----
    _drawLine(ctx, viewport, buf, color, lineWidth = 1.5, pane = null, dash = null) {
        const leftIdx = Math.max(0, Math.floor(viewport.leftEdge));
        const rightIdx = Math.min(buf.length - 1, Math.ceil(viewport.rightEdge));
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        if (dash) ctx.setLineDash(dash); else ctx.setLineDash([]);
        ctx.beginPath();
        let started = false;
        for (let i = leftIdx; i <= rightIdx; i++) {
            const v = buf[i];
            if (!isFinite(v)) { started = false; continue; }
            const x = viewport.indexToX(i) + viewport.barSpacing / 2;
            const y = this._priceToY(v, viewport, pane);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }
    _priceToY(value, viewport, pane) {
        if (pane) {
            const range = pane.priceRange;
            if (!range || range.min === range.max) return (pane.innerHeight || 100) / 2;
            const t = (value - range.min) / (range.max - range.min);
            return (1 - t) * (pane.innerHeight || 100);
        }
        return viewport.priceToY(value);
    }
    _clipToPane(ctx, viewport, pane) {
        const w = viewport.width - 70; // exclude price scale
        const h = pane ? pane.innerHeight : viewport.priceHeight;
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.clip();
    }

    /**
     * Convert a hex color (e.g. '#12C4F0' or '#abc') into an rgba() string
     * with the given alpha. Falls back to returning the original string
     * if it is not hex (e.g. already an rgba()/named color).
     */
    _withAlpha(color, alpha) {
        if (!color) return 'transparent';
        if (color.startsWith('#')) {
            let hex = color.slice(1);
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r},${g},${b},${alpha})`;
        }
        return color;
    }

    toJSON() {
        return { id: this.id, name: this.name, type: this.type, options: this.options, color: this.color, visible: this.visible };
    }
}
IndicatorBase._idCounter = 1;
