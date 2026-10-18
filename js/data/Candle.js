/**
 * Candle.js
 * Lightweight candle/tick data structure. Using a class for clarity but it's
 * just a typed bag of numbers. The DataManager stores them in a flat Float64Array
 * for cache-friendly access when scanning thousands of bars.
 */
export class Candle {
    constructor(time, open, high, low, close, volume = 0) {
        this.time = time;       // unix ms
        this.open = open;
        this.high = high;
        this.low = low;
        this.close = close;
        this.volume = volume;
    }

    get isUp() {
        return this.close >= this.open;
    }

    get body() {
        return Math.abs(this.close - this.open);
    }

    get range() {
        return this.high - this.low;
    }
}
