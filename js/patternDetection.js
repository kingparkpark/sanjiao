// 三角形态识别算法模块
class PatternDetection {
    constructor() {
        this.minPoints = CONFIG.APP.PATTERN_MIN_POINTS;
        this.tolerance = CONFIG.APP.PATTERN_TOLERANCE;
        this.detectedPatterns = new Map();
    }

    // 主要的形态检测函数
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
                if (j !== i && klineData[j].high >= current.high) {
                    isHigh = false;
                    break;
                }
            }

            if (isHigh) {
                highs.push({
                    index: i,
                    time: current.openTime,
                    price: current.high
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
                if (j !== i && klineData[j].low <= current.low) {
                    isLow = false;
                    break;
                }
            }

            if (isLow) {
                lows.push({
                    index: i,
                    time: current.openTime,
                    price: current.low
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

    // 获取形态描述
    getPatternDescription(pattern) {
        const descriptions = {
            [CONFIG.PATTERN_TYPES.ASCENDING]: '上升三角形 - 看涨形态，突破阻力位后可能上涨',
            [CONFIG.PATTERN_TYPES.DESCENDING]: '下降三角形 - 看跌形态，跌破支撑位后可能下跌',
            [CONFIG.PATTERN_TYPES.SYMMETRICAL]: '收敛三角形 - 中性形态，突破方向决定后续走势'
        };
        
        return descriptions[pattern.type] || '未知形态';
    }
}

// 创建全局实例
const patternDetection = new PatternDetection();
window.patternDetection = patternDetection;