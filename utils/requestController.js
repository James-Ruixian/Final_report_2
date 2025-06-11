/**
 * API 請求控制器
 * 處理請求速率限制和重試機制
 */

class RequestController {
    constructor() {
        this.requestCount = 0;
        this.resetTime = Date.now();
        this.REQUEST_LIMIT = 3;          // 降低單位時間的請求數
        this.RESET_INTERVAL = 60 * 1000; // 60 秒重置一次
        this.retryDelays = [5000, 10000, 15000]; // 增加重試間隔
        this.lastRequestTime = 0;
        this.MIN_REQUEST_INTERVAL = 1000; // 最小請求間隔（1秒）
    }

    canMakeRequest() {
        const now = Date.now();
        if (now - this.resetTime >= this.RESET_INTERVAL) {
            this.requestCount = 0;
            this.resetTime = now;
        }
        return this.requestCount < this.REQUEST_LIMIT;
    }

    async waitForNextSlot() {
        const now = Date.now();
        const timeUntilReset = this.RESET_INTERVAL - (now - this.resetTime);
        if (timeUntilReset > 0) {
            console.log(`等待 ${Math.ceil(timeUntilReset/1000)} 秒後重試...`);
            await new Promise(resolve => setTimeout(resolve, timeUntilReset));
        }
        this.requestCount = 0;
        this.resetTime = Date.now();
    }

    async executeRequest(requestFn, options = {}) {
        const maxRetries = options.maxRetries || 3;
        let attempt = 0;

        try {
            while (attempt < maxRetries) {
                try {
                    await this.waitForNextSlot();
                    this.requestCount++;
                    const result = await requestFn();
                    return result;
                } catch (error) {
                    if (error.response?.status === 429) {
                        const retryAfter = parseInt(error.response.headers['retry-after']) * 1000 || 
                                         this.retryDelays[attempt] || 
                                         this.RESET_INTERVAL;
                        console.log(`請求速率超限，等待 ${Math.ceil(retryAfter/1000)} 秒後重試...`);
                        await new Promise(resolve => setTimeout(resolve, retryAfter));
                    } else if (error.response?.status === 404) {
                        console.error('找不到請求的資源：', error.config.url);
                        throw error;
                    } else {
                        if (attempt === maxRetries - 1) {
                            throw error;
                        }
                        const delay = this.retryDelays[attempt] || this.RESET_INTERVAL;
                        console.log(`請求失敗，${Math.ceil(delay/1000)} 秒後重試...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    attempt++;
                }
            }
        } catch (err) {
            console.error('請求執行失敗：', err.message);
            throw err;
        }
    }
}

module.exports = new RequestController();
