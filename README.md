# 台灣國際機場資訊系統

這是一個整合台灣四大國際機場資訊的網頁應用系統，提供即時航班資訊、氣象資料和航空公司查詢功能。

## 功能特點

### 1. 航班資訊
- 即時航班動態
  - 航班編號
  - 出發地/目的地
  - 預計/實際時間
  - 航廈資訊
  - 航班狀態（準時/延誤/取消）
- 支援四大國際機場
  - TPE：桃園國際機場
  - TSA：松山機場
  - KHH：高雄國際機場
  - RMQ：台中機場

### 2. 天氣資訊
- 基本天氣資料
  - 溫度
  - 濕度
  - 天氣狀況
  - 風速風向
- METAR 氣象資訊
  - 能見度
  - 露點溫度
  - 雲幕高度
  - 氣壓
  - 原始 METAR 報文
  - 觀測時間

### 3. 航空公司資訊
- 航空公司查詢
  - 基本資料
  - 營運航線
  - IATA 代碼

## 技術特點

- 資料來源：TDX 運輸資料流通服務
- API 存取優化
  - 30 秒緩存機制
  - 減少 API 調用頻率
  - 提高回應速度
- 響應式設計
  - 支援桌面和行動裝置
  - 優化使用者體驗

## 安裝說明

1. 克隆專案：
```bash
git clone https://github.com/James-Ruixian/Final_report_2.git
cd Final_report_2
```

2. 安裝依賴：
```bash
npm install
```

3. 設置環境變數：
創建 `.env` 文件並添加以下內容：
```
PORT=3000
TDX_CLIENT_ID=your_client_id
TDX_CLIENT_SECRET=your_client_secret
```

4. 啟動服務器：
```bash
npm run dev
```

5. 訪問網站：
打開瀏覽器訪問 http://localhost:3000

## 系統要求

- Node.js 14.0 或更高版本
- npm 6.0 或更高版本
- 有效的 TDX API 認證資訊

## 開發工具

- 前端：HTML5, CSS3, JavaScript
- 後端：Node.js, Express
- API：TDX Transport API
- 開發環境：Visual Studio Code

## 注意事項

1. 請確保在使用前已申請 TDX API 認證資訊
2. API 存取頻率限制為每 30 秒一次
3. 建議使用最新版本的現代瀏覽器訪問

## 資料來源授權

本專案使用的資料來自 TDX 運輸資料流通服務平台，請遵守相關使用規範。
