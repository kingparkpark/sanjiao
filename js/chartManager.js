// 图表管理器
class ChartManager {
    constructor() {
        this.charts = new Map();
        this.chartData = new Map();
        this.cacheSize = 0;
        this.maxCacheSize = 50 * 1024 * 1024; // 50MB缓存限制
    }

    // 初始化所有图表
    initializeCharts(symbols) {
        console.log('初始化图表容器...');
        
        const chartsGrid = document.getElementById('charts-grid');
        if (!chartsGrid) {
            console.error('找不到图表网格容器');
            return;
        }

        // 清空现有内容
        chartsGrid.innerHTML = '';

        // 为每个币种创建图表容器
        symbols.forEach(symbolData => {
            this.createChartContainer(symbolData.symbol, symbolData.baseAsset, symbolData.quoteAsset);
        });

        console.log(`已创建 ${symbols.length} 个图表容器`);
    }

    // 创建单个图表容器
    createChartContainer(symbol, baseAsset, quoteAsset) {
        const chartsGrid = document.getElementById('charts-grid');
        
        const container = document.createElement('div');
        container.className = 'chart-container';
        container.setAttribute('data-symbol', symbol);
        
        container.innerHTML = `
            <div class="chart-header">
                <h3 class="symbol-name">${symbol}</h3>
                <div class="price-change">--</div>
            </div>
            <div class="chart-wrapper">
                <canvas id="chart-${symbol}"></canvas>
                <div id="loading-${symbol}" class="loading-indicator">
                    <div class="spinner"></div>
                    <span>加载中...</span>
                </div>
            </div>
        `;
        
        chartsGrid.appendChild(container);
        
        // 创建图表实例
        this.createChart(symbol);
    }

    // 创建Chart.js实例
    createChart(symbol) {
        const canvas = document.getElementById(`chart-${symbol}`);
        if (!canvas) {
            console.error(`找不到画布元素: chart-${symbol}`);
            return;
        }

        const ctx = canvas.getContext('2d');
        
        const config = {
            type: 'line',
            data: {
                datasets: [{
                    label: symbol,
                    data: [],
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    fill: false,
                    tension: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: '时间'
                        },
                        ticks: {
                            callback: function(value, index, values) {
                                const date = new Date(value);
                                return date.toLocaleTimeString('zh-CN', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                            }
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: '价格'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                const date = new Date(context[0].parsed.x);
                                return date.toLocaleString('zh-CN');
                            },
                            label: function(context) {
                                const data = context.raw;
                                const klineData = this.chartData.get(context.dataset.label) || [];
                                const index = context.dataIndex;
                                const kline = klineData[index];
                                
                                if (kline) {
                                    return [
                                        `开盘: ${parseFloat(kline.open).toFixed(4)}`,
                                        `最高: ${parseFloat(kline.high).toFixed(4)}`,
                                        `最低: ${parseFloat(kline.low).toFixed(4)}`,
                                        `收盘: ${parseFloat(kline.close).toFixed(4)}`
                                    ];
                                }
                                return `价格: ${data.y?.toFixed(4) || 'N/A'}`;
                            }.bind(this)
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 0
                },
                onHover: (event, elements) => {
                    canvas.style.cursor = elements.length > 0 ? 'crosshair' : 'default';
                }
            }
        };

        // 创建图表实例
        const chart = new Chart(ctx, config);
        this.charts.set(symbol, chart);
        this.chartData.set(symbol, []);

        console.log(`图表 ${symbol} 创建成功`);
        
        // 隐藏加载指示器
        setTimeout(() => {
            const loading = document.getElementById(`loading-${symbol}`);
            if (loading) loading.style.display = 'none';
        }, 1000);
        
        return chart;
    }

    // 更新图表数据
    updateChartData(symbol, klineData) {
        const chart = this.charts.get(symbol);
        if (!chart || !klineData || klineData.length === 0) {
            return;
        }

        try {
            // 转换K线数据为图表数据格式
            const chartData = this.convertKlineToChartData(klineData);
            
            // 更新图表数据
            chart.data.datasets[0].data = chartData;
            chart.update('none');

            // 存储数据
            this.chartData.set(symbol, klineData);

            // 更新价格变化显示
            this.updatePriceChange(symbol, klineData);

            console.log(`图表 ${symbol} 数据更新完成`);
        } catch (error) {
            console.error(`更新图表 ${symbol} 数据失败:`, error);
        }
    }

    // 转换K线数据为图表数据格式
    convertKlineToChartData(klineData) {
        return klineData.map(kline => ({
            x: kline.openTime,
            y: parseFloat(kline.close)
        }));
    }

    // 更新实时K线数据
    updateRealtimeKline(symbol, kline) {
        const chart = this.charts.get(symbol);
        if (!chart) return;

        try {
            const data = chart.data.datasets[0].data;
            const storedData = this.chartData.get(symbol) || [];
            
            const newKlineData = {
                x: kline.openTime,
                y: parseFloat(kline.close)
            };

            const newStoredKline = {
                openTime: kline.openTime,
                open: kline.open,
                high: kline.high,
                low: kline.low,
                close: kline.close
            };

            if (kline.isFinal) {
                 // 如果是完成的K线，添加新数据点
                 data.push(newKlineData);
                 storedData.push(newStoredKline);
                 
                 // 保持数据长度限制
                 if (data.length > CONFIG.APP.KLINE_LIMIT) {
                     data.shift();
                     storedData.shift();
                 }
             } else {
                 // 如果是未完成的K线，更新最后一个数据点
                 if (data.length > 0) {
                     data[data.length - 1] = newKlineData;
                 }
                 if (storedData.length > 0) {
                     storedData[storedData.length - 1] = newStoredKline;
                 }
             }

            // 更新存储的数据
            this.chartData.set(symbol, storedData);

            chart.update('none');
            
            // 更新价格显示
            this.updatePriceChange(symbol, storedData);
        } catch (error) {
            console.error(`更新实时K线 ${symbol} 失败:`, error);
        }
    }

    // 更新价格变化显示
    updatePriceChange(symbol, klineData) {
        if (!klineData || klineData.length < 2) return;

        const container = document.querySelector(`[data-symbol="${symbol}"]`);
        if (!container) return;

        const priceElement = container.querySelector('.price-change');
        if (!priceElement) return;

        const currentPrice = parseFloat(klineData[klineData.length - 1].close);
        const previousPrice = parseFloat(klineData[klineData.length - 2].close);
        
        const change = currentPrice - previousPrice;
        const changePercent = (change / previousPrice * 100).toFixed(2);

        priceElement.textContent = `${currentPrice.toFixed(4)} (${change >= 0 ? '+' : ''}${changePercent}%)`;
        priceElement.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
    }

    // 显示形态指示器
    showPatternIndicator(symbol, pattern) {
        const container = document.querySelector(`[data-symbol="${symbol}"]`);
        if (!container) return;

        // 移除现有指示器
        const existingIndicator = container.querySelector('.pattern-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // 创建新指示器
        const indicator = document.createElement('div');
        indicator.className = 'pattern-indicator';
        indicator.innerHTML = `
            <span class="pattern-type">${this.getPatternTypeText(pattern.type)}</span>
            <span class="pattern-confidence">置信度: ${(pattern.confidence * 100).toFixed(1)}%</span>
        `;

        container.appendChild(indicator);

        // 自动移除指示器
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, CONFIG.APP.PATTERN_DISPLAY_DURATION);
    }

    // 获取形态类型文本
    getPatternTypeText(type) {
        const typeTexts = {
            [CONFIG.PATTERN_TYPES.ASCENDING]: '上升三角形',
            [CONFIG.PATTERN_TYPES.DESCENDING]: '下降三角形',
            [CONFIG.PATTERN_TYPES.SYMMETRICAL]: '收敛三角形'
        };
        return typeTexts[type] || '未知形态';
    }

    // 获取图表数据
    getChartData(symbol) {
        return this.chartData.get(symbol) || [];
    }

    // 更新时间周期
    updateTimeframe(timeframe) {
        console.log(`更新图表时间周期: ${timeframe}`);
        // 清空所有图表数据
        this.charts.forEach((chart, symbol) => {
            chart.data.datasets[0].data = [];
            chart.update('none');
            this.chartData.set(symbol, []);
        });
    }

    // 销毁所有图表
    destroyAllCharts() {
        console.log('销毁所有图表...');
        
        this.charts.forEach((chart, symbol) => {
            try {
                chart.destroy();
            } catch (error) {
                console.error(`销毁图表 ${symbol} 失败:`, error);
            }
        });
        
        this.charts.clear();
        this.chartData.clear();
        console.log('所有图表已销毁');
    }

    // 清理缓存
    clearCache() {
        console.log('清理图表缓存...');
        
        // 清理过期的图表数据（保留最近1000条数据）
        for (const [symbol, data] of this.chartData) {
            if (data.length > 1000) {
                const keepData = data.slice(-1000);
                this.chartData.set(symbol, keepData);
                console.log(`${symbol}: 清理了${data.length - 1000}条历史数据`);
            }
        }
        
        // 重新计算缓存大小
        this.updateCacheSize();
        
        console.log(`缓存清理完成，当前大小: ${(this.cacheSize / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // 更新缓存大小估算
    updateCacheSize() {
        let totalSize = 0;
        
        for (const [symbol, data] of this.chartData) {
            // 估算每条K线数据约100字节
            totalSize += data.length * 100;
        }
        
        this.cacheSize = totalSize;
        
        // 如果缓存超过限制，自动清理
        if (this.cacheSize > this.maxCacheSize) {
            console.warn(`缓存大小超限(${(this.cacheSize / 1024 / 1024).toFixed(2)}MB)，执行自动清理`);
            this.clearCache();
        }
    }
    
    // 获取内存使用情况
    getMemoryUsage() {
        return {
            cacheSize: this.cacheSize,
            maxCacheSize: this.maxCacheSize,
            usagePercent: (this.cacheSize / this.maxCacheSize) * 100,
            totalDataPoints: Array.from(this.chartData.values()).reduce((sum, data) => sum + data.length, 0)
        };
    }

    // 获取图表统计信息
    getStats() {
        const memoryUsage = this.getMemoryUsage();
        
        return {
            totalCharts: this.charts.size,
            activeCharts: Array.from(this.chartData.values()).filter(data => data.length > 0).length,
            memory: memoryUsage
        };
    }
}

// 创建全局实例
const chartManager = new ChartManager();
window.chartManager = chartManager;