// 全局變數
let currentAirport = '';
let autoRefreshInterval = null;
let currentFlights = [];

const airports = {
    TPE: '桃園國際機場',
    TSA: '松山國際機場',
    KHH: '高雄國際機場',
    RMQ: '台中國際機場'
};

// 過濾器設置
const filters = {
    date: null,
    timeRange: '',
    terminal: '',
    searchText: ''
};

// DOM 元素
const airportBtns = document.querySelectorAll('.airport-btn');
const currentAirportTitle = document.getElementById('current-airport');
const flightButtons = document.getElementById('flight-buttons');
const flightDetails = document.getElementById('flight-details');
const weatherData = document.getElementById('weather-data');
const airlineSelect = document.getElementById('airline-select');
const airlineFlights = document.getElementById('airline-flights');
const tabBtns = document.querySelectorAll('.tab-btn');
const scheduleTbody = document.getElementById('schedule-tbody');

// 初始化事件監聽器
document.addEventListener('DOMContentLoaded', () => {
    setupAirportButtons();
    setupTabButtons();
    loadAirlines();
    setupFilters();
    setupAutoRefresh();
    setupPrintButton();
});

// 設置過濾器
function setupFilters() {
    // 設置日期過濾器
    const dateFilter = document.getElementById('date-filter');
    dateFilter.valueAsDate = new Date();
    dateFilter.addEventListener('change', () => {
        filters.date = dateFilter.value;
        applyFilters();
    });

    // 設置時段過濾器
    document.getElementById('time-range').addEventListener('change', (e) => {
        filters.timeRange = e.target.value;
        applyFilters();
    });

    // 設置航廈過濾器
    document.getElementById('terminal-filter').addEventListener('change', (e) => {
        filters.terminal = e.target.value;
        applyFilters();
    });

    // 設置搜尋功能
    document.getElementById('flight-search').addEventListener('input', (e) => {
        filters.searchText = e.target.value.toLowerCase();
        applyFilters();
    });

    // 設置重新整理按鈕
    document.getElementById('refresh-btn').addEventListener('click', () => {
        if (currentAirport) {
            loadAirportData(currentAirport);
        }
    });
}

// 設置自動更新
function setupAutoRefresh() {
    const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
    autoRefreshToggle.addEventListener('change', () => {
        if (autoRefreshToggle.checked) {
            // 每5分鐘更新一次
            autoRefreshInterval = setInterval(() => {
                if (currentAirport) {
                    loadAirportData(currentAirport);
                }
            }, 5 * 60 * 1000);
        } else {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    });
}

// 設置列印功能
function setupPrintButton() {
    document.getElementById('print-btn').addEventListener('click', () => {
        window.print();
    });
}

// 應用過濾器
function applyFilters() {
    if (!currentFlights.length) return;

    const filteredFlights = currentFlights.filter(flight => {
        // 檢查日期
        if (filters.date) {
            const flightDate = new Date(flight.ScheduleTime).toISOString().split('T')[0];
            if (flightDate !== filters.date) return false;
        }

        // 檢查時段
        if (filters.timeRange) {
            const flightHour = new Date(flight.ScheduleTime).getHours();
            const [start, end] = filters.timeRange.split('-').map(Number);
            if (flightHour < start || flightHour >= end) return false;
        }

        // 檢查航廈
        if (filters.terminal && flight.Terminal !== filters.terminal) {
            return false;
        }

        // 檢查搜尋文字
        if (filters.searchText) {
            const searchFields = [
                `${flight.AirlineID}${flight.FlightNumber}`, // 航班號碼
                flight.AirlineName?.Zh_tw || '', // 航空公司
                flight.DepartureAirportID || '', // 出發地
                flight.ArrivalAirportID || ''    // 目的地
            ].map(field => field.toLowerCase());

            return searchFields.some(field => field.includes(filters.searchText));
        }

        return true;
    });

    displayFlights(filteredFlights);
}

// 設置分頁按鈕
function setupTabButtons() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // 更新按鈕狀態
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 更新內容顯示
            const contents = document.querySelectorAll('.tab-content');
            contents.forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabId}-flights`).classList.add('active');

            // 如果切換到定期航班頁面且有選中的機場，則載入定期航班數據
            if (tabId === 'scheduled' && currentAirport) {
                loadScheduledFlights(currentAirport);
            }
        });
    });
}

// 設置機場按鈕
function setupAirportButtons() {
    airportBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const airport = btn.dataset.airport;
            setActiveAirport(airport);
            loadAirportData(airport);
        });
    });
}

// 設置當前選中的機場
function setActiveAirport(airport) {
    currentAirport = airport;
    airportBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.airport === airport);
    });
    currentAirportTitle.textContent = airports[airport];
}

// 載入機場資料
async function loadAirportData(airport) {
    try {
        showLoading();
        await Promise.all([
            loadFlights(airport),
            loadWeather(airport),
            loadScheduledFlights(airport)
        ]);
    } catch (error) {
        console.error('載入機場資料時發生錯誤:', error);
        showError('無法載入機場資料');
    } finally {
        hideLoading();
    }
}

// 載入定期航班數據
async function loadScheduledFlights(airport) {
    try {
        const response = await fetch(`/api/schedule/${airport}`);
        const data = await response.json();
        displayScheduledFlights(data);
    } catch (error) {
        console.error('載入定期航班資料時發生錯誤:', error);
        showError('無法載入定期航班資料');
    }
}

// 顯示定期航班數據
function displayScheduledFlights(flights) {
    scheduleTbody.innerHTML = '';
    
    if (!flights || !flights.length) {
        scheduleTbody.innerHTML = '<tr><td colspan="5" class="no-data">無定期航班資料</td></tr>';
        return;
    }

    // 根據時間排序
    flights.sort((a, b) => {
        const timeA = a.DepartureTime || a.ArrivalTime;
        const timeB = b.DepartureTime || b.ArrivalTime;
        return timeA.localeCompare(timeB);
    });

    flights.forEach(flight => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${flight.AirlineID}${flight.FlightNumber}</td>
            <td>${flight.AirlineName?.Zh_tw || flight.AirlineID}</td>
            <td>${flight.OriginAirportID || flight.DepartureAirportID} → ${flight.DestinationAirportID || flight.ArrivalAirportID}</td>
            <td>${formatWeekdays(flight.ServiceDays)}</td>
            <td>${formatScheduleTime(flight.DepartureTime || flight.ArrivalTime)}</td>
        `;
        scheduleTbody.appendChild(row);
    });
}

// 格式化星期幾
function formatWeekdays(days) {
    if (!days) return '-';
    const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
    return days.map((isOperating, index) => 
        isOperating ? weekdays[index] : '').filter(day => day).join('、');
}

// 格式化時刻表時間
function formatScheduleTime(time) {
    if (!time) return '-';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
}

// 載入航班資料
async function loadFlights(airport) {
    try {
        const response = await fetch(`/api/flights/${airport}`);
        const data = await response.json();
        currentFlights = data; // 保存航班數據
        applyFilters(); // 應用過濾器
    } catch (error) {
        console.error('載入航班資料時發生錯誤:', error);
        showError('無法載入航班資料');
    }
}

// 顯示航班資料
function displayFlights(flights) {
    flightButtons.innerHTML = '';
    flightDetails.style.display = 'none';

    if (!flights.length) {
        flightButtons.innerHTML = '<div class="no-data">無航班資料</div>';
        return;
    }

    // 根據時間排序
    flights.sort((a, b) => new Date(a.ScheduleTime) - new Date(b.ScheduleTime));

    flights.forEach(flight => {
        const button = document.createElement('button');
        button.className = 'flight-button';
        button.textContent = `${flight.AirlineID}${flight.FlightNumber}`;
        
        // 根據航班狀態添加不同的樣式
        if (flight.FlightStatus === 'Delayed') {
            button.style.borderColor = '#ff9800';
        } else if (flight.FlightStatus === 'Cancelled') {
            button.style.borderColor = '#f44336';
        }
        
        button.addEventListener('click', () => {
            // 移除其他按鈕的選中狀態
            document.querySelectorAll('.flight-button').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // 添加當前按鈕的選中狀態
            button.classList.add('selected');
            
            // 顯示航班詳細資訊
            showFlightDetails(flight);
        });
        
        flightButtons.appendChild(button);
    });
}

// 顯示航班詳細資訊
function showFlightDetails(flight) {
    const scheduledTime = formatDateTime(flight.ScheduleTime);
    const actualTime = flight.ActualTime ? formatDateTime(flight.ActualTime) : '-';
    const timeDisplay = flight.ActualTime ? `${scheduledTime} (實際: ${actualTime})` : scheduledTime;

    flightDetails.innerHTML = `
        <h4>航班詳細資訊</h4>
        <div class="flight-detail-item">
            <span class="flight-detail-label">航班編號</span>
            <span class="flight-detail-value">${flight.AirlineID}${flight.FlightNumber}</span>
        </div>
        <div class="flight-detail-item">
            <span class="flight-detail-label">出發地</span>
            <span class="flight-detail-value">${flight.DepartureAirportID}</span>
        </div>
        <div class="flight-detail-item">
            <span class="flight-detail-label">目的地</span>
            <span class="flight-detail-value">${flight.ArrivalAirportID}</span>
        </div>
        <div class="flight-detail-item">
            <span class="flight-detail-label">時間</span>
            <span class="flight-detail-value">${timeDisplay}</span>
        </div>
        <div class="flight-detail-item">
            <span class="flight-detail-label">航廈</span>
            <span class="flight-detail-value">${flight.Terminal || '-'}</span>
        </div>
        <div class="flight-detail-item">
            <span class="flight-detail-label">狀態</span>
            <span class="flight-detail-value">${getFlightStatus(flight.FlightStatus)}</span>
        </div>
    `;
    flightDetails.style.display = 'block';
}

// 載入天氣資料
async function loadWeather(airport) {
    try {
        const response = await fetch(`/api/weather/${airport}`);
        const data = await response.json();
        displayWeather(data);
    } catch (error) {
        console.error('載入天氣資料時發生錯誤:', error);
        showError('無法載入天氣資料');
    }
}

// 顯示天氣資料
function displayWeather(weather) {
    if (!weather) {
        weatherData.innerHTML = '<p class="no-data">無天氣資料</p>';
        return;
    }

    const windDirection = getWindDirection(weather.windDirection);
    let metarHtml = '';
    
    if (weather.metar) {
        metarHtml = `
            <div class="weather-metar">
                <h4>詳細氣象資訊 (METAR)</h4>
                <div class="metar-details">
                    <div class="metar-row">
                        <p><strong>能見度：</strong> ${weather.metar.visibility || '-'} 公尺</p>
                        <p><strong>露點溫度：</strong> ${weather.metar.dewPoint || '-'}°C</p>
                    </div>
                    <div class="metar-row">
                        <p><strong>雲幕高度：</strong> ${weather.metar.ceiling || '-'} 呎</p>
                        <p><strong>氣壓：</strong> ${weather.metar.pressure || '-'} hPa</p>
                    </div>
                    <div class="metar-raw">
                        <p><strong>原始 METAR 報文：</strong></p>
                        <code>${weather.metar.raw || '-'}</code>
                    </div>
                    <p class="metar-time">
                        <strong>METAR 觀測時間：</strong> ${formatDateTime(weather.metar.observationTime)}
                    </p>
                </div>
            </div>`;
    }

    weatherData.innerHTML = `
        <div class="weather-details">
            <div class="weather-main">
                <div class="temperature">
                    <h4>溫度</h4>
                    <span class="temp-value">${weather.temperature}°C</span>
                </div>
                <div class="humidity">
                    <h4>濕度</h4>
                    <span class="humidity-value">${weather.humidity}%</span>
                </div>
            </div>
            <div class="weather-extra">
                <p><strong>天氣狀況：</strong> ${weather.description}</p>
                <p><strong>風速：</strong> ${weather.windSpeed} m/s</p>
                <p><strong>風向：</strong> ${windDirection}</p>
                <p class="observation-time"><strong>觀測時間：</strong> ${formatDateTime(weather.observationTime)}</p>
            </div>
            ${metarHtml}
        </div>
    `;
}

// 取得風向說明
function getWindDirection(degrees) {
    const directions = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
    const index = Math.round(((degrees %= 360) < 0 ? degrees + 360 : degrees) / 45) % 8;
    return `${directions[index]} (${degrees}°)`;
}

// 載入航空公司資料
async function loadAirlines() {
    try {
        const response = await fetch('/api/airlines');
        const data = await response.json();
        populateAirlineSelect(data);
    } catch (error) {
        console.error('載入航空公司資料時發生錯誤:', error);
        showError('無法載入航空公司資料');
    }
}

// 填充航空公司選單和顯示航線資訊
function populateAirlineSelect(airlines) {
    airlineSelect.innerHTML = '<option value="">請選擇航空公司</option>';
    
    // 按照航空公司代碼排序
    airlines.sort((a, b) => a.AirlineID.localeCompare(b.AirlineID));
    
    airlines.forEach(airline => {
        const option = document.createElement('option');
        option.value = airline.AirlineID;
        option.textContent = `${airline.AirlineID} - ${airline.AirlineName.Zh_tw}`;
        airlineSelect.appendChild(option);
    });

    airlineSelect.addEventListener('change', async (e) => {
        const selectedAirline = airlines.find(a => a.AirlineID === e.target.value);
        if (selectedAirline) {
            displayAirlineRoutes(selectedAirline);
        } else {
            airlineFlights.innerHTML = '';
        }
    });
}

// 顯示航空公司航線資訊
async function displayAirlineRoutes(airline) {
    try {
        const response = await fetch(`/api/airlines/${airline.AirlineID}/routes`);
        const routes = await response.json();
        
        airlineFlights.innerHTML = `
            <div class="airline-info">
                <h4>${airline.AirlineName.Zh_tw}</h4>
                <p>IATA代碼: ${airline.AirlineID}</p>
                <div class="routes-container">
                    <h5>營運航線：</h5>
                    <div class="route-list">
                        ${routes.map(route => `
                            <div class="route-item">
                                <span class="route-airports">${route.DepartureAirportID} ⟶ ${route.ArrivalAirportID}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error fetching airline routes:', error);
        airlineFlights.innerHTML = '<p class="error">無法載入航線資訊</p>';
    }
}


// 格式化日期時間
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    return new Intl.DateTimeFormat('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);
}

// 取得航班狀態中文說明
function getFlightStatus(status) {
    const statusMap = {
        'Arrival': '抵達',
        'Departure': '起飛',
        'Scheduled': '準時',
        'Delayed': '延誤',
        'Cancelled': '取消'
    };
    return statusMap[status] || status;
}

// 顯示載入中
function showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    flightButtons.innerHTML = '';
    flightButtons.appendChild(loadingDiv);
}

// 隱藏載入中
function hideLoading() {
    const loadingDiv = document.querySelector('.loading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// 顯示錯誤訊息
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    flightButtons.innerHTML = '';
    flightButtons.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}
