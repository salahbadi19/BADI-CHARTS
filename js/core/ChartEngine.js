/**
 * ChartEngine.js
 * The main orchestrator. Owns all subsystems and runs the render loop.
 *
 * v0.4 Architecture: ONE canvas for everything.
 * - All panes (main + indicators + time axis) are regions on the SAME canvas.
 * - Crosshair vertical line extends across ALL regions (connected, not broken).
 * - Current-price line extends across ALL regions.
 * - Divider lines between regions are drawn on the same canvas.
 * - No floating tooltip — cursor candle OHLCV info is drawn as a FIXED bar at the
 *   top-left, just below the top info strip (at y=28). // FIX: moved from bottom-left.
 * - No legend card — info is drawn as a horizontal strip at the top.
 *
 * Render order per frame:
 *   1. Background fill (entire canvas)
 *   2. For each region (main + indicators): gridlines + content (clipped)
 *   3. Divider lines between regions
 *   4. Current-price line (extends across ALL regions, unclipped)
 *   5. Time axis labels (bottom strip) — drawn BEFORE crosshair
 *   6. Crosshair (extends across ALL regions + time label on time axis, unclipped)
 *      // FIX: Time axis is now rendered BEFORE the crosshair so the crosshair's
 *      // time label box appears ON TOP of the time axis background (was previously
 *      // drawn underneath and hidden).
 *   7. Top info strip (symbol + price + OHLCV as horizontal text)
 *   8. Cursor info bar (cursor candle OHLCV, FIXED at top-left just below the top
 *      strip at y=28 — was previously at the bottom of the chart)
 *   9. DOM overlays (settings card only)
 */
import { Canvas } from './Canvas.js';
import { Viewport } from './Viewport.js';
import { EventManager } from './EventManager.js';
import { AnimationLoop } from './AnimationLoop.js';
import { DataManager } from '../data/DataManager.js';
import { DataFeed } from '../data/DataFeed.js';
import { PriceScale } from '../scale/PriceScale.js';
import { TimeScale } from '../scale/TimeScale.js';
import { CandleSeries } from '../series/CandleSeries.js';
import { ChartTypeManager, CHART_TYPES } from '../series/ChartTypeManager.js';
import { Crosshair } from '../ui/Crosshair.js';
import { StatusBar } from '../ui/StatusBar.js';
import { Toolbar } from '../ui/Toolbar.js';
import { ThemeManager } from '../ui/Theme.js';
import { Watermark } from '../ui/Watermark.js';
import { BackgroundManager } from '../ui/BackgroundManager.js';
import { IndicatorSettingsModal } from '../ui/IndicatorSettingsModal.js';
import { DrawingManager } from '../drawing/DrawingManager.js';
import { DrawingSettingsCard } from '../ui/DrawingSettingsCard.js';
import { IndicatorManager } from '../indicators/IndicatorManager.js';
import { Performance } from '../utils/Performance.js';
import { DomUtils } from '../utils/DomUtils.js';
import { MathUtils } from '../utils/MathUtils.js';

export class ChartEngine {
    constructor(container, options = {}) {
        this.container = container;
        this.symbol = options.symbol || 'BTCUSDT';
        this.options = options;
        // Whether to show the toolbar (default: true, but false when created
        // via CDN embed for a cleaner embedded chart).
        this._showToolbar = options.toolbar !== false;
        this._showStatusBar = options.statusBar !== false;
        // Whether to auto-generate demo data on init (default: true for
        // standalone demo, false when used as embedded library).
        this._autoData = options.autoData !== false;

        this.themeManager = new ThemeManager(options.theme || 'dark');
        this.theme = this.themeManager.get();

        // Root DOM
        this.root = DomUtils.el('div', { class: 'ac-root' });
        container.appendChild(this.root);
        this.toolbarContainer = DomUtils.el('div', { class: 'ac-toolbar-container' });
        if (!this._showToolbar) this.toolbarContainer.style.display = 'none';
        this.chartArea = DomUtils.el('div', { class: 'ac-chart-area' });
        this.paneContainer = DomUtils.el('div', { class: 'ac-pane-container' });
        this.overlayContainer = DomUtils.el('div', { class: 'ac-overlay-container' });
        this.statusContainer = DomUtils.el('div', { class: 'ac-status-container' });
        if (!this._showStatusBar) this.statusContainer.style.display = 'none';
        this.chartArea.appendChild(this.paneContainer);
        this.chartArea.appendChild(this.overlayContainer);
        this.root.append(this.toolbarContainer, this.chartArea, this.statusContainer);

        // Canvas (set by PaneManager.init — it creates the shared canvas)
        this.canvas = null;

        // Data
        this.dataManager = new DataManager(10000);
        this.viewport = new Viewport();
        this.viewport._dm = this.dataManager;

        // Data feed
        this.dataFeed = new DataFeed(this.dataManager, {
            startPrice: 50000, volatility: 0.012, drift: 0.0001, interval: 60_000
        });

        // Scales
        this.priceScale = new PriceScale();
        this.timeScale = new TimeScale();

        // Series
        this.candleSeries = new CandleSeries();
        this.chartTypeManager = new ChartTypeManager();
        // Give the ChartTypeManager a reference to the engine so it can
        // request re-renders (needed for animated chart types).
        this.chartTypeManager._engine = this;

        // Drawing manager
        this.drawingManager = new DrawingManager();
        this.drawingManager._viewport = this.viewport;
        this.drawingManager._onToolComplete = () => { this.setActiveTool(null); };
        this.activeTool = null;

        // Indicator manager (creates PaneManager internally)
        this.indicatorManager = new IndicatorManager(this, this.paneContainer);

        // UI overlays — NO Tooltip, NO Legend (replaced with canvas-drawn info strips)
        this.crosshair = new Crosshair();
        this.statusBar = new StatusBar(this.statusContainer);
        this.toolbar = new Toolbar(this.toolbarContainer, this);
        this.settingsCard = new DrawingSettingsCard(this.overlayContainer, this);

        // Brand watermark — drawn on the shared canvas, behind the candles.
        this.watermark = new Watermark();

        // Background manager — supports image/video/SVG backgrounds behind
        // the chart with opacity and contrast controls.
        this.background = new BackgroundManager(this.chartArea);

        // Indicator settings modal — centered card for editing indicator
        // settings (color, width, style, period, etc.). Opened via the
        // gear icon on the indicator's button row.
        this.indicatorModal = new IndicatorSettingsModal(this.overlayContainer, this);

        // Performance
        this.perf = new Performance();
        this.perf.enabled = true;

        // Render loop
        this.loop = new AnimationLoop(() => this._render());

        // Live mode
        this._liveMode = false;
        this._followInterval = null;
        this._fpsTimer = setInterval(() => this.statusBar.setFps(this.perf.fps), 500);

        // Theme subscription
        this.themeManager.subscribe((theme) => {
            this.theme = theme;
            this.root.classList.toggle('ac-theme-light', theme.name === 'light');
            // If the user has set a custom chart background, PRESERVE it
            // across theme toggles instead of reverting to the theme default.
            if (this.toolbar && this.toolbar._customChartBg) {
                theme.chartBg = this.toolbar._customChartBg;
                theme.background = this.toolbar._customChartBg;
                document.documentElement.style.setProperty('--ac-bg', this.toolbar._customChartBg);
                this.root.style.background = this.toolbar._customChartBg;
            }
            // Re-apply watermark colors on theme change.
            if (this.watermark) this.watermark.applyTheme(theme);
            this.requestRender();
        });
        this.root.classList.toggle('ac-theme-light', this.theme.name === 'light');

        // Initialize panes — this creates the shared canvas
        const mainPane = this.indicatorManager.init(400);
        this.canvas = this.indicatorManager.paneManager.canvas;
        this.mainPane = mainPane;
        this.canvas.onResize = (w, h) => this._onResize(w, h);
        this.eventManager = new EventManager(this.canvas, this);

        // Mount the brand watermark as a DOM overlay in the chart area.
        this.watermark.mount(this.chartArea);
        this.watermark.applyTheme(this.theme);
        // Provide a resolver that returns the MAIN price pane's rect — the
        // watermark uses it to position itself INSIDE the main pane, never
        // spilling onto the time axis strip or indicator panes below.
        this.watermark.setRegionResolver(() => {
            const mainRegion = this._getMainRegion();
            if (!mainRegion) return null;
            return mainRegion.rect;
        });

        // Initial size
        this._onResize(this.canvas.cssWidth, this.canvas.cssHeight);
    }

    init() {
        if (this._autoData) {
            this.dataFeed.generateHistory(1500);
            this.viewport.barSpacing = 8;
            this.viewport.rightOffset = 10;
            this.viewport.scrollToRight(this.dataManager.size);
            this.viewport.updatePriceRange(this.dataManager);
            this.statusBar.setBars(this.dataManager.size);
            this.statusBar.setDrawings(0);
            // Only add Volume indicator if none exist yet (prevent duplicates)
            const hasVolume = this.indicatorManager.indicators.some(i => i.name === 'Volume');
            if (!hasVolume) {
                this.indicatorManager.add('Volume', {});
            }
        }
        this.requestRender();
    }

    _onResize(w, h) {
        const width = Math.max(100, w);
        const height = Math.max(100, h);
        // Update responsive settings (mobile vs desktop) on resize.
        if (this.priceScale.updateResponsive) this.priceScale.updateResponsive();
        if (this.timeScale.updateResponsive) this.timeScale.updateResponsive();
        this.viewport.setSize(width, height, 0);
        this.viewport.updatePriceRange(this.dataManager);
        this.crosshair._priceScaleWidth = this.priceScale.width;
        this.crosshair._timeScaleHeight = this.timeScale.height;
        this.requestRender();
    }

    requestRender() { this.loop.requestRender(); }

    /**
     * Get the main price region's rect (the area where candles render).
     */
    _getMainRegion() {
        const regions = this.indicatorManager.paneManager.getRegions();
        return regions.find(r => r.id === 'main');
    }

    _render() {
        this.perf.beginRender();
        const ctx = this.canvas.getContext();
        const theme = this.theme;
        const dm = this.dataManager;
        const canvasW = this.canvas.cssWidth;
        const canvasH = this.canvas.cssHeight;
        const priceScaleW = this.priceScale.width;

        // Compute regions
        const regions = this.indicatorManager.paneManager.getRegions();
        const mainRegion = regions.find(r => r.id === 'main');
        const timeAxisRegion = regions.find(r => r.id === 'timeaxis');
        const indicatorRegions = regions.filter(r => r.id !== 'main' && r.id !== 'timeaxis');

        // Set the viewport's priceHeight to the main region's height (for candle autoscale)
        if (mainRegion) {
            this.viewport.priceHeight = mainRegion.rect.h;
        }

        // Update price range from visible data + overlays
        this.viewport.updatePriceRange(dm);
        const ovRange = this.indicatorManager.overlayRange(this.viewport, dm);
        if (isFinite(ovRange.min) && isFinite(ovRange.max)) {
            this.viewport.priceRange = {
                min: Math.min(this.viewport.priceRange.min, ovRange.min),
                max: Math.max(this.viewport.priceRange.max, ovRange.max)
            };
        }
        // Update indicator pane ranges
        this.indicatorManager.updatePaneRanges(this.viewport, dm);

        // === 1. Background fill (entire canvas) ===
        // CHANGED: if a custom background image/video/SVG is set, make the
        // canvas background TRANSPARENT so the background layer shows through.
        // Otherwise fill with the theme's chartBg color (solid/opaque).
        if (this.background && this.background.type) {
            // A custom background is active — make canvas transparent.
            ctx.clearRect(0, 0, canvasW, canvasH);
        } else {
            ctx.fillStyle = theme.chartBg;
            ctx.fillRect(0, 0, canvasW, canvasH);
        }

        // === 1b. Brand watermark — drawn as a DOM overlay (NOT on canvas).
        //         See Watermark.js: it mounts an <img>/<svg> element in the
        //         bottom-left corner of the chart area, behind the canvas.
        //         The canvas-side render loop no longer paints the watermark.

        // === 2. Render each region ===
        // Main region: candles + overlays + drawings
        if (mainRegion) {
            this._renderMainRegion(ctx, mainRegion, theme, priceScaleW);
        }
        // Indicator regions
        for (const r of indicatorRegions) {
            this._renderIndicatorRegion(ctx, r, theme, priceScaleW);
        }

        // === 3. Divider lines between regions (connected, on same canvas) ===
        ctx.strokeStyle = theme.paneDivider;
        ctx.lineWidth = 1;
        for (let i = 0; i < regions.length - 1; i++) {
            const r = regions[i];
            const y = r.rect.y + r.rect.h;
            // The divider is at the bottom of each region (where the resize handle is)
            // Draw it as a solid line spanning the full width INCLUDING the price scale
            ctx.beginPath();
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(canvasW, y + 0.5);
            ctx.stroke();
        }

        // === 4. Current-price line (extends across ALL regions, unclipped) ===
        this._drawCurrentPriceLine(ctx, regions, theme, priceScaleW);

        // === 4b. Countdown timer — moves with the current price line.
        //         Shows the time remaining until the current candle closes.
        this._drawCountdownTimer(ctx, regions, theme, priceScaleW, canvasW);

        // === 5. Time axis labels (bottom strip) — drawn BEFORE crosshair so the
        //        crosshair's time label appears ON TOP of the time axis background ===
        if (timeAxisRegion) {
            this._renderTimeAxisRegion(ctx, timeAxisRegion, dm, theme, priceScaleW);
        }

        // === 6. Crosshair (extends across ALL regions, unclipped) — drawn AFTER
        //        time axis so its time label is visible on top ===
        this._drawCrosshair(ctx, regions, dm, theme, priceScaleW, canvasW, canvasH);

        // === 7. Top info strip — always show (SYMBOL + price + change%).
        //   When toolbar is visible: y=8 (below toolbar).
        //   When no toolbar (CDN embed): y=6 (top of chart).
        this._drawTopInfoStrip(ctx, dm, theme, canvasW);

        // === 8. Bottom info bar (cursor candle OHLCV) — REMOVED.
        //         It was the second of the two stacked strips and is no longer
        //         drawn. The top strip already shows everything the user needs.

        // === Status bar updates ===
        if (this.eventManager.pointerInside) {
            const idx = Math.round(this.viewport.xToIndex(this.eventManager.pointerX - this.viewport.barSpacing / 2));
            const price = this.viewport.yToPrice(this.eventManager.pointerY);
            this.statusBar.setCursor(price, idx);
        }
        this.statusBar.setDrawings(this.drawingManager.count);
        this.statusBar.setBars(dm.size);
        this.statusBar.setIndicators(this.indicatorManager.count);

        this.perf.endRender();
        this.perf.tick();

        // Reposition the watermark inside the (possibly resized/panned) main pane.
        if (this.watermark) this.watermark.updatePosition();
    }

    /**
     * Render the main price region: candles, overlay indicators, drawings, price grid.
     */
    _renderMainRegion(ctx, region, theme, priceScaleW) {
        const vp = this.viewport;
        const dm = this.dataManager;
        const { x, y, w, h } = region.rect;
        const chartW = w - priceScaleW; // chart area excludes the price scale

        // Set viewport's priceHeight for priceToY calculations
        vp.priceHeight = h;

        // Clip to this region
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();

        // Translate so (0,0) is the top-left of this region
        ctx.translate(0, y);

        // Price grid + Y-axis labels (draws horizontal gridlines + price labels on the right)
        this.priceScale.draw(ctx, vp, theme);

        // Vertical time gridlines (no labels — labels go on the time axis strip)
        this.timeScale.drawGridlines(ctx, vp, dm, theme, w, h);

        // Candles (CLIPPED to chart area, with 5% bottom padding)
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, chartW, h - h * 0.05);
        ctx.clip();
        // FIX: use ChartTypeManager to render the current chart type (candles, hollow, heikin-ashi, etc.)
        this.chartTypeManager.draw(ctx, vp, dm, theme);

        // Overlay indicators
        for (const ind of this.indicatorManager.overlays) {
            ind.draw(ctx, vp, dm, null, theme);
        }

        // Drawings
        this.drawingManager.draw(ctx, vp, theme);
        ctx.restore();

        // FIX: draw the pane title bar with overlay control buttons.
        // Previously the main pane had no title bar, so overlay indicators
        // (SMA, EMA, BollingerBands, etc.) had no visible control buttons.
        // Now we draw the same title+buttons row that indicator panes use,
        // so overlays get ⇅ / ◉ / ⚙ / ✕ controls in the top-left of the chart.
        this._drawPaneTitleWithControls(ctx, this.mainPane, theme);

        ctx.restore();
    }

    /**
     * Render an indicator region (RSI, MACD, etc.).
     */
    _renderIndicatorRegion(ctx, region, theme, priceScaleW) {
        const vp = this.viewport;
        const dm = this.dataManager;
        const pane = region.pane;
        const { x, y, w, h } = region.rect;
        const chartW = w - priceScaleW;
        if (h < 10) return;

        // Clip to this region
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.translate(0, y);

        // Horizontal gridlines at nice ticks of pane.priceRange
        const { min, max } = pane.priceRange;
        const ticks = this._niceTicks(min, max, 4);
        ctx.strokeStyle = theme.gridLine;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillStyle = theme.priceScaleText;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        for (const t of ticks) {
            const ty = this._regionPriceToY(t, pane, h);
            ctx.beginPath();
            ctx.moveTo(0, ty + 0.5);
            ctx.lineTo(chartW, ty + 0.5);
            ctx.stroke();
            ctx.fillText(this._fmt(t), chartW + 4, ty);
        }
        ctx.setLineDash([]);

        // Vertical time gridlines (aligned with main chart)
        this.timeScale.drawGridlines(ctx, vp, dm, theme, w, h);

        // Right border (between chart area and price scale)
        ctx.strokeStyle = theme.priceScaleBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartW + 0.5, 0);
        ctx.lineTo(chartW + 0.5, h);
        ctx.stroke();

        // Draw the indicator's content (clipped to chart area)
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, chartW, h);
        ctx.clip();
        pane.innerHeight = h;
        pane.width = w;
        for (const ind of pane.indicators) {
            if (!ind.visible) continue;
            ind.draw(ctx, vp, dm, pane, theme);
        }
        ctx.restore();

        // Pane title (top-left) with indicator controls: [name] [⇅ reverse] [👁 show/hide] [⚙ settings] [✕ remove]
        this._drawPaneTitleWithControls(ctx, pane, theme);

        ctx.restore();
    }

    /**
     * Draw the pane title bar with indicator control buttons.
     *
     * Features:
     * - Each indicator gets its OWN name label + button group, so the user
     *   can always see which indicator the buttons belong to.
     * - The eye icon (show/hide) is drawn as a canvas path — a proper eye
     *   shape, not a Unicode character. Open eye = visible, closed eye = hidden.
     * - The settings icon is drawn as three sliders (horizontal lines with
     *   dots), replacing the old gear emoji.
     * - Indicator name stays visible even when the indicator is hidden —
     *   it's just dimmed so the user knows it's there but off.
     * - Hover animation is SMOOTH: each button has a `hoverT` (0→1) that
     *   lerps every frame, so the background fades in/out gradually instead
     *   of snapping on/off.
     */
    _drawPaneTitleWithControls(ctx, pane, theme) {
        // When there's no toolbar (CDN embed mode), push the indicator
        // list DOWN to y=6 (top of chart). When there IS a toolbar,
        // use y=28 (below the top info strip).
        const hasToolbar = this._showToolbar;
        // When no toolbar, push indicators below the top info strip (y=26).
        // When toolbar exists, y=28 (below toolbar).
        const yOffset = hasToolbar ? (pane.isMain ? 28 : 4) : (pane.isMain ? 26 : 4);

        // For the main pane, show the pane title ("Price") only if there are
        // NO overlay indicators.
        const indicators = pane.isMain
            ? this.indicatorManager.indicators.filter(i => i.type === 'overlay')
            : pane.indicators;

        if (indicators.length === 0 && pane.isMain) {
            ctx.font = "bold 11px 'Inter', sans-serif";
            ctx.fillStyle = theme.textColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(pane.title, 8, yOffset);
            pane._buttons = [];
            return;
        }

        // VERTICAL layout: each indicator gets its own row.
        // Maximum 10 rows visible. If there are more, show a "+N more" row.
        const MAX_ROWS = 10;
        const ROW_H = 18;
        const allButtons = [];
        const visibleCount = Math.min(indicators.length, MAX_ROWS);
        const hiddenCount = indicators.length - MAX_ROWS;

        ctx.font = "bold 11px 'Inter', sans-serif";
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        for (let idx = 0; idx < visibleCount; idx++) {
            const ind = indicators[idx];
            const rowY = yOffset + idx * ROW_H;
            let x = 8;

            // --- Indicator name (dimmed if hidden) ---
            const label = ind.name || 'Indicator';
            ctx.fillStyle = ind.visible ? theme.textColor : theme.mutedText;
            ctx.globalAlpha = ind.visible ? 1.0 : 0.5;
            ctx.fillText(label, x, rowY);
            const labelW = ctx.measureText(label).width;
            ctx.globalAlpha = 1;
            x += labelW + 6;

            // --- Eye (show/hide) button ---
            const eyeBtn = {
                id: 'toggle', indicatorId: ind.id,
                x: x, y: rowY - 1, w: 18, h: 16,
                hovered: false, active: ind.visible,
                iconType: 'eye',
                visible: ind.visible,
                hoverT: 0
            };
            allButtons.push(eyeBtn);
            x += 18 + 4;

            // --- Gear (settings) button ---
            const setBtn = {
                id: 'settings', indicatorId: ind.id,
                x: x, y: rowY - 1, w: 18, h: 16,
                hovered: false, active: false,
                iconType: 'sliders',
                hoverT: 0
            };
            allButtons.push(setBtn);
            x += 18 + 4;

            // --- Trash (remove) button ---
            const rmBtn = {
                id: 'remove', indicatorId: ind.id,
                x: x, y: rowY - 1, w: 18, h: 16,
                hovered: false, active: false,
                iconType: 'cross',
                hoverT: 0
            };
            allButtons.push(rmBtn);
        }

        // --- "+N more" row if there are hidden indicators ---
        if (hiddenCount > 0) {
            const moreY = yOffset + visibleCount * ROW_H;
            ctx.fillStyle = theme.accent || '#12C4F0';
            ctx.font = "bold 11px 'Inter', sans-serif";
            ctx.fillText('+' + hiddenCount + ' more…', 8, moreY);
            // Store the "more" row for click handling (opens a dropdown if needed).
            this._indicatorMoreY = moreY;
            this._indicatorHiddenCount = hiddenCount;
        }

        // --- Merge with existing button hover state ---
        if (pane._buttons) {
            const prevMap = new Map();
            for (const b of pane._buttons) {
                prevMap.set(b.indicatorId + ':' + b.id, b);
            }
            for (const btn of allButtons) {
                const prev = prevMap.get(btn.indicatorId + ':' + btn.id);
                if (prev) {
                    btn.hovered = prev.hovered || false;
                    btn.hoverT = prev.hoverT ?? 0;
                }
            }
        }

        // --- Animate hoverT ---
        let needsRerender = false;
        for (const btn of allButtons) {
            const target = btn.hovered ? 1 : 0;
            const speed = 0.18;
            const newT = btn.hoverT + (target - btn.hoverT) * speed;
            if (Math.abs(newT - btn.hoverT) > 0.005) needsRerender = true;
            btn.hoverT = newT;
            if (Math.abs(target - btn.hoverT) < 0.01) btn.hoverT = target;
        }

        // --- Draw buttons ---
        for (const btn of allButtons) {
            let bgAlpha = 0;
            if (btn.hoverT > 0.01) bgAlpha = Math.max(bgAlpha, btn.hoverT * 0.7);
            if (bgAlpha > 0.01) {
                ctx.fillStyle = theme.toolbarBtn;
                ctx.globalAlpha = bgAlpha;
                this._roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 3);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            const iconColor = btn.hoverT > 0.3 ? theme.textColor : theme.mutedText;
            const scale = 1 + btn.hoverT * 0.12;
            ctx.save();
            const cx = btn.x + btn.w / 2;
            const cy = btn.y + btn.h / 2 + 1;
            ctx.translate(cx, cy);
            ctx.scale(scale, scale);
            ctx.translate(-cx, -cy);
            ctx.strokeStyle = iconColor;
            ctx.fillStyle = iconColor;
            switch (btn.iconType) {
                case 'eye': this._drawEyeIcon(ctx, btn.x, btn.y, btn.w, btn.h, btn.visible); break;
                case 'sliders': this._drawSlidersIcon(ctx, btn.x, btn.y, btn.w, btn.h); break;
                case 'cross': this._drawCrossIcon(ctx, btn.x, btn.y, btn.w, btn.h); break;
            }
            ctx.restore();
        }

        pane._buttons = allButtons;
        if (needsRerender) this.requestRender();
    }

    /**
     * Draw an eye icon — open (visible) or closed (hidden).
     * Professional SVG-style design with clean curves.
     */
    _drawEyeIcon(ctx, btnX, btnY, btnW, btnH, open) {
        const cx = btnX + btnW / 2;
        const cy = btnY + btnH / 2;
        const w = btnW * 0.38;  // half-width of the eye
        const h = btnH * 0.22;  // half-height

        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (open) {
            // Eye outline — smooth almond shape
            ctx.beginPath();
            ctx.moveTo(cx - w, cy);
            ctx.quadraticCurveTo(cx, cy - h * 1.6, cx + w, cy);
            ctx.quadraticCurveTo(cx, cy + h * 1.6, cx - w, cy);
            ctx.stroke();
            // Iris (ring)
            const irisR = Math.max(2, w * 0.28);
            ctx.beginPath();
            ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
            ctx.stroke();
            // Pupil (filled dot)
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(1.2, irisR * 0.5), 0, Math.PI * 2);
            ctx.fill();
            // Highlight dot (top-right of iris)
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cx + irisR * 0.3, cy - irisR * 0.3, Math.max(0.8, irisR * 0.2), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else {
            // Closed eye — flat line with a small downward curve in the middle
            ctx.beginPath();
            ctx.moveTo(cx - w, cy);
            ctx.quadraticCurveTo(cx - w * 0.3, cy + h * 0.5, cx, cy + h * 0.3);
            ctx.quadraticCurveTo(cx + w * 0.3, cy + h * 0.5, cx + w, cy);
            ctx.stroke();
            // Diagonal slash
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.7, cy - h * 1.3);
            ctx.lineTo(cx + w * 0.7, cy + h * 1.3);
            ctx.lineWidth = 1.3;
            ctx.stroke();
        }
    }

    /**
     * Draw a gear icon (cog) — used for settings.
     * Professional 8-tooth gear with a center hole.
     */
    _drawSlidersIcon(ctx, btnX, btnY, btnW, btnH) {
        const cx = btnX + btnW / 2;
        const cy = btnY + btnH / 2;
        const outerR = btnW * 0.32;
        const innerR = outerR * 0.55;
        const teeth = 8;
        const toothDepth = outerR * 0.25;

        ctx.lineWidth = 1.3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Gear body with teeth
        ctx.beginPath();
        for (let i = 0; i <= teeth * 2; i++) {
            const angle = (i / (teeth * 2)) * Math.PI * 2 - Math.PI / 2;
            const r = (i % 2 === 0) ? outerR : outerR - toothDepth;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Center hole
        ctx.beginPath();
        ctx.arc(cx, cy, innerR * 0.5, 0, Math.PI * 2);
        ctx.stroke();
    }

    /**
     * Draw a trash can icon — used for remove.
     * Professional design with lid, body, and vertical lines.
     */
    _drawCrossIcon(ctx, btnX, btnY, btnW, btnH) {
        const cx = btnX + btnW / 2;
        const cy = btnY + btnH / 2;
        const w = btnW * 0.28;
        const h = btnH * 0.28;

        ctx.lineWidth = 1.3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Lid (horizontal line at top)
        ctx.beginPath();
        ctx.moveTo(cx - w * 1.1, cy - h);
        ctx.lineTo(cx + w * 1.1, cy - h);
        ctx.stroke();

        // Lid handle (small bump on top)
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.35, cy - h);
        ctx.quadraticCurveTo(cx, cy - h * 1.5, cx + w * 0.35, cy - h);
        ctx.stroke();

        // Body (trapezoid — slightly wider at top)
        ctx.beginPath();
        ctx.moveTo(cx - w, cy - h);
        ctx.lineTo(cx - w * 0.85, cy + h);
        ctx.lineTo(cx + w * 0.85, cy + h);
        ctx.lineTo(cx + w, cy - h);
        ctx.stroke();

        // Vertical lines inside (3 lines)
        const lines = [-w * 0.35, 0, w * 0.35];
        for (const lx of lines) {
            ctx.beginPath();
            ctx.moveTo(cx + lx, cy - h * 0.6);
            ctx.lineTo(cx + lx * 0.85, cy + h * 0.7);
            ctx.stroke();
        }
    }

    _roundRect(ctx, x, y, w, h, r) {
        const rr = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
    }

    /**
     * Get the control buttons for a pane.
     *
     * FIX: the main pane's `pane.indicators` array is empty (overlays live
     * at IndicatorManager.indicators level, not in pane.indicators). So for
     * the main pane we look at the overlay indicators; for indicator panes
     * we use pane.indicators as before. Without this, overlay indicators
     * like SMA/EMA/BollingerBands had no visible control buttons.
     */
    _getPaneButtons(pane) {
        const buttons = [];
        const indicators = pane.isMain
            ? this.indicatorManager.indicators.filter(i => i.type === 'overlay')
            : pane.indicators;
        for (const ind of indicators) {
            // Reverse button (only for indicators that support reversal)
            buttons.push({
                id: 'reverse', indicatorId: ind.id, icon: '⇅',
                title: 'Reverse', hovered: false, active: !!ind.reversed
            });
            // Show/hide toggle
            buttons.push({
                id: 'toggle', indicatorId: ind.id, icon: ind.visible ? '◉' : '◯',
                title: ind.visible ? 'Hide' : 'Show', hovered: false, active: ind.visible
            });
            // Settings
            buttons.push({
                id: 'settings', indicatorId: ind.id, icon: '⚙',
                title: 'Settings', hovered: false, active: false
            });
            // Remove
            buttons.push({
                id: 'remove', indicatorId: ind.id, icon: '✕',
                title: 'Remove', hovered: false, active: false
            });
        }
        return buttons;
    }

    /**
     * Handle a click on a pane button. Called from EventManager.
     * Returns true if a button was hit.
     *
     * FIX: pane._buttons stores button positions in PANE-LOCAL coordinates
     * (btn.y = 3 means "3px from the top of this pane"). But the (x, y) we
     * receive here are CANVAS-GLOBAL coordinates (from EventManager's
     * _getPos, which is `e.clientY - rect.top`). So for an indicator pane
     * that starts at canvas y=365 (e.g. the Volume pane), the button is
     * visually at canvas y=368 but stored as btn.y=3. A click at canvas
     * y=368 would fail the old `y >= btn.y` test (368 >= 3 is true, but
     * 368 <= 19 is false).
     *
     * Fix: look up each pane's region and add region.rect.y to btn.y
     * before hit-testing. We also restrict the hit-test to clicks that
     * fall inside the pane's region, so a click in the main pane can't
     * accidentally match a button in the RSI pane (whose btn.y=3 would
     * otherwise overlap the main pane's top).
     */
    handlePaneButtonClick(x, y) {
        const regions = this.indicatorManager.paneManager.getRegions();
        // Map each pane object to its region rect for quick lookup.
        const regionByPane = new Map();
        for (const r of regions) regionByPane.set(r.pane, r.rect);

        for (const pane of this.indicatorManager.paneManager.panes) {
            if (!pane._buttons || pane._buttons.length === 0) continue;
            const rect = regionByPane.get(pane);
            if (!rect) continue;
            // Ignore clicks that aren't even inside this pane's region.
            if (y < rect.y || y >= rect.y + rect.h) continue;
            // FIX: convert pane-local btn.y to canvas-global by adding rect.y.
            const paneY = rect.y;
            for (const btn of pane._buttons) {
                const btnY = paneY + btn.y;
                if (x >= btn.x && x <= btn.x + btn.w && y >= btnY && y <= btnY + btn.h) {
                    const ind = this.indicatorManager.indicators.find(i => i.id === btn.indicatorId);
                    if (!ind) return true;
                    if (btn.id === 'reverse') {
                        ind.reversed = !ind.reversed;
                    } else if (btn.id === 'toggle') {
                        ind.visible = !ind.visible;
                    } else if (btn.id === 'settings') {
                        // Open the centered settings modal for this indicator.
                        this.indicatorModal.show(ind);
                    } else if (btn.id === 'remove') {
                        this.indicatorManager.remove(ind.id);
                    }
                    this.requestRender();
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Render the time axis strip at the very bottom.
     */
    _renderTimeAxisRegion(ctx, region, dm, theme, priceScaleW) {
        const vp = this.viewport;
        const { x, y, w, h } = region.rect;
        ctx.save();
        ctx.translate(0, y);
        this.timeScale.priceScaleWidth = priceScaleW;
        this.timeScale.drawLabels(ctx, vp, dm, theme, w, h);
        ctx.restore();
    }

    /**
     * Draw the current-price line.
     *
     * CHANGED per user request: previously this drew a HORIZONTAL dashed line
     * at the last close price (spanning all panes) PLUS a VERTICAL dashed line
     * on the right edge connecting the price level across panes. The user
     * found the vertical dashed line distracting — it has been REMOVED.
     *
     * Now we only draw:
     *   - The price tag on the right price-axis (a small colored box with the
     *     close price), which is the standard TradingView "last price" label.
     */
    _drawCurrentPriceLine(ctx, regions, theme, priceScaleW) {
        const dm = this.dataManager;
        if (dm.size === 0) return;
        const last = dm.get(dm.size - 1);
        if (!last) return;
        const vp = this.viewport;
        const mainRegion = regions.find(r => r.id === 'main');
        if (!mainRegion) return;
        const yInMain = vp.priceToY(last.close);
        const absY = mainRegion.rect.y + yInMain;
        const canvasW = this.canvas.cssWidth;
        const isUp = last.close >= last.open;
        const color = isUp ? theme.upColor : theme.downColor;

        // Price tag — drawn INSIDE the clipped main region so it's bounded
        // by the region rect (not floating outside). The tag fills the
        // full price scale width and uses the same font as tick labels.
        ctx.save();
        // Clip to the main region so the tag stays inside.
        ctx.beginPath();
        ctx.rect(0, mainRegion.rect.y, canvasW, mainRegion.rect.h);
        ctx.clip();

        const tagX = canvasW - priceScaleW;
        const label = MathUtils.formatPrice(last.close);
        const tagFont = this.priceScale.fontSize;
        ctx.font = `bold ${tagFont}px 'JetBrains Mono', monospace`;
        const tagH = tagFont + 4;
        const tagW = priceScaleW;
        ctx.fillStyle = color;
        ctx.fillRect(tagX, absY - tagH / 2, tagW, tagH);
        ctx.fillStyle = theme.lastPriceTagText;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, tagX + tagW - 8, absY);
        ctx.restore();
    }

    /**
     * Draw a countdown timer that moves with the current price line.
     * The timer shows the time remaining until the current candle closes,
     * based on the data feed's interval (e.g. 1m → 60s countdown).
     *
     * The timer is a small badge positioned just LEFT of the price tag,
     * at the same Y as the current price line — so it visually "follows"
     * the price as it moves up and down.
     */
    _drawCountdownTimer(ctx, regions, theme, priceScaleW, canvasW) {
        const dm = this.dataManager;
        if (dm.size === 0) return;
        const last = dm.get(dm.size - 1);
        if (!last) return;
        const vp = this.viewport;
        const mainRegion = regions.find(r => r.id === 'main');
        if (!mainRegion) return;

        const yInMain = vp.priceToY(last.close);
        const absY = mainRegion.rect.y + yInMain;

        const interval = dm.interval || 60_000;
        const candleCloseTime = last.time + interval;
        const now = Date.now();
        let remaining = candleCloseTime - now;
        if (remaining < 0) remaining = 0;

        const totalSec = Math.floor(remaining / 1000);
        const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const ss = String(totalSec % 60).padStart(2, '0');
        const timerLabel = mm + ':' + ss;

        const pct = remaining / interval;
        let timerColor;
        if (pct > 0.5) timerColor = theme.upColor;
        else if (pct > 0.2) timerColor = '#FFC107';
        else timerColor = theme.downColor;

        // Timer badge — positioned INSIDE the price scale, below the price
        // tag. Fills the full axis width (like the price tag) so it looks
        // like part of the axis.
        const tagFont = this.priceScale.fontSize;
        ctx.save();
        ctx.font = `bold ${tagFont}px 'JetBrains Mono', monospace`;
        const m = ctx.measureText(timerLabel);
        const timerH = tagFont + 4;
        const timerW = priceScaleW;  // full axis width (inside the axis)
        const tagX = canvasW - priceScaleW;
        const tx = tagX;  // start at the axis left edge
        const ty = absY + tagFont / 2 + 2;  // just below the price tag

        ctx.fillStyle = timerColor;
        ctx.fillRect(tx, ty, timerW, timerH);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(timerLabel, tx + timerW - 4, ty + timerH / 2);
        ctx.restore();

        // Request a re-render every second so the timer updates.
        // We use a separate interval that's set up once.
        if (!this._countdownTimerInterval) {
            this._countdownTimerInterval = setInterval(() => {
                this.requestRender();
            }, 1000);
        }
    }

    /**
     * Draw the crosshair across ALL regions (vertical line + horizontal line + labels).
     */
    _drawCrosshair(ctx, regions, dm, theme, priceScaleW, canvasW, canvasH) {
        if (!this.crosshair.visible) return;
        const vp = this.viewport;
        const mainRegion = regions.find(r => r.id === 'main');
        if (!mainRegion) return;
        // FIX: Don't draw the vertical crosshair line when the cursor is on the
        // price axis. The snapped index is meaningless there and the line would
        // overlap the price labels. Only the horizontal line + price label should
        // appear when the cursor is on the price axis.
        const inPriceAxis = this.crosshair.x >= canvasW - priceScaleW;
        const snappedX = this.crosshair.snapToBar ? this.crosshair._snapX(vp) : this.crosshair.x;
        // Vertical line: extends from top of main region to bottom of last indicator region
        let bottomY = mainRegion.rect.y + mainRegion.rect.h;
        for (const r of regions) {
            if (r.id === 'timeaxis' || r.id === 'main') continue;
            bottomY = r.rect.y + r.rect.h;
        }
        ctx.save();
        ctx.strokeStyle = theme.crosshairColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        // Vertical line — ONLY when cursor is in the chart area (not on price axis)
        if (!inPriceAxis) {
            ctx.beginPath();
            ctx.moveTo(snappedX + 0.5, mainRegion.rect.y);
            ctx.lineTo(snappedX + 0.5, bottomY);
            ctx.stroke();
        }
        // Horizontal line (only inside main region, at cursor Y relative to main)
        const cursorYInMain = this.crosshair.y - mainRegion.rect.y;
        if (cursorYInMain >= 0 && cursorYInMain < mainRegion.rect.h) {
            ctx.beginPath();
            ctx.moveTo(0, this.crosshair.y + 0.5);
            ctx.lineTo(canvasW - priceScaleW, this.crosshair.y + 0.5);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Price label on the right axis — fills the FULL axis width,
        // same font size as tick labels (inside the axis, not floating above).
        if (cursorYInMain >= 0 && cursorYInMain < mainRegion.rect.h) {
            const price = vp.yToPrice(cursorYInMain);
            const label = MathUtils.formatPrice(price);
            const tagFont = this.priceScale.fontSize;
            ctx.font = `bold ${tagFont}px 'JetBrains Mono', monospace`;
            const tagH = tagFont + 4;
            const tagW = priceScaleW;  // full axis width
            const tx = canvasW - priceScaleW;
            const ty = this.crosshair.y - tagH / 2;
            ctx.fillStyle = theme.crosshairLabelBg;
            ctx.fillRect(tx, ty, tagW, tagH);
            ctx.fillStyle = theme.crosshairLabelText;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, tx + tagW - 8, this.crosshair.y);
        }

        // Time label on the time axis strip — skip when cursor is on the price axis
        // (the snapped index is meaningless there)
        const timeAxisRegion = regions.find(r => r.id === 'timeaxis');
        if (timeAxisRegion && !inPriceAxis) {
            // FIX: Previously this used `Math.round(vp.xToIndex(snappedX))` where
            // `snappedX` is the snapped bar's CENTER (fractional index = barIdx + 0.5).
            // `Math.round(barIdx + 0.5)` returned `barIdx + 1`, causing the time label
            // to display the NEXT minute instead of the CURRENT minute the cursor is
            // actually hovering over. We now read the bar index directly from the
            // cursor's X via `Math.floor()`, which is consistent with Crosshair.js.
            const idx = this.crosshair._getSnappedIdx(vp);
            if (idx >= 0 && idx < dm.size) {
                const time = dm.times[idx];
                const d = new Date(time);
                const label = this._formatTime(d, dm.interval);
                ctx.font = "bold 11px 'JetBrains Mono', monospace";
                const m = ctx.measureText(label);
                const tagW = m.width + 14;
                const tagH = 18;
                const tx = Math.max(0, Math.min(canvasW - priceScaleW - tagW, snappedX - tagW / 2));
                const ty = timeAxisRegion.rect.y + (timeAxisRegion.rect.h - tagH) / 2;
                ctx.fillStyle = theme.crosshairLabelBg;
                ctx.fillRect(tx, ty, tagW, tagH);
                ctx.fillStyle = theme.crosshairLabelText;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, tx + tagW / 2, ty + tagH / 2);
            }
        }
        ctx.restore();
    }

    /**
     * Draw the top info strip — TradingView-style single compact line.
     *
     * Layout (left → right, all on one row at y≈8):
     *   SYMBOL  price  ▲ change (changePct%)   [O H L C   Vol]   [time]
     *
     * - When the cursor is INSIDE the chart, all values reflect the bar under
     *   the cursor (and a small time label is shown on the right).
     * - When the cursor is OUTSIDE the chart (or there is no pointer), the
     *   values reflect the LATEST bar (and the time label is hidden).
     *
     * This replaces the old two-strip layout (top strip + bottom info bar).
     */
    _drawTopInfoStrip(ctx, dm, theme, canvasW) {
        if (dm.size === 0) return;

        // Decide which bar to display: cursor bar if pointer is inside, else last.
        const vp = this.viewport;
        let c = null;
        let prevC = null;
        let cursorActive = false;
        if (this.eventManager.pointerInside) {
            const idx = Math.max(0, Math.min(dm.size - 1, Math.floor(vp.xToIndex(this.eventManager.pointerX))));
            c = dm.get(idx);
            if (idx > 0) prevC = dm.get(idx - 1);
            cursorActive = true;
        }
        if (!c) {
            c = dm.get(dm.size - 1);
            if (dm.size > 1) prevC = dm.get(dm.size - 2);
        }
        if (!c || !prevC) {
            // Fallback: only one bar available
            prevC = c;
        }

        const change = c.close - prevC.close;
        const changePct = prevC.close ? (change / prevC.close) * 100 : 0;
        const isUp = change >= 0;
        const color = isUp ? theme.upColor : theme.downColor;
        const arrow = isUp ? '▲' : '▼';

        ctx.save();
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        // Position: y=8 when toolbar is visible, y=6 when no toolbar.
        const y = this._showToolbar ? 8 : 6;
        let x = 12;

        // --- Symbol ---
        ctx.fillStyle = theme.textColor;
        ctx.font = "bold 13px 'Inter', sans-serif";
        ctx.fillText(this.symbol, x, y);
        x += ctx.measureText(this.symbol).width + 14;

        // --- Current/close price (colored) ---
        ctx.fillStyle = color;
        ctx.font = "bold 13px 'JetBrains Mono', monospace";
        const priceTxt = MathUtils.formatPrice(c.close);
        ctx.fillText(priceTxt, x, y);
        x += ctx.measureText(priceTxt).width + 10;

        // --- Change arrow + value + percent (compact, TradingView-style) ---
        ctx.font = "12px 'JetBrains Mono', monospace";
        const changeTxt = `${arrow} ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePct.toFixed(2)}%)`;
        ctx.fillText(changeTxt, x, y);
        x += ctx.measureText(changeTxt).width + 18;

        // --- Compact OHLCV (always shown) ---
        // When cursor is active, values reflect the bar under the cursor.
        // When cursor is outside, values reflect the latest bar.
        ctx.fillStyle = theme.mutedText;
        ctx.font = "11px 'JetBrains Mono', monospace";
        const ohlcv = `O ${MathUtils.formatPrice(c.open)}  H ${MathUtils.formatPrice(c.high)}  L ${MathUtils.formatPrice(c.low)}  C ${MathUtils.formatPrice(c.close)}  Vol ${this._fmtVol(c.volume)}`;
        ctx.fillText(ohlcv, x, y);
        x += ctx.measureText(ohlcv).width + 18;

        // --- Time label (right-aligned, dimmed) ---
        const d = new Date(c.time);
        const pad = (n) => String(n).padStart(2, '0');
        const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        const w = ctx.measureText(timeStr).width;
        const rightX = canvasW - this.priceScale.width - 12 - w;
        if (rightX > x) {
            ctx.fillStyle = theme.mutedText;
            ctx.fillText(timeStr, rightX, y);
        }

        ctx.restore();
    }

    /**
     * Draw the cursor-candle info bar: FIXED in the top-left corner, just below
     * the top info strip. Shows the OHLCV of the candle under the cursor.
     * This replaces the floating tooltip that used to follow the mouse.
     *
     * User requested: "put it under the top strip in the left corner" — so it's
     * a fixed horizontal line of text at y=28 (right below the top strip at y=8).
     */
    _drawBottomInfoBar(ctx, regions, dm, theme, priceScaleW) {
        if (!this.eventManager.pointerInside) return;
        const vp = this.viewport;
        const idx = Math.round(vp.xToIndex(this.eventManager.pointerX - vp.barSpacing / 2));
        if (idx < 0 || idx >= dm.size) return;
        const c = dm.get(idx);
        if (!c) return;

        // FIXED position: top-left, just below the top info strip (y=8, height ~16, so y=28)
        const barY = 28;
        const change = c.close - c.open;
        const changePct = c.open ? (change / c.open) * 100 : 0;
        const isUp = change >= 0;
        const color = isUp ? theme.upColor : theme.downColor;
        const d = new Date(c.time);
        const timeStr = d.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

        ctx.save();
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        let x = 12;
        // Time
        ctx.fillStyle = theme.mutedText;
        ctx.fillText(timeStr, x, barY);
        x += ctx.measureText(timeStr).width + 16;
        // O H L C
        const parts = [
            { label: 'O', value: MathUtils.formatPrice(c.open) },
            { label: 'H', value: MathUtils.formatPrice(c.high) },
            { label: 'L', value: MathUtils.formatPrice(c.low) },
            { label: 'C', value: MathUtils.formatPrice(c.close) }
        ];
        for (const p of parts) {
            ctx.fillStyle = theme.mutedText;
            ctx.fillText(p.label, x, barY);
            x += ctx.measureText(p.label).width + 4;
            ctx.fillStyle = color;
            ctx.fillText(p.value, x, barY);
            x += ctx.measureText(p.value).width + 12;
        }
        // Change
        const changeTxt = `${change >= 0 ? '+' : ''}${change.toFixed(4)} (${changePct.toFixed(2)}%)`;
        ctx.fillStyle = color;
        ctx.fillText(changeTxt, x, barY);
        x += ctx.measureText(changeTxt).width + 12;
        // Volume
        ctx.fillStyle = theme.mutedText;
        ctx.fillText('Vol ' + this._fmtVol(c.volume), x, barY);
        ctx.restore();
    }

    // ---- Helpers ----
    _regionPriceToY(value, pane, h) {
        const range = pane.priceRange;
        if (range.min === range.max) return h / 2;
        const t = (value - range.min) / (range.max - range.min);
        return (1 - t) * h;
    }
    _niceTicks(min, max, count) {
        if (min === max) { min -= 1; max += 1; }
        const range = max - min;
        const step = Math.pow(10, Math.floor(Math.log10(range / count)));
        const err = (count / range) * step;
        let niceStep;
        if (err <= 0.15) niceStep = step * 10;
        else if (err <= 0.35) niceStep = step * 5;
        else if (err <= 0.75) niceStep = step * 2;
        else niceStep = step;
        const ticks = [];
        const start = Math.ceil(min / niceStep) * niceStep;
        for (let v = start; v <= max + niceStep * 0.5; v += niceStep) ticks.push(v);
        return ticks;
    }
    _fmt(v) {
        const abs = Math.abs(v);
        if (abs >= 1e9) return (v / 1e9).toFixed(2) + 'B';
        if (abs >= 1e6) return (v / 1e6).toFixed(2) + 'M';
        if (abs >= 1e3) return (v / 1e3).toFixed(2) + 'K';
        if (abs >= 1) return v.toFixed(2);
        return v.toFixed(4);
    }
    _fmtVol(v) {
        if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
        if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
        if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K';
        return v.toFixed(0);
    }
    _formatTime(d, interval) {
        const pad = (n) => String(n).padStart(2, '0');
        const pad3 = (n) => String(n).padStart(3, '0');
        const hhmm = pad(d.getHours()) + ':' + pad(d.getMinutes());
        if (interval < 1000) {
            // sub-second: HH:MM:SS.mmm
            return hhmm + ':' + pad(d.getSeconds()) + '.' + pad3(d.getMilliseconds());
        } else if (interval < 60 * 1000) {
            // sub-minute: HH:MM:SS
            return hhmm + ':' + pad(d.getSeconds());
        } else if (interval < 24 * 60 * 60 * 1000) {
            // intraday (>= 1 minute): HH:MM
            return hhmm;
        } else {
            return d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + d.getFullYear();
        }
    }

    // ---- Public API ----
    setChartType(type) {
        this.chartTypeManager.set(type);
        this.requestRender();
    }
    getChartType() { return this.chartTypeManager.get(); }

    setActiveTool(tool) {
        this.activeTool = tool;
        this.drawingManager.setActiveTool(tool);
        this.toolbar.setActiveTool(tool);
        if (tool) this.settingsCard.hide();
        this.requestRender();
    }
    zoomBy(factor) {
        this.viewport.zoomAt(this.viewport.width / 2, factor);
        this.viewport.updatePriceRange(this.dataManager);
        this.requestRender();
    }
    fitAll() {
        if (this.dataManager.size === 0) return;
        this.viewport.fitRange(this.dataManager.size, 5);
        this.viewport.updatePriceRange(this.dataManager);
        this.requestRender();
    }
    toggleTheme() { this.themeManager.toggle(); }
    toggleLive() {
        const btn = document.getElementById('ac-live-btn');
        if (this._liveMode) {
            this.dataFeed.stop();
            this._liveMode = false;
            if (this._followInterval) clearInterval(this._followInterval);
            btn?.classList.remove('active');
        } else {
            this.dataFeed.start(1500);
            this._liveMode = true;
            btn?.classList.add('active');
            // CHANGED per user request: the chart NO LONGER auto-scrolls
            // to the right when a new tick arrives. The user must pan/
            // scroll manually to see the latest candles. This matches
            // TradingView behavior where the chart stays put unless the
            // user explicitly scrolls to the right edge.
            //
            // The follow interval is kept (but does nothing) so we can
            // easily re-enable auto-scroll later if needed.
            this._followInterval = setInterval(() => {
                // No-op: chart stays where the user left it.
                // We only re-render to show the updated last candle.
                if (this.dataManager.size > 0) {
                    this.requestRender();
                }
            }, 800);
        }
    }
    setInterval(iv) {
        const intervals = {
            '1m': 60_000, '5m': 5 * 60_000, '15m': 15 * 60_000,
            '1h': 60 * 60_000, '4h': 4 * 60 * 60_000,
            '1D': 24 * 60 * 60_000, '1W': 7 * 24 * 60 * 60_000
        };
        const ms = intervals[iv];
        if (!ms) return;
        const wasLive = this._liveMode;
        if (wasLive) this.dataFeed.stop();
        this.dataFeed.interval = ms;
        this.dataManager.interval = ms;
        this.dataFeed.generateHistory(1500);
        this.viewport.scrollToRight(this.dataManager.size);
        this.viewport.updatePriceRange(this.dataManager);
        this.statusBar.setBars(this.dataManager.size);
        this.requestRender();
        if (wasLive) this.dataFeed.start(1500);
    }
    addIndicator(key, options = {}) {
        const ind = this.indicatorManager.add(key, options);
        this.requestRender();
        return ind;
    }
    removeIndicator(id) {
        this.indicatorManager.remove(id);
        this.requestRender();
    }
    destroy() {
        clearInterval(this._fpsTimer);
        clearInterval(this._followInterval);
        if (this._countdownTimerInterval) clearInterval(this._countdownTimerInterval);
        this.dataFeed.stop();
        this.loop.stop();
        this.eventManager.destroy();
        this.indicatorManager.paneManager.destroy();
        this.root.remove();
    }
}
