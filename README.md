# 币安三角形态监控系统

一个实时监控币安合约交易平台前20个热门币种K线图和三角形态检测的Web应用程序。

## 功能特性

- 🔄 **实时数据更新**: 通过币安API和WebSocket获取实时K线数据
- 📊 **多币种监控**: 自动获取交易量前20的USDT合约币种
- 🔺 **三角形态识别**: 智能检测上升、下降和收敛三角形态
- 🔔 **实时提醒系统**: 浏览器通知、页面提示和音频提醒
- 📱 **响应式设计**: 适配桌面和移动设备
- ⚡ **高性能优化**: 内存管理和连接池优化

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **图表库**: Chart.js
- **数据源**: 币安期货API
- **实时通信**: WebSocket
- **开发服务器**: http-server

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm start
```

应用将在 `http://localhost:8080` 启动

### 或使用serve

```bash
npx serve .
```

应用将在 `http://localhost:3000` 启动

## 项目结构

```
binance-triangle-monitor/
├── index.html              # 主页面
├── css/
│   └── style.css           # 样式文件
├── js/
│   ├── app.js              # 主应用程序
│   ├── binanceApi.js       # 币安API接口
│   ├── chartManager.js     # 图表管理器
│   ├── config.js           # 配置文件
│   ├── notifications.js    # 通知系统
│   └── patternDetection.js # 形态检测算法
├── package.json            # 项目配置
└── README.md              # 项目说明
```

## 功能说明

### 三角形态类型

1. **上升三角形**: 价格高点水平，低点逐步抬高
2. **下降三角形**: 价格低点水平，高点逐步降低
3. **收敛三角形**: 价格高点降低，低点抬高，形成收敛

### 提醒功能

- 浏览器桌面通知
- 页面内实时提示
- 音频提醒（不同形态不同音调）
- 形态历史记录

### 配置选项

- 时间周期选择（1分钟到1天）
- 形态过滤器
- 通知开关
- 内存使用监控

## 使用说明

1. 打开应用后会自动连接币安API
2. 系统会获取交易量前20的币种并显示K线图
3. 实时检测三角形态并发送提醒
4. 可通过过滤器选择关注的形态类型
5. 点击通知可查看详细信息

## 注意事项

- 本应用仅供学习和参考使用
- 不构成任何投资建议
- 请谨慎进行交易决策
- 确保网络连接稳定以获得最佳体验

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 上传到GitHub步骤

1. 在GitHub上创建新仓库 `binance-triangle-monitor`
2. 在项目目录中初始化Git:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: 币安三角形态监控系统"
   ```
3. 添加远程仓库并推送:
   ```bash
   git remote add origin https://github.com/你的用户名/binance-triangle-monitor.git
   git branch -M main
   git push -u origin main
   ```

## 联系方式

如有问题或建议，请通过GitHub Issues联系。