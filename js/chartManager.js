/**
 * TradingView图表管理器 - 负责创建和管理所有币种的TradingView图表
 */
class ChartManager {
    constructor() {
        this.charts = new Map();
        this.chartData = new Map(); // 存储图表数据用于形态检测
        this.chartsContainer = document.getElementById('charts-grid');
        this.cacheSize = 0;
        this.maxCacheSize = 50 * 1024 * 1024; // 50MB缓存限制
    }

    /**
     * 初始化所有图表
     * @param {Array} symbols - 币种列表
     * @param {string} interval - 时间周期，默认为5分钟
     */
    async initializeCharts(symbols, interval = '5') {
        console.log(`初始化TradingView图表容器，时间周期: ${interval}`);
        
        if (!this.chartsContainer) {
            console.error('找不到图表网格容器');
            return;
        }

        // 清空现有图表
        this.clearCharts();
        
        // 显示加载状态
        this.chartsContainer.innerHTML = '<div class="loading-message"><div class="spinner"></div><p>正在创建TradingView图表...</p></div>';
        
        // 为每个币种创建图表容器
        const chartsHTML = symbols.map(symbolData => 
            this.createChartContainer(symbolData.symbol)
        ).join('');
        
        this.chartsContainer.innerHTML = chartsHTML;
        
        // 初始化事件监听器
        this.initializeIndividualTimeframeControls();
        
        // 为每个币种初始化TradingView图表
        for (const symbolData of symbols) {
            await this.createTradingViewChart(symbolData.symbol, interval);
        }

        console.log(`已创建 ${symbols.length} 个TradingView图表容器，时间周期: ${interval}`);
    }

    /**
     * 创建图表容器HTML
     * @param {string} symbol - 币种符号
     * @param {string} baseAsset - 基础资产（可选）
     * @param {string} quoteAsset - 计价资产（可选）
     * @returns {string} HTML字符串
     */
    createChartContainer(symbol, baseAsset = null, quoteAsset = null) {
        const displaySymbol = symbol.toUpperCase();
        return `
            <div class="chart-item" data-symbol="${symbol}">
                <div class="chart-item-header">
                    <div class="chart-item-title">
                        ${displaySymbol}
                        <span class="chart-item-symbol">USDT</span>
                    </div>
                    <div class="chart-controls">
                        <label>周期:</label>
                        <select class="time-selector" data-symbol="${symbol}" title="选择时间周期">
                            <option value="1">1分钟</option>
                            <option value="3">3分钟</option>
                            <option value="5" selected>5分钟</option>
                            <option value="15">15分钟</option>
                            <option value="30">30分钟</option>
                            <option value="60">1小时</option>
                            <option value="240">4小时</option>
                            <option value="D">1天</option>
                        </select>
                    </div>
                </div>
                <div class="chart-content">
                    <div class="tradingview-widget-container" id="tradingview-${symbol}" style="height: 100%;">
                        <div class="tradingview-widget-container__widget" style="height: 100%;"></div>
                        <div class="tradingview-widget-copyright">
                            <a href="https://cn.tradingview.com/symbols/${displaySymbol}USDT/?exchange=BINANCE" rel="noopener" target="_blank">
                                <span class="blue-text">${displaySymbol}USDT图表</span>
                            </a>由TradingView提供
                        </div>
                    </div>
                    <div class="chart-error" style="display: none;">
                        <p>图表加载失败</p>
                        <button onclick="chartManager.retryChart('${symbol}')">重试</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 获取TradingView symbol映射
     * @param {string} symbol - 币种符号
     * @returns {string} TradingView格式的symbol
     */
    getTradingViewSymbol(symbol) {
        // 使用TradingView内置的Binance数据源
        console.log(`[ChartManager] getTradingViewSymbol: 原始symbol: ${symbol}`);
        
        // 确保symbol格式正确
        let cleanSymbol = symbol.toUpperCase();
        
        // 处理USDT后缀
        if (!cleanSymbol.endsWith('USDT') && !cleanSymbol.includes('USD')) {
            cleanSymbol = `${cleanSymbol}USDT`;
        }
        
        // 添加BINANCE:前缀以使用Binance数据源
        if (!cleanSymbol.startsWith('BINANCE:')) {
            cleanSymbol = `BINANCE:${cleanSymbol}`;
        }
        
        console.log(`[ChartManager] getTradingViewSymbol: TradingView symbol: ${cleanSymbol}`);
        return cleanSymbol;
    }
    
    /**
     * 获取备选TradingView symbol格式
     * @param {string} symbol - 原始symbol
     * @returns {Array} 备选格式数组
     */
    getAlternativeTradingViewSymbols(symbol) {
        const upperSymbol = symbol.toUpperCase();
        
        // 基础币种名（去除USDT后缀）
        const baseSymbol = upperSymbol.replace('USDT', '');
        
        return [
            // Binance格式
            `BINANCE:${upperSymbol}`,
            `BINANCE:${baseSymbol}USDT`,
            `BINANCE:${baseSymbol}USD`,
            `BINANCE:${baseSymbol}PERP`,
            `BINANCE:${baseSymbol}.P`,
            
            // Bybit格式
            `BYBIT:${upperSymbol}`,
            `BYBIT:${baseSymbol}USDT`,
            `BYBIT:${baseSymbol}USD`,
            
            // OKX格式
            `OKX:${upperSymbol}`,
            `OKX:${baseSymbol}USDT`,
            `OKX:${baseSymbol}USD`,
            
            // Coinbase格式
            `COINBASE:${baseSymbol}USD`,
            `COINBASE:${baseSymbol}USDT`,
            
            // Kraken格式
            `KRAKEN:${baseSymbol}USD`,
            `KRAKEN:${baseSymbol}USDT`,
            
            // Huobi格式
            `HUOBI:${upperSymbol}`,
            `HUOBI:${baseSymbol}USDT`,
            
            // Gate格式
            `GATE:${upperSymbol}`,
            `GATE:${baseSymbol}USDT`,
            
            // MEXC格式
            `MEXC:${upperSymbol}`,
            `MEXC:${baseSymbol}USDT`,
            
            // 直接格式
            upperSymbol,
            baseSymbol,
            `${baseSymbol}USDT`,
            `${baseSymbol}USD`
        ].filter((value, index, self) => self.indexOf(value) === index); // 去重
    }

    /**
     * 创建TradingView图表
     * @param {string} symbol - 币种符号
     * @param {string} interval - 时间周期，默认为5分钟
     */
    async createTradingViewChart(symbol, interval = '5') {
        const container = document.getElementById(`tradingview-${symbol}`);
        if (!container) {
            console.error(`Container not found for symbol: ${symbol}`);
            return;
        }

        try {
            const tradingViewSymbol = this.getTradingViewSymbol(symbol);
            console.log(`🚀 [DEBUG] Creating TradingView chart for ${symbol} -> ${tradingViewSymbol}`);
            console.log(`✅ [DEBUG] Container found for ${symbol}:`, container);
            
            const widget = new TradingView.widget({
                width: '100%',
                height: 300,
                symbol: symbol, // 直接使用原始symbol
                interval: interval,
                timezone: 'Asia/Shanghai',
                theme: 'dark',
                style: '1', // 蜡烛图
                locale: 'zh_CN',
                toolbar_bg: '#1e1e1e',
                enable_publishing: false,
                hide_top_toolbar: true,
                hide_legend: true,
                save_image: false,
                container_id: `tradingview-${symbol}`,
                datafeed: new BinanceDatafeed(),
                library_path: '/charting_library/',
                studies: [
                    'Volume@tv-basicstudies'
                ],
                overrides: {
                    'paneProperties.background': '#1a1a1a',
                    'paneProperties.vertGridProperties.color': '#2a2a2a',
                    'paneProperties.horzGridProperties.color': '#2a2a2a',
                    'symbolWatermarkProperties.transparency': 90,
                    'scalesProperties.textColor': '#b2b5be',
                    'mainSeriesProperties.candleStyle.upColor': '#26a69a',
                    'mainSeriesProperties.candleStyle.downColor': '#ef5350',
                    'mainSeriesProperties.candleStyle.drawWick': true,
                    'mainSeriesProperties.candleStyle.drawBorder': true,
                    'mainSeriesProperties.candleStyle.borderColor': '#378658',
                    'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
                    'mainSeriesProperties.candleStyle.borderDownColor': '#ef5350',
                    'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
                    'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350',
                    'volumePaneSize': 'small'
                },
                disabled_features: [
                    'use_localstorage_for_settings',
                    'volume_force_overlay',
                    'create_volume_indicator_by_default',
                    'header_compare',
                    'header_undo_redo',
                    'header_screenshot',
                    'header_chart_type',
                    'header_settings',
                    'header_indicators',
                    'header_symbol_search',
                    'symbol_search_hot_key',
                    'header_resolutions',
                    'timeframes_toolbar'
                ],
                enabled_features: [
                    'hide_left_toolbar'
                ],
                loading_screen: {
                    backgroundColor: '#1a1a1a',
                    foregroundColor: '#2962ff'
                },
                // 图表就绪回调
                onChartReady: () => {
                    console.log(`🎉 [SUCCESS] TradingView chart ready for ${symbol} using ${tradingViewSymbol}`);
                    this.updateStatusDot(symbol, true);
                    
                    // 监听图表错误事件
                    widget.onChartReady(() => {
                        console.log(`📡 [DEBUG] Setting up symbol change listener for ${symbol}`);
                        widget.chart().onSymbolChanged().subscribe(null, (symbolInfo) => {
                            console.log(`🔄 [DEBUG] Symbol changed event for ${symbol}:`, symbolInfo);
                            if (symbolInfo && symbolInfo.error) {
                                console.warn(`⚠️ [WARNING] Symbol error for ${symbol}:`, symbolInfo.error);
                                this.handleSymbolError(symbol, tradingViewSymbol);
                            }
                        });
                    });
                },
                // 添加错误处理回调
                onError: (error) => {
                    console.error(`💥 [ERROR] TradingView error for ${symbol} using ${tradingViewSymbol}:`, error);
                    console.error(`💥 [ERROR] Error details:`, JSON.stringify(error, null, 2));
                    this.handleSymbolError(symbol, tradingViewSymbol);
                }
            });

            this.charts.set(symbol, widget);

        } catch (error) {
            console.error(`💥 [CATCH ERROR] Failed to create TradingView chart for ${symbol}:`, error);
            console.error(`💥 [CATCH ERROR] Error stack:`, error.stack);
            console.error(`💥 [CATCH ERROR] TradingView available:`, typeof TradingView !== 'undefined');
            console.error(`💥 [CATCH ERROR] TradingView.widget available:`, typeof TradingView?.widget !== 'undefined');
            
            // 处理symbol错误，尝试使用其他交易所前缀
            await this.handleSymbolError(symbol, tradingViewSymbol);
        }
    }

    /**
     * 处理symbol错误，自动尝试备选交易所
     * @param {string} symbol - 币种符号
     * @param {string} failedSymbol - 失败的TradingView symbol
     */
    async handleSymbolError(symbol, failedSymbol) {
        console.log(`❌ Symbol error detected for ${symbol}`);
        console.log(`🔍 Failed symbol: ${failedSymbol}`);
        console.log(`🔄 Starting alternative symbol search process`);
        
        // 销毁当前图表
        if (this.charts.has(symbol)) {
            try {
                console.log(`🧹 Removing existing chart widget for ${symbol}`);
                this.charts.get(symbol).remove();
                console.log(`✅ Chart widget removed successfully for ${symbol}`);
            } catch (e) {
                console.warn(`⚠️ Error removing chart for ${symbol}:`, e);
            }
            this.charts.delete(symbol);
            console.log(`📝 Chart reference deleted from charts map for ${symbol}`);
        }
        
        // 尝试备选交易所
        console.log(`🚀 Initiating alternative symbols search for ${symbol}`);
        await this.tryAlternativeSymbols(symbol, failedSymbol);
    }

    /**
     * 尝试使用其他交易所前缀创建图表
     * @param {string} symbol - 币种符号
     * @param {string} excludeSymbol - 要排除的已失败symbol
     */
    async tryAlternativeSymbols(symbol, excludeSymbol = null) {
        // 为不同类型的币种提供更智能的备选方案
        let alternatives = [];
        
        // 获取基础symbol（去除USDT后缀）
        const baseSymbol = symbol.replace('USDT', '');
        
        // 由于getTradingViewSymbol已经优先使用BINANCE，这里提供其他交易所作为备选
        alternatives = [
            `BYBIT:${symbol}`,
            `OKX:${symbol}`,
            `COINBASE:${symbol.replace('USDT', 'USD')}`,
            `KRAKEN:${symbol.replace('USDT', 'USD')}`,
            `HUOBI:${symbol}`,
            `GATE:${symbol}`,
            `MEXC:${symbol}`,
            // 尝试不同的symbol格式
            `BINANCE:${baseSymbol}USD`,
            `BINANCE:${baseSymbol}BUSD`,
            `BINANCE:${baseSymbol}BTC`,
            symbol // 不带前缀，最后尝试
        ];
        
        console.log(`📋 Prepared ${alternatives.length} alternative exchanges for ${symbol}`);
        
        // 排除已经失败的symbol
        const filteredAlternatives = alternatives.filter(alt => alt !== excludeSymbol);
        
        const container = document.getElementById(`tradingview-${symbol}`);
        if (!container) return;
        
        // 获取当前时间周期
        const currentInterval = document.querySelector(`[data-symbol="${symbol}"].time-selector`)?.value || '5';
        
        console.log(`Trying ${filteredAlternatives.length} alternative symbols for ${symbol} with interval ${currentInterval}`);
        
        for (const altSymbol of filteredAlternatives) {
            try {
                console.log(`Trying alternative symbol: ${altSymbol}`);
                
                const widget = new TradingView.widget({
                    width: '100%',
                    height: 300,
                    symbol: altSymbol,
                    interval: currentInterval,
                    timezone: 'Asia/Shanghai',
                    theme: 'dark',
                    style: '1',
                    locale: 'zh_CN',
                    toolbar_bg: '#1e1e1e',
                    enable_publishing: false,
                    hide_top_toolbar: true,
                    hide_legend: true,
                    save_image: false,
                    container_id: `tradingview-${symbol}`,
                    studies: ['Volume@tv-basicstudies'],
                    overrides: {
                        'paneProperties.background': '#1a1a1a',
                        'paneProperties.vertGridProperties.color': '#2a2a2a',
                        'paneProperties.horzGridProperties.color': '#2a2a2a',
                        'symbolWatermarkProperties.transparency': 90,
                        'scalesProperties.textColor': '#b2b5be',
                        'mainSeriesProperties.candleStyle.upColor': '#26a69a',
                        'mainSeriesProperties.candleStyle.downColor': '#ef5350',
                        'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
                        'mainSeriesProperties.candleStyle.borderDownColor': '#ef5350',
                        'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
                        'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350'
                    },
                    disabled_features: [
                        'use_localstorage_for_settings',
                        'volume_force_overlay',
                        'create_volume_indicator_by_default',
                        'header_compare',
                        'header_undo_redo',
                        'header_screenshot',
                        'header_chart_type',
                        'header_settings',
                        'header_indicators',
                        'header_symbol_search',
                        'symbol_search_hot_key',
                        'header_resolutions',
                        'timeframes_toolbar'
                    ],
                    enabled_features: ['hide_left_toolbar'],
                    loading_screen: {
                        backgroundColor: '#1a1a1a',
                        foregroundColor: '#2962ff'
                    },
                    onChartReady: () => {
                        console.log(`TradingView chart ready for ${symbol} using ${altSymbol}`);
                        this.updateStatusDot(symbol, true);
                        
                        // 监听图表错误事件
                        widget.onChartReady(() => {
                            widget.chart().onSymbolChanged().subscribe(null, (symbolInfo) => {
                                if (symbolInfo && symbolInfo.error) {
                                    console.warn(`Symbol error for ${symbol} using ${altSymbol}:`, symbolInfo.error);
                                    // 继续尝试下一个备选symbol
                                    this.tryNextAlternative(symbol, altSymbol, filteredAlternatives);
                                }
                            });
                        });
                    },
                    // 添加错误处理回调
                    onError: (error) => {
                        console.error(`TradingView error for ${symbol} using ${altSymbol}:`, error);
                        this.tryNextAlternative(symbol, altSymbol, filteredAlternatives);
                    }
                });
                
                this.charts.set(symbol, widget);
                console.log(`Successfully created chart for ${symbol} using ${altSymbol}`);
                return; // 成功创建，退出循环
                
            } catch (error) {
                console.warn(`Failed to create chart with ${altSymbol}:`, error);
                continue; // 尝试下一个
            }
        }
        
        // 所有尝试都失败，显示错误
        this.showChartError(symbol);
    }

    /**
     * 尝试下一个备选symbol
     * @param {string} symbol - 币种符号
     * @param {string} failedSymbol - 失败的symbol
     * @param {Array} alternatives - 备选symbol列表
     */
    async tryNextAlternative(symbol, failedSymbol, alternatives) {
        // 销毁当前图表
        if (this.charts.has(symbol)) {
            try {
                this.charts.get(symbol).remove();
            } catch (e) {
                console.warn('Error removing chart:', e);
            }
            this.charts.delete(symbol);
        }
        
        // 找到当前失败symbol的索引
        const currentIndex = alternatives.indexOf(failedSymbol);
        const remainingAlternatives = alternatives.slice(currentIndex + 1);
        
        if (remainingAlternatives.length > 0) {
            console.log(`Trying next alternative for ${symbol}, remaining: ${remainingAlternatives.length}`);
            // 直接尝试剩余的备选项，而不是重新开始整个列表
            await this.tryAlternativeSymbolsFromList(symbol, remainingAlternatives);
        } else {
            console.log(`All alternatives exhausted for ${symbol}`);
            this.showChartError(symbol);
        }
    }

    /**
     * 从指定的备选symbol列表中尝试创建图表
     * @param {string} symbol - 币种符号
     * @param {Array} alternatives - 备选symbol列表
     */
    async tryAlternativeSymbolsFromList(symbol, alternatives) {
        if (!alternatives || alternatives.length === 0) {
            console.warn(`❌ No more alternatives available for ${symbol}`);
            console.log(`🚫 Showing error message for ${symbol}`);
            this.showChartError(symbol);
            return;
        }
        
        const container = document.getElementById(`tradingview-${symbol}`);
        if (!container) {
            console.error(`❌ Container not found for ${symbol}`);
            return;
        }
        
        console.log(`🔄 Trying ${alternatives.length} remaining alternative symbols for ${symbol}`);
        
        for (const altSymbol of alternatives) {
            try {
                console.log(`🎯 Trying alternative symbol: ${altSymbol} for ${symbol}`);
                console.log(`📊 Remaining alternatives: ${alternatives.length - alternatives.indexOf(altSymbol) - 1}`);
                
                const widget = new TradingView.widget({
                    width: '100%',
                    height: 300,
                    symbol: altSymbol,
                    interval: '5',
                    timezone: 'Asia/Shanghai',
                    theme: 'dark',
                    style: '1',
                    locale: 'zh_CN',
                    toolbar_bg: '#1e1e1e',
                    enable_publishing: false,
                    hide_top_toolbar: true,
                    hide_legend: true,
                    save_image: false,
                    container_id: `tradingview-${symbol}`,
                    studies: ['Volume@tv-basicstudies'],
                    overrides: {
                        'paneProperties.background': '#1a1a1a',
                        'paneProperties.vertGridProperties.color': '#2a2a2a',
                        'paneProperties.horzGridProperties.color': '#2a2a2a',
                        'symbolWatermarkProperties.transparency': 90,
                        'scalesProperties.textColor': '#b2b5be',
                        'mainSeriesProperties.candleStyle.upColor': '#26a69a',
                        'mainSeriesProperties.candleStyle.downColor': '#ef5350',
                        'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
                        'mainSeriesProperties.candleStyle.borderDownColor': '#ef5350',
                        'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
                        'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350'
                    },
                    disabled_features: [
                        'use_localstorage_for_settings',
                        'volume_force_overlay',
                        'create_volume_indicator_by_default',
                        'header_compare',
                        'header_undo_redo',
                        'header_screenshot',
                        'header_chart_type',
                        'header_settings',
                        'header_indicators',
                        'header_symbol_search',
                        'symbol_search_hot_key',
                        'header_resolutions',
                        'timeframes_toolbar'
                    ],
                    enabled_features: ['hide_left_toolbar'],
                    loading_screen: {
                        backgroundColor: '#1a1a1a',
                        foregroundColor: '#2962ff'
                    },
                    onChartReady: () => {
                        console.log(`TradingView chart ready for ${symbol} using ${altSymbol}`);
                        this.updateStatusDot(symbol, true);
                        
                        // 监听图表错误事件
                        widget.onChartReady(() => {
                            widget.chart().onSymbolChanged().subscribe(null, (symbolInfo) => {
                                if (symbolInfo && symbolInfo.error) {
                                    console.warn(`Symbol error for ${symbol} using ${altSymbol}:`, symbolInfo.error);
                                    // 继续尝试下一个备选symbol
                                    this.tryNextAlternative(symbol, altSymbol, alternatives);
                                }
                            });
                        });
                    },
                    // 添加错误处理回调
                    onError: (error) => {
                        console.error(`TradingView error for ${symbol} using ${altSymbol}:`, error);
                        this.tryNextAlternative(symbol, altSymbol, alternatives);
                    }
                });
                
                this.charts.set(symbol, widget);
                console.log(`Successfully created chart for ${symbol} using ${altSymbol}`);
                return; // 成功创建，退出循环
                
            } catch (error) {
                console.warn(`Failed to create chart with ${altSymbol}:`, error);
                continue; // 尝试下一个
            }
        }
        
        // 所有尝试都失败，显示错误
        this.showChartError(symbol);
    }

    /**
     * 显示图表错误
     * @param {string} symbol - 币种符号
     */
    showChartError(symbol) {
        const container = document.getElementById(`tradingview-${symbol}`);
        if (container) {
            container.innerHTML = `
                <div class="chart-error">
                    <p>图表加载失败</p>
                    <button onclick="chartManager.retryChart('${symbol}')">重试</button>
                </div>
            `;
        }
    }

    /**
     * 重试创建图表
     * @param {string} symbol - 币种符号
     */
    async retryChart(symbol) {
        await this.createTradingViewChart(symbol);
    }

    /**
     * 更新图表数据（TradingView自动更新，这里主要用于形态检测数据存储）
     * @param {string} symbol - 币种符号
     * @param {Array} klineData - K线数据
     */
    updateChartData(symbol, klineData) {
        if (!klineData || klineData.length === 0) {
            return;
        }

        try {
            // 存储数据用于形态检测
            const chartData = klineData.map(kline => ({
                x: kline.openTime || kline[0], // 时间戳
                o: parseFloat(kline.open || kline[1]), // 开盘价
                h: parseFloat(kline.high || kline[2]), // 最高价
                l: parseFloat(kline.low || kline[3]), // 最低价
                c: parseFloat(kline.close || kline[4]), // 收盘价
                v: parseFloat(kline.volume || kline[5])  // 成交量
            }));

            this.chartData.set(symbol, chartData);

            // 更新价格显示
            this.updatePriceDisplay(symbol, chartData);

            console.log(`图表 ${symbol} 数据更新完成`);
        } catch (error) {
            console.error(`更新图表 ${symbol} 数据失败:`, error);
        }
    }

    /**
     * 更新价格显示
     * @param {string} symbol - 币种符号
     * @param {Array} chartData - 图表数据
     */
    updatePriceDisplay(symbol, chartData) {
        const chartItem = document.querySelector(`[data-symbol="${symbol}"]`);
        if (!chartItem || chartData.length === 0) return;

        const latestData = chartData[chartData.length - 1];
        const previousData = chartData[chartData.length - 2];
        
        const priceElement = chartItem.querySelector('.price');
        const changeElement = chartItem.querySelector('.change span');
        const volumeElement = chartItem.querySelector('.volume span');
        
        if (priceElement) {
            priceElement.textContent = latestData.c.toFixed(4);
        }
        
        if (changeElement && previousData) {
            const change = ((latestData.c - previousData.c) / previousData.c * 100);
            changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            changeElement.className = change >= 0 ? 'positive' : 'negative';
        }
        
        if (volumeElement) {
            volumeElement.textContent = this.formatVolume(latestData.v);
        }
    }

    /**
     * 格式化成交量显示
     * @param {number} volume - 成交量
     * @returns {string} 格式化后的成交量
     */
    formatVolume(volume) {
        if (volume >= 1e9) {
            return (volume / 1e9).toFixed(2) + 'B';
        } else if (volume >= 1e6) {
            return (volume / 1e6).toFixed(2) + 'M';
        } else if (volume >= 1e3) {
            return (volume / 1e3).toFixed(2) + 'K';
        }
        return volume.toFixed(2);
    }

    /**
     * 更新状态指示器
     * @param {string} symbol - 币种符号
     * @param {boolean} active - 是否活跃
     */
    updateStatusDot(symbol, active) {
        const chartItem = document.querySelector(`[data-symbol="${symbol}"]`);
        if (!chartItem) return;
        
        const statusDot = chartItem.querySelector('.status-dot');
        if (statusDot) {
            statusDot.className = `status-dot ${active ? 'active' : ''}`;
        }
    }

    /**
     * 更新实时K线数据（TradingView自动处理实时数据）
     * @param {string} symbol - 币种符号
     * @param {Object} kline - K线数据
     */
    updateRealtimeKline(symbol, kline) {
        try {
            const storedData = this.chartData.get(symbol) || [];
            
            const newStoredKline = {
                x: kline.openTime,
                o: parseFloat(kline.open),
                h: parseFloat(kline.high),
                l: parseFloat(kline.low),
                c: parseFloat(kline.close),
                v: parseFloat(kline.volume || 0)
            };

            if (kline.isFinal) {
                 // 如果是完成的K线，添加新数据点
                 storedData.push(newStoredKline);
                 
                 // 保持数据长度限制
                 if (storedData.length > (CONFIG.APP?.KLINE_LIMIT || 1000)) {
                     storedData.shift();
                 }
             } else {
                 // 如果是未完成的K线，更新最后一个数据点
                 if (storedData.length > 0) {
                     storedData[storedData.length - 1] = newStoredKline;
                 } else {
                     storedData.push(newStoredKline);
                 }
             }

            // 更新存储的数据
            this.chartData.set(symbol, storedData);
            
            // 更新价格显示
            this.updatePriceDisplay(symbol, storedData);
        } catch (error) {
            console.error(`更新实时K线 ${symbol} 失败:`, error);
        }
    }

    /**
     * 高亮显示图表（用于形态检测提醒）
     * @param {string} symbol - 币种符号
     * @param {string} patternType - 形态类型
     */
    highlightChart(symbol, patternType) {
        const chartItem = document.querySelector(`[data-symbol="${symbol}"]`);
        if (!chartItem) return;

        // 添加高亮样式
        chartItem.classList.add('highlighted', `pattern-${patternType}`);
        
        // 5秒后移除高亮
        setTimeout(() => {
            chartItem.classList.remove('highlighted', `pattern-${patternType}`);
        }, 5000);
    }

    /**
     * 显示形态指示器
     * @param {string} symbol - 币种符号
     * @param {Object} pattern - 形态信息
     */
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
        }, (CONFIG.APP?.PATTERN_DISPLAY_DURATION || 5000));
    }

    /**
     * 获取形态类型文本
     * @param {string} type - 形态类型
     * @returns {string} 形态类型文本
     */
    getPatternTypeText(type) {
        const typeTexts = {
            'ASCENDING': '上升三角形',
            'DESCENDING': '下降三角形',
            'SYMMETRICAL': '收敛三角形'
        };
        return typeTexts[type] || '未知形态';
    }

    /**
     * 获取图表数据（用于形态检测）
     * @param {string} symbol - 币种符号
     * @returns {Array} 图表数据
     */
    getChartData(symbol) {
        return this.chartData.get(symbol) || [];
    }

    /**
     * 更新图表时间周期
     * @param {string} interval - 时间周期
     */
    async updateTimeframe(interval) {
        console.log(`更新图表时间周期: ${interval}`);
        
        // TradingView时间周期映射
        const intervalMap = {
            '1m': '1',
            '5m': '5',
            '15m': '15',
            '1h': '60',
            '4h': '240',
            '1d': '1D'
        };

        const tvInterval = intervalMap[interval] || '5';
        
        // 获取当前监控的币种列表
        const symbols = Array.from(this.charts.keys());
        
        // 销毁现有图表
        this.clearCharts();
        
        // 重新创建图表容器
        if (this.chartsContainer) {
            const chartsHTML = symbols.map(symbol => 
                this.createChartContainer(symbol)
            ).join('');
            this.chartsContainer.innerHTML = chartsHTML;
        }
        
        // 重新创建图表，使用新的时间周期
        for (const symbol of symbols) {
            await this.createTradingViewChart(symbol, tvInterval);
        }
        
        console.log(`时间周期更新完成: ${interval} (${tvInterval})`);
        
        // 清空存储的数据
        this.chartData.clear();
    }

    /**
     * 切换到指定的时间周期（用于多时间周期功能）
     * @param {string} targetTimeframe - 目标时间周期
     * @param {Array} availableTimeframes - 可用的时间周期列表
     */
    async switchToTimeframe(targetTimeframe, availableTimeframes = []) {
        console.log(`切换到时间周期: ${targetTimeframe}`);
        
        // 验证目标时间周期是否在可用列表中
        if (availableTimeframes.length > 0 && !availableTimeframes.includes(targetTimeframe)) {
            console.warn(`时间周期 ${targetTimeframe} 不在可用列表中:`, availableTimeframes);
            return;
        }
        
        // 更新图表显示
        await this.updateTimeframe(targetTimeframe);
        
        // 触发自定义事件，通知其他组件时间周期已切换
        const event = new CustomEvent('timeframeSwitched', {
            detail: {
                newTimeframe: targetTimeframe,
                availableTimeframes: availableTimeframes
            }
        });
        document.dispatchEvent(event);
        
        console.log(`时间周期切换完成: ${targetTimeframe}`);
    }

    /**
     * 清空所有图表
     */
    clearCharts() {
        // 清理TradingView图表实例
        this.charts.forEach((widget, symbol) => {
            try {
                if (widget && typeof widget.remove === 'function') {
                    widget.remove();
                }
            } catch (error) {
                console.warn(`Failed to remove chart for ${symbol}:`, error);
            }
        });
        
        this.charts.clear();
        this.chartData.clear();
        
        // 清空容器
        if (this.chartsContainer) {
            this.chartsContainer.innerHTML = '';
        }
    }

    /**
     * 初始化每个图表的独立时间周期控制
     */
    initializeIndividualTimeframeControls() {
        // 为每个时间选择器添加事件监听器
        const timeSelectors = document.querySelectorAll('.time-selector');
        timeSelectors.forEach(selector => {
            selector.addEventListener('change', (event) => {
                const symbol = event.target.dataset.symbol;
                const interval = event.target.value;
                this.updateIndividualChartTimeframe(symbol, interval);
            });
        });
    }

    /**
     * 更新单个图表的时间周期
     * @param {string} symbol - 币种符号
     * @param {string} interval - 时间周期
     */
    async updateIndividualChartTimeframe(symbol, interval) {
        console.log(`更新 ${symbol} 图表时间周期: ${interval}`);
        
        // TradingView时间周期映射
        const intervalMap = {
            '1': '1',
            '3': '3',
            '5': '5',
            '15': '15',
            '30': '30',
            '60': '60',
            '240': '240',
            'D': '1D'
        };

        const tvInterval = intervalMap[interval] || '5';
        
        const container = document.getElementById(`tradingview-${symbol}`);
        if (!container) {
            console.error(`Container not found for symbol: ${symbol}`);
            return;
        }

        try {
            // 销毁现有图表
            if (this.charts.has(symbol)) {
                const widget = this.charts.get(symbol);
                if (widget && typeof widget.remove === 'function') {
                    widget.remove();
                }
                this.charts.delete(symbol);
            }

            // 重新创建图表，使用新的时间周期
            await this.createTradingViewChart(symbol, tvInterval);
            
            // 更新选择器显示
            const selector = document.querySelector(`[data-symbol="${symbol}"].time-selector`);
            if (selector) {
                selector.value = interval;
            }

            console.log(`${symbol} 图表时间周期更新完成: ${interval} -> ${tvInterval}`);
            
        } catch (error) {
            console.error(`更新 ${symbol} 图表时间周期失败:`, error);
        }
    }

    /**
     * 销毁所有图表
     */
    destroyAllCharts() {
        console.log('销毁所有TradingView图表...');
        this.clearCharts();
        console.log('所有图表已销毁');
    }

    /**
     * 获取图表数量
     * @returns {number} 图表数量
     */
    getChartsCount() {
        return this.charts.size;
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