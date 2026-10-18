/**
 * AdvancedChartTypes.js
 *
 * Six powerful chart types that go beyond standard candlesticks.
 *
 * FIX (user-reported): the previous versions computed bricks/columns/lines
 * from the VISIBLE range on every frame — so when the user panned or
 * zoomed, the bricks shifted and jumped. The new versions compute the
 * full structure ONCE from the entire dataset (cached by data version),
 * and each brick/column/line is tagged with the source bar index. This
 * way the structure stays anchored to the chart when panning/zooming.
 *
 * Chart types:
 * 1. Renko           — bricks based on price movement only (no time)
 * 2. Point & Figure  — X/O columns based on reversal boxes
 * 3. ThreeLineBreak  — reversal only when price breaks 3 prior lines
 * 4. Kagi            — line thickness changes at reversal points
 * 5. HeikinAshiSmoothed — HA with EMA smoothing for cleaner trends
 * 6. PatternDetection — overlays pattern markers on regular candles
 */

// ============================================================
// 1. RENKO
// ============================================================
/**
 * Renko chart: bricks are drawn only when price moves by a fixed amount.
 * Each brick is anchored to the bar index where it was generated.
 * Bricks are cached and only recomputed when the data changes.
 */
export function drawRenko(ctx, vp, dm, theme) {
    const bricks = getRenkoBricks(dm);
    if (!bricks || bricks.length === 0) return;

    const leftIdx = Math.max(0, Math.floor(vp.leftEdge));
    const rightIdx = Math.min(dm.size - 1, Math.ceil(vp.rightEdge));

    const barSpacing = vp.barSpacing;

    ctx.save();

    // When very zoomed out (barSpacing < 2), draw a simple close-price
    // step line instead of bricks — the bricks would be invisible at 1px.
    if (barSpacing < 2) {
        ctx.lineWidth = 1.5;
        let prevX = null, prevY = null;
        for (const brick of bricks) {
            if (brick.barIdx < leftIdx || brick.barIdx > rightIdx) continue;
            const x = vp.indexToX(brick.barIdx) + barSpacing / 2;
            // Use the brick's midpoint price for the step line.
            const midPrice = (brick.topPrice + brick.botPrice) / 2;
            const y = vp.priceToY(midPrice);
            ctx.strokeStyle = brick.dir > 0 ? theme.upColor : theme.downColor;
            if (prevX !== null && prevY !== null) {
                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(x, prevY); // horizontal step
                ctx.lineTo(x, y);     // vertical step
                ctx.stroke();
            }
            prevX = x; prevY = y;
        }
        ctx.restore();
        return;
    }

    const bodyW = Math.max(2, barSpacing * 0.7);
    for (const brick of bricks) {
        // Only draw bricks within the visible range.
        if (brick.barIdx < leftIdx || brick.barIdx > rightIdx) continue;
        const x = vp.indexToX(brick.barIdx) + barSpacing / 2;
        const yTop = vp.priceToY(brick.topPrice);
        const yBot = vp.priceToY(brick.botPrice);
        const h = Math.max(2, Math.abs(yBot - yTop));
        const color = brick.dir > 0 ? theme.upColor : theme.downColor;
        if (brick.dir > 0) {
            // Up brick — hollow
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x - bodyW / 2 + 0.5, yTop + 0.5, bodyW, h);
        } else {
            // Down brick — filled
            ctx.fillStyle = color;
            ctx.fillRect(x - bodyW / 2, yTop, bodyW, h);
        }
    }
    ctx.restore();
}

// Renko brick cache.
let _renkoCache = { version: -1, bricks: null, brickSize: 0 };

function getRenkoBricks(dm) {
    if (_renkoCache.version === dm.version) return _renkoCache.bricks;
    const { highs, lows, closes } = dm.raw();
    const n = dm.size;
    if (n < 2) { _renkoCache = { version: dm.version, bricks: [], brickSize: 0 }; return []; }

    // Brick size = average of (high - low) over all bars, / 2.
    let sumRange = 0;
    for (let i = 0; i < n; i++) sumRange += highs[i] - lows[i];
    const brickSize = (sumRange / n) / 2;
    if (brickSize <= 0) { _renkoCache = { version: dm.version, bricks: [], brickSize: 0 }; return []; }

    const bricks = [];
    let lastClose = closes[0];
    let brickCount = 0; // virtual index for spacing multiple bricks from one bar

    for (let i = 1; i < n; i++) {
        const diff = closes[i] - lastClose;
        const absDiff = Math.abs(diff);
        if (absDiff >= brickSize) {
            const numBricks = Math.floor(absDiff / brickSize);
            for (let b = 0; b < numBricks; b++) {
                if (diff > 0) {
                    const topPrice = lastClose + brickSize;
                    bricks.push({
                        barIdx: i,           // anchor to source bar
                        topPrice: topPrice,
                        botPrice: lastClose,
                        dir: 1
                    });
                    lastClose = topPrice;
                } else {
                    const botPrice = lastClose - brickSize;
                    bricks.push({
                        barIdx: i,
                        topPrice: lastClose,
                        botPrice: botPrice,
                        dir: -1
                    });
                    lastClose = botPrice;
                }
                brickCount++;
            }
        }
    }
    _renkoCache = { version: dm.version, bricks, brickSize };
    return bricks;
}

// ============================================================
// 2. POINT & FIGURE
// ============================================================
/**
 * Point & Figure chart: X = rising column, O = falling column.
 * Each column is anchored to the bar index range where it was generated.
 */
export function drawPointAndFigure(ctx, vp, dm, theme) {
    const columns = getPFColumns(dm);
    if (!columns || columns.length === 0) return;

    const leftIdx = Math.max(0, Math.floor(vp.leftEdge));
    const rightIdx = Math.min(dm.size - 1, Math.ceil(vp.rightEdge));
    const barSpacing = vp.barSpacing;

    ctx.save();

    // When very zoomed out (barSpacing < 3), draw colored vertical bars
    // instead of X/O letters — the letters would be unreadable at <3px.
    if (barSpacing < 3) {
        const colW = Math.max(1, barSpacing * 0.7);
        for (const col of columns) {
            if (col.endBarIdx < leftIdx || col.startBarIdx > rightIdx) continue;
            const x = vp.indexToX(col.startBarIdx) + barSpacing / 2;
            const color = col.type === 'X' ? theme.upColor : theme.downColor;
            // Draw a thin bar from min to max price in this column.
            const prices = col.prices;
            const minP = Math.min(...prices);
            const maxP = Math.max(...prices);
            const yTop = vp.priceToY(maxP);
            const yBot = vp.priceToY(minP);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(x - colW / 2, yTop, colW, Math.max(1, yBot - yTop));
            ctx.globalAlpha = 1;
        }
        ctx.restore();
        return;
    }

    ctx.font = `${Math.max(8, Math.min(barSpacing, 14))}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const col of columns) {
        // Only draw columns that overlap the visible range.
        if (col.endBarIdx < leftIdx || col.startBarIdx > rightIdx) continue;
        // Anchor the column's x to its starting bar.
        const x = vp.indexToX(col.startBarIdx) + barSpacing / 2;
        const symbol = col.type;
        const color = symbol === 'X' ? theme.upColor : theme.downColor;
        ctx.fillStyle = color;
        for (const price of col.prices) {
            const y = vp.priceToY(price);
            ctx.fillText(symbol, x, y);
        }
    }
    ctx.restore();
}

let _pfCache = { version: -1, columns: null };

function getPFColumns(dm) {
    if (_pfCache.version === dm.version) return _pfCache.columns;
    const { closes } = dm.raw();
    const n = dm.size;
    if (n < 2) { _pfCache = { version: dm.version, columns: [] }; return []; }

    // Box size = average daily range / 3.
    const { highs, lows } = dm.raw();
    let sumRange = 0;
    for (let i = 0; i < n; i++) sumRange += highs[i] - lows[i];
    const boxSize = (sumRange / n) / 3;
    if (boxSize <= 0) { _pfCache = { version: dm.version, columns: [] }; return []; }

    const reversalBoxes = 3;
    const reversalAmount = boxSize * reversalBoxes;

    const columns = [];
    let currentCol = { type: 'X', prices: [closes[0]], startBarIdx: 0, endBarIdx: 0 };
    let lastPrice = closes[0];
    let direction = 0;

    for (let i = 1; i < n; i++) {
        const price = closes[i];
        currentCol.endBarIdx = i;
        if (direction >= 0) {
            if (price - lastPrice >= boxSize) {
                currentCol.type = 'X';
                currentCol.prices.push(price);
                lastPrice = price;
                direction = 1;
            } else if (lastPrice - price >= reversalAmount) {
                columns.push(currentCol);
                currentCol = { type: 'O', prices: [price], startBarIdx: i, endBarIdx: i };
                lastPrice = price;
                direction = -1;
            }
        } else {
            if (lastPrice - price >= boxSize) {
                currentCol.type = 'O';
                currentCol.prices.push(price);
                lastPrice = price;
            } else if (price - lastPrice >= reversalAmount) {
                columns.push(currentCol);
                currentCol = { type: 'X', prices: [price], startBarIdx: i, endBarIdx: i };
                lastPrice = price;
                direction = 1;
            }
        }
    }
    if (currentCol.prices.length > 0) columns.push(currentCol);
    _pfCache = { version: dm.version, columns };
    return columns;
}

// ============================================================
// 3. THREE-LINE BREAK
// ============================================================
/**
 * Three-Line Break: a new line is drawn only when price exceeds the
 * high or low of the previous 3 lines. Each line is anchored to its
 * source bar index.
 */
export function drawThreeLineBreak(ctx, vp, dm, theme) {
    const lines = getTLBLines(dm);
    if (!lines || lines.length < 2) return;

    const leftIdx = Math.max(0, Math.floor(vp.leftEdge));
    const rightIdx = Math.min(dm.size - 1, Math.ceil(vp.rightEdge));
    const barSpacing = vp.barSpacing;

    ctx.save();

    // When very zoomed out (barSpacing < 2), draw a close-price step line
    // instead of rectangles — the rectangles would be invisible at 1px.
    if (barSpacing < 2) {
        ctx.lineWidth = 1.5;
        let prevX = null, prevY = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.barIdx < leftIdx || line.barIdx > rightIdx) continue;
            const x = vp.indexToX(line.barIdx) + barSpacing / 2;
            const y = vp.priceToY(line.price);
            ctx.strokeStyle = line.dir > 0 ? theme.upColor : (line.dir < 0 ? theme.downColor : theme.mutedText);
            if (prevX !== null && prevY !== null) {
                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(x, prevY);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
            prevX = x; prevY = y;
        }
        ctx.restore();
        return;
    }

    const lineW = Math.max(2, barSpacing * 0.7);
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.barIdx < leftIdx || line.barIdx > rightIdx) continue;
        const prev = lines[i - 1];
        const x = vp.indexToX(line.barIdx) + barSpacing / 2;
        const y1 = vp.priceToY(prev.price);
        const y2 = vp.priceToY(line.price);
        const yTop = Math.min(y1, y2);
        const h = Math.max(1, Math.abs(y2 - y1));
        const color = line.dir > 0 ? theme.upColor : (line.dir < 0 ? theme.downColor : theme.mutedText);
        if (line.dir > 0) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x - lineW / 2 + 0.5, yTop + 0.5, lineW, h);
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(x - lineW / 2, yTop, lineW, h);
        }
    }
    ctx.restore();
}

let _tlbCache = { version: -1, lines: null };

function getTLBLines(dm) {
    if (_tlbCache.version === dm.version) return _tlbCache.lines;
    const { closes } = dm.raw();
    const n = dm.size;
    if (n < 2) { _tlbCache = { version: dm.version, lines: [] }; return []; }

    const lines = [];
    let prevPrice = closes[0];
    lines.push({ price: prevPrice, dir: 0, barIdx: 0 });

    for (let i = 1; i < n; i++) {
        const price = closes[i];
        const last3 = lines.slice(-3);
        const maxHigh = Math.max(...last3.map(l => l.price));
        const minLow = Math.min(...last3.map(l => l.price));

        if (price > maxHigh) {
            lines.push({ price, dir: 1, barIdx: i });
            prevPrice = price;
        } else if (price < minLow) {
            lines.push({ price, dir: -1, barIdx: i });
            prevPrice = price;
        }
    }
    _tlbCache = { version: dm.version, lines };
    return lines;
}

// ============================================================
// 4. KAGI
// ============================================================
/**
 * Kagi chart: a continuous line whose thickness changes at reversal
 * points. Each segment is anchored to its source bar index.
 *
 * FIX: the horizontal connector between consecutive vertical segments
 * is now drawn from the PREVIOUS segment's X position to the current
 * segment's X position at the shared price (the end of the previous =
 * the start of the current). This makes the Kagi line look continuous
 * — a proper stair-step pattern — instead of disconnected vertical bars.
 */
export function drawKagi(ctx, vp, dm, theme) {
    const segments = getKagiSegments(dm);
    if (!segments || segments.length === 0) return;

    const leftIdx = Math.max(0, Math.floor(vp.leftEdge));
    const rightIdx = Math.min(dm.size - 1, Math.ceil(vp.rightEdge));
    const barSpacing = vp.barSpacing;
    // Kagi draws a continuous line, so it works at any zoom level.
    // No early return for small barSpacing.

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const thickColor = theme.upColor;
    const thinColor = theme.downColor;

    // Iterate through ALL segments (not just visible ones) so we can draw
    // the horizontal connector from the previous segment even when the
    // previous one is off-screen but the current one is on-screen.
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const x = vp.indexToX(seg.barIdx) + barSpacing / 2;
        const y1 = vp.priceToY(seg.fromPrice);
        const y2 = vp.priceToY(seg.toPrice);
        const color = seg.thickness === 'thick' ? thickColor : thinColor;
        const width = seg.thickness === 'thick' ? 3 : 1.5;

        ctx.strokeStyle = color;
        ctx.lineWidth = width;

        // Draw the horizontal connector FIRST (from previous segment's X
        // to this segment's X, at the shared price y1).
        // The connector uses the PREVIOUS segment's thickness/color to
        // visually distinguish the transition point.
        if (i > 0) {
            const prevSeg = segments[i - 1];
            const prevX = vp.indexToX(prevSeg.barIdx) + barSpacing / 2;
            // Only draw the connector if at least part of it is visible.
            if (Math.max(prevX, x) >= 0 && Math.min(prevX, x) <= vp.width) {
                // The connector's color/thickness matches the segment that
                // is BEGINNING (the new direction), which is the standard
                // Kagi convention.
                ctx.beginPath();
                ctx.moveTo(prevX, y1);
                ctx.lineTo(x, y1);
                ctx.stroke();
            }
        }

        // Draw the vertical segment (only if visible).
        if (seg.barIdx >= leftIdx - 1 && seg.barIdx <= rightIdx + 1) {
            ctx.beginPath();
            ctx.moveTo(x, y1);
            ctx.lineTo(x, y2);
            ctx.stroke();
        }
    }
    ctx.restore();
}

let _kagiCache = { version: -1, segments: null };

function getKagiSegments(dm) {
    if (_kagiCache.version === dm.version) return _kagiCache.segments;
    const { highs, lows, closes } = dm.raw();
    const n = dm.size;
    if (n < 2) { _kagiCache = { version: dm.version, segments: [] }; return []; }

    // Reversal amount = 4% of the total price range.
    let pMin = Infinity, pMax = -Infinity;
    for (let i = 0; i < n; i++) {
        if (lows[i] < pMin) pMin = lows[i];
        if (highs[i] > pMax) pMax = highs[i];
    }
    const reversalAmount = (pMax - pMin) * 0.04;
    if (reversalAmount <= 0) { _kagiCache = { version: dm.version, segments: [] }; return []; }

    const segments = [];
    let curPrice = closes[0];
    let curDir = 0;
    let curThickness = 'thin';
    let prevBarIdx = 0;
    let prevX = 0; // not used for positioning, just for connector

    for (let i = 1; i < n; i++) {
        const price = closes[i];
        if (curDir >= 0) {
            if (price > curPrice) {
                segments.push({
                    barIdx: i, fromPrice: curPrice, toPrice: price,
                    thickness: curThickness
                });
                curPrice = price;
                curDir = 1;
                prevBarIdx = i;
            } else if (curPrice - price >= reversalAmount) {
                curDir = -1;
                curThickness = 'thin';
                segments.push({
                    barIdx: i, fromPrice: curPrice, toPrice: price,
                    thickness: curThickness
                });
                curPrice = price;
                prevBarIdx = i;
            }
        } else {
            if (price < curPrice) {
                segments.push({
                    barIdx: i, fromPrice: curPrice, toPrice: price,
                    thickness: curThickness
                });
                curPrice = price;
            } else if (price - curPrice >= reversalAmount) {
                curDir = 1;
                curThickness = 'thick';
                segments.push({
                    barIdx: i, fromPrice: curPrice, toPrice: price,
                    thickness: curThickness
                });
                curPrice = price;
                prevBarIdx = i;
            }
        }
    }
    _kagiCache = { version: dm.version, segments };
    return segments;
}

// ============================================================
// 5. HEIKIN-ASHI SMOOTHED
// ============================================================
/**
 * Heikin-Ashi Smoothed: applies HA calculation, then smooths the
 * HA open/close with a 3-period EMA for cleaner trend visualization.
 * This type IS time-based (like regular candles), so no anchoring fix
 * is needed.
 */
export function drawHeikinAshiSmoothed(ctx, vp, dm, theme, manager) {
    const ha = manager._computeHeikinAshi(dm);
    if (!ha) return;

    const period = 3;
    const alpha = 2 / (period + 1);
    const n = dm.size;
    const smOpen = new Float64Array(n);
    const smClose = new Float64Array(n);
    const smHigh = new Float64Array(n);
    const smLow = new Float64Array(n);

    smOpen[0] = ha.opens[0];
    smClose[0] = ha.closes[0];
    smHigh[0] = ha.highs[0];
    smLow[0] = ha.lows[0];

    for (let i = 1; i < n; i++) {
        smOpen[i] = alpha * ha.opens[i] + (1 - alpha) * smOpen[i - 1];
        smClose[i] = alpha * ha.closes[i] + (1 - alpha) * smClose[i - 1];
        smHigh[i] = Math.max(ha.highs[i], smHigh[i - 1] * 0.5 + ha.highs[i] * 0.5);
        smLow[i] = Math.min(ha.lows[i], smLow[i - 1] * 0.5 + ha.lows[i] * 0.5);
    }

    const leftIdx = Math.max(0, Math.floor(vp.leftEdge));
    const rightIdx = Math.min(n - 1, Math.ceil(vp.rightEdge));
    if (rightIdx < leftIdx) return;

    const barSpacing = vp.barSpacing;
    if (barSpacing < 1.5) {
        ctx.save();
        ctx.strokeStyle = theme.upColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        for (let i = leftIdx; i <= rightIdx; i++) {
            const x = vp.indexToX(i) + barSpacing / 2;
            const y = vp.priceToY(smClose[i]);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
        return;
    }

    const bodyW = Math.max(1, barSpacing * 0.7);
    ctx.save();
    for (let i = leftIdx; i <= rightIdx; i++) {
        const o = smOpen[i], c = smClose[i], h = smHigh[i], l = smLow[i];
        const x = vp.indexToX(i) + barSpacing / 2;
        const isUp = c >= o;
        const color = isUp ? theme.upColor : theme.downColor;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, vp.priceToY(h));
        ctx.lineTo(x + 0.5, vp.priceToY(l));
        ctx.stroke();

        const yOpen = vp.priceToY(o);
        const yClose = vp.priceToY(c);
        const yTop = Math.min(yOpen, yClose);
        const bodyH = Math.max(1, Math.abs(yClose - yOpen));
        ctx.fillStyle = color;
        ctx.fillRect(x - bodyW / 2, yTop, bodyW, bodyH);
    }
    ctx.restore();
}

// ============================================================
// 6. PATTERN DETECTION
// ============================================================
/**
 * Pattern Detection: draws regular candles, then overlays markers
 * for detected candlestick patterns. This type IS time-based, so no
 * anchoring fix is needed.
 */
export function drawPatternDetection(ctx, vp, dm, theme, manager) {
    manager._drawCandleVariant(ctx, vp, dm, theme, 'candles');

    const { opens, highs, lows, closes } = dm.raw();
    const leftIdx = Math.max(1, Math.floor(vp.leftEdge));
    const rightIdx = Math.min(dm.size - 1, Math.ceil(vp.rightEdge));
    if (rightIdx <= leftIdx) return;

    const barSpacing = vp.barSpacing;
    if (barSpacing < 3) return;

    ctx.save();
    ctx.font = "bold 9px 'Inter', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = leftIdx; i <= rightIdx; i++) {
        const o = opens[i], h = highs[i], l = lows[i], c = closes[i];
        const prevO = opens[i - 1], prevC = closes[i - 1];
        const body = Math.abs(c - o);
        const range = h - l;
        const upperWick = h - Math.max(o, c);
        const lowerWick = Math.min(o, c) - l;
        const x = vp.indexToX(i) + barSpacing / 2;
        let label = null, color = null;
        const yHigh = vp.priceToY(h);

        if (range > 0 && body / range < 0.1) {
            label = 'D'; color = '#FFC107';
        } else if (body > 0 && lowerWick >= body * 2 && upperWick < body * 0.5) {
            label = 'H'; color = theme.upColor;
        } else if (body > 0 && upperWick >= body * 2 && lowerWick < body * 0.5) {
            label = 'SS'; color = theme.downColor;
        } else if (prevC < prevO && c > o && c >= prevO && o <= prevC) {
            label = 'BE'; color = theme.upColor;
        } else if (prevC > prevO && c < o && o >= prevC && c <= prevO) {
            label = 'BrE'; color = theme.downColor;
        } else if (range > 0 && body / range > 0.95) {
            label = 'M'; color = c >= o ? theme.upColor : theme.downColor;
        }

        if (label) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, yHigh - 8, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText(label, x, yHigh - 8);
        }
    }
    ctx.restore();
}

// ============================================================
// 7. ANIMATED CANDLES
// ============================================================
/**
 * Animated Candles: draws regular candles but the last N candles "grow"
 * from their open price to their close price with a smooth animation.
 * This lets the user SEE how the chart works — each candle appears to
 * form in real time.
 *
 * The animation uses a time-based progress (0..1) that loops every ~3
 * seconds for the last 15 candles.
 */
let _animStartTime = 0;

export function drawAnimatedCandles(ctx, vp, dm, theme, manager) {
    // Draw all candles normally first.
    manager._drawCandleVariant(ctx, vp, dm, theme, 'candles');

    // Then overlay the animation on the last 15 candles.
    const { opens, highs, lows, closes } = dm.raw();
    const n = dm.size;
    if (n < 2) return;

    const ANIM_COUNT = 15;
    const ANIM_DURATION = 3000; // ms per full grow cycle
    const now = performance.now();
    if (_animStartTime === 0) _animStartTime = now;
    const elapsed = (now - _animStartTime) % ANIM_DURATION;
    const progress = elapsed / ANIM_DURATION; // 0..1

    const barSpacing = vp.barSpacing;
    // When very zoomed out, skip the animation overlay — it would just
    // create visual noise on top of the close line.
    if (barSpacing < 3) return;

    const leftIdx = Math.max(0, Math.floor(vp.leftEdge));
    const rightIdx = Math.min(n - 1, Math.ceil(vp.rightEdge));
    const animStart = Math.max(leftIdx, n - ANIM_COUNT);

    ctx.save();
    const bodyW = Math.max(1, barSpacing * 0.7);

    for (let i = animStart; i <= rightIdx; i++) {
        if (i < leftIdx || i > rightIdx) continue;
        const o = opens[i], h = highs[i], l = lows[i], c = closes[i];
        const isUp = c >= o;
        const color = isUp ? theme.upColor : theme.downColor;

        // Stagger: each candle starts its growth a bit later.
        const stagger = ((i - animStart) / ANIM_COUNT) * 0.5; // 0..0.5
        const localT = Math.max(0, Math.min(1, (progress - stagger) * 2));
        // Ease-out cubic for smooth growth.
        const ease = 1 - Math.pow(1 - localT, 3);

        // Animated close = open + (close - open) * ease.
        const animClose = o + (c - o) * ease;
        // Animated high/low = open + (h-o)*ease, open + (l-o)*ease.
        const animHigh = o + (h - o) * ease;
        const animLow = o + (l - o) * ease;

        const x = vp.indexToX(i) + barSpacing / 2;
        const yOpen = vp.priceToY(o);
        const yClose = vp.priceToY(animClose);
        const yHigh = vp.priceToY(animHigh);
        const yLow = vp.priceToY(animLow);

        // Subtle glow only — reduced blur to avoid noise when zoomed.
        // Only apply glow when the candle is mid-growth (ease < 0.95).
        if (ease < 0.95) {
            ctx.shadowColor = color;
            ctx.shadowBlur = Math.min(4, barSpacing * 0.3); // scaled, capped
        } else {
            ctx.shadowBlur = 0;
        }

        // Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, yHigh);
        ctx.lineTo(x + 0.5, yLow);
        ctx.stroke();

        // Body
        const yTop = Math.min(yOpen, yClose);
        const bodyH = Math.max(1, Math.abs(yClose - yOpen));
        ctx.fillStyle = color;
        ctx.fillRect(x - bodyW / 2, yTop, bodyW, bodyH);

        ctx.shadowBlur = 0;
    }
    ctx.restore();

    // Request next frame to keep the animation going — but only if the
    // chart type is still 'animatedCandles'.
    if (manager._engine && manager._engine.getChartType() === 'animatedCandles') {
        manager._engine.requestRender();
    }
}

// ============================================================
// 8. BICOLOR CANDLES — body split into red/green rectangles
// ============================================================
/**
 * BiColor Candles: each candle body is split VERTICALLY into two
 * groups of small rectangles:
 *   - LEFT group = RED (selling pressure)
 *   - RIGHT group = GREEN (buying pressure)
 *
 * The WIDTH of each group is proportional to the relative strength of
 * buyers vs sellers in that candle:
 *   - If the candle is strongly bullish (large body, close near high),
 *     the green group is WIDER than the red group.
 *   - If the candle is strongly bearish (large body, close near low),
 *     the red group is WIDER.
 *   - If the candle is balanced (doji-like), both groups are equal.
 *
 * Each group is drawn as a stack of small horizontal rectangles
 * (like an order-flow footprint) with slight transparency so the
 * candles behind remain visible.
 *
 * The "strength ratio" is computed from:
 *   buyStrength = (close - low) / (high - low)   — how close to the high
 *   sellStrength = (high - close) / (high - low)  — how close to the low
 *   ratio = buyStrength / (buyStrength + sellStrength)
 *   greenWidth = bodyW * ratio
 *   redWidth = bodyW * (1 - ratio)
 */
export function drawBiColorCandles(ctx, vp, dm, theme, manager) {
    const { opens, highs, lows, closes } = dm.raw();
    const leftIdx = Math.max(0, Math.floor(vp.leftEdge));
    const rightIdx = Math.min(dm.size - 1, Math.ceil(vp.rightEdge));
    if (rightIdx < leftIdx) return;

    const barSpacing = vp.barSpacing;
    const bodyW = Math.max(2, barSpacing * 0.7);
    ctx.save();
    for (let i = leftIdx; i <= rightIdx; i++) {
        const o = opens[i], h = highs[i], l = lows[i], c = closes[i];
        const x = vp.indexToX(i) + barSpacing / 2;
        const isUp = c >= o;
        const upColor = theme.upColor;     // green
        const downColor = theme.downColor; // red
        const yHigh = vp.priceToY(h);
        const yLow = vp.priceToY(l);
        const yOpen = vp.priceToY(o);
        const yClose = vp.priceToY(c);
        const yTop = Math.min(yOpen, yClose);
        const yBot = Math.max(yOpen, yClose);
        const bodyH = Math.max(1, yBot - yTop);

        // --- Compute buyer/seller strength ratio ---
        // buyStrength = how far the close is above the low (0..1)
        // sellStrength = how far the close is below the high (0..1)
        const range = h - l;
        let buyStrength, sellStrength;
        if (range > 0) {
            buyStrength = Math.max(0, (c - l) / range);
            sellStrength = Math.max(0, (h - c) / range);
        } else {
            buyStrength = 0.5;
            sellStrength = 0.5;
        }
        const total = buyStrength + sellStrength;
        const ratio = total > 0 ? buyStrength / total : 0.5;
        // greenWidth = proportion of body width for green (buyers)
        const greenW = bodyW * ratio;
        const redW = bodyW - greenW;

        // --- Wick ---
        ctx.strokeStyle = isUp ? (theme.upWick || upColor) : (theme.downWick || downColor);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, yHigh);
        ctx.lineTo(x + 0.5, yLow);
        ctx.stroke();

        // --- Body: stack of small rectangles ---
        // Rectangle height scales with zoom.
        const rectH = Math.max(2, barSpacing * 0.25);
        const numRects = Math.max(1, Math.floor(bodyH / rectH));

        // Left group (red / selling) — from x - bodyW/2 to x - bodyW/2 + redW
        const leftStart = x - bodyW / 2;
        // Right group (green / buying) — from leftStart + redW to x + bodyW/2
        const rightStart = leftStart + redW;

        ctx.globalAlpha = 0.75; // semi-transparent

        for (let r = 0; r < numRects; r++) {
            const rectY = yTop + r * rectH;
            const rectYEnd = Math.min(rectY + rectH - 0.5, yBot);
            const rectActualH = rectYEnd - rectY;
            if (rectActualH <= 0) continue;

            // Left rectangle (red)
            if (redW > 0.5) {
                ctx.fillStyle = downColor;
                ctx.fillRect(leftStart, rectY, redW - 0.3, rectActualH);
            }
            // Right rectangle (green)
            if (greenW > 0.5) {
                ctx.fillStyle = upColor;
                ctx.fillRect(rightStart, rectY, greenW - 0.3, rectActualH);
            }
        }
        ctx.globalAlpha = 1;

        // --- Border ---
        ctx.strokeStyle = theme.candleBorder || 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x - bodyW / 2 + 0.5, yTop + 0.5, bodyW, bodyH);
    }
    ctx.restore();
}

// ============================================================
// 9. ORDER FLOW CANDLES — small rectangles inside the candle body
// ============================================================
/**
 * Order Flow Candles: draws the candle body as a stack of small
 * horizontal rectangles (like an order-flow / footprint chart).
 * Each rectangle represents a price level within the candle's range.
 * Green rectangles = price levels where close > open (buying).
 * Red rectangles = price levels where close < open (selling).
 * The number of rectangles scales with the candle's body height.
 */
export function drawOrderFlowCandles(ctx, vp, dm, theme, manager) {
    const { opens, highs, lows, closes } = dm.raw();
    const leftIdx = Math.max(0, Math.floor(vp.leftEdge));
    const rightIdx = Math.min(dm.size - 1, Math.ceil(vp.rightEdge));
    if (rightIdx < leftIdx) return;

    const barSpacing = vp.barSpacing;
    if (barSpacing < 3) {
        // Too zoomed out — draw simple candles.
        manager._drawCandleVariant(ctx, vp, dm, theme, 'candles');
        return;
    }
    const bodyW = Math.max(2, barSpacing * 0.7);
    const rectH = Math.max(2, barSpacing * 0.3); // height of each order-flow box
    ctx.save();
    for (let i = leftIdx; i <= rightIdx; i++) {
        const o = opens[i], h = highs[i], l = lows[i], c = closes[i];
        const x = vp.indexToX(i) + barSpacing / 2;
        const isUp = c >= o;
        const upColor = theme.upColor;
        const downColor = theme.downColor;
        const yHigh = vp.priceToY(h);
        const yLow = vp.priceToY(l);
        const yOpen = vp.priceToY(o);
        const yClose = vp.priceToY(c);
        const yTop = Math.min(yOpen, yClose);
        const yBot = Math.max(yOpen, yClose);
        const bodyH = Math.max(1, yBot - yTop);

        // Wick
        ctx.strokeStyle = isUp ? (theme.upWick || upColor) : (theme.downWick || downColor);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, yHigh);
        ctx.lineTo(x + 0.5, yLow);
        ctx.stroke();

        // Body = stack of small rectangles from open to close
        const numRects = Math.max(1, Math.floor(bodyH / rectH));
        for (let r = 0; r < numRects; r++) {
            const rectY = yTop + r * rectH;
            const priceAtRect = vp.yToPrice(rectY + rectH / 2);
            // Color: if this price level is above the candle's midpoint,
            // it's "buying" (up color). Below = "selling" (down color).
            const midPrice = (o + c) / 2;
            const isBuying = priceAtRect >= midPrice ? isUp : !isUp;
            ctx.fillStyle = isBuying ? upColor : downColor;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(x - bodyW / 2, rectY, bodyW, Math.min(rectH - 0.5, yBot - rectY));
        }
        ctx.globalAlpha = 1;
        // Border
        ctx.strokeStyle = theme.candleBorder || 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x - bodyW / 2 + 0.5, yTop + 0.5, bodyW, bodyH);
    }
    ctx.restore();
}

// ============================================================
// 10. NUMBERED CANDLES — candles with numbers displayed on them
// ============================================================
/**
 * Numbered Candles: draws regular candles, then overlays the candle's
 * close price (or index number) as text inside or next to each candle body.
 * The number is drawn at the candle's close price level.
 */
export function drawNumberedCandles(ctx, vp, dm, theme, manager) {
    // Draw regular candles first
    manager._drawCandleVariant(ctx, vp, dm, theme, 'candles');

    const { opens, closes } = dm.raw();
    const leftIdx = Math.max(0, Math.floor(vp.leftEdge));
    const rightIdx = Math.min(dm.size - 1, Math.ceil(vp.rightEdge));
    if (rightIdx < leftIdx) return;

    const barSpacing = vp.barSpacing;
    if (barSpacing < 5) return; // too zoomed out for numbers

    ctx.save();
    ctx.font = `${Math.max(7, Math.min(10, barSpacing * 0.5))}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = leftIdx; i <= rightIdx; i++) {
        const o = opens[i], c = closes[i];
        const x = vp.indexToX(i) + barSpacing / 2;
        const isUp = c >= o;
        const yClose = vp.priceToY(c);
        const yOpen = vp.priceToY(o);
        const yMid = (yClose + yOpen) / 2;

        // Draw the close price as a small number at the candle's midpoint
        const label = c.toFixed(c >= 1000 ? 0 : 2);
        // Background for readability
        const m = ctx.measureText(label);
        const padX = 2, padY = 1;
        ctx.fillStyle = isUp ? theme.upColor : theme.downColor;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x - m.width / 2 - padX, yMid - 5, m.width + padX * 2, 10);
        ctx.globalAlpha = 1;
        // Text
        ctx.fillStyle = '#fff';
        ctx.fillText(label, x, yMid);
    }
    ctx.restore();
}

// Registry of advanced chart types and their draw functions.
export const ADVANCED_CHART_TYPES = {
    renko:              (ctx, vp, dm, theme, mgr) => drawRenko(ctx, vp, dm, theme),
    pointAndFigure:     (ctx, vp, dm, theme, mgr) => drawPointAndFigure(ctx, vp, dm, theme),
    threeLineBreak:     (ctx, vp, dm, theme, mgr) => drawThreeLineBreak(ctx, vp, dm, theme),
    kagi:               (ctx, vp, dm, theme, mgr) => drawKagi(ctx, vp, dm, theme),
    heikinAshiSmoothed: (ctx, vp, dm, theme, mgr) => drawHeikinAshiSmoothed(ctx, vp, dm, theme, mgr),
    patternDetection:   (ctx, vp, dm, theme, mgr) => drawPatternDetection(ctx, vp, dm, theme, mgr),
    animatedCandles:    (ctx, vp, dm, theme, mgr) => drawAnimatedCandles(ctx, vp, dm, theme, mgr),
    biColorCandles:     (ctx, vp, dm, theme, mgr) => drawBiColorCandles(ctx, vp, dm, theme, mgr),
    orderFlow:          (ctx, vp, dm, theme, mgr) => drawOrderFlowCandles(ctx, vp, dm, theme, mgr),
    numberedCandles:    (ctx, vp, dm, theme, mgr) => drawNumberedCandles(ctx, vp, dm, theme, mgr)
};
