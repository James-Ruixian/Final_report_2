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

// 緩存管理
const cache = {
    flights: new Map(),
    weather: new Map(),
    airlines: null,
    lastUpdate: new Map(),
    cacheTimeout: 30 * 1000 // 30秒的緩存時間
};

// 檢查是否需要更新緩存
function shouldUpdateCache(key) {
    const lastUpdate = cache.lastUpdate.get(key);
    if (!lastUpdate) return true;
    return Date.now() - lastUpdate > cache.cacheTimeout;
}

// 更新緩存時間戳
function updateCacheTimestamp(key) {
    cache.lastUpdate.set(key, Date.now());
}

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

// 即時航班資料路由
app.get('/api/flights/:airport', async (req, res) => {
    try {
        const { airport } = req.params;
        const cacheKey = `flights_${airport}`;

        // 檢查緩存
        if (!shouldUpdateCache(cacheKey) && cache.flights.has(airport)) {
            console.log(`返回緩存的航班資料 - ${airport}`);
            return res.json(cache.flights.get(airport));
        }

        console.log(`從 TDX API 獲取航班資料 - ${airport}`);
        const token = await getTDXToken();
        
        // 同時獲取出發和抵達航班
        const [departureRes, arrivalRes] = await Promise.all([
            axios.get(
                `https://tdx.transportdata.tw/api/basic/v2/Air/FIDS/Airport/${airport}?$filter=DepartureAirportID%20eq%20'${airport}'&$format=JSON`,
                { headers: { Authorization: `Bearer ${token}` } }
            ),
            axios.get(
                `https://tdx.transportdata.tw/api/basic/v2/Air/FIDS/Airport/${airport}?$filter=ArrivalAirportID%20eq%20'${airport}'&$format=JSON`,
                { headers: { Authorization: `Bearer ${token}` } }
            )
        ]);
        
        const flights = [...departureRes.data, ...arrivalRes.data].map(flight => ({
            ...flight,
            FlightType: flight.DepartureAirportID === airport ? 'Departure' : 'Arrival'
        }));

        // 更新緩存
        cache.flights.set(airport, flights);
        updateCacheTimestamp(cacheKey);
        
        res.json(flights);
    } catch (error) {
        console.error('Error fetching flight data:', error);
        res.status(500).json({ error: '無法獲取航班資料' });
    }
});

// 定期航班資料路由
app.get('/api/schedule/:airport', async (req, res) => {
    try {
        const token = await getTDXToken();
        const { airport } = req.params;
        
        const response = await axios.get(
            `https://tdx.transportdata.tw/api/basic/v2/Air/Schedule/Airport/${airport}?$format=JSON`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching schedule data:', error);
        res.status(500).json({ error: '無法獲取定期航班資料' });
    }
});

// 天氣資料路由
app.get('/api/weather/:airport', async (req, res) => {
    try {
        const { airport } = req.params;
        const cacheKey = `weather_${airport}`;

        // 檢查緩存
        if (!shouldUpdateCache(cacheKey) && cache.weather.has(airport)) {
            console.log(`返回緩存的天氣資料 - ${airport}`);
            return res.json(cache.weather.get(airport));
        }

        console.log(`從 TDX API 獲取天氣資料 - ${airport}`);
        const token = await getTDXToken();
        
        // 獲取一般天氣資料和 METAR 資料
        const [weatherResponse, metarResponse] = await Promise.all([
            axios.get(
                `https://tdx.transportdata.tw/api/basic/v2/Air/Airport/Weather/${airport}?$format=JSON`,
                { headers: { Authorization: `Bearer ${token}` } }
            ),
            axios.get(
                `https://tdx.transportdata.tw/api/basic/v2/Air/METAR/Airport/${airport}?$format=JSON`,
                { headers: { Authorization: `Bearer ${token}` } }
            )
        ]);

        const weatherData = weatherResponse.data;
        const metarData = metarResponse.data;

        if (weatherData && weatherData.length > 0) {
            const currentWeather = weatherData[0];
            const currentMetar = metarData && metarData.length > 0 ? metarData[0] : null;

            const formattedWeather = {
                // 基本天氣資訊
                temperature: currentWeather.Temperature,
                humidity: currentWeather.Humidity,
                description: currentWeather.WeatherDescription,
                windSpeed: currentWeather.WindSpeed,
                windDirection: currentWeather.WindDirection,
                observationTime: currentWeather.ObservationTime,
                
                // METAR 資訊
                metar: currentMetar ? {
                    raw: currentMetar.MetarText, // 原始 METAR 報文
                    visibility: currentMetar.Visibility, // 能見度
                    ceiling: currentMetar.WeatherCeiling, // 雲幕高度
                    dewPoint: currentMetar.DewpointTemperature, // 露點溫度
                    pressure: currentMetar.AltimeterSetting, // 氣壓
                    observationTime: currentMetar.DateTime // METAR 觀測時間
                } : null
            };

            // 更新緩存
            cache.weather.set(airport, formattedWeather);
            updateCacheTimestamp(cacheKey);

            res.json(formattedWeather);
        } else {
            res.status(404).json({ error: '無法找到天氣資料' });
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        res.status(500).json({ error: '無法獲取天氣資料' });
    }
});

// 航空公司資料路由
app.get('/api/airlines', async (req, res) => {
    try {
        const cacheKey = 'airlines';

        // 檢查緩存
        if (!shouldUpdateCache(cacheKey) && cache.airlines) {
            console.log('返回緩存的航空公司資料');
            return res.json(cache.airlines);
        }

        console.log('從 TDX API 獲取航空公司資料');
        const token = await getTDXToken();
        
        // 獲取航空公司基本資料
        const airlineResponse = await axios.get(
            'https://tdx.transportdata.tw/api/basic/v2/Air/Airline?$format=JSON',
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // 獲取航空公司航線資料
        const routeResponse = await axios.get(
            'https://tdx.transportdata.tw/api/basic/v2/Air/Route/Airline?$format=JSON',
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // 合併航空公司資料和航線資料
        const airlines = airlineResponse.data.map(airline => {
            const routes = routeResponse.data.filter(route => 
                route.AirlineID === airline.AirlineID
            );
            return {
                ...airline,
                routes: routes
            };
        });

        // 更新緩存
        cache.airlines = airlines;
        updateCacheTimestamp(cacheKey);
        
        res.json(airlines);
    } catch (error) {
        console.error('Error fetching airline data:', error);
        res.status(500).json({ error: '無法獲取航空公司資料' });
    }
});

// 航空公司航線資料路由
app.get('/api/airlines/:airlineId/routes', async (req, res) => {
    try {
        const token = await getTDXToken();
        const { airlineId } = req.params;
        
        const response = await axios.get(
            `https://tdx.transportdata.tw/api/basic/v2/Air/Route/Airline/${airlineId}?$format=JSON`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching airline routes:', error);
        res.status(500).json({ error: '無法獲取航空公司航線資料' });
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
