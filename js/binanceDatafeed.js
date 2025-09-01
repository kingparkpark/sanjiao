/**
 * 简化的Binance数据源，用于TradingView
 * 直接获取Binance的K线数据
 */

class BinanceDatafeed {
    constructor() {
        this.baseUrl = 'https://fapi.binance.com/fapi/v1';
    }

    /**
     * 获取配置信息
     */
    onReady(callback) {
        setTimeout(() => callback({
            exchanges: [{ value: 'Binance', name: 'Binance', desc: 'Binance Exchange' }],
            symbols_types: [{ name: 'crypto', value: 'crypto' }],
            supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', 'D', '1D', 'W', '1W', 'M'],
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true
        }));
    }

    /**
     * 解析交易对信息
     */
    resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
        const config = {
            name: symbolName,
            ticker: symbolName,
            description: symbolName.replace('USDT', '/USDT'),
            type: 'crypto',
            session: '24x7',
            timezone: 'UTC',
            exchange: 'Binance',
            minmov: 1,
            pricescale: 100,
            has_intraday: true,
            has_daily: true,
            has_weekly_and_monthly: true,
            supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', 'D', '1D', 'W', '1W', 'M'],
            volume_precision: 6,
            data_status: 'streaming'
        };

        onSymbolResolvedCallback(config);
    }

    /**
     * 获取K线数据
     */
    getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
        const intervalMap = {
            '1': '1m', '3': '3m', '5': '5m', '15': '15m', '30': '30m',
            '60': '1h', '120': '2h', '240': '4h', 'D': '1d', '1D': '1d', 'W': '1w', 'M': '1M'
        };

        const binanceInterval = intervalMap[resolution] || '5m';
        const limit = 200;

        const url = `${this.baseUrl}/continuousKlines?pair=${symbolInfo.ticker}&interval=${binanceInterval}&limit=${limit}&contractType=PERPETUAL`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (!Array.isArray(data)) {
                    onErrorCallback('数据格式错误');
                    return;
                }

                const bars = data.map(kline => ({
                    time: kline[0],
                    open: parseFloat(kline[1]),
                    high: parseFloat(kline[2]),
                    low: parseFloat(kline[3]),
                    close: parseFloat(kline[4]),
                    volume: parseFloat(kline[5])
                }));

                bars.sort((a, b) => a.time - b.time);
                onHistoryCallback(bars, { noData: bars.length === 0 });
            })
            .catch(error => {
                console.error('获取Binance数据失败:', error);
                onErrorCallback('网络错误');
            });
    }

    /**
     * 订阅实时数据（简化版本）
     */
    subscribeBars(symbolInfo, resolution, onRealtimeCallback, listenerGuid, onResetCacheNeededCallback) {
        // 暂时不实现实时订阅，使用历史数据
        return () => {};
    }

    unsubscribeBars(listenerGuid) {
        // 清理订阅
    }
}

// 全局变量，供TradingView使用
window.BinanceDatafeed = BinanceDatafeed;