require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 設置靜態檔案目錄
app.use(express.static('public'));

// 設置視圖目錄
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// TDX API 認證資訊
const getTDXToken = async () => {
    try {
        const response = await axios.post(
            'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token',
            new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: process.env.TDX_CLIENT_ID,
                client_secret: process.env.TDX_CLIENT_SECRET
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting TDX token:', error);
        throw error;
    }
};

// API 路由
app.get('/api/flights/:airport', async (req, res) => {
    try {
        const token = await getTDXToken();
        const { airport } = req.params;
        
        const response = await axios.get(
            `https://tdx.transportdata.tw/api/basic/v2/Air/FIDS/Airport/${airport}?$format=JSON`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching flight data:', error);
        res.status(500).json({ error: '無法獲取航班資料' });
    }
});

// 天氣資料路由
app.get('/api/weather/:airport', async (req, res) => {
    try {
        const token = await getTDXToken();
        const { airport } = req.params;
        
        const response = await axios.get(
            `https://tdx.transportdata.tw/api/basic/v2/Air/Airport/Weather/${airport}?$format=JSON`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        res.status(500).json({ error: '無法獲取天氣資料' });
    }
});

// 航空公司資料路由
app.get('/api/airlines', async (req, res) => {
    try {
        const token = await getTDXToken();
        
        const response = await axios.get(
            'https://tdx.transportdata.tw/api/basic/v2/Air/Airline?$format=JSON',
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching airline data:', error);
        res.status(500).json({ error: '無法獲取航空公司資料' });
    }
});

// 首頁路由
app.get('/', (req, res) => {
    res.render('index');
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器運行在 http://localhost:${PORT}`);
});
