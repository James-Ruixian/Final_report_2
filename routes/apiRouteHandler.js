/**
 * API 路由處理器
 * 集中管理所有 API 路由
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const tdxConfig = require('../config/tdxConfig');

// 導入處理器
const airportFlightHandler = require('../services/airportFlightHandler');
const airportWeatherHandler = require('../services/airportWeatherHandler');
const airlineDataHandler = require('../services/airlineDataHandler');
const { authenticate, getAuthHeaders } = require('../middleware/tdxAuthHandler');

// 機場航班相關路由
router.get('/flights/:airport', authenticate, async (req, res) => {
    try {
        const { airport } = req.params;
        const flights = await airportFlightHandler.getAirportFlights(airport);
        res.json(flights);
    } catch (error) {
        console.error('處理航班請求時發生錯誤:', error);
        res.status(500).json({
            error: '無法獲取航班資料',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 機場天氣相關路由
router.get('/weather/:airport', authenticate, async (req, res) => {
    try {
        const { airport } = req.params;
        const weather = await airportWeatherHandler.getAirportWeather(airport);
        res.json(weather);
    } catch (error) {
        console.error('處理天氣請求時發生錯誤:', error);
        res.status(500).json({
            error: '無法獲取天氣資料',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 航空公司相關路由
router.get('/airlines', authenticate, async (req, res) => {
    try {
        const airlines = await airlineDataHandler.getAllAirlines();
        res.json(airlines);
    } catch (error) {
        console.error('處理航空公司請求時發生錯誤:', error);
        res.status(500).json({
            error: '無法獲取航空公司資料',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 航空公司航線路由
router.get('/airlines/:airlineId/routes', authenticate, async (req, res) => {
    try {
        const { airlineId } = req.params;
        const routes = await airlineDataHandler.getAirlineRoutes(airlineId);
        res.json(routes);
    } catch (error) {
        console.error('處理航線請求時發生錯誤:', error);
        res.status(500).json({
            error: '無法獲取航線資料',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 機場定期航班路由
router.get('/schedule/:airport', authenticate, async (req, res) => {
    try {
        const { airport } = req.params;
        const response = await axios.get(
            tdxConfig.endpoints.flight.schedule(airport),
            {
                headers: await getAuthHeaders(),
                params: {
                    '$format': 'JSON',
                    '$select': [
                        'AirlineID',
                        'FlightNumber',
                        'DepartureAirportID',
                        'ArrivalAirportID',
                        'DepartureTime',
                        'ArrivalTime',
                        'ServiceDays',
                        'AirlineName'
                    ].join(',')
                }
            }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('處理定期航班請求時發生錯誤:', error);
        res.status(500).json({
            error: '無法獲取定期航班資料',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 導出路由
module.exports = router;
