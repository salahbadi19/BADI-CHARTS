/**
 * MathUtils.js
 * Utility functions for mathematical operations used throughout the chart engine.
 * All functions are pure and side-effect free for performance.
 */
export const MathUtils = {
    /**
     * Clamp a value between min and max.
     */
    clamp(value, min, max) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    },

    /**
     * Linear interpolation between a and b.
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    /**
     * Inverse linear interpolation - returns t such that lerp(a, b, t) = value.
     */
    invLerp(a, b, value) {
        if (a === b) return 0;
        return (value - a) / (b - a);
    },

    /**
     * Round to a given number of decimal places.
     */
    round(value, decimals = 0) {
        const f = Math.pow(10, decimals);
        return Math.round(value * f) / f;
    },

    /**
     * Nice number algorithm - rounds a value up to a "nice" number (1, 2, 5, 10...).
     * Used for grid line spacing.
     */
    niceNumber(value, round) {
        if (value <= 0) return 1;
        const exp = Math.floor(Math.log10(value));
        const f = value / Math.pow(10, exp);
        let nf;
        if (round) {
            if (f < 1.5) nf = 1;
            else if (f < 3) nf = 2;
            else if (f < 7) nf = 5;
            else nf = 10;
        } else {
            if (f <= 1) nf = 1;
            else if (f <= 2) nf = 2;
            else if (f <= 5) nf = 5;
            else nf = 10;
        }
        return nf * Math.pow(10, exp);
    },

    /**
     * Generate nice tick values between min and max.
     * FIX: Previous implementation pre-rounded the range via niceNumber(max-min, false),
     * which inflated the step and produced far fewer ticks than requested (e.g. tickCount=14
     * yielded only ~5-7 visible ticks). The new implementation picks the nice step from
     * {1, 2, 2.5, 5, 10} × 10^exp whose resulting tick count is closest to maxTicks,
     * giving the user a density close to what they requested (e.g. tickCount=14 → ~10-14 ticks).
     */
    niceTicks(min, max, maxTicks = 8) {
        if (min === max) {
            min -= 1;
            max += 1;
        }
        const rawRange = max - min;
        if (rawRange <= 0) return { ticks: [min], step: 1, min, max };
        // Candidate nice multipliers; FIX: include 2.5 for finer granularity
        const multipliers = [1, 2, 2.5, 5, 10];
        // Initial guess for magnitude based on raw step
        const rawStep = rawRange / Math.max(1, maxTicks - 1);
        const exp0 = Math.floor(Math.log10(rawStep));
        // Consider candidates at exp0 and exp0+1 (one magnitude larger) so we can find
        // the step whose tick count is closest to maxTicks.
        const candidates = [];
        for (const e of [exp0, exp0 + 1]) {
            const base = Math.pow(10, e);
            for (const m of multipliers) candidates.push(m * base);
        }
        // For each candidate step, estimate the total tick count it would produce.
        // Pick the candidate whose count is closest to maxTicks; tie → smaller step (denser).
        let bestStep = candidates[0];
        let bestErr = Infinity;
        for (const step of candidates) {
            if (step <= 0) continue;
            const count = rawRange / step + 1; // approximate number of ticks
            const err = Math.abs(count - maxTicks);
            if (err < bestErr || (err === bestErr && step < bestStep)) {
                bestErr = err;
                bestStep = step;
            }
        }
        const step = bestStep;
        const niceMin = Math.floor(min / step) * step;
        const niceMax = Math.ceil(max / step) * step;
        const ticks = [];
        // Guard against tiny step producing huge arrays
        const maxIter = Math.min(1000, Math.round((niceMax - niceMin) / step) + 2);
        for (let i = 0; i <= maxIter; i++) {
            const v = niceMin + i * step;
            if (v > niceMax + step * 0.5) break;
            ticks.push(v);
        }
        return { ticks, step, min: niceMin, max: niceMax };
    },

    /**
     * Format a number with appropriate precision.
     */
    formatNumber(value, precision = 2) {
        if (!isFinite(value)) return '—';
        const abs = Math.abs(value);
        if (abs >= 1e9) return (value / 1e9).toFixed(2) + 'B';
        if (abs >= 1e6) return (value / 1e6).toFixed(2) + 'M';
        if (abs >= 1e3) return (value / 1e3).toFixed(2) + 'K';
        return value.toFixed(precision);
    },

    /**
     * Format price with adaptive decimals based on magnitude.
     */
    formatPrice(value) {
        if (!isFinite(value)) return '—';
        const abs = Math.abs(value);
        let decimals;
        if (abs >= 1000) decimals = 2;
        else if (abs >= 1) decimals = 4;
        else if (abs >= 0.01) decimals = 6;
        else decimals = 8;
        return value.toFixed(decimals);
    },

    /**
     * Distance between two points.
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Check if a point is inside a rectangle.
     */
    pointInRect(px, py, x, y, w, h) {
        return px >= x && px <= x + w && py >= y && py <= y + h;
    },

    /**
     * Throttle a function call to run at most once per animation frame.
     */
    rafThrottle(fn) {
        let scheduled = false;
        let lastArgs = null;
        let lastThis = null;
        return function (...args) {
            lastArgs = args;
            lastThis = this;
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                fn.apply(lastThis, lastArgs);
            });
        };
    },

    /**
     * Debounce a function.
     */
    debounce(fn, delay) {
        let timer = null;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }
};
