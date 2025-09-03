// 形态检测测试模块
class PatternTest {
    constructor() {
        this.testResults = [];
    }

    // 生成上升三角形测试数据
    generateAscendingTriangleData() {
        const data = [];
        const basePrice = 50000;
        const resistance = 52000;
        
        // 生成50个数据点，形成上升三角形
        for (let i = 0; i < 50; i++) {
            const time = Date.now() - (50 - i) * 300000; // 5分钟间隔
            
            // 上升的支撑线
            const supportLevel = basePrice + (i * 30);
            
            // 水平阻力线
            const resistanceLevel = resistance;
            
            // 在支撑和阻力之间随机波动
            const range = resistanceLevel - supportLevel;
            const randomFactor = Math.random();
            
            const open = supportLevel + (range * randomFactor);
            const close = supportLevel + (range * Math.random());
            const high = Math.max(open, close) + (Math.random() * 100);
            const low = Math.min(open, close) - (Math.random() * 50);
            
            // 确保高点不超过阻力位太多
            const finalHigh = Math.min(high, resistanceLevel + 50);
            // 确保低点不低于支撑位太多
            const finalLow = Math.max(low, supportLevel - 50);
            
            data.push({
                time: time,
                open: open,
                high: finalHigh,
                low: finalLow,
                close: close,
                volume: Math.random() * 1000000
            });
        }
        
        return data;
    }

    // 生成下降三角形测试数据
    generateDescendingTriangleData() {
        const data = [];
        const basePrice = 52000;
        const support = 50000;
        
        for (let i = 0; i < 50; i++) {
            const time = Date.now() - (50 - i) * 300000;
            
            // 下降的阻力线
            const resistanceLevel = basePrice - (i * 30);
            
            // 水平支撑线
            const supportLevel = support;
            
            const range = resistanceLevel - supportLevel;
            const randomFactor = Math.random();
            
            const open = supportLevel + (range * randomFactor);
            const close = supportLevel + (range * Math.random());
            const high = Math.max(open, close) + (Math.random() * 50);
            const low = Math.min(open, close) - (Math.random() * 100);
            
            const finalHigh = Math.min(high, resistanceLevel + 50);
            const finalLow = Math.max(low, supportLevel - 50);
            
            data.push({
                time: time,
                open: open,
                high: finalHigh,
                low: finalLow,
                close: close,
                volume: Math.random() * 1000000
            });
        }
        
        return data;
    }

    // 生成对称三角形测试数据
    generateSymmetricalTriangleData() {
        const data = [];
        const basePrice = 51000;
        
        for (let i = 0; i < 50; i++) {
            const time = Date.now() - (50 - i) * 300000;
            
            // 上升的支撑线
            const supportLevel = basePrice - 500 + (i * 15);
            
            // 下降的阻力线
            const resistanceLevel = basePrice + 500 - (i * 15);
            
            const range = resistanceLevel - supportLevel;
            const randomFactor = Math.random();
            
            const open = supportLevel + (range * randomFactor);
            const close = supportLevel + (range * Math.random());
            const high = Math.max(open, close) + (Math.random() * 50);
            const low = Math.min(open, close) - (Math.random() * 50);
            
            const finalHigh = Math.min(high, resistanceLevel + 30);
            const finalLow = Math.max(low, supportLevel - 30);
            
            data.push({
                time: time,
                open: open,
                high: finalHigh,
                low: finalLow,
                close: close,
                volume: Math.random() * 1000000
            });
        }
        
        return data;
    }

    // 运行所有测试
    runAllTests() {
        console.log('=== 开始形态检测测试 ===');
        
        // 测试上升三角形
        console.log('\n--- 测试上升三角形 ---');
        const ascendingData = this.generateAscendingTriangleData();
        const ascendingResult = window.patternDetection.detectPatterns(ascendingData, 'TEST_ASCENDING');
        console.log('上升三角形测试结果:', ascendingResult);
        
        // 测试下降三角形
        console.log('\n--- 测试下降三角形 ---');
        const descendingData = this.generateDescendingTriangleData();
        const descendingResult = window.patternDetection.detectPatterns(descendingData, 'TEST_DESCENDING');
        console.log('下降三角形测试结果:', descendingResult);
        
        // 测试对称三角形
        console.log('\n--- 测试对称三角形 ---');
        const symmetricalData = this.generateSymmetricalTriangleData();
        const symmetricalResult = window.patternDetection.detectPatterns(symmetricalData, 'TEST_SYMMETRICAL');
        console.log('对称三角形测试结果:', symmetricalResult);
        
        console.log('\n=== 形态检测测试完成 ===');
        
        return {
            ascending: ascendingResult,
            descending: descendingResult,
            symmetrical: symmetricalResult
        };
    }

    // 测试实时数据检测
    testRealTimeDetection() {
        console.log('=== 开始实时数据检测测试 ===');
        
        // 获取当前的币种列表
        const symbols = window.binanceAPI ? window.binanceAPI.getTopSymbols() : [];
        
        if (symbols.length === 0) {
            console.log('没有可用的币种数据');
            return;
        }
        
        // 对前5个币种进行检测
        const testSymbols = symbols.slice(0, 5);
        
        testSymbols.forEach(symbol => {
            console.log(`\n--- 检测 ${symbol} ---`);
            
            // 获取K线数据
            if (window.binanceAPI && window.binanceAPI.klineData && window.binanceAPI.klineData[symbol]) {
                const klineData = window.binanceAPI.klineData[symbol]['5m'];
                if (klineData && klineData.length > 0) {
                    console.log(`${symbol} 有 ${klineData.length} 个数据点`);
                    const result = window.patternDetection.detectPatterns(klineData, symbol);
                    console.log(`${symbol} 检测结果:`, result);
                } else {
                    console.log(`${symbol} 没有K线数据`);
                }
            } else {
                console.log(`${symbol} 数据不可用`);
            }
        });
        
        console.log('\n=== 实时数据检测测试完成 ===');
    }
}

// 创建全局测试实例
const patternTest = new PatternTest();
window.patternTest = patternTest;

// 添加快捷测试函数
window.runPatternTests = () => patternTest.runAllTests();
window.testRealTimeDetection = () => patternTest.testRealTimeDetection();

console.log('形态检测测试模块已加载');
console.log('使用 runPatternTests() 运行模拟数据测试');
console.log('使用 testRealTimeDetection() 测试实时数据检测');