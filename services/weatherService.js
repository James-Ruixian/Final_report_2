/**
 * 天氣服務模組
 * 處理天氣資料的獲取、解析和格式化
 */

const axios = require('axios');
const config = require('../config/tdx.config');
const cache = require('../utils/cacheManager');
const { getAuthHeaders } = require('../middleware/authMiddleware');

class WeatherService {
    /**
     * 獲取機場天氣資訊
     * @param {string} airport - 機場代碼 (IATA)
     * @returns {Promise<Object>} 格式化的天氣資訊
     */
    async getAirportWeather(airport) {
        try {
            // 檢查緩存
            const cachedData = cache.get('weather', airport);
            if (cachedData) {
                console.log(`返回 ${airport} 的緩存天氣資料`);
                return cachedData;
            }

            console.log(`從 TDX API 獲取 ${airport} 的天氣資料...`);
            
            // 獲取 METAR 資料
            const headers = await getAuthHeaders();
            const response = await axios.get(
                config.endpoints.weather.metar(airport),
                {
                    headers,
                    params: {
                        '$format': 'JSON',
                        '$select': [
                            'StationID',
                            'AltimeterSetting',
                            'WeatherPhenomena',
                            'Temperature',
                            'DewpointTemperature',
                            'WindDirection',
                            'WindSpeed',
                            'Visibility',
                            'DateTime'
                        ].join(',')
                    }
                }
            );

            const metarData = response.data;
            if (!metarData || !metarData.length) {
                throw new Error('無法獲取天氣資料');
            }

            const weatherInfo = this.formatWeatherData(metarData[0]);
            
            // 更新緩存
            cache.set('weather', airport, weatherInfo);

            return weatherInfo;

        } catch (error) {
            console.error(`獲取 ${airport} 天氣資料時發生錯誤:`, error);
            throw error;
        }
    }

    /**
     * 格式化天氣數據
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
            description: metarData.WeatherPhenomena || '無天氣描述',
            windSpeed: this.parseNumber(metarData.WindSpeed),
            windDirection: this.parseNumber(metarData.WindDirection),
            observationTime: metarData.DateTime,

            // METAR 詳細資訊
            metar: {
                visibility: this.parseNumber(metarData.Visibility),
                dewPoint: this.parseNumber(metarData.DewpointTemperature),
                pressure: this.parseNumber(metarData.AltimeterSetting),
                raw: metarData.MetarText || null
            }
        };
    }

    /**
     * 解析數值
     * @private
     */
    parseNumber(value) {
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    }

    /**
     * 計算相對濕度
     * @private
     */
    calculateHumidity(temperature, dewPoint) {
        if (temperature === null || dewPoint === null) {
            return null;
        }

        // 使用溫度和露點溫度計算相對濕度
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
module.exports = new WeatherService();
