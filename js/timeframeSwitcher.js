/**
 * 时间周期切换器管理类
 * 负责管理图表时间周期的切换UI和逻辑
 */
class TimeframeSwitcher {
    constructor() {
        this.switcherElement = document.getElementById('timeframe-switcher');
        this.currentTimeframeElement = document.getElementById('current-timeframe');
        this.buttonsContainer = document.getElementById('switcher-buttons');
        
        this.enabledTimeframes = [];
        this.currentTimeframe = '5m';
        
        this.timeframeLabels = {
            '1m': '1分钟',
            '5m': '5分钟',
            '15m': '15分钟',
            '1h': '1小时',
            '4h': '4小时',
            '1d': '1天'
        };
        
        this.initializeEventListeners();
    }
    
    /**
     * 初始化事件监听器
     */
    initializeEventListeners() {
        // 监听时间周期切换器更新事件
        document.addEventListener('timeframeSwitcherUpdate', (event) => {
            this.handleSwitcherUpdate(event.detail);
        });
    }
    
    /**
     * 处理切换器更新事件
     * @param {Object} detail - 事件详情
     */
    handleSwitcherUpdate(detail) {
        const { enabledTimeframes, currentTimeframe } = detail;
        
        this.enabledTimeframes = enabledTimeframes || [];
        this.currentTimeframe = currentTimeframe || '5m';
        
        this.updateSwitcherDisplay();
    }
    
    /**
     * 更新切换器显示
     */
    updateSwitcherDisplay() {
        // 如果没有启用的时间周期或只有一个，隐藏切换器
        if (this.enabledTimeframes.length <= 1) {
            this.switcherElement.style.display = 'none';
            return;
        }
        
        // 显示切换器
        this.switcherElement.style.display = 'block';
        
        // 更新当前时间周期显示
        this.updateCurrentTimeframeDisplay();
        
        // 更新切换按钮
        this.updateSwitcherButtons();
    }
    
    /**
     * 更新当前时间周期显示
     */
    updateCurrentTimeframeDisplay() {
        const label = this.timeframeLabels[this.currentTimeframe] || this.currentTimeframe;
        this.currentTimeframeElement.textContent = label;
    }
    
    /**
     * 更新切换按钮
     */
    updateSwitcherButtons() {
        // 清空现有按钮
        this.buttonsContainer.innerHTML = '';
        
        // 为每个启用的时间周期创建按钮
        this.enabledTimeframes.forEach(timeframe => {
            const button = this.createTimeframeButton(timeframe);
            this.buttonsContainer.appendChild(button);
        });
    }
    
    /**
     * 创建时间周期按钮
     * @param {string} timeframe - 时间周期
     * @returns {HTMLElement} 按钮元素
     */
    createTimeframeButton(timeframe) {
        const button = document.createElement('button');
        button.className = 'timeframe-btn';
        button.textContent = this.timeframeLabels[timeframe] || timeframe;
        button.dataset.timeframe = timeframe;
        
        // 设置当前时间周期的按钮为激活状态
        if (timeframe === this.currentTimeframe) {
            button.classList.add('active');
        }
        
        // 添加点击事件
        button.addEventListener('click', () => {
            this.switchTimeframe(timeframe);
        });
        
        return button;
    }
    
    /**
     * 切换时间周期
     * @param {string} timeframe - 目标时间周期
     */
    async switchTimeframe(timeframe) {
        if (timeframe === this.currentTimeframe) {
            return; // 已经是当前时间周期，无需切换
        }
        
        console.log(`时间周期切换器: 切换到 ${timeframe}`);
        
        // 更新当前时间周期
        this.currentTimeframe = timeframe;
        
        // 更新UI显示
        this.updateCurrentTimeframeDisplay();
        this.updateButtonStates();
        
        // 触发时间周期切换事件
        const event = new CustomEvent('timeframeSwitched', {
            detail: {
                newTimeframe: timeframe,
                availableTimeframes: this.enabledTimeframes
            }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * 更新按钮状态
     */
    updateButtonStates() {
        const buttons = this.buttonsContainer.querySelectorAll('.timeframe-btn');
        buttons.forEach(button => {
            const buttonTimeframe = button.dataset.timeframe;
            if (buttonTimeframe === this.currentTimeframe) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
    
    /**
     * 获取当前时间周期
     * @returns {string} 当前时间周期
     */
    getCurrentTimeframe() {
        return this.currentTimeframe;
    }
    
    /**
     * 获取启用的时间周期列表
     * @returns {Array} 启用的时间周期列表
     */
    getEnabledTimeframes() {
        return [...this.enabledTimeframes];
    }
    
    /**
     * 设置当前时间周期（不触发切换事件）
     * @param {string} timeframe - 时间周期
     */
    setCurrentTimeframe(timeframe) {
        this.currentTimeframe = timeframe;
        this.updateCurrentTimeframeDisplay();
        this.updateButtonStates();
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimeframeSwitcher;
}