/**
 * DataManager.js
 * Stores candle data efficiently and provides indexed access.
 *
 * For very large datasets, we use a structured approach:
 * - times: Float64Array of timestamps
 * - opens/highs/lows/closes/volumes: Float64Array each
 * This is far more cache-friendly than array-of-objects for scanning.
 *
 * Also supports:
 * - Live updates (last candle mutates or new candle appended)
 * - Subscribing to data changes
 * - Historical lookback for indicators
 */
export class DataManager {
    constructor(initialCapacity = 5000) {
        this._capacity = initialCapacity;
        this._size = 0;
        // FIX: Monotonically-increasing version counter. Bumped on EVERY data
        // mutation (push / updateLast / loadFrom / clear). Used by
        // IndicatorBase.ensureCalculated() to decide whether an indicator's
        // cached buffers are stale.
        //
        // Why not just use `dm.size`? Because `updateLast()` mutates the last
        // candle in place when the timestamp matches (live tick on the current
        // bar) WITHOUT changing `dm.size`. Using `dm.size` as the version would
        // cause indicators to silently keep stale values for the live candle.
        this._version = 0;
        this.times = new Float64Array(initialCapacity);
        this.opens = new Float64Array(initialCapacity);
        this.highs = new Float64Array(initialCapacity);
        this.lows = new Float64Array(initialCapacity);
        this.closes = new Float64Array(initialCapacity);
        this.volumes = new Float64Array(initialCapacity);
        this.subscribers = new Set();
        this.interval = 60_000; // 1 minute default
    }

    /**
     * Grow internal buffers when capacity is exceeded.
     */
    _ensureCapacity(needed) {
        if (needed <= this._capacity) return;
        let newCap = this._capacity * 2;
        while (newCap < needed) newCap *= 2;
        const grow = (arr) => {
            const n = new Float64Array(newCap);
            n.set(arr);
            return n;
        };
        this.times = grow(this.times);
        this.opens = grow(this.opens);
        this.highs = grow(this.highs);
        this.lows = grow(this.lows);
        this.closes = grow(this.closes);
        this.volumes = grow(this.volumes);
        this._capacity = newCap;
    }

    /**
     * Append a new candle.
     */
    push(time, open, high, low, close, volume = 0) {
        this._ensureCapacity(this._size + 1);
        const i = this._size++;
        this.times[i] = time;
        this.opens[i] = open;
        this.highs[i] = high;
        this.lows[i] = low;
        this.closes[i] = close;
        this.volumes[i] = volume;
        this._version++; // FIX: bump version so indicators recalc on append.
        this._notify('append', i);
        return i;
    }

    /**
     * Update or append the most recent candle (used for live ticks).
     * If the given time matches the last candle's time, mutate it.
     * Otherwise append a new candle.
     */
    updateLast(time, open, high, low, close, volume = 0) {
        if (this._size > 0 && this.times[this._size - 1] === time) {
            const i = this._size - 1;
            this.opens[i] = open;
            this.highs[i] = high;
            this.lows[i] = low;
            this.closes[i] = close;
            this.volumes[i] = volume;
            // FIX: bump version on in-place mutation. `dm.size` does NOT change
            // here, so without this bump, `IndicatorBase.ensureCalculated()`
            // (which previously keyed off `dm.size`) would skip recalculation —
            // leaving the indicator line stale on the live (rightmost) candle.
            this._version++;
            this._notify('update', i);
            return i;
        }
        return this.push(time, open, high, low, close, volume);
    }

    /**
     * Get a candle at index i as a lightweight object.
     * Returns null if out of bounds.
     */
    get(i) {
        if (i < 0 || i >= this._size) return null;
        return {
            time: this.times[i],
            open: this.opens[i],
            high: this.highs[i],
            low: this.lows[i],
            close: this.closes[i],
            volume: this.volumes[i],
            index: i,
            get isUp() { return this.close >= this.open; }
        };
    }

    /**
     * Get raw arrays for fast iteration (no allocation per candle).
     *
     * FIX: Return TypedArray *views* truncated to `this._size` rather than the
     * full-capacity backing arrays.
     *
     * Previously this returned the underlying Float64Arrays whose `.length` is
     * the *capacity* (e.g. 10000), NOT the number of valid candles
     * (`dm.size`, e.g. 1500). Every indicator's `calculate(dm)` reads
     * `closes.length` (or `highs.length`, etc.) as its iteration bound and
     * allocates output buffers with `new Float64Array(src.length)`. That meant
     * indicators iterated past `dm.size` into the zero-initialized tail of the
     * backing array, producing garbage values that decay toward 0. The chart
     * then drew those garbage values at the right edge (since `rightEdge` can
     * exceed `dm.size - 1` when `rightOffset > 0`), causing the SMA/EMA line
     * to appear to "crash" vertically at the last few candles.
     *
     * `subarray()` is O(1) — it creates a view over the same backing buffer,
     * no copy — so this fix is free at runtime and corrects the buffer length
     * for every indicator at once.
     */
    raw() {
        const n = this._size;
        return {
            times: this.times.subarray(0, n),
            opens: this.opens.subarray(0, n),
            highs: this.highs.subarray(0, n),
            lows: this.lows.subarray(0, n),
            closes: this.closes.subarray(0, n),
            volumes: this.volumes.subarray(0, n)
        };
    }

    /**
     * Find the index of the bar at or just before a given timestamp.
     * Uses binary search for O(log n) performance.
     */
    indexAtTime(time) {
        let lo = 0, hi = this._size - 1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (this.times[mid] < time) lo = mid + 1;
            else if (this.times[mid] > time) hi = mid - 1;
            else return mid;
        }
        return hi;
    }

    /**
     * Get the visible high/low range for a bar index range.
     */
    rangeFor(left, right) {
        left = Math.max(0, Math.floor(left));
        right = Math.min(this._size - 1, Math.ceil(right));
        let min = Infinity, max = -Infinity;
        for (let i = left; i <= right; i++) {
            if (this.lows[i] < min) min = this.lows[i];
            if (this.highs[i] > max) max = this.highs[i];
        }
        return { min, max, hasData: isFinite(min) && isFinite(max) };
    }

    /**
     * Get the max volume in a range (for volume bar normalization).
     */
    maxVolumeFor(left, right) {
        left = Math.max(0, Math.floor(left));
        right = Math.min(this._size - 1, Math.ceil(right));
        let max = 0;
        for (let i = left; i <= right; i++) {
            if (this.volumes[i] > max) max = this.volumes[i];
        }
        return max;
    }

    get size() { return this._size; }

    /**
     * Subscribe to data changes. Callback: (event, index) => void.
     */
    subscribe(fn) {
        this.subscribers.add(fn);
        return () => this.subscribers.delete(fn);
    }

    _notify(event, index) {
        this.subscribers.forEach(fn => fn(event, index));
    }

    /**
     * Replace all data with the given candles array.
     */
    loadFrom(candles) {
        this._ensureCapacity(candles.length);
        this._size = candles.length;
        for (let i = 0; i < candles.length; i++) {
            const c = candles[i];
            this.times[i] = c.time;
            this.opens[i] = c.open;
            this.highs[i] = c.high;
            this.lows[i] = c.low;
            this.closes[i] = c.close;
            this.volumes[i] = c.volume || 0;
        }
        this._version++; // FIX: bump version so indicators recalc after a full reload.
        this._notify('load', -1);
    }

    clear() {
        this._size = 0;
        this._version++; // FIX: bump version so indicators recalc after clear.
        this._notify('clear', -1);
    }

    /**
     * FIX: Expose the data version for `IndicatorBase.ensureCalculated()`.
     * Incremented on every push / updateLast / loadFrom / clear.
     */
    get version() { return this._version; }
}
