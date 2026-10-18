/**
 * ChartTypeManager.js
 * Manages chart/candle rendering types. 36 types available:
 *
 * Standard candles (10):
 *  1. candles       — Standard Japanese candlestick
 *  2. hollow        — Hollow candles (up = outline, down = filled)
 *  3. heikinAshi    — Heikin-Ashi candles (smoothed)
 *  4. barChart      — OHLC bars (traditional bar chart)
 *  5. line          — Close price line
 *  6. area          — Close line with fill below
 *  7. baseline      — Line with fill above/below a baseline
 *  8. stepLine      — Stepped close line
 *  9. lineMarkers   — Close line with dot markers
 * 10. mountain      — Area with gradient fill
 *
 * Special candles (10):
 * 11. bodyOnly      — Candles without wicks
 * 12. highLow       — High-low bars only (no body)
 * 13. medianCandle  — Candles with median line through body
 * 14. squared       — Squared candles (no gap, full width)
 * 15. volumeCandle  — Body width proportional to volume
 * 16. shadowCandle  — Transparent body, wicks only
 * 17. coloredCandle — Gradient-filled bodies
 * 18. deltaCandle   — Body height = close - previous close
 * 19. elastic       — Elastic volume-weighted candles
 * 20. rangeBar      — Range bars (price-range based)
 *
 * Pushed/Hollow candles (10) — الشموع المدفوعة:
 * 21. hollowUp        — Up candles hollow, down filled (classic)
 * 22. hollowDown      — Down candles hollow, up filled (reverse)
 * 23. hollowBoth      — Both up & down hollow (outlines only)
 * 24. hollowColored   — Hollow with bright colored outlines
 * 25. hollowPushed    — Hollow with thick borders (pushed look)
 * 26. hollowMinimal   — Very thin hollow outline, no wicks
 * 27. hollowFilled    — Semi-transparent fill + outline
 * 28. hollowClassic   — TradingView classic hollow style
 * 29. hollowWickOnly  — Hollow body, colored wicks only
 * 30. hollowBiColor   — Up = green hollow, Down = red hollow, diff wick colors
 *
 * Advanced chart types (3) — أنماط قوية:
 * 31. kagi               — Kagi (thickness changes at reversal)
 * 32. heikinAshiSmoothed — Heikin-Ashi with EMA smoothing
 * 33. patternDetection   — Candles + pattern markers (Doji, Hammer, etc.)
 *
 * NOTE: Renko, Point & Figure, and Three-Line Break were removed per user
 * request (rendering was distorted at various zoom levels).
 */
import { ADVANCED_CHART_TYPES } from './AdvancedChartTypes.js';

export const CHART_TYPES = [
    { id: 'candles',       label: 'Candles',          category: 'Standard' },
    { id: 'hollow',        label: 'Hollow Candles',   category: 'Standard' },
    { id: 'heikinAshi',    label: 'Heikin Ashi',      category: 'Standard' },
    { id: 'barChart',      label: 'Bar Chart',        category: 'Standard' },
    { id: 'line',          label: 'Line',             category: 'Standard' },
    { id: 'area',          label: 'Area',             category: 'Standard' },
    { id: 'baseline',      label: 'Baseline',         category: 'Standard' },
    { id: 'stepLine',      label: 'Step Line',        category: 'Standard' },
    { id: 'lineMarkers',   label: 'Line + Markers',   category: 'Standard' },
    { id: 'mountain',      label: 'Mountain',         category: 'Standard' },
    { id: 'bodyOnly',      label: 'Body Only',        category: 'Special' },
    { id: 'highLow',       label: 'High-Low Bars',    category: 'Special' },
    { id: 'medianCandle',  label: 'Median Candle',    category: 'Special' },
    { id: 'squared',       label: 'Squared Candles',  category: 'Special' },
    { id: 'volumeCandle',  label: 'Volume Candles',   category: 'Special' },
    { id: 'shadowCandle',  label: 'Shadow Candles',   category: 'Special' },
    { id: 'coloredCandle', label: 'Colored Candles',  category: 'Special' },
    { id: 'deltaCandle',   label: 'Delta Candles',    category: 'Special' },
    { id: 'elastic',       label: 'Elastic',          category: 'Special' },
    { id: 'rangeBar',      label: 'Range Bars',       category: 'Special' },
    { id: 'hollowUp',      label: 'Hollow Up',            category: 'Pushed' },
    { id: 'hollowDown',    label: 'Hollow Down',          category: 'Pushed' },
    { id: 'hollowBoth',    label: 'Hollow Both',          category: 'Pushed' },
    { id: 'hollowColored', label: 'Hollow Colored',       category: 'Pushed' },
    { id: 'hollowPushed',  label: 'Hollow Pushed',        category: 'Pushed' },
    { id: 'hollowMinimal', label: 'Hollow Minimal',       category: 'Pushed' },
    { id: 'hollowFilled',  label: 'Hollow Filled',        category: 'Pushed' },
    { id: 'hollowClassic', label: 'Hollow Classic',       category: 'Pushed' },
    { id: 'hollowWickOnly', label: 'Hollow Wick Only',    category: 'Pushed' },
    { id: 'hollowBiColor', label: 'Hollow Bi-Color',      category: 'Pushed' },
    { id: 'kagi',               label: 'Kagi',               category: 'Advanced' },
    { id: 'heikinAshiSmoothed', label: 'HA Smoothed',       category: 'Advanced' },
    { id: 'patternDetection',   label: 'Pattern Detection',  category: 'Advanced' },
    { id: 'animatedCandles',    label: 'Animated Candles',  category: 'Advanced' },
    { id: 'biColorCandles',     label: 'BiColor Candles',   category: 'Advanced' },
    { id: 'orderFlow',          label: 'Order Flow',        category: 'Advanced' },
    { id: 'numberedCandles',    label: 'Numbered Candles',  category: 'Advanced' }
];

export class ChartTypeManager {
    constructor() {
        this.current = 'candles';
        // Heikin-Ashi computed data
        this._haData = null;
        this._haVersion = -1;
    }

    set(type) {
        this.current = type;
    }

    get() { return this.current; }

    /**
     * Compute Heikin-Ashi OHLC from regular OHLC.
     * HA_Close = (O + H + L + C) / 4
     * HA_Open = (prev_HA_Open + prev_HA_Close) / 2  (first = (O + C) / 2)
     * HA_High = max(H, HA_Open, HA_Close)
     * HA_Low = min(L, HA_Open, HA_Close)
     */
    _computeHeikinAshi(dm) {
        if (this._haVersion === dm.version) return this._haData;
        const n = dm.size;
        const ha = {
            opens: new Float64Array(n),
            highs: new Float64Array(n),
            lows: new Float64Array(n),
            closes: new Float64Array(n)
        };
        const { opens, highs, lows, closes } = dm.raw();
        let prevOpen = (opens[0] + closes[0]) / 2;
        let prevClose = (opens[0] + highs[0] + lows[0] + closes[0]) / 4;
        ha.opens[0] = prevOpen;
        ha.closes[0] = prevClose;
        ha.highs[0] = Math.max(highs[0], prevOpen, prevClose);
        ha.lows[0] = Math.min(lows[0], prevOpen, prevClose);
        for (let i = 1; i < n; i++) {
            const haClose = (opens[i] + highs[i] + lows[i] + closes[i]) / 4;
            const haOpen = (prevOpen + prevClose) / 2;
            ha.opens[i] = haOpen;
            ha.closes[i] = haClose;
            ha.highs[i] = Math.max(highs[i], haOpen, haClose);
            ha.lows[i] = Math.min(lows[i], haOpen, haClose);
            prevOpen = haOpen;
            prevClose = haClose;
        }
        this._haData = ha;
        this._haVersion = dm.version;
        return ha;
    }

    /**
     * Render the chart using the current type.
     * @param ctx, viewport, dm, theme — standard render args
     */
    draw(ctx, viewport, dm, theme) {
        const type = this.current;
        // Compute Heikin-Ashi if needed
        let ohlc = dm;
        if (type === 'heikinAshi') {
            this._computeHeikinAshi(dm);
        }

        switch (type) {
            case 'candles':
            case 'hollow':
            case 'heikinAshi':
            case 'bodyOnly':
            case 'medianCandle':
            case 'squared':
            case 'volumeCandle':
            case 'shadowCandle':
            case 'coloredCandle':
            case 'deltaCandle':
            case 'elastic':
            case 'rangeBar':
            // Pushed/Hollow variants
            case 'hollowUp':
            case 'hollowDown':
            case 'hollowBoth':
            case 'hollowColored':
            case 'hollowPushed':
            case 'hollowMinimal':
            case 'hollowFilled':
            case 'hollowClassic':
            case 'hollowWickOnly':
            case 'hollowBiColor':
                this._drawCandleVariant(ctx, viewport, dm, theme, type);
                break;
            case 'barChart':
                this._drawBarChart(ctx, viewport, dm, theme);
                break;
            case 'line':
                this._drawLine(ctx, viewport, dm, theme, false, false);
                break;
            case 'area':
                this._drawArea(ctx, viewport, dm, theme, false);
                break;
            case 'baseline':
                this._drawBaseline(ctx, viewport, dm, theme);
                break;
            case 'stepLine':
                this._drawLine(ctx, viewport, dm, theme, true, false);
                break;
            case 'lineMarkers':
                this._drawLine(ctx, viewport, dm, theme, false, true);
                break;
            case 'mountain':
                this._drawArea(ctx, viewport, dm, theme, true);
                break;
            case 'highLow':
                this._drawHighLow(ctx, viewport, dm, theme);
                break;
            // Advanced chart types (Kagi, HA-Smoothed, Pattern Detection)
            // — see AdvancedChartTypes.js
            // NOTE: Renko, Point & Figure, and Three-Line Break were removed
            // per user request (they were still distorted).
            case 'kagi':
            case 'heikinAshiSmoothed':
            case 'patternDetection':
            case 'animatedCandles':
            case 'biColorCandles':
            case 'orderFlow':
            case 'numberedCandles':
                if (ADVANCED_CHART_TYPES[type]) {
                    ADVANCED_CHART_TYPES[type](ctx, viewport, dm, theme, this);
                }
                break;
            default:
                this._drawCandleVariant(ctx, viewport, dm, theme, 'candles');
        }
    }

    /**
     * Get OHLC arrays (Heikin-Ashi if mode is heikinAshi, otherwise raw).
     */
    _getOHLC(dm) {
        if (this.current === 'heikinAshi' && this._haData) {
            return { opens: this._haData.opens, highs: this._haData.highs, lows: this._haData.lows, closes: this._haData.closes };
        }
        return dm.raw();
    }

    /**
     * Draw a candle variant. Handles all candle-style types.
     */
    _drawCandleVariant(ctx, vp, dm, theme, type) {
        const { opens, highs, lows, closes, volumes } = this._getOHLCWithVol(dm);
        const barSpacing = vp.barSpacing;
        const leftIdx = Math.max(0, Math.floor(vp.leftEdge));
        const rightIdx = Math.min(dm.size - 1, Math.ceil(vp.rightEdge));
        if (rightIdx < leftIdx) return;

        const upColor = theme.upColor;
        const downColor = theme.downColor;
        const upWick = theme.upWick || theme.upColor;
        const downWick = theme.downWick || theme.downColor;

        // Adaptive: when very zoomed out, just draw close line
        if (barSpacing < 1.5) {
            this._drawCloseLineAdaptive(ctx, vp, closes, leftIdx, rightIdx, upColor, downColor);
            return;
        }

        const bodyWidth = type === 'squared' ? barSpacing : Math.max(1, barSpacing * 0.7);
        const wickWidth = 1;

        // Determine max volume for volumeCandle type
        let maxVol = 1;
        if (type === 'volumeCandle' || type === 'elastic') {
            for (let i = leftIdx; i <= rightIdx; i++) maxVol = Math.max(maxVol, volumes[i]);
        }

        // Previous close for deltaCandle
        let prevClose = leftIdx > 0 ? closes[leftIdx - 1] : opens[leftIdx];

        for (let i = leftIdx; i <= rightIdx; i++) {
            const x = vp.indexToX(i) + barSpacing / 2;
            const open = opens[i], high = highs[i], low = lows[i], close = closes[i];
            const isUp = close >= open;
            const c = isUp ? upColor : downColor;
            const wc = isUp ? upWick : downWick;

            const yHigh = vp.priceToY(high);
            const yLow = vp.priceToY(low);
            const yOpen = vp.priceToY(open);
            const yClose = vp.priceToY(close);

            // Delta candle: body = close - prevClose
            if (type === 'deltaCandle') {
                const delta = close - prevClose;
                const yPrev = vp.priceToY(prevClose);
                const yDelta = vp.priceToY(prevClose + delta);
                ctx.fillStyle = delta >= 0 ? upColor : downColor;
                ctx.fillRect(x - bodyWidth / 2, Math.min(yDelta, yPrev), bodyWidth, Math.abs(yDelta - yPrev));
                prevClose = close;
                continue;
            }

            // Wick (skip for bodyOnly)
            // FIX: hollowMinimal is documented as "no wicks" but was still drawing them.
            //      Added hollowMinimal to the skip list so it renders as outline-only.
            if (type !== 'bodyOnly' && type !== 'shadowCandle' && type !== 'hollowMinimal') {
                ctx.fillStyle = wc;
                if (type === 'highLow' || type === 'squared') {
                    // Thin line
                    ctx.fillRect(x - wickWidth / 2, yHigh, wickWidth, yLow - yHigh);
                } else {
                    ctx.fillRect(x - wickWidth / 2, yHigh, wickWidth, yLow - yHigh);
                }
            }

            // Body
            const bodyTop = Math.min(yOpen, yClose);
            const bodyH = Math.max(1, Math.abs(yClose - yOpen));
            let bw = bodyWidth;

            if (type === 'volumeCandle') {
                bw = Math.max(2, (volumes[i] / maxVol) * barSpacing * 0.9);
            } else if (type === 'elastic') {
                // Body width scales with volume, but min 30%
                bw = Math.max(barSpacing * 0.3, (volumes[i] / maxVol) * barSpacing * 0.9);
            }

            if (type === 'shadowCandle') {
                // Transparent body — only wicks + body outline
                ctx.strokeStyle = c;
                ctx.lineWidth = 1;
                ctx.strokeRect(x - bw / 2 + 0.5, bodyTop + 0.5, bw, bodyH);
            } else if (type === 'hollow' || type === 'hollowUp' || type === 'hollowClassic') {
                // Up = hollow (outline only), Down = filled
                if (isUp) {
                    ctx.strokeStyle = c;
                    ctx.lineWidth = type === 'hollowClassic' ? 2 : 1.5;
                    ctx.strokeRect(x - bw / 2 + 0.5, bodyTop + 0.5, bw, bodyH);
                } else {
                    ctx.fillStyle = c;
                    ctx.fillRect(x - bw / 2, bodyTop, bw, bodyH);
                }
            } else if (type === 'hollowDown') {
                // Reverse: Down = hollow, Up = filled
                if (!isUp) {
                    ctx.strokeStyle = c;
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(x - bw / 2 + 0.5, bodyTop + 0.5, bw, bodyH);
                } else {
                    ctx.fillStyle = c;
                    ctx.fillRect(x - bw / 2, bodyTop, bw, bodyH);
                }
            } else if (type === 'hollowBoth') {
                // Both up & down = hollow (outlines only)
                ctx.strokeStyle = c;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(x - bw / 2 + 0.5, bodyTop + 0.5, bw, bodyH);
            } else if (type === 'hollowColored') {
                // Hollow with bright colored outlines (up = bright green, down = bright red)
                const brightUp = '#00e676';
                const brightDown = '#ff1744';
                ctx.strokeStyle = isUp ? brightUp : brightDown;
                ctx.lineWidth = 2;
                ctx.strokeRect(x - bw / 2 + 0.5, bodyTop + 0.5, bw, bodyH);
            } else if (type === 'hollowPushed') {
                // Hollow with thick borders (pushed look) — up hollow, down filled
                if (isUp) {
                    ctx.strokeStyle = c;
                    ctx.lineWidth = 3;
                    ctx.strokeRect(x - bw / 2 + 0.5, bodyTop + 0.5, bw, bodyH);
                } else {
                    ctx.fillStyle = c;
                    ctx.fillRect(x - bw / 2, bodyTop, bw, bodyH);
                    // Inner border
                    ctx.strokeStyle = theme.lastPriceTagText || '#fff';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(x - bw / 2 + 1, bodyTop + 1, bw - 2, bodyH - 2);
                }
            } else if (type === 'hollowMinimal') {
                // Very thin hollow outline, NO wicks
                ctx.strokeStyle = c;
                ctx.lineWidth = 1;
                ctx.strokeRect(x - bw / 2 + 0.5, bodyTop + 0.5, bw, bodyH);
            } else if (type === 'hollowFilled') {
                // Semi-transparent fill + outline (both up and down)
                ctx.fillStyle = this._withAlpha(c, 0.25);
                ctx.fillRect(x - bw / 2, bodyTop, bw, bodyH);
                ctx.strokeStyle = c;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(x - bw / 2 + 0.5, bodyTop + 0.5, bw, bodyH);
            } else if (type === 'hollowWickOnly') {
                // Hollow body, but colored wicks (no body fill at all)
                ctx.strokeStyle = c;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(x - bw / 2 + 0.5, bodyTop + 0.5, bw, bodyH);
                // Redraw wick with brighter color
                const bright = isUp ? '#00e676' : '#ff1744';
                ctx.fillStyle = bright;
                ctx.fillRect(x - wickWidth / 2, yHigh, wickWidth, yLow - yHigh);
            } else if (type === 'hollowBiColor') {
                // Up = green hollow, Down = red hollow, different wick colors
                ctx.strokeStyle = c;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(x - bw / 2 + 0.5, bodyTop + 0.5, bw, bodyH);
                // Brighter wick
                ctx.fillStyle = isUp ? '#26a69a' : '#ef5350';
                ctx.fillRect(x - wickWidth / 2, yHigh, wickWidth, yLow - yHigh);
            } else if (type === 'coloredCandle') {
                // Gradient fill
                const grad = ctx.createLinearGradient(0, bodyTop, 0, bodyTop + bodyH);
                grad.addColorStop(0, c);
                grad.addColorStop(1, this._withAlpha(c, 0.4));
                ctx.fillStyle = grad;
                ctx.fillRect(x - bw / 2, bodyTop, bw, bodyH);
            } else if (type === 'rangeBar') {
                // Range bar — just a vertical line from high to low, colored by direction
                ctx.fillStyle = c;
                ctx.fillRect(x - wickWidth / 2, yHigh, wickWidth * 2, yLow - yHigh);
            } else {
                // Standard, heikinAshi, bodyOnly, medianCandle, squared
                ctx.fillStyle = c;
                ctx.fillRect(x - bw / 2, bodyTop, bw, bodyH);

                if (type === 'medianCandle') {
                    // Median line through body
                    const median = (open + close) / 2;
                    const yMedian = vp.priceToY(median);
                    ctx.strokeStyle = theme.lastPriceTagText || '#fff';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x - bw / 2, yMedian);
                    ctx.lineTo(x + bw / 2, yMedian);
                    ctx.stroke();
                }
            }
            prevClose = close;
        }
    }

    _getOHLCWithVol(dm) {
        const raw = dm.raw();
        if (this.current === 'heikinAshi' && this._haData) {
            return {
                opens: this._haData.opens,
                highs: this._haData.highs,
                lows: this._haData.lows,
                closes: this._haData.closes,
                volumes: raw.volumes
            };
        }
        return raw;
    }

    _withAlpha(color, alpha) {
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

    _drawCloseLineAdaptive(ctx, vp, closes, leftIdx, rightIdx, upColor, downColor) {
        ctx.lineWidth = 1;
        let prevY = null, prevColor = null;
        ctx.beginPath();
        for (let i = leftIdx; i <= rightIdx; i++) {
            const x = vp.indexToX(i) + vp.barSpacing / 2;
            const y = vp.priceToY(closes[i]);
            const color = (i > 0 && closes[i] >= closes[i - 1]) ? upColor : downColor;
            if (prevY !== null && color === prevColor) ctx.lineTo(x, y);
            else if (prevY !== null) {
                ctx.strokeStyle = prevColor; ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x - vp.barSpacing, prevY); ctx.lineTo(x, y);
            } else ctx.moveTo(x, y);
            prevY = y; prevColor = color;
        }
        ctx.strokeStyle = prevColor; ctx.stroke();
    }

    _drawBarChart(ctx, vp, dm, theme) {
        const { opens, highs, lows, closes } = this._getOHLCWithVol(dm);
        const leftIdx = Math.max(0, Math.floor(vp.leftEdge));
        const rightIdx = Math.min(dm.size - 1, Math.ceil(vp.rightEdge));
        const barSpacing = vp.barSpacing;
        const tickW = Math.max(1, barSpacing * 0.25);
        for (let i = leftIdx; i <= rightIdx; i++) {
            const x = vp.indexToX(i) + barSpacing / 2;
            const yHigh = vp.priceToY(highs[i]);
            const yLow = vp.priceToY(lows[i]);
            const yOpen = vp.priceToY(opens[i]);
            const yClose = vp.priceToY(closes[i]);
            const isUp = closes[i] >= opens[i];
            const c = isUp ? theme.upColor : theme.downColor;
            ctx.strokeStyle = c;
            ctx.lineWidth = 1;
            // Vertical line
            ctx.beginPath();
            ctx.moveTo(x + 0.5, yHigh); ctx.lineTo(x + 0.5, yLow); ctx.stroke();
            // Open tick (left)
            ctx.beginPath();
            ctx.moveTo(x - tickW, yOpen); ctx.lineTo(x, yOpen); ctx.stroke();
            // Close tick (right)
            ctx.beginPath();
            ctx.moveTo(x, yClose); ctx.lineTo(x + tickW, yClose); ctx.stroke();
        }
    }

    _drawLine(ctx, vp, dm, theme, stepped, markers) {
        const { closes } = this._getOHLCWithVol(dm);
        const leftIdx = Math.max(0, Math.floor(vp.leftEdge));
        const rightIdx = Math.min(dm.size - 1, Math.ceil(vp.rightEdge));
        const last = dm.size > 0 ? dm.get(dm.size - 1) : null;
        const isUp = last && last.close >= last.open;
        ctx.strokeStyle = isUp ? theme.upColor : theme.downColor;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        let started = false;
        for (let i = leftIdx; i <= rightIdx; i++) {
            const x = vp.indexToX(i) + vp.barSpacing / 2;
            const y = vp.priceToY(closes[i]);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else if (stepped) {
                ctx.lineTo(x, vp.priceToY(closes[i - 1]));
                ctx.lineTo(x, y);
            } else ctx.lineTo(x, y);
        }
        ctx.stroke();
        if (markers) {
            ctx.fillStyle = isUp ? theme.upColor : theme.downColor;
            for (let i = leftIdx; i <= rightIdx; i++) {
                const x = vp.indexToX(i) + vp.barSpacing / 2;
                const y = vp.priceToY(closes[i]);
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    _drawArea(ctx, vp, dm, theme, gradient) {
        const { closes } = this._getOHLCWithVol(dm);
        const leftIdx = Math.max(0, Math.floor(vp.leftEdge));
        const rightIdx = Math.min(dm.size - 1, Math.ceil(vp.rightEdge));
        const last = dm.size > 0 ? dm.get(dm.size - 1) : null;
        const isUp = last && last.close >= last.open;
        const color = isUp ? theme.upColor : theme.downColor;
        const baseY = vp.priceHeight;
        // Path
        ctx.beginPath();
        ctx.moveTo(vp.indexToX(leftIdx) + vp.barSpacing / 2, baseY);
        for (let i = leftIdx; i <= rightIdx; i++) {
            const x = vp.indexToX(i) + vp.barSpacing / 2;
            const y = vp.priceToY(closes[i]);
            ctx.lineTo(x, y);
        }
        ctx.lineTo(vp.indexToX(rightIdx) + vp.barSpacing / 2, baseY);
        ctx.closePath();
        // Fill
        if (gradient) {
            const grad = ctx.createLinearGradient(0, 0, 0, baseY);
            grad.addColorStop(0, this._withAlpha(color, 0.5));
            grad.addColorStop(1, this._withAlpha(color, 0.02));
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = this._withAlpha(color, 0.15);
        }
        ctx.fill();
        // Line on top
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        let started = false;
        for (let i = leftIdx; i <= rightIdx; i++) {
            const x = vp.indexToX(i) + vp.barSpacing / 2;
            const y = vp.priceToY(closes[i]);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    _drawBaseline(ctx, vp, dm, theme) {
        const { closes } = this._getOHLCWithVol(dm);
        const leftIdx = Math.max(0, Math.floor(vp.leftEdge));
        const rightIdx = Math.min(dm.size - 1, Math.ceil(vp.rightEdge));
        // Baseline = first visible close
        const baseline = closes[leftIdx] || 0;
        const yBase = vp.priceToY(baseline);
        // Areas above (green) and below (red) baseline
        for (let i = leftIdx; i < rightIdx; i++) {
            const x1 = vp.indexToX(i) + vp.barSpacing / 2;
            const x2 = vp.indexToX(i + 1) + vp.barSpacing / 2;
            const y1 = vp.priceToY(closes[i]);
            const y2 = vp.priceToY(closes[i + 1]);
            const above = closes[i] >= baseline;
            ctx.fillStyle = above ? this._withAlpha(theme.upColor, 0.25) : this._withAlpha(theme.downColor, 0.25);
            ctx.beginPath();
            ctx.moveTo(x1, yBase); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x2, yBase);
            ctx.closePath();
            ctx.fill();
        }
        // Line
        ctx.strokeStyle = theme.textColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        for (let i = leftIdx; i <= rightIdx; i++) {
            const x = vp.indexToX(i) + vp.barSpacing / 2;
            const y = vp.priceToY(closes[i]);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // Baseline
        ctx.strokeStyle = theme.mutedText;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, yBase); ctx.lineTo(vp.width - 72, yBase);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    _drawHighLow(ctx, vp, dm, theme) {
        const { opens, highs, lows, closes } = this._getOHLCWithVol(dm);
        const leftIdx = Math.max(0, Math.floor(vp.leftEdge));
        const rightIdx = Math.min(dm.size - 1, Math.ceil(vp.rightEdge));
        const w = Math.max(0.5, vp.barSpacing * 0.3);
        for (let i = leftIdx; i <= rightIdx; i++) {
            const x = vp.indexToX(i) + vp.barSpacing / 2;
            const yHigh = vp.priceToY(highs[i]);
            const yLow = vp.priceToY(lows[i]);
            const isUp = closes[i] >= opens[i];
            ctx.fillStyle = isUp ? theme.upColor : theme.downColor;
            ctx.fillRect(x - w / 2, yHigh, w, yLow - yHigh);
        }
    }
}
