// 币安API数据获取模块
class BinanceAPI {
    constructor() {
        this.baseUrl = CONFIG.BINANCE.BASE_URL;
        this.wsUrl = CONFIG.BINANCE.WS_URL;
        this.wsConnections = new Map();
        this.reconnectAttempts = new Map();
        this.maxReconnectAttempts = 5;
    }

    // 获取前20个热门合约币种
    async getTopSymbols() {
        try {
            const response = await fetch(`${this.baseUrl}${CONFIG.BINANCE.ENDPOINTS.TICKER_24HR}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 过滤USDT合约并按交易量排序
            const usdtSymbols = data
                .filter(ticker => ticker.symbol.endsWith('USDT'))
                .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
                .slice(0, CONFIG.APP.TOP_SYMBOLS_COUNT)
                .map(ticker => ({
                    symbol: ticker.symbol,
                    price: parseFloat(ticker.lastPrice),
                    change: parseFloat(ticker.priceChangePercent),
                    volume: parseFloat(ticker.quoteVolume),
                    high: parseFloat(ticker.highPrice),
                    low: parseFloat(ticker.lowPrice)
                }));
            
            console.log('获取到热门币种:', usdtSymbols.map(s => s.symbol));
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
        const baseSymbol = symbol.replace('USDT', '');
        const streamName = `${baseSymbol.toLowerCase()}usdt@kline_${interval}`;
        const wsUrl = `${this.wsUrl}/${streamName}`;
        
        if (this.wsConnections.has(streamName)) {
            console.log(`${streamName} 连接已存在`);
            return;
        }
        
        try {
            const ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log(`WebSocket连接已建立: ${streamName}`);
                this.reconnectAttempts.set(streamName, 0);
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
                console.error(`WebSocket错误 ${streamName}:`, error);
            };
            
            ws.onclose = (event) => {
                console.log(`WebSocket连接关闭 ${streamName}:`, event.code, event.reason);
                this.wsConnections.delete(streamName);
                
                // 自动重连
                this.handleReconnect(streamName, symbol, interval, callback);
            };
            
            this.wsConnections.set(streamName, ws);
        } catch (error) {
            console.error(`创建WebSocket连接失败 ${streamName}:`, error);
        }
    }

    // 处理重连逻辑
    handleReconnect(streamName, symbol, interval, callback) {
        const attempts = this.reconnectAttempts.get(streamName) || 0;
        
        if (attempts < this.maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // 指数退避，最大30秒
            
            console.log(`${streamName} 将在 ${delay}ms 后重连 (尝试 ${attempts + 1}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.reconnectAttempts.set(streamName, attempts + 1);
                this.subscribeToKlineStream(symbol, interval, callback);
            }, delay);
        } else {
            console.error(`${streamName} 重连失败，已达到最大重试次数`);
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
        
        for (const [streamName, ws] of this.wsConnections) {
            if (ws.readyState === WebSocket.CLOSED) {
                deadConnections.push(streamName);
            }
        }
        
        deadConnections.forEach(streamName => {
            this.wsConnections.delete(streamName);
            console.log(`清理失效连接: ${streamName}`);
        });
        
        return deadConnections.length;
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