/**
 * IndicatorManager.js
 * Manages all active indicators (overlays + pane indicators).
 * Each indicator is registered with a unique id and can be added/removed at runtime.
 *
 * Pane indicators get their own pane via PaneManager. When a pane indicator is added,
 * we create a pane for it (unless one already exists with the same name).
 */
import { PaneManager } from '../core/PaneManager.js';

// Import all indicator classes for the registry
import { SMA } from '../indicators/overlays/SMA.js';
import { EMA } from '../indicators/overlays/EMA.js';
import { WMA } from '../indicators/overlays/WMA.js';
import { DoubleEMA } from '../indicators/overlays/DoubleEMA.js';
import { TripleEMA } from '../indicators/overlays/TripleEMA.js';
import { SMMA } from '../indicators/overlays/SMMA.js';
import { VWMA } from '../indicators/overlays/VWMA.js';
import { HullMA } from '../indicators/overlays/HullMA.js';
import { KAMA } from '../indicators/overlays/KAMA.js';
import { ALMA } from '../indicators/overlays/ALMA.js';
import { VWAP } from '../indicators/overlays/VWAP.js';
import { AnchoredVWAP } from '../indicators/overlays/AnchoredVWAP.js';
import { BollingerBands } from '../indicators/overlays/BollingerBands.js';
import { KeltnerChannel } from '../indicators/overlays/KeltnerChannel.js';
import { DonchianChannel } from '../indicators/overlays/DonchianChannel.js';
import { SuperTrend } from '../indicators/overlays/SuperTrend.js';
import { ParabolicSAR } from '../indicators/overlays/ParabolicSAR.js';
import { IchimokuCloud } from '../indicators/overlays/IchimokuCloud.js';
import { ZigZag } from '../indicators/overlays/ZigZag.js';
import { PivotPoints } from '../indicators/overlays/PivotPoints.js';
import { LinearRegression } from '../indicators/overlays/LinearRegression.js';
import { MAribbon } from '../indicators/overlays/MAribbon.js';
import { EnvChannel } from '../indicators/overlays/EnvChannel.js';
import { EMAribbon } from '../indicators/overlays/EMAribbon.js';
import { WilliamsFractals } from '../indicators/overlays/WilliamsFractals.js';
import { HeikinAshi } from '../indicators/overlays/HeikinAshi.js';
import { BuySellSignals } from '../indicators/overlays/BuySellSignals.js';

import { RSI } from '../indicators/panes/RSI.js';
import { MACD } from '../indicators/panes/MACD.js';
import { Stochastic } from '../indicators/panes/Stochastic.js';
import { StochRSI } from '../indicators/panes/StochRSI.js';
import { CCI } from '../indicators/panes/CCI.js';
import { ATR } from '../indicators/panes/ATR.js';
import { ADX } from '../indicators/panes/ADX.js';
import { WilliamsR } from '../indicators/panes/WilliamsR.js';
import { MFI } from '../indicators/panes/MFI.js';
import { ROC } from '../indicators/panes/ROC.js';
import { Momentum } from '../indicators/panes/Momentum.js';
import { OBV } from '../indicators/panes/OBV.js';
import { Volume } from '../indicators/panes/Volume.js';
import { ChaikinOsc } from '../indicators/panes/ChaikinOsc.js';
import { CMF } from '../indicators/panes/CMF.js';
import { TRIX } from '../indicators/panes/TRIX.js';
import { DPO } from '../indicators/panes/DPO.js';
import { KST } from '../indicators/panes/KST.js';
import { AO } from '../indicators/panes/AO.js';
import { AC } from '../indicators/panes/AC.js';
import { PPO } from '../indicators/panes/PPO.js';
import { PVO } from '../indicators/panes/PVO.js';
import { TSI } from '../indicators/panes/TSI.js';
import { UltimateOsc } from '../indicators/panes/UltimateOsc.js';
import { VolumeProfile } from '../indicators/panes/VolumeProfile.js';

export const INDICATOR_REGISTRY = {
    // Moving Averages — kept per user request (overlay on candles)
    SMA: { cls: SMA, type: 'overlay', category: 'Moving Averages' },
    EMA: { cls: EMA, type: 'overlay', category: 'Moving Averages' },
    WMA: { cls: WMA, type: 'overlay', category: 'Moving Averages' },
    DoubleEMA: { cls: DoubleEMA, type: 'overlay', category: 'Moving Averages' },
    TripleEMA: { cls: TripleEMA, type: 'overlay', category: 'Moving Averages' },
    SMMA: { cls: SMMA, type: 'overlay', category: 'Moving Averages' },
    VWMA: { cls: VWMA, type: 'overlay', category: 'Moving Averages' },
    HullMA: { cls: HullMA, type: 'overlay', category: 'Moving Averages' },
    KAMA: { cls: KAMA, type: 'overlay', category: 'Moving Averages' },
    ALMA: { cls: ALMA, type: 'overlay', category: 'Moving Averages' },
    MAribbon: { cls: MAribbon, type: 'overlay', category: 'Moving Averages' },
    EMAribbon: { cls: EMAribbon, type: 'overlay', category: 'Moving Averages' },
    // Volume indicators — kept per user request
    Volume: { cls: Volume, type: 'pane', category: 'Volume' },
    VolumeProfile: { cls: VolumeProfile, type: 'overlay', category: 'Volume' },
    BuySellSignals: { cls: BuySellSignals, type: 'overlay', category: 'Signals' }
    // NOTE: All other indicators (RSI, MACD, Bollinger, Stochastic, OBV, MFI,
    // ATR, ADX, Ichimoku, SuperTrend, ParabolicSAR, ZigZag, PivotPoints,
    // WilliamsFractals, HeikinAshi, VWAP, AnchoredVWAP, Keltner, Donchian,
    // EnvChannel, LinearRegression, CCI, WilliamsR, ROC, Momentum, TRIX,
    // DPO, KST, AO, AC, PPO, TSI, UltimateOsc, ChaikinOsc, CMF, PVO) have
    // been removed per user request. Their class imports remain so the
    // existing indicator instances on a saved chart still load, but they
    // are no longer selectable from the Indicators menu.
};

export class IndicatorManager {
    constructor(engine, paneContainer) {
        this.engine = engine;
        this.indicators = [];        // active indicators
        this.paneManager = new PaneManager(paneContainer, engine);
        this._initialized = false;
    }

    init(mainHeight) {
        // FIX: return the main pane so ChartEngine can grab its canvas.
        // Previously this returned undefined, which caused
        // `this.canvas = mainPane.canvas` to throw
        // "Cannot read properties of undefined (reading 'canvas')" in ChartEngine.
        const mainPane = this.paneManager.init(mainHeight);
        this._initialized = true;
        return mainPane;
    }

    /**
     * Add an indicator by registry key.
     */
    add(key, options = {}) {
        const reg = INDICATOR_REGISTRY[key];
        if (!reg) {
            console.warn('Unknown indicator:', key);
            return null;
        }
        const indicator = new reg.cls({ name: key, ...options });
        indicator._registryKey = key;
        indicator._category = reg.category;
        this.indicators.push(indicator);

        if (reg.type === 'pane') {
            // Create or reuse a pane for this indicator
            const paneId = 'pane_' + key;
            let pane = this.paneManager.getPane(paneId);
            if (!pane) {
                pane = this.paneManager.addPane(paneId, key, 130);
            }
            indicator.paneId = paneId;
            pane.indicators.push(indicator);
        }
        return indicator;
    }

    remove(indicatorId) {
        const idx = this.indicators.findIndex(i => i.id === indicatorId);
        if (idx < 0) return;
        const ind = this.indicators[idx];
        this.indicators.splice(idx, 1);
        if (ind.paneId) {
            const pane = this.paneManager.getPane(ind.paneId);
            if (pane) {
                const pidx = pane.indicators.indexOf(ind);
                if (pidx >= 0) pane.indicators.splice(pidx, 1);
                // If pane is now empty, remove it (unless it's the main pane)
                if (pane.indicators.length === 0 && !pane.isMain) {
                    this.paneManager.removePane(pane.id);
                }
            }
        }
    }

    clear() {
        // Remove all pane indicators' panes (except main)
        const paneIds = this.paneManager.panes.map(p => p.id).filter(id => id !== 'main');
        for (const id of paneIds) this.paneManager.removePane(id);
        this.indicators = [];
    }

    /**
     * Update pane autoscale ranges from their indicators' visible ranges.
     */
    updatePaneRanges(viewport, dm) {
        for (const pane of this.paneManager.panes) {
            if (pane.isMain) continue;
            let min = Infinity, max = -Infinity;
            for (const ind of pane.indicators) {
                if (!ind.visible) continue;
                const r = ind.visibleRange(viewport, dm);
                if (r.min < min) min = r.min;
                if (r.max > max) max = r.max;
            }
            if (!isFinite(min) || !isFinite(max) || min === max) {
                pane.priceRange = { min: 0, max: 1 };
            } else {
                const pad = (max - min) * 0.1;
                pane.priceRange = { min: min - pad, max: max + pad };
            }
        }
    }

    /**
     * Get all overlay indicators.
     */
    get overlays() {
        return this.indicators.filter(i => i.type === 'overlay' && i.visible);
    }
    /**
     * Get all pane indicators mapped to their pane.
     */
    get paneIndicators() {
        return this.indicators.filter(i => i.type === 'pane' && i.visible);
    }

    get count() { return this.indicators.length; }

    /**
     * Update main pane overlays' contribution to the main pane's autoscale range.
     * Returns extended price range if overlays extend beyond candle range.
     *
     * FIX: overlays that return null from visibleRange() (e.g. VolumeProfile
     * which uses the candle range directly) are SKIPPED here — they don't
     * contribute to autoscale, so the candle range isn't broken.
     */
    overlayRange(viewport, dm) {
        let min = Infinity, max = -Infinity;
        for (const ind of this.overlays) {
            if (typeof ind.visibleRange !== 'function') continue;
            const r = ind.visibleRange(viewport, dm);
            if (!r) continue; // overlay doesn't contribute to autoscale
            if (r.min < min) min = r.min;
            if (r.max > max) max = r.max;
        }
        return { min, max };
    }
}
