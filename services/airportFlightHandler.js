/**
 * 機場航班資訊處理器
 * 處理機場航班資訊的獲取和格式化
 * 
 * @module airportFlightHandler
 * @description 此模組負責：
 * - 獲取即時航班資訊
 * - 獲取定期航班資訊
 * - 解析和格式化航班數據
 * - 管理航班資訊的快取
 */

const axios = require('axios');
const tdxConfig = require('../config/tdxConfig');
const cacheHandler = require('../utils/cacheHandler');
const { getAuthHeaders } = require('../middleware/tdxAuthHandler');
const requestController = require('../utils/requestController');

class AirportFlightHandler {
    /**
     * 獲取機場即時航班資訊
     * @async
     * @param {string} airport - 機場代碼 (IATA)
     * @returns {Promise<Array>} 格式化的航班資訊列表
     */
    async getAirportFlights(airport) {
        try {
            // 檢查快取
            const cachedData = cacheHandler.get('flights', airport);
            if (cachedData) {
                console.log(`返回 ${airport} 的快取航班資料`);
                return cachedData;
            }

            console.log(`從 TDX API 獲取 ${airport} 的航班資料...`);

            // 獲取出發和抵達航班資料
            const headers = await getAuthHeaders();
            
            const [departureRes, arrivalRes] = await Promise.all([
                requestController.executeRequest(() => this.getDepartureFlights(airport, headers)),
                requestController.executeRequest(() => this.getArrivalFlights(airport, headers))
            ]);

            // 合併並格式化航班資料
            const flights = [
                ...this.formatFlights(departureRes.data || [], 'Departure'),
                ...this.formatFlights(arrivalRes.data || [], 'Arrival')
            ];

            // 根據時間排序
            flights.sort((a, b) => 
                new Date(a.scheduledTime) - new Date(b.scheduledTime)
            );

            // 更新快取
            cacheHandler.set('flights', airport, flights);

            return flights;

        } catch (error) {
            console.error(`獲取 ${airport} 航班資料時發生錯誤:`, error);
            throw error;
        }
    }

    /**
     * 獲取出發航班資料
     * @private
     * @param {string} airport - 機場代碼
     * @param {Object} headers - 請求標頭
     * @returns {Promise<Object>} API 回應數據
     */
    async getDepartureFlights(airport, headers) {
        return axios.get(
            tdxConfig.endpoints.flight.fids(airport),
            {
                headers,
                    params: {
                        '$format': 'JSON',
                        '$filter': `FromAirportID eq '${airport}'`,
                        '$orderby': 'DepartureTime'
                    }
            }
        );
    }

    /**
     * 獲取抵達航班資料
     * @private
     * @param {string} airport - 機場代碼
     * @param {Object} headers - 請求標頭
     * @returns {Promise<Object>} API 回應數據
     */
    async getArrivalFlights(airport, headers) {
        return axios.get(
            tdxConfig.endpoints.flight.fids(airport),
            {
                headers,
                    params: {
                        '$format': 'JSON',
                        '$filter': `ToAirportID eq '${airport}'`,
                        '$orderby': 'ArrivalTime'
                    }
            }
        );
    }

    /**
     * 格式化航班資料
     * @private
     * @param {Array} flights - 原始航班數據
     * @param {string} type - 航班類型 (Departure/Arrival)
     * @returns {Array} 格式化後的航班資訊
     */
    formatFlights(flights, type) {
        return flights.map(flight => ({
            flightNumber: `${flight.AirlineID}${flight.FlightNumber}`,
            airlineId: flight.AirlineID,
            type: type,
            departureAirport: flight.DepartureAirportID,
            arrivalAirport: flight.ArrivalAirportID,
            scheduledTime: type === 'Departure' ? flight.ScheduleDepartureTime : flight.ScheduleArrivalTime,
            actualTime: type === 'Departure' ? flight.ActualDepartureTime : flight.ActualArrivalTime,
            estimatedTime: type === 'Departure' ? flight.EstimatedDepartureTime : flight.EstimatedArrivalTime,
            terminal: flight.Terminal || null,
            gate: flight.Gate || null,
            status: this.getFlightStatus(flight.FlightStatus),
            remark: flight.Remark || null
        }));
    }

    /**
     * 獲取航班狀態說明
     * @private
     * @param {string} status - 原始狀態代碼
     * @returns {string} 中文狀態說明
     */
    getFlightStatus(status) {
        const statusMap = {
            'Arrival': '抵達',
            'Departure': '起飛',
            'Scheduled': '準時',
            'Delayed': '延誤',
            'Cancelled': '取消',
            'CheckIn': '報到中',
            'Boarding': '登機中',
            'FinalCall': '最後登機',
            'Departed': '已起飛',
            'Arrived': '已抵達'
        };

        return statusMap[status] || status;
    }

    /**
     * 獲取定期航班時刻表
     * @async
     * @param {string} airport - 機場代碼
     * @returns {Promise<Array>} 定期航班資訊
     */
    async getScheduledFlights(airport) {
        try {
            const headers = await getAuthHeaders();
            const response = await axios.get(
                tdxConfig.endpoints.flight.schedule(airport),
                {
                    headers,
                    params: {
                        '$format': 'JSON',
                        '$select': 'AirlineID,FlightNumber,DepartureAirportID,ArrivalAirportID,DepartureTime,ArrivalTime,ServiceDays'
                    }
                }
            );

            return this.formatScheduleFlights(response.data || []);
        } catch (error) {
            console.error(`獲取 ${airport} 定期航班資料時發生錯誤:`, error);
            throw error;
        }
    }

    /**
     * 格式化定期航班資料
     * @private
     * @param {Array} flights - 原始航班數據
     * @returns {Array} 格式化後的定期航班資訊
     */
    formatScheduleFlights(flights) {
        return flights.map(flight => ({
            flightNumber: `${flight.AirlineID}${flight.FlightNumber}`,
            airlineId: flight.AirlineID,
            route: `${flight.DepartureAirportID} → ${flight.ArrivalAirportID}`,
            departureTime: flight.DepartureTime,
            arrivalTime: flight.ArrivalTime,
            frequency: this.formatScheduleDays(flight.ServiceDays)
        }));
    }

    /**
     * 格式化航班營運日期
     * @private
     * @param {Array} days - 營運日期陣列
     * @returns {string} 格式化後的營運日期說明
     */
    formatScheduleDays(days) {
        if (!Array.isArray(days)) {
            return '未指定營運日期';
        }

        const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
        const operatingDays = days
            .map((operates, index) => operates ? weekDays[index] : null)
            .filter(Boolean);

        return operatingDays.length > 0 ? 
            operatingDays.join('、') : 
            '未指定營運日期';
    }
}

// 導出單例
module.exports = new AirportFlightHandler();
