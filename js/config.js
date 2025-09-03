// 配置文件
const CONFIG = {
    // 币安API配置
    BINANCE: {
        BASE_URL: 'https://fapi.binance.com',
        WS_URL: 'wss://fstream.binance.com/ws',
        ENDPOINTS: {
            TICKER_24HR: '/fapi/v1/ticker/24hr',
            KLINES: '/fapi/v1/klines',
            EXCHANGE_INFO: '/fapi/v1/exchangeInfo'
        }
    },
    
    // 应用配置
    APP: {
        TOP_SYMBOLS_COUNT: 10,
        DEFAULT_TIMEFRAME: '5m',
        UPDATE_INTERVAL: 5000, // 5秒更新一次
        KLINE_LIMIT: 100, // 获取K线数量
        PATTERN_MIN_POINTS: 5, // 三角形态最少需要的点数
        PATTERN_EXPIRE_TIME: 300000, // 形态过期时间（5分钟）
        MAX_WEBSOCKET_CONNECTIONS: 50, // 最大WebSocket连接数
        MEMORY_CLEANUP_INTERVAL: 30000, // 内存清理间隔（30秒）
        MEMORY_WARNING_THRESHOLD: 0.8 // 内存警告阈值（80%）
    },
    
    // 时间框架配置
    TIMEFRAMES: {
        '1m': { label: '1分钟', interval: 60000 },
        '5m': { label: '5分钟', interval: 300000 },
        '15m': { label: '15分钟', interval: 900000 },
        '1h': { label: '1小时', interval: 3600000 },
        '4h': { label: '4小时', interval: 14400000 },
        '1d': { label: '1天', interval: 86400000 }
    },
    
    // 图表配置
    CHART: {
        COLORS: {
            UP: '#26a69a',
            DOWN: '#ef5350',
            BACKGROUND: '#1e1e1e',
            GRID: 'rgba(255, 255, 255, 0.1)',
            TEXT: '#ffffff',
            PATTERN_LINE: '#ffd700'
        },
        OPTIONS: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            minute: 'HH:mm',
                            hour: 'MM-dd HH:mm',
                            day: 'MM-dd'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                },
                y: {
                    position: 'right',
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#ffd700',
                    borderWidth: 1
                }
            }
        }
    },
    
    // 形态检测配置
    PATTERN: {
        TRIANGLE: {
            MIN_TOUCHES: 4, // 最少触碰点数
            MAX_DEVIATION: 0.02, // 最大偏差（2%）
            MIN_DURATION: 3600000, // 最小持续时间（1小时）
            BREAKOUT_THRESHOLD: 0.005 // 突破阈值（0.5%）
        },
        MA_DAXIAN: {
            PERIODS: [20, 60, 120], // MA和EMA的周期
            CONVERGENCE_THRESHOLD: 0.001, // 收敛阈值（0.1%）
            MIN_CONVERGENCE_DURATION: 1800000, // 最小收敛持续时间（30分钟）
            SIGNAL_STRENGTH: 0.8 // 信号强度阈值
        }
    },
    
    // 形态类型定义
    PATTERN_TYPES: {
        ASCENDING: 'ascending_triangle',
        DESCENDING: 'descending_triangle',
        SYMMETRICAL: 'symmetrical_triangle',
        MA_DAXIAN: 'ma_daxian_convergence'
    },
    
    // 通知配置
    NOTIFICATIONS: {
        ENABLED: true,
        SOUND_ENABLED: true,
        SHOW_BROWSER_NOTIFICATION: true,
        AUTO_DISMISS_TIME: 10000 // 10秒后自动消失
    },
    
    // Symbol映射配置 - 将特殊币种映射到TradingView标准格式
    SYMBOL_MAPPINGS: {
        // 主流币种
        'BTC': 'BINANCE:BTCUSDT',
        'ETH': 'BINANCE:ETHUSDT',
        'BNB': 'BINANCE:BNBUSDT',
        'BONK': 'BINANCE:BONKUSDT',
        'PEPE': 'BINANCE:PEPEUSDT',
        'DOGE': 'BINANCE:DOGEUSDT',
        'SHIB': 'BINANCE:SHIBUSDT',
        'SOL': 'BINANCE:SOLUSDT',
        'ADA': 'BINANCE:ADAUSDT',
        'XRP': 'BINANCE:XRPUSDT',
        'DOT': 'BINANCE:DOTUSDT',
        'LINK': 'BINANCE:LINKUSDT',
        'MATIC': 'BINANCE:MATICUSDT',
        'AVAX': 'BINANCE:AVAXUSDT',
        'UNI': 'BINANCE:UNIUSDT',
        'LTC': 'BINANCE:LTCUSDT',
        'BCH': 'BINANCE:BCHUSDT',
        'ETC': 'BINANCE:ETCUSDT',
        'XLM': 'BINANCE:XLMUSDT',
        'VET': 'BINANCE:VETUSDT',
        'FIL': 'BINANCE:FILUSDT',
        'TRX': 'BINANCE:TRXUSDT',
        'ALGO': 'BINANCE:ALGOUSDT',
        'ATOM': 'BINANCE:ATOMUSDT',
        'XTZ': 'BINANCE:XTZUSDT',
        'COMP': 'BINANCE:COMPUSDT',
        'MKR': 'BINANCE:MKRUSDT',
        'AAVE': 'BINANCE:AAVEUSDT',
        'SUSHI': 'BINANCE:SUSHIUSDT',
        'YFI': 'BINANCE:YFIUSDT',
        'SNX': 'BINANCE:SNXUSDT',
        'CRV': 'BINANCE:CRVUSDT',
        '1INCH': 'BINANCE:1INCHUSDT',
        'BAT': 'BINANCE:BATUSDT',
        'ZRX': 'BINANCE:ZRXUSDT',
        'OMG': 'BINANCE:OMGUSDT',
        'KNC': 'BINANCE:KNCUSDT',
        'BNT': 'BINANCE:BNTUSDT',
        'LRC': 'BINANCE:LRCUSDT',
        'ZIL': 'BINANCE:ZILUSDT',
        'ENJ': 'BINANCE:ENJUSDT',
        'MANA': 'BINANCE:MANAUSDT',
        'SAND': 'BINANCE:SANDUSDT',
        'AXS': 'BINANCE:AXSUSDT',
        'CHZ': 'BINANCE:CHZUSDT',
        'FLOW': 'BINANCE:FLOWUSDT',
        'NEAR': 'BINANCE:NEARUSDT',
        'ICP': 'BINANCE:ICPUSDT',
        'EGLD': 'BINANCE:EGLDUSDT',
        'THETA': 'BINANCE:THETAUSDT',
        'TFUEL': 'BINANCE:TFUELUSDT',
        'AUDIO': 'BINANCE:AUDIOUSDT',
        'GALA': 'BINANCE:GALAUSDT',
        // 特殊格式币种
        'LUNC': 'BINANCE:LUNCUSDT',
        'USTC': 'BINANCE:USTCUSDT'
    }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}