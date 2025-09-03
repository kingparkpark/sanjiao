// 币安API数据获取模块
class BinanceAPI {
    constructor() {
        this.baseUrl = CONFIG.BINANCE.BASE_URL;
        this.wsUrl = CONFIG.BINANCE.WS_URL;
        this.wsConnections = new Map();
        this.reconnectAttempts = new Map();
        this.maxReconnectAttempts = 5;
        
        // 启动定期清理任务
        this.startCleanupTask();
    }
    
    // 启动定期清理任务
    startCleanupTask() {
        // 定期清理无效连接
        setInterval(() => {
            this.cleanupDeadConnections();
        }, CONFIG.APP.MEMORY_CLEANUP_INTERVAL);
        
        // 定期监控连接健康状态
        setInterval(() => {
            this.monitorConnectionHealth();
        }, 60000); // 每分钟检查一次
    }
    
    // 监控连接健康状态
    monitorConnectionHealth() {
        const status = this.getConnectionPoolStatus();
        const healthRatio = status.totalConnections > 0 ? 
            status.activeConnections / status.totalConnections : 0;
        
        if (status.totalConnections > 0) {
            console.log(`WebSocket连接健康状态: ${status.activeConnections}/${status.totalConnections} 活跃 (${Math.round(healthRatio * 100)}%)`);
            
            // 如果健康率过低，触发警告
            if (healthRatio < 0.5 && status.totalConnections > 5) {
                console.warn(`WebSocket连接健康率过低: ${Math.round(healthRatio * 100)}%，可能存在网络问题`);
            }
        }
        
        return status;
    }

    // 获取成交额前10的U本位合约币种
    async getTopSymbols() {
        try {
            const response = await fetch(`${this.baseUrl}${CONFIG.BINANCE.ENDPOINTS.TICKER_24HR}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 过滤USDT合约并按成交额(quoteVolume)排序，取前10名
            const usdtSymbols = data
                .filter(ticker => {
                    // 只选择USDT合约
                    if (!ticker.symbol.endsWith('USDT')) return false;
                    
                    // 排除一些特殊的合约（如杠杆代币等）
                    const symbol = ticker.symbol;
                    if (symbol.includes('UP') || symbol.includes('DOWN') || 
                        symbol.includes('BULL') || symbol.includes('BEAR')) {
                        return false;
                    }
                    
                    // 确保有有效的成交额数据
                    return ticker.quoteVolume && parseFloat(ticker.quoteVolume) > 0;
                })
                .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
                .slice(0, 10) // 取前10名
                .map(ticker => ({
                    symbol: ticker.symbol,
                    price: parseFloat(ticker.lastPrice),
                    change: parseFloat(ticker.priceChangePercent),
                    volume: parseFloat(ticker.quoteVolume),
                    high: parseFloat(ticker.highPrice),
                    low: parseFloat(ticker.lowPrice)
                }));
            
            console.log('获取到成交额前10的币种:', usdtSymbols.map(s => `${s.symbol} (${(s.volume/1000000).toFixed(1)}M USDT)`));
            return usdtSymbols;
        } catch (error) {
            console.error('获取热门币种失败:', error);
            throw error;
        }
    }

    // 获取K线数据
    async getKlineData(symbol, interval = '5m', limit = 100) {
        try {
            const params = new URLSearchParams({
                symbol: symbol,
                interval: interval,
                limit: limit.toString()
            });
            
            const response = await fetch(`${this.baseUrl}${CONFIG.BINANCE.ENDPOINTS.KLINES}?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 转换K线数据格式
            const klines = data.map(kline => ({
                openTime: parseInt(kline[0]),
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
                volume: parseFloat(kline[5]),
                closeTime: parseInt(kline[6]),
                quoteVolume: parseFloat(kline[7]),
                trades: parseInt(kline[8])
            }));
            
            return klines;
        } catch (error) {
            console.error(`获取${symbol}的K线数据失败:`, error);
            throw error;
        }
    }

    // 建立WebSocket连接获取实时数据
    subscribeToKlineStream(symbol, interval, callback) {
        // 验证symbol是否有效
        const baseSymbol = symbol.replace('USDT', '');
        const validSymbols = new Set(Object.keys(CONFIG.SYMBOL_MAPPINGS || {}));
        
        if (!validSymbols.has(baseSymbol)) {
            console.warn(`跳过无效的symbol: ${symbol} (基础币种 ${baseSymbol} 不在有效列表中)`);
            return;
        }
        
        const streamName = `${baseSymbol.toLowerCase()}usdt@kline_${interval}`;
        const wsUrl = `${this.wsUrl}/${streamName}`;
        
        // 检查连接是否已存在且状态正常
        if (this.wsConnections.has(streamName)) {
            const existingWs = this.wsConnections.get(streamName);
            if (existingWs.readyState === WebSocket.OPEN) {
                console.log(`${streamName} 连接已存在且正常`);
                return;
            } else {
                // 清理无效连接
                this.wsConnections.delete(streamName);
            }
        }
        
        // 检查连接池限制
        if (this.wsConnections.size >= CONFIG.APP.MAX_WEBSOCKET_CONNECTIONS) {
            console.warn(`WebSocket连接池已满 (${this.wsConnections.size}/${CONFIG.APP.MAX_WEBSOCKET_CONNECTIONS})，跳过 ${streamName}`);
            return;
        }
        
        try {
            const ws = new WebSocket(wsUrl);
            
            // 设置连接超时
            const connectionTimeout = setTimeout(() => {
                if (ws.readyState === WebSocket.CONNECTING) {
                    console.warn(`${streamName} 连接超时，关闭连接`);
                    ws.close();
                }
            }, 10000); // 10秒超时
            
            ws.onopen = () => {
                clearTimeout(connectionTimeout);
                console.log(`WebSocket连接已建立: ${streamName}`);
                this.wsConnections.set(streamName, ws); // 连接成功后存储
                this.reconnectAttempts.delete(streamName); // 重置重连计数
            };
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.k) {
                        const kline = {
                            openTime: data.k.t,
                            open: parseFloat(data.k.o),
                            high: parseFloat(data.k.h),
                            low: parseFloat(data.k.l),
                            close: parseFloat(data.k.c),
                            volume: parseFloat(data.k.v),
                            closeTime: data.k.T,
                            quoteVolume: parseFloat(data.k.q),
                            trades: data.k.n,
                            isFinal: data.k.x
                        };
                        callback(symbol, kline);
                    }
                } catch (error) {
                    console.error('解析WebSocket数据失败:', error);
                }
            };
            
            ws.onerror = (error) => {
                console.warn(`WebSocket连接失败 ${streamName}:`, error.type || 'connection_error');
                // 不立即重连，等待onclose事件处理
            };
            
            ws.onclose = (event) => {
                console.log(`WebSocket连接关闭 ${streamName}:`, event.code, event.reason);
                this.wsConnections.delete(streamName);
                
                // 只在非正常关闭时重连
                if (event.code !== 1000 && event.code !== 1001) {
                    this.handleReconnect(streamName, symbol, interval, callback);
                }
            };
            
        } catch (error) {
            console.error(`创建WebSocket连接失败 ${streamName}:`, error);
            // 连接创建失败时，延迟重试
            setTimeout(() => {
                this.handleReconnect(streamName, symbol, interval, callback);
            }, 5000);
        }
    }

    // 处理重连逻辑
    handleReconnect(streamName, symbol, interval, callback) {
        const attempts = this.reconnectAttempts.get(streamName) || 0;
        
        if (attempts < this.maxReconnectAttempts) {
            // 更智能的退避策略：基础延迟 + 随机抖动
            const baseDelay = Math.min(1000 * Math.pow(2, attempts), 30000);
            const jitter = Math.random() * 1000; // 0-1秒随机抖动
            const delay = baseDelay + jitter;
            
            console.log(`${streamName} 将在 ${Math.round(delay)}ms 后重连 (尝试 ${attempts + 1}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                // 检查连接池状态，避免在高负载时重连
                if (this.wsConnections.size < CONFIG.APP.MAX_WEBSOCKET_CONNECTIONS) {
                    this.reconnectAttempts.set(streamName, attempts + 1);
                    this.subscribeToKlineStream(symbol, interval, callback);
                } else {
                    console.warn(`${streamName} 重连被跳过：连接池已满`);
                    this.reconnectAttempts.delete(streamName);
                }
            }, delay);
        } else {
            console.warn(`${streamName} 重连失败，已达到最大重试次数 (${this.maxReconnectAttempts})`);
            this.reconnectAttempts.delete(streamName);
        }
    }

    // 连接池管理
    getConnectionPoolStatus() {
        const poolInfo = {
            totalConnections: this.wsConnections.size,
            activeConnections: 0,
            reconnectingConnections: 0,
            failedConnections: 0
        };
        
        for (const [streamName, ws] of this.wsConnections) {
            switch (ws.readyState) {
                case WebSocket.OPEN:
                    poolInfo.activeConnections++;
                    break;
                case WebSocket.CONNECTING:
                    poolInfo.reconnectingConnections++;
                    break;
                case WebSocket.CLOSED:
                case WebSocket.CLOSING:
                    poolInfo.failedConnections++;
                    break;
            }
        }
        
        return poolInfo;
    }

    // 清理失效连接
    cleanupDeadConnections() {
        const deadConnections = [];
        const staleConnections = [];
        
        for (const [streamName, ws] of this.wsConnections) {
            if (ws.readyState === WebSocket.CLOSED) {
                deadConnections.push(streamName);
            } else if (ws.readyState === WebSocket.CLOSING) {
                // 正在关闭的连接，如果超过30秒仍未关闭，强制清理
                staleConnections.push(streamName);
            }
        }
        
        // 清理已关闭的连接
        deadConnections.forEach(streamName => {
            this.wsConnections.delete(streamName);
            this.reconnectAttempts.delete(streamName);
            console.log(`清理失效连接: ${streamName}`);
        });
        
        // 清理长时间处于关闭状态的连接
        staleConnections.forEach(streamName => {
            const ws = this.wsConnections.get(streamName);
            if (ws) {
                ws.close();
                this.wsConnections.delete(streamName);
                this.reconnectAttempts.delete(streamName);
                console.log(`强制清理停滞连接: ${streamName}`);
            }
        });
        
        const totalCleaned = deadConnections.length + staleConnections.length;
        if (totalCleaned > 0) {
            console.log(`连接清理完成: 清理了 ${totalCleaned} 个无效连接`);
        }
        
        return totalCleaned;
    }

    // 取消订阅
    unsubscribeFromKlineStream(symbol, interval) {
        const baseSymbol = symbol.replace('USDT', '');
        const streamName = `${baseSymbol.toLowerCase()}usdt@kline_${interval}`;
        const ws = this.wsConnections.get(streamName);
        
        if (ws) {
            ws.close();
            this.wsConnections.delete(streamName);
            this.reconnectAttempts.delete(streamName);
            console.log(`已取消订阅: ${streamName}`);
        }
    }

    // 关闭所有WebSocket连接
    closeAllConnections() {
        for (const [streamName, ws] of this.wsConnections) {
            ws.close();
            console.log(`关闭连接: ${streamName}`);
        }
        this.wsConnections.clear();
        this.reconnectAttempts.clear();
    }

    // 获取连接状态
    getConnectionStatus() {
        const total = this.wsConnections.size;
        const connected = Array.from(this.wsConnections.values())
            .filter(ws => ws.readyState === WebSocket.OPEN).length;
        
        return {
            total,
            connected,
            status: connected === total ? 'connected' : connected > 0 ? 'partial' : 'disconnected'
        };
    }

    // 批量获取多个币种的K线数据
    async getBatchKlineData(symbols, interval = '5m', limit = 100) {
        const promises = symbols.map(symbol => 
            this.getKlineData(symbol, interval, limit)
                .catch(error => {
                    console.error(`获取${symbol}数据失败:`, error);
                    return null;
                })
        );
        
        const results = await Promise.all(promises);
        const data = {};
        
        symbols.forEach((symbol, index) => {
            if (results[index]) {
                data[symbol] = results[index];
            }
        });
        
        return data;
    }

    // 获取交易所信息
    async getExchangeInfo() {
        try {
            const response = await fetch(`${this.baseUrl}${CONFIG.BINANCE.ENDPOINTS.EXCHANGE_INFO}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('获取交易所信息失败:', error);
            throw error;
        }
    }
}

// 创建全局实例
const binanceAPI = new BinanceAPI();

// 全局变量
window.binanceAPI = binanceAPI;
// 兼容性变量（解决缓存问题）
window.binanceApi = binanceAPI;