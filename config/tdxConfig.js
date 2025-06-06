/**
 * TDX API 配置管理器
 * 集中管理 TDX API 的端點和認證設定
 * 
 * @module tdxConfig
 * @author Your Name
 * @description 此模組用於管理 TDX 運輸資料流通服務的相關配置，包括：
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
             * 機場航班資訊查詢端點
             * @param {string} airport - 機場代碼
             * @returns {string} API 端點 URL
             */
            fids: (airport) => 
                `https://tdx.transportdata.tw/api/basic/v2/Air/FIDS/Airport/${airport}`,

            /**
             * 定期航班查詢端點
             * @param {string} airport - 機場代碼
             * @returns {string} API 端點 URL
             */
            schedule: (airport) => 
                `https://tdx.transportdata.tw/api/basic/v2/Air/Schedule/Airport/${airport}`
        },

        /**
         * 天氣相關端點
         */
        weather: {
            /**
             * METAR 天氣資訊查詢端點
             * @param {string} airport - 機場代碼
             * @returns {string} API 端點 URL
             */
            metar: (airport) => 
                `https://tdx.transportdata.tw/api/basic/v2/Air/METAR/Airport/${airport}`
        },

        /**
         * 航空公司相關端點
         */
        airline: {
            /**
             * 航空公司基本資料查詢端點
             */
            base: 'https://tdx.transportdata.tw/api/basic/v2/Air/Airline',

            /**
             * 航空公司航線查詢端點
             * @param {string} airlineId - 航空公司代碼
             * @returns {string} API 端點 URL
             */
            routes: (airlineId) => 
                `https://tdx.transportdata.tw/api/basic/v2/Air/Route/Airline/${airlineId}`
        }
    },

    /**
     * API 請求配置
     */
    requestConfig: {
        format: 'JSON',
        cacheTimeout: 30 * 1000, // 緩存時間 (30 秒)
        headers: {
            'Content-Type': 'application/json'
        }
    }
};

module.exports = tdxConfig;
