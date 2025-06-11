/**
 * TDX API 配置管理器
 * 集中管理 TDX API 的端點和認證設定
 * 
 * @module tdxConfig
 * @description 管理 TDX 運輸資料流通服務的相關配置，包括：
 * - API 認證資訊
 * - API 端點配置
 * - 請求參數設定
 */

require('dotenv').config();

/**
 * TDX API 配置對象
 */
const tdxConfig = {
    /**
     * API 認證設定
     */
    auth: {
        clientId: process.env.TDX_CLIENT_ID,
        clientSecret: process.env.TDX_CLIENT_SECRET,
        tokenUrl: 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token'
    },

    /**
     * API 端點設定
     */
    endpoints: {
        /**
         * 航班相關端點
         */
        flight: {
            /**
             * 機場即時航班資訊
             * @param {string} airport - 機場代碼
             */
            fids: (airport) => 
                `https://tdx.transportdata.tw/api/basic/v2/Air/FIDS/Airport/${airport}`,

            /**
             * 定期航班資訊
             * @param {string} airport - 機場代碼
             */
            schedule: (airport) => 
                `https://tdx.transportdata.tw/api/basic/v2/Air/Schedule/Airport/${airport}`
        },

        /**
         * 天氣相關端點
         */
        weather: {
            /**
             * METAR 天氣資訊
             * @param {string} airport - 機場代碼
             */
            metar: (airport) => 
                `https://tdx.transportdata.tw/api/basic/v2/Air/METAR/Airport/${airport}`
        },

        /**
         * 航空公司相關端點
         */
        airline: {
            /**
             * 航空公司基本資料
             */
            base: 'https://tdx.transportdata.tw/api/basic/v2/Air/Airline',

            /**
             * 航空公司航線資訊
             * @param {string} [airlineId] - 航空公司代碼（可選）
             * @returns {string} API URL
             */
            routes: (airlineId = '') => 
                `https://tdx.transportdata.tw/api/basic/v2/Air/Route/Airline/${airlineId ? airlineId : ''}`
        }
    },

    /**
     * API 請求通用設定
     */
    requestConfig: {
        format: 'JSON',
        cacheTimeout: 180 * 1000, // 緩存時間（3 分鐘）
        headers: {
            'Content-Type': 'application/json'
        }
    }
};

module.exports = tdxConfig;
