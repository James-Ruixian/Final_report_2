/**
 * 航空公司數據處理器
 * 負責處理航空公司相關資料的獲取、解析和格式化
 * 包含航空公司基本資訊和航線資料
 */

const axios = require('axios');
const tdxConfig = require('../config/tdxConfig');
const cacheHandler = require('../utils/cacheHandler');
const { getAuthHeaders } = require('../middleware/tdxAuthHandler');
const requestController = require('../utils/requestController');

class AirlineDataHandler {
    /**
     * 獲取所有航空公司資料
     * @returns {Promise<Array>} 航空公司資訊列表
     */
    async getAllAirlines() {
        try {
            // 檢查緩存
            const cachedData = cacheHandler.get('airlines');
            if (cachedData) {
                console.log('返回緩存的航空公司資料');
                return cachedData;
            }

            console.log('從 TDX API 獲取航空公司資料...');
            const headers = await getAuthHeaders();

            // 獲取航空公司基本資料和航線資料
            const [airlines, routes] = await Promise.all([
                requestController.executeRequest(() => this.fetchAirlineBasicInfo(headers)),
                requestController.executeRequest(() => this.fetchAirlineRoutes(headers))
            ]);

            // 整合數據
            const integratedData = this.integrateAirlineData(airlines, routes);

            // 更新緩存
            cacheHandler.set('airlines', 'global', integratedData);

            return integratedData;

        } catch (error) {
            const message = error.response?.data?.Message || error.message;
            console.error('❌ 獲取航空公司資料時發生錯誤:', message);
            throw error;
        }
    }

    /**
     * 獲取特定航空公司的航線資料
     * @param {string} airlineId - 航空公司代碼
     * @returns {Promise<Array>} 航線資訊
     */
    async getAirlineRoutes(airlineId) {
        try {
            const headers = await getAuthHeaders();
            const response = await requestController.executeRequest(() => 
                axios.get(
                    tdxConfig.endpoints.airline.routes(airlineId),
                    {
                        headers,
                        params: {
                            '$format': 'JSON',
                            '$orderby': 'DepartureAirportID'
                        }
                    }
                )
            );

            return this.formatRouteData(response.data);
        } catch (error) {
            const message = error.response?.data?.Message || error.message;
            console.error(`❌ 獲取航空公司 ${airlineId} 航線資料錯誤:`, message);
            throw error;
        }
    }

    /**
     * 獲取航空公司基本資料
     * @private
     */
    async fetchAirlineBasicInfo(headers) {
        try {
            const response = await requestController.executeRequest(() =>
                axios.get(
                    tdxConfig.endpoints.airline.base,
                    {
                        headers,
                        params: {
                            '$format': 'JSON',
                            '$orderby': 'AirlineID'
                        }
                    }
                )
            );
            return response.data;
        } catch (error) {
            console.error('❌ 獲取航空公司基本資料時發生錯誤:', error.message);
            throw error;
        }
    }

    /**
     * 獲取所有航線資料
     * @private
     */
    async fetchAirlineRoutes(headers) {
        try {
            const response = await requestController.executeRequest(() =>
                axios.get(
                    tdxConfig.endpoints.airline.routes(), // 注意這裡不傳參數
                    {
                        headers,
                        params: {
                            '$format': 'JSON'
                        }
                    }
                )
            );
            return response.data;
        } catch (error) {
            console.error('❌ 獲取航空公司航線資料時發生錯誤:', error.message);
            throw error;
        }
    }

    /**
     * 整合航空公司資料
     * @private
     */
    integrateAirlineData(airlines, routes) {
        return airlines.map(airline => ({
            airlineId: airline.AirlineID,
            name: {
                chinese: airline.AirlineName?.Zh_tw || '',
                english: airline.AirlineName?.En || ''
            },
            icaoCode: airline.AirlineICAOCode,
            routes: this.filterRoutesByAirline(routes, airline.AirlineID)
        }));
    }

    /**
     * 過濾特定航空公司的航線
     * @private
     */
    filterRoutesByAirline(routes, airlineId) {
        return routes
            .filter(route => route.AirlineID === airlineId)
            .map(route => ({
                departureAirport: route.DepartureAirportID,
                arrivalAirport: route.ArrivalAirportID,
                schedule: this.formatSchedule(route.ServiceDays),
                aircraft: route.AircraftType || '未指定'
            }));
    }

    /**
     * 格式化航班時刻表
     * @private
     */
    formatSchedule(days) {
        if (!Array.isArray(days)) {
            return '未指定營運日期';
        }

        const weekDays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
        const operatingDays = days
            .map((operates, index) => operates ? weekDays[index] : null)
            .filter(Boolean);

        return operatingDays.length > 0 ? operatingDays.join(', ') : '未指定營運日期';
    }

    /**
     * 格式化航線資料
     * @private
     */
    formatRouteData(routes) {
        return routes.map(route => ({
            routeId: `${route.AirlineID}-${route.DepartureAirportID}-${route.ArrivalAirportID}`,
            route: `${route.DepartureAirportID} → ${route.ArrivalAirportID}`,
            schedule: this.formatSchedule(route.ServiceDays),
            aircraft: route.AircraftType || '未指定',
            remarks: route.Remarks || ''
        }));
    }
}

module.exports = new AirlineDataHandler();
