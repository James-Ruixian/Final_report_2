/**
 * 航班服務模組
 * 處理航班資料的獲取、解析和格式化
 */

const axios = require('axios');
const config = require('../config/tdx.config');
const cache = require('../utils/cacheManager');
const { getAuthHeaders } = require('../middleware/authMiddleware');

class FlightService {
    /**
     * 獲取機場即時航班資訊
     * @param {string} airport - 機場代碼 (IATA)
     * @returns {Promise<Array>} 航班資訊列表
     */
    async getAirportFlights(airport) {
        try {
            // 檢查緩存
            const cachedData = cache.get('flights', airport);
            if (cachedData) {
                console.log(`返回 ${airport} 的緩存航班資料`);
                return cachedData;
            }

            console.log(`從 TDX API 獲取 ${airport} 的航班資料...`);

            // 獲取出發和抵達航班資料
            const headers = await getAuthHeaders();
            const [departureRes, arrivalRes] = await Promise.all([
                this.getDepartureFlights(airport, headers),
                this.getArrivalFlights(airport, headers)
            ]);

            // 合併並格式化航班資料
            const flights = [
                ...this.formatFlights(departureRes.data, 'Departure'),
                ...this.formatFlights(arrivalRes.data, 'Arrival')
            ];

            // 根據時間排序
            flights.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));

            // 更新緩存
            cache.set('flights', airport, flights);

            return flights;

        } catch (error) {
            console.error(`獲取 ${airport} 航班資料時發生錯誤:`, error);
            throw error;
        }
    }

    /**
     * 獲取出發航班資料
     * @private
     */
    async getDepartureFlights(airport, headers) {
        return axios.get(
            config.endpoints.flight.fids(airport),
            {
                headers,
                params: {
                    '$format': 'JSON',
                    '$filter': `DepartureAirportID eq '${airport}'`,
                    '$orderby': 'ScheduleTime'
                }
            }
        );
    }

    /**
     * 獲取抵達航班資料
     * @private
     */
    async getArrivalFlights(airport, headers) {
        return axios.get(
            config.endpoints.flight.fids(airport),
            {
                headers,
                params: {
                    '$format': 'JSON',
                    '$filter': `ArrivalAirportID eq '${airport}'`,
                    '$orderby': 'ScheduleTime'
                }
            }
        );
    }

    /**
     * 格式化航班資料
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
            scheduledTime: flight.ScheduleTime,
            actualTime: flight.ActualTime,
            estimatedTime: flight.EstimatedTime,
            terminal: flight.Terminal || null,
            gate: flight.Gate || null,
            status: this.getFlightStatus(flight.FlightStatus),
            remark: flight.Remark || null
        }));
    }

    /**
     * 獲取航班狀態說明
     * @private
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
     * @param {string} airport - 機場代碼
     * @returns {Promise<Array>} 定期航班資訊
     */
    async getScheduledFlights(airport) {
        try {
            const headers = await getAuthHeaders();
            const response = await axios.get(
                config.endpoints.flight.schedule(airport),
                {
                    headers,
                    params: {
                        '$format': 'JSON',
                        '$orderby': 'ScheduleTime'
                    }
                }
            );

            return this.formatScheduleFlights(response.data);
        } catch (error) {
            console.error(`獲取 ${airport} 定期航班資料時發生錯誤:`, error);
            throw error;
        }
    }

    /**
     * 格式化定期航班資料
     * @private
     */
    formatScheduleFlights(flights) {
        return flights.map(flight => ({
            flightNumber: `${flight.AirlineID}${flight.FlightNumber}`,
            airlineId: flight.AirlineID,
            route: `${flight.DepartureAirportID} → ${flight.ArrivalAirportID}`,
            scheduleTime: flight.ScheduleTime,
            frequency: flight.ServiceDays.join(', '), // 營運日期
            aircraft: flight.AircraftType || '未指定',
            remarks: flight.Remarks || null
        }));
    }
}

// 導出單例
module.exports = new FlightService();
