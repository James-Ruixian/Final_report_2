/**
 * 機場天氣資訊處理器
 * 處理機場天氣資訊的獲取和格式化
 * 
 * @module airportWeatherHandler
 * @description 此模組負責：
 * - 獲取機場 METAR 天氣資訊
 * - 解析並格式化天氣數據
 * - 管理天氣資訊的快取
 */

const axios = require('axios');
const tdxConfig = require('../config/tdxConfig');
const cacheHandler = require('../utils/cacheHandler');
const { getAuthHeaders } = require('../middleware/tdxAuthHandler');
const requestController = require('../utils/requestController');

class AirportWeatherHandler {
    /**
     * 獲取機場天氣資訊
     * @async
     * @param {string} airport - 機場代碼 (IATA)
     * @returns {Promise<Object>} 格式化的天氣資訊
     * @throws {Error} 當無法獲取天氣資料時拋出錯誤
     */
    async getAirportWeather(airport) {
        try {
            // 檢查快取
            const cachedData = cacheHandler.get('weather', airport);
            if (cachedData) {
                console.log(`返回 ${airport} 的快取天氣資料`);
                return cachedData;
            }

            console.log(`從 TDX API 獲取 ${airport} 的天氣資料...`);
            
            // 獲取 METAR 資料
            const headers = await getAuthHeaders();
            const response = await requestController.executeRequest(() => 
                axios.get(
                    tdxConfig.endpoints.weather.metar(airport),
                    {
                        headers,
                        params: {
                            '$format': 'JSON',
                            '$select': [
                                'StationID',
                                'WeatherState',
                                'Temperature',
                                'DewPointTemperature',
                                'WindDirection',
                                'WindSpeed',
                                'Visibility',
                                'ObservationTime',
                                'MetarText'
                            ].join(',')
                        }
                    }
                )
            );

            const metarData = response.data;
            if (!metarData || !metarData.length) {
                throw new Error(`無法獲取 ${airport} 的天氣資料`);
            }

            // 格式化天氣資訊
            const weatherInfo = this.formatWeatherData(metarData[0]);
            
            // 更新快取
            cacheHandler.set('weather', airport, weatherInfo);

            return weatherInfo;

        } catch (error) {
            console.error(`獲取 ${airport} 天氣資料時發生錯誤:`, error);
            throw error;
        }
    }

    /**
     * 格式化天氣數據
     * @private
     * @param {Object} metarData - 原始 METAR 數據
     * @returns {Object} 格式化後的天氣資訊
     */
    formatWeatherData(metarData) {
        return {
            // 基本天氣資訊
            temperature: this.parseNumber(metarData.Temperature),
            humidity: this.calculateHumidity(
                metarData.Temperature,
                metarData.DewpointTemperature
            ),
            description: metarData.WeatherState || '無天氣描述',
            windSpeed: this.parseNumber(metarData.WindSpeed),
            windDirection: this.parseNumber(metarData.WindDirection),
            observationTime: metarData.ObservationTime,

            // METAR 詳細資訊
            metar: {
                visibility: this.parseNumber(metarData.Visibility),
                dewPoint: this.parseNumber(metarData.DewpointTemperature),
                pressure: null,
                raw: metarData.MetarText || null,
                observationTime: metarData.ObservationTime
            }
        };
    }

    /**
     * 解析數值
     * @private
     * @param {string|number} value - 要解析的值
     * @returns {number|null} 解析後的數值，如果無效則返回 null
     */
    parseNumber(value) {
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    }

    /**
     * 計算相對濕度
     * @private
     * @param {number} temperature - 溫度
     * @param {number} dewPoint - 露點溫度
     * @returns {number|null} 計算出的相對濕度，如果無法計算則返回 null
     */
    calculateHumidity(temperature, dewPoint) {
        if (temperature === null || dewPoint === null) {
            return null;
        }

        // 使用溫度和露點溫度計算相對濕度的公式
        const e = 2.71828;
        const a = 17.27;
        const b = 237.7;

        const ft = (a * temperature) / (b + temperature);
        const fd = (a * dewPoint) / (b + dewPoint);

        const humidity = 100 * (Math.pow(e, fd) / Math.pow(e, ft));
        return Math.round(humidity);
    }
}

// 導出單例
module.exports = new AirportWeatherHandler();
