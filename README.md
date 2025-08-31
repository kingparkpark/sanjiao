# 币安三角形态监控系统

一个实时监控币安合约交易平台前20个热门币种K线图和三角形态检测的Web应用。

## 功能特性

- 🔄 **实时数据**: 通过币安API获取实时K线数据
- 📊 **图表显示**: 使用Chart.js显示专业的蜡烛图
- 🔺 **形态识别**: 自动检测上升、下降、收敛三角形态
- 🔔 **智能提醒**: 浏览器通知、页面提示、音频提醒
- 📱 **响应式设计**: 适配各种屏幕尺寸
- ⚡ **性能优化**: 内存管理和WebSocket连接优化

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm start
```

应用将在 `http://localhost:8080` 启动。

### 或使用其他静态服务器

```bash
npx serve .
```

## 项目结构

```
├── index.html          # 主页面
├── css/
│   └── style.css      # 样式文件
├── js/
│   ├── app.js         # 主应用程序
│   ├── binanceApi.js  # 币安API模块
│   ├── chartManager.js # 图表管理器
│   ├── config.js      # 配置文件
│   ├── notifications.js # 通知系统
│   └── patternDetection.js # 形态检测算法
└── package.json       # 项目配置
```

## 技术栈

- **前端框架**: 原生JavaScript (ES6+)
- **图表库**: Chart.js 4.x
- **API**: 币安合约API
- **实时通信**: WebSocket
- **样式**: CSS3 + Flexbox/Grid

## 主要功能模块

### 1. 数据获取 (binanceApi.js)
- 获取热门币种列表
- 实时K线数据获取
- WebSocket连接管理

### 2. 图表管理 (chartManager.js)
- Chart.js图表初始化
- 实时数据更新
- 图表样式配置

### 3. 形态检测 (patternDetection.js)
- 上升三角形检测
- 下降三角形检测
- 收敛三角形检测
- 置信度计算

### 4. 通知系统 (notifications.js)
- 浏览器通知
- 页面提示
- 音频提醒
- 历史记录管理

## 配置说明

主要配置项在 `js/config.js` 中：

- `TOP_SYMBOLS_COUNT`: 监控币种数量 (默认20)
- `UPDATE_INTERVAL`: 数据更新间隔 (默认5秒)
- `PATTERN_MIN_POINTS`: 形态检测最少点数 (默认5)
- `MEMORY_WARNING_THRESHOLD`: 内存警告阈值 (默认80%)

## 使用说明

1. **选择时间周期**: 在顶部选择1分钟到1天的不同时间周期
2. **启用通知**: 点击通知按钮允许浏览器通知权限
3. **过滤形态**: 使用过滤器选择要监控的三角形态类型
4. **查看提醒**: 在右侧通知面板查看检测到的形态

## 三角形态说明

### 上升三角形
- **特征**: 水平阻力线 + 上升支撑线
- **信号**: 通常为看涨信号
- **突破**: 向上突破概率较高

### 下降三角形
- **特征**: 水平支撑线 + 下降阻力线
- **信号**: 通常为看跌信号
- **突破**: 向下突破概率较高

### 收敛三角形
- **特征**: 上升支撑线 + 下降阻力线
- **信号**: 方向不确定，需等待突破
- **突破**: 可能向上或向下突破

## 风险提示

⚠️ **重要提醒**:
- 本系统仅供学习和研究使用
- 不构成任何投资建议
- 加密货币交易存在高风险
- 请谨慎投资，理性交易

## 开发说明

### 本地开发

1. 克隆项目
```bash
git clone https://github.com/kingparkpark/sanjiao.git
cd sanjiao
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm start
```

### 部署

项目为纯前端应用，可部署到任何静态文件服务器：
- GitHub Pages
- Netlify
- Vercel
- 或任何Web服务器

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题或建议，请通过 GitHub Issues 联系。