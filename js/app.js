// 主应用程序
class CryptoTriangleMonitor {
    constructor() {
        this.isRunning = false;
        this.currentTimeframe = CONFIG.APP.DEFAULT_TIMEFRAME;
        this.topSymbols = [];
        this.updateInterval = null;
        this.patternCheckInterval = null;
        this.connectionStatus = 'disconnected';
        
        this.init();
    }

    // 初始化应用
    async init() {
        console.log('初始化币安三角形态监控系统...');
        
        try {
            // 绑定事件监听器
            this.bindEventListeners();
            
            // 初始化通知系统
            await this.initializeNotifications();
            
            // 启动应用
            await this.start();
            
            console.log('应用初始化完成');
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showError('应用初始化失败，请刷新页面重试');
        }
    }

    // 绑定事件监听器
    bindEventListeners() {
        // 时间周期选择
        const timeframeSelect = document.getElementById('timeframe');
        if (timeframeSelect) {
            timeframeSelect.addEventListener('change', (e) => {
                this.changeTimeframe(e.target.value);
            });
        }

        // 通知切换按钮
        const notificationToggle = document.getElementById('notification-toggle');
        if (notificationToggle) {
            notificationToggle.addEventListener('click', () => {
                this.toggleNotifications();
            });
        }

        // 清空通知按钮
        const clearNotifications = document.getElementById('clear-notifications');
        if (clearNotifications) {
            clearNotifications.addEventListener('click', () => {
                notificationManager.clearHistory();
                this.updateNotificationCount();
            });
        }

        // 形态过滤器
        const filterCheckboxes = [
            'filter-ascending',
            'filter-descending', 
            'filter-symmetrical'
        ];
        
        filterCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.updatePatternFilters();
                });
            }
        });

        // 模态框关闭
        const modal = document.getElementById('notification-modal');
        const closeBtn = modal?.querySelector('.close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notificationManager.closeModal();
            });
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    notificationManager.closeModal();
                }
            });
        }

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.toggleNotifications();
            }
        });

        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handlePageHidden();
            } else {
                this.handlePageVisible();
            }
        });

        // 窗口关闭前清理
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    // 初始化通知系统
    async initializeNotifications() {
        try {
            await notificationManager.requestPermission();
            notificationManager.updateToggleButton();
            this.updateNotificationCount();
        } catch (error) {
            console.warn('通知系统初始化失败:', error);
        }
    }

    // 获取测试用的热门币种数据
    getTestSymbols() {
        return [
            { symbol: 'BTCUSDT', price: 43250.50, change: 2.45, volume: 1234567890, high: 44000, low: 42800 },
            { symbol: 'ETHUSDT', price: 2650.75, change: -1.23, volume: 987654321, high: 2700, low: 2600 },
            { symbol: 'BNBUSDT', price: 315.20, change: 0.85, volume: 456789123, high: 320, low: 310 },
            { symbol: 'ADAUSDT', price: 0.4521, change: 3.21, volume: 234567890, high: 0.46, low: 0.44 },
            { symbol: 'SOLUSDT', price: 98.45, change: -2.15, volume: 345678901, high: 102, low: 96 },
            { symbol: 'XRPUSDT', price: 0.6234, change: 1.87, volume: 567890123, high: 0.64, low: 0.61 },
            { symbol: 'DOTUSDT', price: 7.123, change: -0.95, volume: 123456789, high: 7.3, low: 7.0 },
            { symbol: 'AVAXUSDT', price: 36.78, change: 4.12, volume: 678901234, high: 38, low: 35 },
            { symbol: 'MATICUSDT', price: 0.8765, change: 2.34, volume: 789012345, high: 0.89, low: 0.85 },
            { symbol: 'LINKUSDT', price: 14.567, change: -1.45, volume: 890123456, high: 15, low: 14.2 },
            { symbol: 'UNIUSDT', price: 6.789, change: 0.67, volume: 901234567, high: 6.9, low: 6.6 },
            { symbol: 'LTCUSDT', price: 72.34, change: 1.23, volume: 12345678, high: 74, low: 71 },
            { symbol: 'ATOMUSDT', price: 9.876, change: -2.34, volume: 123450987, high: 10.1, low: 9.7 },
            { symbol: 'FILUSDT', price: 5.432, change: 3.45, volume: 234561098, high: 5.6, low: 5.2 },
            { symbol: 'TRXUSDT', price: 0.1023, change: 0.98, volume: 345672109, high: 0.105, low: 0.100 },
            { symbol: 'ETCUSDT', price: 26.78, change: -1.67, volume: 456783210, high: 27.5, low: 26.2 },
            { symbol: 'XLMUSDT', price: 0.1234, change: 2.11, volume: 567894321, high: 0.126, low: 0.120 },
            { symbol: 'VETUSDT', price: 0.0234, change: 1.45, volume: 678905432, high: 0.024, low: 0.023 },
            { symbol: 'ICPUSDT', price: 12.34, change: -0.87, volume: 789016543, high: 12.8, low: 12.0 },
            { symbol: 'THETAUSDT', price: 1.567, change: 2.78, volume: 890127654, high: 1.6, low: 1.5 }
        ];
    }

    // 启动应用
    async start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.updateConnectionStatus('connecting');
        
        try {
            // 检查TradingView库是否加载
            console.log(`🔍 [DEBUG] Checking TradingView library status...`);
            console.log(`🔍 [DEBUG] TradingView defined:`, typeof TradingView !== 'undefined');
            console.log(`🔍 [DEBUG] TradingView.widget defined:`, typeof TradingView?.widget !== 'undefined');
            
            if (typeof TradingView === 'undefined') {
                console.log('⏳ [WARNING] TradingView library not loaded yet, waiting...');
                setTimeout(() => {
                    this.start();
                }, 1000);
                return;
            }
            
            console.log(`✅ [SUCCESS] TradingView library is loaded and ready!`);
            
            // 检查是否为测试模式（当API请求失败时）
            let useTestMode = false;
            
            try {
                // 尝试获取热门币种
                console.log('获取热门币种...');
                this.topSymbols = await binanceAPI.getTopSymbols();
                
                if (this.topSymbols.length === 0) {
                    throw new Error('未能获取到热门币种数据');
                }
            } catch (error) {
                console.warn('API请求失败，切换到测试模式:', error.message);
                useTestMode = true;
                this.topSymbols = this.getTestSymbols();
            }
            
            console.log(`成功获取${this.topSymbols.length}个热门币种${useTestMode ? '（测试模式）' : ''}`);
            console.log('测试模式：将测试TradingView图表的错误处理机制');
            
            // 初始化图表
            chartManager.initializeCharts(this.topSymbols);
            
            if (!useTestMode) {
                // 加载初始K线数据
                await this.loadInitialData();
                
                // 启动实时数据订阅
                this.startRealtimeUpdates();
                
                // 启动形态检测
                this.startPatternDetection();
            } else {
                console.log('测试模式：跳过实时数据和形态检测');
                 console.log('测试模式启动完成 - 观察控制台查看symbol错误处理日志');
                 
                 // 测试模式 - 添加调试信息
                 console.log('应用程序正在测试模式下运行，将测试TradingView图表错误处理机制');
                 console.log('当前币种列表:', this.topSymbols ? this.topSymbols.map(s => s.symbol) : '未加载');
 
                 // 监听TradingView加载状态
                  if (typeof TradingView !== 'undefined') {
                      console.log('TradingView库已加载');
                  } else {
                      console.log('等待TradingView库加载...');
                      window.addEventListener('load', () => {
                          setTimeout(() => {
                              if (typeof TradingView !== 'undefined') {
                                  console.log('TradingView库加载完成');
                              } else {
                                  console.error('TradingView库加载失败');
                              }
                          }, 1000);
                      });
                  }
                  
                  // 强制重新创建图表来测试修复
                  setTimeout(() => {
                      console.log('🔄 强制重新创建图表以测试修复效果');
                      if (window.chartManager) {
                          // 清除所有现有图表
                          window.chartManager.charts.forEach((chart, symbol) => {
                              try {
                                  chart.remove();
                              } catch (e) {
                                  console.warn(`清除图表失败: ${symbol}`, e);
                              }
                          });
                          window.chartManager.charts.clear();
                          
                          // 重新创建图表
                          this.topSymbols.forEach(symbolData => {
                              window.chartManager.createTradingViewChart(symbolData.symbol);
                          });
                      }
                  }, 3000);
            }
            
            this.updateConnectionStatus('connected');
            this.updateLastUpdateTime();
            
            console.log('应用启动成功');
        } catch (error) {
            console.error('应用启动失败:', error);
            this.updateConnectionStatus('error');
            this.showError(`启动失败: ${error.message}`);
            this.isRunning = false;
        }
    }

    // 加载初始K线数据
    async loadInitialData() {
        console.log('加载初始K线数据...');
        
        const symbols = this.topSymbols.map(s => s.symbol);
        const batchData = await binanceAPI.getBatchKlineData(
            symbols, 
            this.currentTimeframe, 
            CONFIG.APP.KLINE_LIMIT
        );
        
        // 更新图表数据
        for (const [symbol, klineData] of Object.entries(batchData)) {
            if (klineData && klineData.length > 0) {
                chartManager.updateChartData(symbol, klineData);
            }
        }
        
        console.log('初始数据加载完成');
    }

    // 启动实时数据更新
    startRealtimeUpdates() {
        console.log('启动实时数据订阅...');
        
        // 为每个币种订阅WebSocket数据流
        this.topSymbols.forEach(symbolData => {
            binanceAPI.subscribeToKlineStream(
                symbolData.symbol,
                this.currentTimeframe,
                (symbol, kline) => {
                    this.handleRealtimeKline(symbol, kline);
                }
            );
        });
        
        // 定期检查连接状态
        this.updateInterval = setInterval(() => {
            this.checkConnectionStatus();
            this.updateLastUpdateTime();
        }, 5000);
        
        // 定期清理失效连接和内存
        this.cleanupInterval = setInterval(() => {
            const cleaned = binanceApi.cleanupDeadConnections();
            if (cleaned > 0) {
                console.log(`清理了${cleaned}个失效连接`);
            }
            
            // 定期内存监控
            this.monitorMemoryUsage();
        }, 30000); // 每30秒清理一次
        
        // 内存监控定时器
        this.memoryMonitorInterval = setInterval(() => {
            this.updateMemoryStatus();
        }, 5000); // 每5秒更新内存状态
    }

    // 处理实时K线数据
    handleRealtimeKline(symbol, kline) {
        // 更新图表
        chartManager.updateRealtimeKline(symbol, kline);
        
        // 如果是完成的K线，触发形态检测
        if (kline.isFinal) {
            this.checkPatternForSymbol(symbol);
        }
    }

    // 启动形态检测
    startPatternDetection() {
        console.log('启动形态检测...');
        
        // 立即检测一次
        this.runPatternDetection();
        
        // 定期检测形态
        this.patternCheckInterval = setInterval(() => {
            this.runPatternDetection();
        }, 30000); // 每30秒检测一次
    }

    // 运行形态检测
    runPatternDetection() {
        // 批量处理，避免阻塞UI
        const batchSize = 5;
        let index = 0;
        
        const processBatch = () => {
            const endIndex = Math.min(index + batchSize, this.topSymbols.length);
            
            for (let i = index; i < endIndex; i++) {
                this.checkPatternForSymbol(this.topSymbols[i].symbol);
            }
            
            index = endIndex;
            
            if (index < this.topSymbols.length) {
                // 使用requestAnimationFrame确保不阻塞UI
                requestAnimationFrame(processBatch);
            } else {
                // 所有检测完成后清理过期形态
                patternDetection.clearExpiredPatterns();
            }
        };
        
        processBatch();
    }

    // 检测单个币种的形态
    checkPatternForSymbol(symbol) {
        const klineData = chartManager.getChartData(symbol);
        
        if (!klineData || klineData.length < CONFIG.APP.PATTERN_MIN_POINTS * 2) {
            return;
        }
        
        try {
            const pattern = patternDetection.detectTrianglePatterns(klineData, symbol);
            
            if (pattern && this.isPatternFilterEnabled(pattern.type)) {
                console.log(`检测到形态:`, pattern);
                
                // 显示形态指示器
                chartManager.showPatternIndicator(symbol, pattern);
                
                // 发送通知
            notificationManager.sendPatternAlert(pattern);
            
            // 更新通知计数
            this.updateNotificationCount();
            }
        } catch (error) {
            console.error(`${symbol} 形态检测失败:`, error);
        }
    }

    // 检查形态过滤器是否启用
    isPatternFilterEnabled(patternType) {
        const filterMap = {
            [CONFIG.PATTERN_TYPES.ASCENDING]: 'filter-ascending',
            [CONFIG.PATTERN_TYPES.DESCENDING]: 'filter-descending',
            [CONFIG.PATTERN_TYPES.SYMMETRICAL]: 'filter-symmetrical',
            [CONFIG.PATTERN_TYPES.MA_DAXIAN]: 'filter-ma-daxian'
        };
        
        const checkbox = document.getElementById(filterMap[patternType]);
        return checkbox ? checkbox.checked : true;
    }

    // 更新形态过滤器
    updatePatternFilters() {
        console.log('形态过滤器已更新');
        // 重新运行形态检测
        this.runPatternDetection();
    }

    // 切换时间周期
    async changeTimeframe(newTimeframe) {
        if (newTimeframe === this.currentTimeframe) return;
        
        console.log(`切换时间周期: ${this.currentTimeframe} -> ${newTimeframe}`);
        
        this.currentTimeframe = newTimeframe;
        
        // 停止当前订阅
        this.stopRealtimeUpdates();
        
        // 更新图表显示
        chartManager.updateTimeframe(newTimeframe);
        
        // 重新加载数据
        await this.loadInitialData();
        
        // 重新启动实时更新
        this.startRealtimeUpdates();
        
        console.log('时间周期切换完成');
    }

    // 停止实时更新
    stopRealtimeUpdates() {
        // 关闭WebSocket连接
        binanceAPI.closeAllConnections();
        
        // 清除定时器
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
            this.memoryMonitorInterval = null;
        }
    }

    // 监控内存使用情况
    monitorMemoryUsage() {
        if (!performance.memory) return;
        
        const memoryInfo = {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
        };
        
        const usagePercent = (memoryInfo.used / memoryInfo.limit) * 100;
        
        // 记录内存使用历史
        if (!this.memoryHistory) {
            this.memoryHistory = [];
        }
        
        this.memoryHistory.push({
            timestamp: Date.now(),
            usage: usagePercent,
            used: memoryInfo.used
        });
        
        // 只保留最近10分钟的数据
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        this.memoryHistory = this.memoryHistory.filter(entry => entry.timestamp > tenMinutesAgo);
        
        // 检测内存泄漏
        this.detectMemoryLeak();
    }

    // 检测内存泄漏
    detectMemoryLeak() {
        if (!this.memoryHistory || this.memoryHistory.length < 10) return;
        
        // 计算最近5分钟的内存增长趋势
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const recentHistory = this.memoryHistory.filter(entry => entry.timestamp > fiveMinutesAgo);
        
        if (recentHistory.length < 5) return;
        
        const firstUsage = recentHistory[0].usage;
        const lastUsage = recentHistory[recentHistory.length - 1].usage;
        const growthRate = lastUsage - firstUsage;
        
        // 如果5分钟内内存增长超过10%，可能存在内存泄漏
        if (growthRate > 10) {
            console.warn(`检测到可能的内存泄漏，5分钟内增长${growthRate.toFixed(1)}%`);
            this.performMemoryCleanup();
            
            // 发送内存警告通知
            notificationManager.sendMemoryWarning({
                growthRate: growthRate.toFixed(1),
                currentUsage: lastUsage.toFixed(1)
            });
        }
    }

    // 切换通知
    async toggleNotifications() {
        const enabled = await notificationManager.toggleNotifications();
        console.log(`通知${enabled ? '已启用' : '已禁用'}`);
    }

    // 更新通知计数
    updateNotificationCount() {
        const activePatternsElement = document.getElementById('active-patterns');
        if (activePatternsElement) {
            const count = notificationManager.getHistory().length;
            activePatternsElement.textContent = `活跃形态: ${count}`;
        }
    }

    // 检查连接状态
    checkConnectionStatus() {
        const status = binanceAPI.getConnectionStatus();
        
        if (status.connected === status.total && status.total > 0) {
            this.updateConnectionStatus('connected');
        } else if (status.connected > 0) {
            this.updateConnectionStatus('partial');
        } else {
            this.updateConnectionStatus('disconnected');
        }
    }

    // 更新连接状态显示
    updateConnectionStatus(status) {
        this.connectionStatus = status;
        const statusElement = document.getElementById('connection-status');
        
        if (!statusElement) return;
        
        const statusTexts = {
            'connecting': '连接中...',
            'connected': '已连接',
            'partial': '部分连接',
            'disconnected': '连接断开',
            'error': '连接错误'
        };
        
        const statusColors = {
            'connecting': '#ffc107',
            'connected': '#4CAF50',
            'partial': '#ff9800',
            'disconnected': '#f44336',
            'error': '#f44336'
        };
        
        statusElement.textContent = `连接状态: ${statusTexts[status]}`;
        statusElement.style.backgroundColor = statusColors[status];
        
        // 显示内存使用情况
        this.updateMemoryStatus();
    }

    // 更新内存状态显示
    updateMemoryStatus() {
        if (performance.memory) {
            const memoryInfo = {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
            
            const memoryElement = document.getElementById('memory-status');
            if (memoryElement) {
                memoryElement.textContent = `内存: ${memoryInfo.used}MB/${memoryInfo.total}MB`;
                
                // 内存使用率超过80%时警告
                const usagePercent = (memoryInfo.used / memoryInfo.limit) * 100;
                if (usagePercent > 80) {
                    memoryElement.style.color = '#f44336';
                    console.warn(`内存使用率过高: ${usagePercent.toFixed(1)}%`);
                    this.performMemoryCleanup();
                } else {
                    memoryElement.style.color = '#4CAF50';
                }
            }
        }
    }

    // 执行内存清理
    performMemoryCleanup() {
        console.log('执行内存清理...');
        
        // 清理过期的形态数据
        patternDetection.clearExpiredPatterns();
        
        // 清理图表缓存
        chartManager.clearCache();
        
        // 清理通知历史
        const historyCount = notificationManager.getHistory().length;
        if (historyCount > 100) {
            notificationManager.clearOldHistory(50); // 只保留最新50条
        }
        
        // 强制垃圾回收（如果可用）
        if (window.gc) {
            window.gc();
        }
        
        console.log('内存清理完成');
    }

    // 更新最后更新时间
    updateLastUpdateTime() {
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = `最后更新: ${new Date().toLocaleTimeString('zh-CN')}`;
        }
    }

    // 显示错误信息
    showError(message) {
        console.error(message);
        
        // 可以在这里添加错误提示UI
        const alertsList = document.getElementById('alerts-list');
        if (alertsList) {
            const errorAlert = document.createElement('div');
            errorAlert.className = 'alert-item error';
            errorAlert.innerHTML = `
                <div class="alert-content">
                    <span class="alert-emoji">⚠️</span>
                    <span class="alert-text">
                        <strong>错误:</strong> ${message}
                    </span>
                </div>
                <div class="alert-time">${new Date().toLocaleTimeString('zh-CN')}</div>
            `;
            alertsList.insertBefore(errorAlert, alertsList.firstChild);
        }
    }

    // 页面隐藏时的处理
    handlePageHidden() {
        console.log('页面已隐藏，减少更新频率');
        // 可以在这里减少更新频率以节省资源
    }

    // 页面可见时的处理
    handlePageVisible() {
        console.log('页面已显示，恢复正常更新');
        // 恢复正常更新频率
        this.updateLastUpdateTime();
    }

    // 停止应用
    stop() {
        if (!this.isRunning) return;
        
        console.log('停止应用...');
        
        this.isRunning = false;
        
        // 停止实时更新
        this.stopRealtimeUpdates();
        
        // 停止形态检测
        if (this.patternCheckInterval) {
            clearInterval(this.patternCheckInterval);
            this.patternCheckInterval = null;
        }
        
        this.updateConnectionStatus('disconnected');
        
        console.log('应用已停止');
    }

    // 重启应用
    async restart() {
        console.log('重启应用...');
        this.stop();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.start();
    }

    // 清理资源
    cleanup() {
        console.log('清理应用资源...');
        
        this.stop();
        chartManager.destroyAllCharts();
        binanceAPI.closeAllConnections();
    }

    // 获取应用状态
    getStatus() {
        const memoryInfo = performance.memory ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
            usagePercent: Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100)
        } : null;
        
        return {
            isRunning: this.isRunning,
            connectionStatus: this.connectionStatus,
            currentTimeframe: this.currentTimeframe,
            symbolCount: this.topSymbols.length,
            notifications: notificationManager.getStatus(),
            patterns: patternDetection.getAllDetectedPatterns().length,
            memory: memoryInfo,
            memoryHistory: this.memoryHistory ? this.memoryHistory.slice(-20) : [] // 最近20条记录
        };
    }
}

// 全局变量
let app;

// DOM加载完成后启动应用
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM加载完成，启动应用...');
    
    try {
        app = new CryptoTriangleMonitor();
        
        // 将app实例暴露到全局作用域以便调试
        window.cryptoApp = app;
        
        console.log('应用实例创建成功');
    } catch (error) {
        console.error('应用启动失败:', error);
        
        // 显示启动失败信息
        document.body.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                flex-direction: column;
                text-align: center;
                color: white;
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            ">
                <h1>应用启动失败</h1>
                <p>错误信息: ${error.message}</p>
                <button onclick="location.reload()" style="
                    padding: 1rem 2rem;
                    margin-top: 1rem;
                    border: none;
                    border-radius: 5px;
                    background: #4CAF50;
                    color: white;
                    cursor: pointer;
                    font-size: 1rem;
                ">重新加载</button>
            </div>
        `;
    }
});

// 全局变量已在DOM加载完成后创建