/**
 * VolumeSeries.js
 * Renders volume bars at the bottom of the chart in a separate pane.
 * Bars are colored to match their corresponding candle direction.
 * Volume scale is auto-fit to the visible range.
 */
import { SeriesBase } from './SeriesBase.js';

export class VolumeSeries extends SeriesBase {
    constructor(options = {}) {
        super(options);
        this.pane = 'volume';
        this.zIndex = 5;
        this.upColor = options.upColor;
        this.downColor = options.downColor;
        this.opacity = options.opacity || 0.6;
        this.heightRatio = options.heightRatio || 0.85;
        this.showMa = options.showMa !== false;
        this.maPeriod = options.maPeriod || 20;
        this.maColor = options.maColor || '#f0b90b';
        this._maBuffer = null;
        this._maVersion = -1;
    }

    draw(ctx, viewport, dm, theme) {
        if (!this.visible || dm.size === 0 || viewport.volumeHeight <= 0) return;
        const upColor = this.upColor || theme.upColor;
        const downColor = this.downColor || theme.downColor;

        const leftIdx = Math.max(0, Math.floor(viewport.leftEdge));
        const rightIdx = Math.min(dm.size - 1, Math.ceil(viewport.rightEdge));
        if (rightIdx < leftIdx) return;

        const { opens, closes, volumes } = dm.raw();
        const maxVol = dm.maxVolumeFor(leftIdx, rightIdx);
        if (maxVol <= 0) return;

        const paneTop = viewport.priceHeight;
        const paneHeight = viewport.volumeHeight * this.heightRatio;
        const paneBottom = paneTop + paneHeight;
        const barWidth = Math.max(1, viewport.barSpacing * 0.7);

        // Volume bars
        for (let i = leftIdx; i <= rightIdx; i++) {
            const x = viewport.indexToX(i) + viewport.barSpacing / 2;
            const v = volumes[i];
            const h = (v / maxVol) * paneHeight;
            const isUp = closes[i] >= opens[i];
            ctx.fillStyle = isUp ? this._withAlpha(upColor) : this._withAlpha(downColor);
            ctx.fillRect(x - barWidth / 2, paneBottom - h, barWidth, h);
        }

        // Volume MA line
        if (this.showMa && viewport.barSpacing > 2) {
            this._ensureMA(dm);
            ctx.strokeStyle = this.maColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            let started = false;
            for (let i = Math.max(this.maPeriod, leftIdx); i <= rightIdx; i++) {
                const ma = this._maBuffer[i];
                if (!isFinite(ma)) continue;
                const x = viewport.indexToX(i) + viewport.barSpacing / 2;
                const y = paneBottom - (ma / maxVol) * paneHeight;
                if (!started) { ctx.moveTo(x, y); started = true; }
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Divider line
        ctx.strokeStyle = theme.paneDivider;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, paneTop + 0.5);
        ctx.lineTo(viewport.width - 70, paneTop + 0.5);
        ctx.stroke();

        // Volume label
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillStyle = theme.volumeLabel;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Vol ' + this._formatVol(maxVol), 8, paneTop + 4);
    }

    _withAlpha(color) {
        // Quick hex -> rgba with opacity
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r},${g},${b},${this.opacity})`;
        }
        return color;
    }

    _ensureMA(dm) {
        if (this._maVersion === dm.size) return;
        this._maVersion = dm.size;
        const buf = new Float64Array(dm.size);
        const { volumes } = dm.raw();
        let sum = 0;
        for (let i = 0; i < dm.size; i++) {
            sum += volumes[i];
            if (i >= this.maPeriod) sum -= volumes[i - this.maPeriod];
            buf[i] = i >= this.maPeriod - 1 ? sum / this.maPeriod : NaN;
        }
        this._maBuffer = buf;
    }

    _formatVol(v) {
        if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
        if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
        if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K';
        return v.toFixed(0);
    }
}
