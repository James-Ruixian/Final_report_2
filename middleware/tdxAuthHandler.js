/**
 * TDX API 認證處理器
 * 處理與 TDX API 認證相關的所有操作
 * 
 * @module tdxAuthHandler
 * @description 此模組負責：
 * - 管理 TDX API 的認證 token
 * - 自動更新過期的 token
 * - 提供認證中間件功能
 */

const axios = require('axios');
const tdxConfig = require('../config/tdxConfig');

/**
 * TDX 認證處理器類別
 * @class TdxAuthHandler
 */
class TdxAuthHandler {
    /**
     * 建立認證處理器實例
     * @constructor
     */
    constructor() {
        /**
         * 當前的認證 token
         * @private
         */
        this.token = null;

        /**
         * token 過期時間
         * @private
         */
        this.tokenExpireTime = null;

        /**
         * token 更新緩衝時間 (5分鐘)
         * @private
         */
        this.tokenRefreshBuffer = 5 * 60 * 1000;
    }

    /**
     * 獲取有效的 access token
     * @async
     * @returns {Promise<string>} 有效的 access token
     * @throws {Error} 當認證失敗時拋出錯誤
     */
    async getToken() {
        try {
            // 檢查現有 token 是否有效
            if (this.isTokenValid()) {
                console.log('使用現有的 token');
                return this.token;
            }

            console.log('正在獲取新的 TDX token...');

            // 獲取新的 token
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

            // 更新 token 和過期時間
            this.token = response.data.access_token;
            this.tokenExpireTime = Date.now() + (response.data.expires_in * 1000);

            console.log('成功獲取新的 token');
            return this.token;

        } catch (error) {
            console.error('獲取 TDX token 失敗:', error.message);
            throw new Error('TDX 認證失敗');
        }
    }

    /**
     * 檢查當前 token 是否有效
     * @private
     * @returns {boolean} 如果 token 有效返回 true
     */
    isTokenValid() {
        if (!this.token || !this.tokenExpireTime) {
            return false;
        }

        // 檢查 token 是否即將過期
        const isValid = Date.now() < (this.tokenExpireTime - this.tokenRefreshBuffer);
        if (!isValid) {
            console.log('Token 即將過期，需要更新');
        }
        return isValid;
    }

    /**
     * Express 中間件函數
     * 自動處理 API 請求的認證
     * @async
     * @param {Object} req - Express 請求對象
     * @param {Object} res - Express 響應對象
     * @param {Function} next - Express next 函數
     */
    async authenticate(req, res, next) {
        try {
            const token = await this.getToken();
            req.tdxToken = token;
            next();
        } catch (error) {
            console.error('認證中間件錯誤:', error);
            next(error);
        }
    }

    /**
     * 獲取帶有認證信息的請求頭
     * @async
     * @returns {Promise<Object>} 包含認證信息的請求頭
     */
    async getAuthHeaders() {
        const token = await this.getToken();
        return {
            Authorization: `Bearer ${token}`
        };
    }
}

// 創建並導出單例
const authHandler = new TdxAuthHandler();

module.exports = {
    // 中間件函數
    authenticate: (req, res, next) => authHandler.authenticate(req, res, next),
    // 工具函數
    getAuthHeaders: () => authHandler.getAuthHeaders(),
    getToken: () => authHandler.getToken()
};
