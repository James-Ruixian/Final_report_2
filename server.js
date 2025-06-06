/**
 * 台灣國際機場資訊系統服務器
 * 整合航班、天氣和航空公司資訊的 RESTful API 服務
 */

require('dotenv').config();
const express = require('express');
const path = require('path');

// 導入路由處理器
const apiRoutes = require('./routes/apiRouteHandler');

// 創建 Express 應用
const app = express();
const PORT = process.env.PORT || 3000;

/**
 * 中間件配置
 */
// 靜態文件服務
app.use(express.static('public'));

// JSON 解析
app.use(express.json());

// CORS 設置
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

/**
 * 視圖引擎配置
 */
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

/**
 * 路由配置
 */
// API 路由
app.use('/api', apiRoutes);

// 首頁路由
app.get('/', (req, res) => {
    res.render('index');
});

/**
 * 錯誤處理
 */
// 404 處理
app.use((req, res) => {
    res.status(404).json({
        error: '找不到請求的資源',
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
    console.error('服務器錯誤:', err);
    res.status(err.status || 500).json({
        error: '服務器內部錯誤',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

/**
 * 伺服器啟動
 */
const server = app.listen(PORT, () => {
    console.log(`伺服器運行在 http://localhost:${PORT}`);
    console.log('按 Ctrl+C 停止伺服器');
});

/**
 * 優雅地處理伺服器關閉
 */
process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信號，正在關閉伺服器...');
    server.close(() => {
        console.log('伺服器已關閉');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('收到 SIGINT 信號，正在關閉伺服器...');
    server.close(() => {
        console.log('伺服器已關閉');
        process.exit(0);
    });
});

// 未捕獲的 Promise 異常處理
process.on('unhandledRejection', (reason, promise) => {
    console.error('未捕獲的 Promise 異常:', reason);
});

// 未捕獲的異常處理
process.on('uncaughtException', (error) => {
    console.error('未捕獲的異常:', error);
    process.exit(1);
});
