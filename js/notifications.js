// 通知系统模块
class NotificationManager {
    constructor() {
        this.isEnabled = false;
        this.soundEnabled = true;
        this.browserNotificationEnabled = true;
        this.alertHistory = [];
        this.maxAlerts = 50;
        this.audioContext = null;
        this.initializeAudio();
    }

    // 初始化音频上下文
    initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('音频上下文初始化失败:', error);
            this.soundEnabled = false;
        }
    }

    // 请求通知权限
    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('此浏览器不支持桌面通知');
            this.browserNotificationEnabled = false;
            return false;
        }

        if (Notification.permission === 'granted') {
            this.isEnabled = true;
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            this.isEnabled = permission === 'granted';
            return this.isEnabled;
        }

        this.isEnabled = false;
        return false;
    }

    // 发送内存警告
    sendMemoryWarning(memoryInfo) {
        const alert = {
            id: Date.now(),
            symbol: 'SYSTEM',
            type: 'memory_warning',
            confidence: 1.0,
            timestamp: new Date(),
            memoryInfo: memoryInfo
        };
        
        this.addToHistory(alert);
        this.showPageAlert(alert);
        
        if (this.isEnabled && this.soundEnabled) {
            this.playNotificationSound('memory_warning');
        }
    }

    // 发送形态检测通知
    sendPatternAlert(pattern) {
        const alert = {
            id: Date.now(),
            symbol: pattern.symbol,
            type: pattern.type,
            confidence: pattern.confidence,
            timestamp: new Date(),
            description: patternDetection.getPatternDescription(pattern)
        };

        // 添加到历史记录
        this.addToHistory(alert);

        // 显示页面通知
        this.showPageAlert(alert);

        // 发送浏览器通知
        if (this.isEnabled && this.browserNotificationEnabled) {
            this.showBrowserNotification(alert);
        }

        // 播放提示音
        if (this.soundEnabled) {
            this.playNotificationSound(pattern.type);
        }

        // 显示模态框（重要形态）
        if (pattern.confidence > 0.8) {
            this.showModal(alert);
        }

        console.log('发送形态提醒:', alert);
    }

    // 显示页面提醒
    showPageAlert(alert) {
        const notificationsList = document.getElementById('notifications-list');
        if (!notificationsList) return;

        // 移除"暂无形态提醒"提示
        const noNotifications = notificationsList.querySelector('.no-notifications');
        if (noNotifications) {
            noNotifications.remove();
        }

        const alertElement = document.createElement('div');
        alertElement.className = 'alert-item';
        alertElement.id = `alert-${alert.id}`;
        
        const patternNames = {
            [CONFIG.PATTERN_TYPES.ASCENDING]: '上升三角形',
            [CONFIG.PATTERN_TYPES.DESCENDING]: '下降三角形',
            [CONFIG.PATTERN_TYPES.SYMMETRICAL]: '收敛三角形',
            [CONFIG.PATTERN_TYPES.MA_DAXIAN]: '马大仙法则'
        };
        
        const patternEmojis = {
            [CONFIG.PATTERN_TYPES.ASCENDING]: '📈',
            [CONFIG.PATTERN_TYPES.DESCENDING]: '📉',
            [CONFIG.PATTERN_TYPES.SYMMETRICAL]: '🔄',
            [CONFIG.PATTERN_TYPES.MA_DAXIAN]: '⚡'
        };

        alertElement.innerHTML = `
            <div class="alert-content">
                <span class="alert-emoji">${patternEmojis[alert.type]}</span>
                <span class="alert-text">
                    <strong>${alert.symbol}</strong> 检测到 ${patternNames[alert.type]}
                    <br><small>置信度: ${(alert.confidence * 100).toFixed(0)}%</small>
                </span>
            </div>
            <div class="alert-time">${alert.timestamp.toLocaleTimeString('zh-CN')}</div>
        `;

        // 添加点击事件
        alertElement.addEventListener('click', () => {
            this.highlightChart(alert.symbol);
        });

        // 插入到列表顶部
        notificationsList.insertBefore(alertElement, notificationsList.firstChild);

        // 限制显示数量
        const alerts = notificationsList.children;
        if (alerts.length > 10) {
            notificationsList.removeChild(alerts[alerts.length - 1]);
        }

        // 添加闪烁效果
        alertElement.style.animation = 'alertFlash 2s ease-in-out';
        
        // 自动移除动画
        setTimeout(() => {
            alertElement.style.animation = '';
        }, 2000);
    }

    // 显示浏览器通知
    showBrowserNotification(alert) {
        if (!this.isEnabled || Notification.permission !== 'granted') return;

        const patternNames = {
            [CONFIG.PATTERN_TYPES.ASCENDING]: '上升三角形',
            [CONFIG.PATTERN_TYPES.DESCENDING]: '下降三角形',
            [CONFIG.PATTERN_TYPES.SYMMETRICAL]: '收敛三角形',
            [CONFIG.PATTERN_TYPES.MA_DAXIAN]: '马大仙法则'
        };

        const notification = new Notification(`${alert.symbol} 形态提醒`, {
            body: `检测到 ${patternNames[alert.type]}，置信度: ${(alert.confidence * 100).toFixed(0)}%`,
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTIiIGZpbGw9IiMxZTNjNzIiLz4KPHBhdGggZD0iTTMyIDEyTDUyIDQ0SDE2TDMyIDEyWiIgZmlsbD0iI2ZmZDcwMCIvPgo8L3N2Zz4K',
            badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMjIgMjBIMkwxMiAyWiIgZmlsbD0iI2ZmZDcwMCIvPgo8L3N2Zz4K',
            tag: `pattern-${alert.symbol}`,
            requireInteraction: alert.confidence > 0.8,
            silent: false
        });

        // 点击通知时聚焦到对应图表
        notification.onclick = () => {
            window.focus();
            this.highlightChart(alert.symbol);
            notification.close();
        };

        // 自动关闭通知
        setTimeout(() => {
            notification.close();
        }, CONFIG.NOTIFICATIONS.AUTO_DISMISS_TIME);
    }

    // 显示模态框
    showModal(alert) {
        const modal = document.getElementById('notification-modal');
        const details = document.getElementById('notification-details');
        
        if (!modal || !details) return;

        const patternNames = {
            [CONFIG.PATTERN_TYPES.ASCENDING]: '上升三角形',
            [CONFIG.PATTERN_TYPES.DESCENDING]: '下降三角形',
            [CONFIG.PATTERN_TYPES.SYMMETRICAL]: '收敛三角形'
        };

        details.innerHTML = `
            <div class="modal-alert-info">
                <h4>${alert.symbol}</h4>
                <p><strong>形态类型:</strong> ${patternNames[alert.type]}</p>
                <p><strong>置信度:</strong> ${(alert.confidence * 100).toFixed(1)}%</p>
                <p><strong>检测时间:</strong> ${alert.timestamp.toLocaleString('zh-CN')}</p>
                <p><strong>形态描述:</strong> ${alert.description}</p>
                <div class="modal-actions">
                    <button onclick="notificationManager.highlightChart('${alert.symbol}'); notificationManager.closeModal();">查看图表</button>
                    <button onclick="notificationManager.closeModal()">关闭</button>
                </div>
            </div>
        `;

        modal.style.display = 'block';

        // 自动关闭
        setTimeout(() => {
            this.closeModal();
        }, 15000);
    }

    // 关闭模态框
    closeModal() {
        const modal = document.getElementById('notification-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 播放提示音
    playNotificationSound(patternType) {
        if (!this.audioContext || !this.soundEnabled) return;

        try {
            // 内存警告使用特殊音效
            if (patternType === 'memory_warning') {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
                oscillator.type = 'square';
                
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1);
                gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1.0);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 1.0);
                return;
            }

            // 创建音频振荡器
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            // 连接音频节点
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // 根据形态类型设置不同的音调
            const frequencies = {
                [CONFIG.PATTERN_TYPES.ASCENDING]: [440, 554, 659], // A-C#-E (上升和弦)
                [CONFIG.PATTERN_TYPES.DESCENDING]: [659, 554, 440], // E-C#-A (下降和弦)
                [CONFIG.PATTERN_TYPES.SYMMETRICAL]: [523, 659, 523] // C-E-C (对称音调)
            };

            const freqSequence = frequencies[patternType] || [440, 554, 659];
            
            // 播放音序
            freqSequence.forEach((freq, index) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.frequency.setValueAtTime(freq, this.audioContext.currentTime + index * 0.2);
                osc.type = 'sine';
                
                gain.gain.setValueAtTime(0, this.audioContext.currentTime + index * 0.2);
                gain.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + index * 0.2 + 0.05);
                gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + index * 0.2 + 0.15);
                
                osc.start(this.audioContext.currentTime + index * 0.2);
                osc.stop(this.audioContext.currentTime + index * 0.2 + 0.15);
            });
        } catch (error) {
            console.warn('播放提示音失败:', error);
        }
    }

    // 高亮显示图表
    highlightChart(symbol) {
        const container = document.getElementById(`chart-container-${symbol}`);
        if (!container) return;

        // 滚动到图表位置
        container.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });

        // 添加高亮效果
        container.style.boxShadow = '0 0 20px #ffd700';
        container.style.transform = 'scale(1.02)';
        
        // 移除高亮效果
        setTimeout(() => {
            container.style.boxShadow = '';
            container.style.transform = '';
        }, 3000);
    }

    // 添加到历史记录
    addToHistory(alert) {
        this.alertHistory.unshift(alert);
        
        // 限制历史记录数量
        if (this.alertHistory.length > this.maxAlerts) {
            this.alertHistory = this.alertHistory.slice(0, this.maxAlerts);
        }
    }

    // 获取历史记录
    getHistory() {
        return this.alertHistory;
    }

    // 清除历史记录
    clearHistory() {
        this.alertHistory = [];
        const notificationsList = document.getElementById('notifications-list');
        if (notificationsList) {
            notificationsList.innerHTML = '<div class="no-notifications">暂无形态提醒</div>';
        }
    }
    
    // 清除旧的历史记录，保留指定数量
    clearOldHistory(keepCount = 50) {
        if (this.alertHistory.length > keepCount) {
            const removedCount = this.alertHistory.length - keepCount;
            this.alertHistory = this.alertHistory.slice(-keepCount);
            
            // 更新页面显示
            const notificationsList = document.getElementById('notifications-list');
            if (notificationsList) {
                const alerts = notificationsList.children;
                for (let i = alerts.length - 1; i >= keepCount; i--) {
                    notificationsList.removeChild(alerts[i]);
                }
            }
            
            console.log(`清理了${removedCount}条旧通知记录`);
            return removedCount;
        }
        return 0;
    }

    // 切换通知状态
    toggleNotifications() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
        return this.isEnabled;
    }

    // 启用通知
    async enable() {
        const granted = await this.requestPermission();
        if (granted) {
            this.isEnabled = true;
            this.updateToggleButton();
        }
        return granted;
    }

    // 禁用通知
    disable() {
        this.isEnabled = false;
        this.updateToggleButton();
    }

    // 更新切换按钮状态
    updateToggleButton() {
        const button = document.getElementById('notification-toggle');
        if (!button) return;

        if (this.isEnabled) {
            button.textContent = '禁用通知';
            button.classList.remove('disabled');
        } else {
            button.textContent = '启用通知';
            button.classList.add('disabled');
        }
    }

    // 切换声音
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        return this.soundEnabled;
    }

    // 获取通知状态
    getStatus() {
        return {
            enabled: this.isEnabled,
            soundEnabled: this.soundEnabled,
            browserNotificationEnabled: this.browserNotificationEnabled,
            permission: Notification.permission,
            alertCount: this.alertHistory.length
        };
    }
}

// 创建全局实例
const notificationManager = new NotificationManager();
window.notificationManager = notificationManager;

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes alertFlash {
        0%, 100% { background-color: rgba(255, 255, 255, 0.1); }
        50% { background-color: rgba(255, 215, 0, 0.3); }
    }
    
    .modal-alert-info {
        text-align: left;
    }
    
    .modal-alert-info h4 {
        color: #ffd700;
        margin-bottom: 1rem;
        font-size: 1.5rem;
    }
    
    .modal-alert-info p {
        margin-bottom: 0.5rem;
        line-height: 1.5;
    }
    
    .modal-actions {
        margin-top: 1.5rem;
        display: flex;
        gap: 1rem;
        justify-content: center;
    }
    
    .modal-actions button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 5px;
        background: #4CAF50;
        color: white;
        cursor: pointer;
        transition: background 0.3s;
    }
    
    .modal-actions button:hover {
        background: #45a049;
    }
    
    .modal-actions button:last-child {
        background: #f44336;
    }
    
    .modal-actions button:last-child:hover {
        background: #da190b;
    }
    
    .alert-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .alert-emoji {
        font-size: 1.2rem;
    }
    
    .alert-text strong {
        color: #ffd700;
    }
`;
document.head.appendChild(style);