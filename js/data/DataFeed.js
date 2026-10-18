/**
 * DataFeed.js
 * Simulated market data feed for demonstration.
 * Generates realistic-looking OHLC candles using a random-walk with volatility.
 *
 * In a real platform, this would be replaced with WebSocket / REST feed adapters.
 * The interface below (start/stop/onTick) is what the chart engine expects.
 */
export class DataFeed {
    constructor(dataManager, options = {}) {
        this.dm = dataManager;
        this.startPrice = options.startPrice || 100;
        this.volatility = options.volatility || 0.015;
        this.drift = options.drift || 0.0002;
        this.interval = options.interval || 60_000; // 1m
        this.onTick = options.onTick || (() => {});
        this._timer = null;
        this._running = false;
        this._currentPrice = this.startPrice;
        this._lastTime = 0;
    }

    /**
     * Generate N historical candles leading up to "now".
     */
    generateHistory(count = 1000) {
        const candles = [];
        let price = this.startPrice;
        const now = Date.now();
        // Align to interval boundary
        const startTime = Math.floor(now / this.interval) * this.interval - count * this.interval;
        for (let i = 0; i < count; i++) {
            const time = startTime + i * this.interval;
            const open = price;
            // Random walk with mean reversion
            const change = (Math.random() - 0.5) * 2 * this.volatility * price;
            const trendComponent = this.drift * price;
            let close = open + change + trendComponent;
            if (close < 0.01) close = 0.01;
            const highLowRange = Math.abs(change) * (1 + Math.random() * 1.5) + price * 0.001;
            const high = Math.max(open, close) + Math.random() * highLowRange;
            const low = Math.min(open, close) - Math.random() * highLowRange;
            const volume = Math.round(500_000 + Math.random() * 2_000_000 * (1 + Math.abs(change / price) * 20));
            candles.push({ time, open, high, low, close: close, volume });
            price = close;
        }
        this._currentPrice = candles[candles.length - 1].close;
        this._lastTime = candles[candles.length - 1].time;
        this.dm.loadFrom(candles);
        return candles;
    }

    /**
     * Start the live tick simulation. Emits a new tick every `tickMs`.
     */
    start(tickMs = 1000) {
        if (this._running) return;
        this._running = true;
        this._timer = setInterval(() => this._tick(), tickMs);
    }

    stop() {
        if (this._timer) clearInterval(this._timer);
        this._timer = null;
        this._running = false;
    }

    _tick() {
        const now = Date.now();
        // Determine if we should start a new candle or update the current one
        const currentBucket = Math.floor(now / this.interval) * this.interval;
        if (currentBucket > this._lastTime) {
            // New candle
            const open = this._currentPrice;
            const change = (Math.random() - 0.5) * 2 * this.volatility * open;
            const close = Math.max(0.01, open + change);
            const range = Math.abs(change) * (1 + Math.random() * 1.5) + open * 0.001;
            const high = Math.max(open, close) + Math.random() * range;
            const low = Math.min(open, close) - Math.random() * range;
            const volume = Math.round(500_000 + Math.random() * 2_000_000);
            this.dm.updateLast(currentBucket, open, high, low, close, volume);
            this._currentPrice = close;
            this._lastTime = currentBucket;
        } else {
            // Update current candle
            const lastIdx = this.dm.size - 1;
            const c = this.dm.get(lastIdx);
            if (!c) return;
            const tickChange = (Math.random() - 0.5) * 0.5 * this.volatility * c.close;
            const newClose = Math.max(0.01, c.close + tickChange);
            const newHigh = Math.max(c.high, newClose);
            const newLow = Math.min(c.low, newClose);
            const newVol = c.volume + Math.round(Math.random() * 50_000);
            this.dm.updateLast(c.time, c.open, newHigh, newLow, newClose, newVol);
            this._currentPrice = newClose;
        }
        this.onTick();
    }

    get isRunning() { return this._running; }
}
