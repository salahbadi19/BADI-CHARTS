/**
 * IndicatorSettingsModal.js
 * A centered modal card for editing indicator settings.
 *
 * Appears in the CENTER of the chart when the user clicks the gear icon
 * on an indicator's button row.
 *
 * Layout:
 *   ┌───────────────────────────────────────┐
 *   │  [Indicator Name]              [×]    │
 *   ├───────────────────────────────────────┤
 *   │  Color:  [● ● ● ● ● ● ● ● ●]  [🎨]   │
 *   │  Width:  [━━━━●━━━━]                  │
 *   │  Style:  [Solid ▾]                    │
 *   │  Period: [14    ]                    │
 *   │  Visible: [✓]                        │
 *   │  ... (type-specific options)          │
 *   ├───────────────────────────────────────┤
 *   │         [Reset]   [Apply]   [Close]   │
 *   └───────────────────────────────────────┘
 */
import { DomUtils } from '../utils/DomUtils.js';
import { ColorPicker } from './ColorPicker.js';

const PALETTE = [
    '#12C4F0', '#3B6CF5', '#16C784', '#EA3943',
    '#FF9800', '#9C27B0', '#FFC107', '#00BCD4', '#FFFFFF'
];

const LINE_STYLES = [
    { value: 'solid', label: 'Solid ———' },
    { value: 'dashed', label: 'Dashed – – –' },
    { value: 'dotted', label: 'Dotted ·····' },
    { value: 'long-dash', label: 'Long Dash — –' }
];

export class IndicatorSettingsModal {
    constructor(container, engine) {
        this.container = container;
        this.engine = engine;
        this.indicator = null;
        this.element = DomUtils.el('div', { class: 'ac-indicator-modal', style: 'display:none' });
        container.appendChild(this.element);

        // Shared color picker for the color field.
        this._colorPicker = new ColorPicker(container, (hex) => {
            if (!this.indicator) return;
            this.indicator.color = hex;
            if ('fillColor' in this.indicator && this.indicator.fillColor !== null) {
                this.indicator.fillColor = hex;
            }
            this._syncColorSwatch();
            this.engine.requestRender();
        });

        this._build();
    }

    _build() {
        this.element.innerHTML = `
            <div class="ac-im-header">
                <span class="ac-im-title">Indicator Settings</span>
                <button class="ac-im-close" title="Close">×</button>
            </div>
            <div class="ac-im-body">
                <div class="ac-im-row">
                    <label class="ac-im-label">Color</label>
                    <div class="ac-im-palette"></div>
                    <button class="ac-sch-swatch ac-sch-swatch-custom ac-im-custom-color" title="Custom color (HSL picker)"></button>
                </div>
                <div class="ac-im-row">
                    <label class="ac-im-label">Line Width</label>
                    <input type="range" min="1" max="6" step="0.5" class="ac-im-range" data-field="lineWidth">
                    <span class="ac-im-value" data-display="lineWidth">1.5</span>
                </div>
                <div class="ac-im-row">
                    <label class="ac-im-label">Line Style</label>
                    <select class="ac-im-select" data-field="lineStyle">
                        ${LINE_STYLES.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
                    </select>
                </div>
                <div class="ac-im-row ac-im-period-row">
                    <label class="ac-im-label">Period</label>
                    <input type="number" min="1" max="500" class="ac-im-number" data-field="period">
                </div>
                <div class="ac-im-row">
                    <label class="ac-im-label">Opacity</label>
                    <input type="range" min="0.1" max="1" step="0.05" class="ac-im-range" data-field="opacity">
                    <span class="ac-im-value" data-display="opacity">1.0</span>
                </div>
                <div class="ac-im-row">
                    <label class="ac-im-checkbox-label">
                        <input type="checkbox" data-field="visible"> Visible
                    </label>
                </div>
            </div>
            <div class="ac-im-footer">
                <button class="ac-im-btn ac-im-reset">Reset</button>
                <button class="ac-im-btn ac-im-apply">Apply</button>
                <button class="ac-im-btn ac-im-done">Close</button>
            </div>
        `;

        // Build palette swatches
        const pal = this.element.querySelector('.ac-im-palette');
        for (const c of PALETTE) {
            const sw = DomUtils.el('button', {
                class: 'ac-sch-swatch ac-im-swatch',
                style: `background:${c}`,
                dataset: { color: c }
            });
            sw.addEventListener('click', () => this._setColor(c));
            pal.appendChild(sw);
        }

        // Wire inputs
        this.element.querySelectorAll('[data-field]').forEach(el => {
            const field = el.dataset.field;
            const evt = (el.tagName === 'SELECT') ? 'change' : 'input';
            el.addEventListener(evt, () => {
                const v = el.type === 'checkbox' ? el.checked : (el.type === 'number' || el.type === 'range' ? parseFloat(el.value) : el.value);
                this._setField(field, v);
            });
        });

        // Buttons
        this.element.querySelector('.ac-im-close').addEventListener('click', () => this.hide());
        this.element.querySelector('.ac-im-done').addEventListener('click', () => this.hide());
        this.element.querySelector('.ac-im-apply').addEventListener('click', () => {
            this.engine.requestRender();
        });
        this.element.querySelector('.ac-im-reset').addEventListener('click', () => this._reset());

        // Custom color button
        this.element.querySelector('.ac-im-custom-color').addEventListener('click', () => {
            if (!this.indicator) return;
            this._colorPicker.show(this.indicator.color || '#12C4F0');
            // Position the color picker to the right of the modal.
            const modalRect = this.element.getBoundingClientRect();
            const contRect = this.container.getBoundingClientRect();
            this._colorPicker.element.style.left = (modalRect.right - contRect.left + 6) + 'px';
            this._colorPicker.element.style.top = (modalRect.top - contRect.top) + 'px';
        });

        // Close on outside click
        this.element.addEventListener('pointerdown', (e) => e.stopPropagation());
    }

    _setColor(c) {
        if (!this.indicator) return;
        this.indicator.color = c;
        if ('fillColor' in this.indicator && this.indicator.fillColor !== null) {
            this.indicator.fillColor = c;
        }
        this._syncColorSwatch();
        this.engine.requestRender();
    }

    _setField(field, value) {
        if (!this.indicator) return;
        if (field === 'lineWidth') {
            this.indicator.lineWidth = value;
        } else if (field === 'opacity') {
            this.indicator.opacity = value;
        } else if (field === 'period') {
            this.indicator.options = this.indicator.options || {};
            this.indicator.options.period = value;
            this.indicator._lastDataVersion = -1; // force recalc
        } else if (field === 'visible') {
            this.indicator.visible = value;
        } else {
            this.indicator[field] = value;
        }
        // Update display values
        const dispEl = this.element.querySelector(`[data-display="${field}"]`);
        if (dispEl) dispEl.textContent = value;
        this.engine.requestRender();
    }

    _syncColorSwatch() {
        if (!this.indicator) return;
        this.element.querySelectorAll('.ac-im-swatch').forEach(sw => {
            sw.classList.toggle('active', sw.dataset.color === this.indicator.color);
        });
    }

    _syncDisplay() {
        if (!this.indicator) return;
        const ind = this.indicator;
        this.element.querySelectorAll('[data-field]').forEach(el => {
            const f = el.dataset.field;
            if (el.type === 'checkbox') {
                el.checked = !!ind[f];
            } else if (el.tagName === 'SELECT') {
                el.value = ind[f] || 'solid';
            } else if (f === 'lineWidth') {
                el.value = ind.lineWidth ?? 1.5;
                const disp = this.element.querySelector('[data-display="lineWidth"]');
                if (disp) disp.textContent = ind.lineWidth ?? 1.5;
            } else if (f === 'opacity') {
                const op = ind.opacity ?? 1;
                el.value = op;
                const disp = this.element.querySelector('[data-display="opacity"]');
                if (disp) disp.textContent = op.toFixed(2);
            } else if (f === 'period') {
                el.value = ind.options?.period || '';
            }
        });
        this._syncColorSwatch();

        // Show/hide period row (only for indicators that support it)
        const periodRow = this.element.querySelector('.ac-im-period-row');
        if (periodRow) {
            const hasPeriod = ind.options && ('period' in ind.options || ind.options.period !== undefined);
            periodRow.style.display = hasPeriod ? 'flex' : 'none';
        }
    }

    _reset() {
        if (!this.indicator) return;
        const ind = this.indicator;
        ind.color = '#12C4F0';
        ind.fillColor = null;
        ind.lineWidth = 1.5;
        ind.lineStyle = 'solid';
        ind.opacity = 1;
        ind.visible = true;
        if (ind.options) {
            ind.options.period = 14;
            ind._lastDataVersion = -1;
        }
        this._syncDisplay();
        this.engine.requestRender();
    }

    show(indicator) {
        if (!indicator) { this.hide(); return; }
        this.indicator = indicator;
        // Update title
        this.element.querySelector('.ac-im-title').textContent = (indicator.name || 'Indicator') + ' Settings';
        this._syncDisplay();
        this.element.style.display = 'flex';
        // Center the modal in the chart area.
        const contRect = this.container.getBoundingClientRect();
        const modalRect = this.element.getBoundingClientRect();
        const cx = (contRect.width - modalRect.width) / 2;
        const cy = (contRect.height - modalRect.height) / 2;
        this.element.style.left = Math.max(8, cx) + 'px';
        this.element.style.top = Math.max(8, cy) + 'px';
    }

    hide() {
        this.element.style.display = 'none';
        this._colorPicker.hide();
        this.indicator = null;
    }
}
