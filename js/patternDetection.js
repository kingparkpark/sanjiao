// 三角形态识别算法模块
class PatternDetection {
    constructor() {
        this.minPoints = CONFIG.APP.PATTERN_MIN_POINTS;
        this.tolerance = CONFIG.APP.PATTERN_TOLERANCE;
        this.detectedPatterns = new Map();
    }

    // 主要的形态检测函数 - 支持多种形态检测
    detectPatterns(klineData, symbol) {
        const patterns = [];
        
        // 检测三角形态
        const trianglePattern = this.detectTrianglePatterns(klineData, symbol);
        if (trianglePattern) {
            patterns.push(trianglePattern);
        }
        
        // 检测马大仙法则（MA/EMA收敛）
        const maDaxianPattern = this.detectMaDaxianPattern(klineData, symbol);
        if (maDaxianPattern) {
            patterns.push(maDaxianPattern);
        }
        
        return patterns.length > 0 ? patterns : null;
    }

    // 兼容旧接口：检测三角形态
    detectTrianglePatterns(klineData, symbol) {
        if (!klineData || klineData.length < this.minPoints * 2) {
            return null;
        }

        const highs = this.extractHighs(klineData);
        const lows = this.extractLows(klineData);

        if (highs.length < this.minPoints || lows.length < this.minPoints) {
            return null;
        }

        // 检测三种三角形态
        const ascendingTriangle = this.detectAscendingTriangle(highs, lows);
        const descendingTriangle = this.detectDescendingTriangle(highs, lows);
        const symmetricalTriangle = this.detectSymmetricalTriangle(highs, lows);

        // 返回最强的形态
        const patterns = [ascendingTriangle, descendingTriangle, symmetricalTriangle]
            .filter(pattern => pattern !== null)
            .sort((a, b) => b.confidence - a.confidence);

        if (patterns.length > 0) {
            const bestPattern = patterns[0];
            bestPattern.symbol = symbol;
            bestPattern.timestamp = Date.now();
            
            // 检查是否是新发现的形态
            if (this.isNewPattern(symbol, bestPattern)) {
                this.detectedPatterns.set(symbol, bestPattern);
                return bestPattern;
            }
        }

        return null;
    }

    // 提取高点
    extractHighs(klineData) {
        const highs = [];
        const lookback = 3; // 前后3个点进行比较

        for (let i = lookback; i < klineData.length - lookback; i++) {
            const current = klineData[i];
            let isHigh = true;

            // 检查是否为局部高点
            for (let j = i - lookback; j <= i + lookback; j++) {
                if (j !== i && (klineData[j].h || klineData[j].high) >= (current.h || current.high)) {
                    isHigh = false;
                    break;
                }
            }

            if (isHigh) {
                highs.push({
                    index: i,
                    time: current.x || current.openTime,
                    price: current.h || current.high
                });
            }
        }

        return highs.slice(-10); // 只保留最近的10个高点
    }

    // 提取低点
    extractLows(klineData) {
        const lows = [];
        const lookback = 3;

        for (let i = lookback; i < klineData.length - lookback; i++) {
            const current = klineData[i];
            let isLow = true;

            // 检查是否为局部低点
            for (let j = i - lookback; j <= i + lookback; j++) {
                if (j !== i && (klineData[j].l || klineData[j].low) <= (current.l || current.low)) {
                    isLow = false;
                    break;
                }
            }

            if (isLow) {
                lows.push({
                    index: i,
                    time: current.x || current.openTime,
                    price: current.l || current.low
                });
            }
        }

        return lows.slice(-10); // 只保留最近的10个低点
    }

    // 检测上升三角形
    detectAscendingTriangle(highs, lows) {
        if (highs.length < 3 || lows.length < 3) return null;

        // 检查高点是否形成水平阻力线
        const recentHighs = highs.slice(-5);
        const highPrices = recentHighs.map(h => h.price);
        const avgHigh = highPrices.reduce((a, b) => a + b, 0) / highPrices.length;
        
        // 检查高点是否在容差范围内水平
        const highVariation = Math.max(...highPrices) - Math.min(...highPrices);
        const isHorizontalResistance = (highVariation / avgHigh) < this.tolerance;

        if (!isHorizontalResistance) return null;

        // 检查低点是否形成上升趋势线
        const recentLows = lows.slice(-5);
        const lowTrendline = this.calculateTrendline(recentLows);
        
        if (lowTrendline.slope <= 0) return null;

        // 计算置信度
        const confidence = this.calculatePatternConfidence(
            recentHighs, recentLows, 'ascending'
        );

        if (confidence < 0.6) return null;

        return {
            type: CONFIG.PATTERN_TYPES.ASCENDING,
            confidence: confidence,
            resistanceLevel: avgHigh,
            supportTrendline: lowTrendline,
            highs: recentHighs,
            lows: recentLows,
            breakoutTarget: avgHigh * (1 + this.tolerance * 2)
        };
    }

    // 检测下降三角形
    detectDescendingTriangle(highs, lows) {
        if (highs.length < 3 || lows.length < 3) return null;

        // 检查低点是否形成水平支撑线
        const recentLows = lows.slice(-5);
        const lowPrices = recentLows.map(l => l.price);
        const avgLow = lowPrices.reduce((a, b) => a + b, 0) / lowPrices.length;
        
        // 检查低点是否在容差范围内水平
        const lowVariation = Math.max(...lowPrices) - Math.min(...lowPrices);
        const isHorizontalSupport = (lowVariation / avgLow) < this.tolerance;

        if (!isHorizontalSupport) return null;

        // 检查高点是否形成下降趋势线
        const recentHighs = highs.slice(-5);
        const highTrendline = this.calculateTrendline(recentHighs);
        
        if (highTrendline.slope >= 0) return null;

        // 计算置信度
        const confidence = this.calculatePatternConfidence(
            recentHighs, recentLows, 'descending'
        );

        if (confidence < 0.6) return null;

        return {
            type: CONFIG.PATTERN_TYPES.DESCENDING,
            confidence: confidence,
            supportLevel: avgLow,
            resistanceTrendline: highTrendline,
            highs: recentHighs,
            lows: recentLows,
            breakoutTarget: avgLow * (1 - this.tolerance * 2)
        };
    }

    // 检测收敛三角形（对称三角形）
    detectSymmetricalTriangle(highs, lows) {
        if (highs.length < 3 || lows.length < 3) return null;

        const recentHighs = highs.slice(-5);
        const recentLows = lows.slice(-5);

        // 计算高点和低点的趋势线
        const highTrendline = this.calculateTrendline(recentHighs);
        const lowTrendline = this.calculateTrendline(recentLows);

        // 检查趋势线是否收敛
        if (highTrendline.slope >= 0 || lowTrendline.slope <= 0) return null;

        // 检查收敛角度是否合理
        const convergenceAngle = Math.abs(highTrendline.slope - lowTrendline.slope);
        if (convergenceAngle < 0.001 || convergenceAngle > 0.1) return null;

        // 计算交汇点
        const intersectionPoint = this.calculateIntersection(highTrendline, lowTrendline);
        
        if (!intersectionPoint || intersectionPoint.time < Date.now()) return null;

        // 计算置信度
        const confidence = this.calculatePatternConfidence(
            recentHighs, recentLows, 'symmetrical'
        );

        if (confidence < 0.6) return null;

        return {
            type: CONFIG.PATTERN_TYPES.SYMMETRICAL,
            confidence: confidence,
            upperTrendline: highTrendline,
            lowerTrendline: lowTrendline,
            intersectionPoint: intersectionPoint,
            highs: recentHighs,
            lows: recentLows,
            breakoutTargets: {
                upward: intersectionPoint.price * (1 + this.tolerance * 2),
                downward: intersectionPoint.price * (1 - this.tolerance * 2)
            }
        };
    }

    // 计算趋势线
    calculateTrendline(points) {
        if (points.length < 2) return null;

        const n = points.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

        points.forEach(point => {
            const x = point.time;
            const y = point.price;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return {
            slope: slope,
            intercept: intercept,
            r2: this.calculateR2(points, slope, intercept)
        };
    }

    // 计算R²值（拟合度）
    calculateR2(points, slope, intercept) {
        const meanY = points.reduce((sum, p) => sum + p.price, 0) / points.length;
        
        let ssRes = 0; // 残差平方和
        let ssTot = 0; // 总平方和

        points.forEach(point => {
            const predicted = slope * point.time + intercept;
            ssRes += Math.pow(point.price - predicted, 2);
            ssTot += Math.pow(point.price - meanY, 2);
        });

        return 1 - (ssRes / ssTot);
    }

    // 计算两条趋势线的交汇点
    calculateIntersection(line1, line2) {
        const x = (line2.intercept - line1.intercept) / (line1.slope - line2.slope);
        const y = line1.slope * x + line1.intercept;

        return {
            time: x,
            price: y
        };
    }

    // 计算形态置信度
    calculatePatternConfidence(highs, lows, patternType) {
        let confidence = 0;

        // 基础置信度：基于点的数量
        confidence += Math.min(highs.length / 5, 1) * 0.3;
        confidence += Math.min(lows.length / 5, 1) * 0.3;

        // 趋势线拟合度
        if (patternType === 'ascending') {
            const lowTrendline = this.calculateTrendline(lows);
            confidence += lowTrendline.r2 * 0.4;
        } else if (patternType === 'descending') {
            const highTrendline = this.calculateTrendline(highs);
            confidence += highTrendline.r2 * 0.4;
        } else if (patternType === 'symmetrical') {
            const highTrendline = this.calculateTrendline(highs);
            const lowTrendline = this.calculateTrendline(lows);
            confidence += (highTrendline.r2 + lowTrendline.r2) / 2 * 0.4;
        }

        return Math.min(confidence, 1);
    }

    // 检查是否为新形态
    isNewPattern(symbol, newPattern) {
        const existingPattern = this.detectedPatterns.get(symbol);
        
        if (!existingPattern) return true;
        
        // 如果形态类型不同，认为是新形态
        if (existingPattern.type !== newPattern.type) return true;
        
        // 如果置信度显著提高，认为是新形态
        if (newPattern.confidence > existingPattern.confidence + 0.1) return true;
        
        // 如果距离上次检测超过30分钟，认为是新形态
        if (Date.now() - existingPattern.timestamp > 30 * 60 * 1000) return true;
        
        return false;
    }

    // 获取所有检测到的形态
    getAllDetectedPatterns() {
        return Array.from(this.detectedPatterns.values());
    }

    // 清除过期的形态
    clearExpiredPatterns() {
        const now = Date.now();
        const expireTime = 2 * 60 * 60 * 1000; // 2小时过期
        
        for (const [symbol, pattern] of this.detectedPatterns) {
            if (now - pattern.timestamp > expireTime) {
                this.detectedPatterns.delete(symbol);
            }
        }
    }

    // 马大仙法则检测（MA/EMA收敛检测）
    detectMaDaxianPattern(klineData, symbol) {
        if (!klineData || klineData.length < 120) return null;

        const closes = klineData.map(k => k.c || k.close);
        
        // 计算MA和EMA
        const ma20 = this.calculateMA(closes, 20);
        const ma60 = this.calculateMA(closes, 60);
        const ma120 = this.calculateMA(closes, 120);
        
        const ema20 = this.calculateEMA(closes, 20);
        const ema60 = this.calculateEMA(closes, 60);
        const ema120 = this.calculateEMA(closes, 120);
        
        // 获取最新的值
        const currentMa20 = ma20[ma20.length - 1];
        const currentMa60 = ma60[ma60.length - 1];
        const currentMa120 = ma120[ma120.length - 1];
        const currentEma20 = ema20[ema20.length - 1];
        const currentEma60 = ema60[ema60.length - 1];
        const currentEma120 = ema120[ema120.length - 1];
        
        if (!currentMa20 || !currentMa60 || !currentMa120 || 
            !currentEma20 || !currentEma60 || !currentEma120) return null;
        
        // 计算收敛程度
        const maValues = [currentMa20, currentMa60, currentMa120];
        const emaValues = [currentEma20, currentEma60, currentEma120];
        const allValues = [...maValues, ...emaValues];
        
        const avgPrice = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
        const maxDeviation = Math.max(...allValues.map(val => Math.abs(val - avgPrice))) / avgPrice;
        
        // 检查是否收敛
        if (maxDeviation > CONFIG.PATTERN.MA_DAXIAN.CONVERGENCE_THRESHOLD) return null;
        
        // 检查收敛持续时间
        const convergenceDuration = this.checkConvergenceDuration(klineData, ma20, ma60, ma120, ema20, ema60, ema120);
        if (convergenceDuration < CONFIG.PATTERN.MA_DAXIAN.MIN_CONVERGENCE_DURATION) return null;
        
        // 计算信号强度
        const signalStrength = 1 - (maxDeviation / CONFIG.PATTERN.MA_DAXIAN.CONVERGENCE_THRESHOLD);
        if (signalStrength < CONFIG.PATTERN.MA_DAXIAN.SIGNAL_STRENGTH) return null;
        
        // 获取当前价格
        const currentPrice = closes[closes.length - 1];
        
        // 判断趋势方向
        const trendDirection = this.determineTrendDirection(ma20, ma60, ma120, ema20, ema60, ema120);
        
        return {
            type: CONFIG.PATTERN_TYPES.MA_DAXIAN,
            confidence: signalStrength,
            symbol: symbol,
            timestamp: Date.now(),
            currentPrice: currentPrice,
            maValues: {
                ma20: currentMa20,
                ma60: currentMa60,
                ma120: currentMa120,
                ema20: currentEma20,
                ema60: currentEma60,
                ema120: currentEma120
            },
            convergenceDeviation: maxDeviation,
            convergenceDuration: convergenceDuration,
            trendDirection: trendDirection,
            breakoutTargets: {
                bullish: currentPrice * 1.05, // 5%上涨目标
                bearish: currentPrice * 0.95  // 5%下跌目标
            }
        };
    }

    // 计算简单移动平均线
    calculateMA(data, period) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.push(null);
            } else {
                const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
                result.push(sum / period);
            }
        }
        return result;
    }

    // 计算指数移动平均线
    calculateEMA(data, period) {
        const result = [];
        const multiplier = 2 / (period + 1);
        
        for (let i = 0; i < data.length; i++) {
            if (i === 0) {
                result.push(data[0]);
            } else if (i < period - 1) {
                result.push(null);
            } else if (i === period - 1) {
                const sma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
                result.push((data[i] - sma) * multiplier + sma);
            } else {
                const prevEma = result[i - 1];
                result.push((data[i] - prevEma) * multiplier + prevEma);
            }
        }
        return result;
    }

    // 检查收敛持续时间
    checkConvergenceDuration(klineData, ma20, ma60, ma120, ema20, ema60, ema120) {
        const convergencePoints = [];
        const threshold = CONFIG.PATTERN.MA_DAXIAN.CONVERGENCE_THRESHOLD;
        
        for (let i = 0; i < klineData.length; i++) {
            if (ma20[i] && ma60[i] && ma120[i] && ema20[i] && ema60[i] && ema120[i]) {
                const values = [ma20[i], ma60[i], ma120[i], ema20[i], ema60[i], ema120[i]];
                const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
                const maxDev = Math.max(...values.map(val => Math.abs(val - avg))) / avg;
                
                if (maxDev <= threshold) {
                    convergencePoints.push(klineData[i].x || klineData[i].openTime);
                }
            }
        }
        
        if (convergencePoints.length < 2) return 0;
        
        return convergencePoints[convergencePoints.length - 1] - convergencePoints[0];
    }

    // 判断趋势方向
    determineTrendDirection(ma20, ma60, ma120, ema20, ema60, ema120) {
        const currentMa20 = ma20[ma20.length - 1];
        const currentMa60 = ma60[ma60.length - 1];
        const currentMa120 = ma120[ma120.length - 1];
        
        const prevMa20 = ma20[ma20.length - 5]; // 5根K线前的值
        const prevMa60 = ma60[ma60.length - 5];
        const prevMa120 = ma120[ma120.length - 5];
        
        if (!prevMa20 || !prevMa60 || !prevMa120) return 'neutral';
        
        const ma20Slope = (currentMa20 - prevMa20) / Math.abs(prevMa20);
        const ma60Slope = (currentMa60 - prevMa60) / Math.abs(prevMa60);
        const ma120Slope = (currentMa120 - prevMa120) / Math.abs(prevMa120);
        
        const avgSlope = (ma20Slope + ma60Slope + ma120Slope) / 3;
        
        if (avgSlope > 0.001) return 'bullish';
        if (avgSlope < -0.001) return 'bearish';
        return 'neutral';
    }

    // 获取形态描述（更新版本，支持马大仙法则）
    getPatternDescription(pattern) {
        const descriptions = {
            [CONFIG.PATTERN_TYPES.ASCENDING]: '上升三角形 - 看涨形态，突破阻力位后可能上涨',
            [CONFIG.PATTERN_TYPES.DESCENDING]: '下降三角形 - 看跌形态，跌破支撑位后可能下跌',
            [CONFIG.PATTERN_TYPES.SYMMETRICAL]: '收敛三角形 - 中性形态，突破方向决定后续走势',
            [CONFIG.PATTERN_TYPES.MA_DAXIAN]: '马大仙法则 - MA/EMA多线收敛，大行情启动信号'
        };
        
        return descriptions[pattern.type] || '未知形态';
    }
}

// 创建全局实例
const patternDetection = new PatternDetection();
window.patternDetection = patternDetection;