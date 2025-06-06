/**
 * 快取處理器
 * 管理系統中各類資料的快取機制
 * 
 * @module cacheHandler
 * @description 此模組提供一個統一的快取管理系統，用於：
 * - 儲存和管理不同類型的資料快取
 * - 控制快取的生命週期
 * - 提供快取更新機制
 */

const tdxConfig = require('../config/tdxConfig');

/**
 * 快取管理器類別
 * @class CacheHandler
 */
class CacheHandler {
    /**
     * 建立快取管理器實例
     * @constructor
     */
    constructor() {
        /**
         * 快取存儲容器
         * @private
         */
        this.caches = {
            flights: new Map(),    // 航班資料快取
            weather: new Map(),    // 天氣資料快取
            airlines: null,        // 航空公司資料快取
            lastUpdate: new Map()  // 最後更新時間紀錄
        };
        
        // 從配置檔讀取快取超時時間
        this.cacheTimeout = tdxConfig.requestConfig.cacheTimeout;
    }

    /**
     * 獲取快取資料
     * @param {string} type - 快取類型 (flights/weather/airlines)
     * @param {string} [key] - 快取鍵值
     * @returns {any|null} 快取的資料，如果無效則返回 null
     */
    get(type, key = null) {
        if (!this.caches[type]) {
            console.log(`無效的快取類型: ${type}`);
            return null;
        }

        // 檢查是否需要更新快取
        if (this.shouldUpdate(type, key)) {
            console.log(`快取已過期: ${type}_${key}`);
            return null;
        }

        // 根據類型返回相應的快取
        if (type === 'airlines') {
            return this.caches.airlines;
        }
        
        const data = key ? this.caches[type].get(key) : null;
        console.log(`獲取快取資料: ${type}_${key}, 資料${data ? '存在' : '不存在'}`);
        return data;
    }

    /**
     * 設置快取資料
     * @param {string} type - 快取類型
     * @param {string} key - 快取鍵值
     * @param {any} data - 要快取的資料
     */
    set(type, key, data) {
        if (!this.caches[type]) {
            console.log(`無效的快取類型: ${type}`);
            return;
        }

        if (type === 'airlines') {
            this.caches.airlines = data;
        } else {
            this.caches[type].set(key, data);
        }

        // 更新時間戳
        this.caches.lastUpdate.set(
            this.getCacheKey(type, key),
            Date.now()
        );

        console.log(`更新快取: ${type}_${key}`);
    }

    /**
     * 檢查快取是否需要更新
     * @param {string} type - 快取類型
     * @param {string} key - 快取鍵值
     * @returns {boolean} 如果需要更新返回 true
     */
    shouldUpdate(type, key) {
        const lastUpdate = this.caches.lastUpdate.get(
            this.getCacheKey(type, key)
        );
        
        if (!lastUpdate) {
            return true;
        }

        const shouldUpdate = Date.now() - lastUpdate > this.cacheTimeout;
        if (shouldUpdate) {
            console.log(`快取需要更新: ${type}_${key}`);
        }

        return shouldUpdate;
    }

    /**
     * 生成快取鍵值
     * @private
     * @param {string} type - 快取類型
     * @param {string} key - 快取鍵值
     * @returns {string} 組合後的快取鍵值
     */
    getCacheKey(type, key) {
        return `${type}_${key || 'global'}`;
    }

    /**
     * 清除指定類型的快取
     * @param {string} type - 快取類型
     * @param {string} [key] - 快取鍵值
     */
    clear(type, key = null) {
        if (!this.caches[type]) {
            console.log(`無效的快取類型: ${type}`);
            return;
        }

        if (type === 'airlines') {
            this.caches.airlines = null;
        } else if (key) {
            this.caches[type].delete(key);
        } else {
            this.caches[type].clear();
        }

        // 清除相關的時間戳
        this.caches.lastUpdate.delete(
            this.getCacheKey(type, key)
        );

        console.log(`清除快取: ${type}${key ? `_${key}` : ''}`);
    }

    /**
     * 清除所有快取
     */
    clearAll() {
        this.caches.flights.clear();
        this.caches.weather.clear();
        this.caches.airlines = null;
        this.caches.lastUpdate.clear();
        console.log('清除所有快取');
    }
}

// 導出單例
module.exports = new CacheHandler();
