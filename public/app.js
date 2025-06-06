// 全局變數
let currentAirport = '';
const airports = {
    TPE: '桃園國際機場',
    TSA: '松山機場',
    KHH: '高雄國際機場',
    RMQ: '台中國際機場'
};

// DOM 元素
const airportBtns = document.querySelectorAll('.airport-btn');
const currentAirportTitle = document.getElementById('current-airport');
const flightTable = document.getElementById('flight-table');
const flightSearch = document.getElementById('flight-search');
const airportFilter = document.getElementById('airport-filter');
const weatherData = document.getElementById('weather-data');
const airlineSelect = document.getElementById('airline-select');
const airlineFlights = document.getElementById('airline-flights');

// 初始化事件監聽器
document.addEventListener('DOMContentLoaded', () => {
    setupAirportButtons();
    setupFlightSearch();
    loadAirlines();
});

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
            loadWeather(airport)
        ]);
    } catch (error) {
        console.error('載入機場資料時發生錯誤:', error);
        showError('無法載入機場資料');
    } finally {
        hideLoading();
    }
}

// 載入航班資料
async function loadFlights(airport) {
    try {
        const response = await fetch(`/api/flights/${airport}`);
        const data = await response.json();
        displayFlights(data);
    } catch (error) {
        console.error('載入航班資料時發生錯誤:', error);
        showError('無法載入航班資料');
    }
}

// 顯示航班資料
function displayFlights(flights) {
    const tbody = document.getElementById('flight-data');
    tbody.innerHTML = '';

    if (!flights.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">無航班資料</td></tr>';
        return;
    }

    // 根據時間排序
    flights.sort((a, b) => new Date(a.ScheduleTime) - new Date(b.ScheduleTime));

    flights.forEach(flight => {
        const row = document.createElement('tr');
        const scheduledTime = formatDateTime(flight.ScheduleTime);
        const actualTime = flight.ActualTime ? formatDateTime(flight.ActualTime) : '-';
        const timeDisplay = flight.ActualTime ? `${scheduledTime} (實際: ${actualTime})` : scheduledTime;
        
        row.innerHTML = `
            <td>${flight.AirlineID}${flight.FlightNumber}</td>
            <td>${flight.DepartureAirportID}</td>
            <td>${flight.ArrivalAirportID}</td>
            <td>${timeDisplay}</td>
            <td>${flight.Terminal || '-'}</td>
            <td>${getFlightStatus(flight.FlightStatus)}</td>
        `;
        
        // 根據航班狀態添加不同的樣式
        if (flight.FlightStatus === 'Delayed') {
            row.classList.add('delayed-flight');
        } else if (flight.FlightStatus === 'Cancelled') {
            row.classList.add('cancelled-flight');
        }
        
        tbody.appendChild(row);
    });
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

// 設置航班搜尋
function setupFlightSearch() {
    // 航班號碼搜尋
    flightSearch.addEventListener('input', filterFlights);
    // 機場篩選
    airportFilter.addEventListener('change', filterFlights);
}

// 篩選航班
function filterFlights() {
    const searchText = flightSearch.value.toUpperCase();
    const selectedAirport = airportFilter.value.toUpperCase();
    const rows = document.querySelectorAll('#flight-data tr');
    
    rows.forEach(row => {
        const flightNumber = row.cells[0]?.textContent.toUpperCase() || '';
        const departureAirport = row.cells[1]?.textContent.toUpperCase() || '';
        const arrivalAirport = row.cells[2]?.textContent.toUpperCase() || '';
        
        const matchesSearch = flightNumber.includes(searchText);
        const matchesAirport = !selectedAirport || 
                             departureAirport === selectedAirport || 
                             arrivalAirport === selectedAirport;
        
        row.style.display = (matchesSearch && matchesAirport) ? '' : 'none';
    });
}

// 根據航空公司篩選航班
function filterFlightsByAirline() {
    const selectedAirline = airlineSelect.value;
    const rows = document.querySelectorAll('#flight-data tr');
    
    rows.forEach(row => {
        const flightNumber = row.cells[0]?.textContent || '';
        row.style.display = !selectedAirline || flightNumber.startsWith(selectedAirline) ? '' : 'none';
    });
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
    flightTable.parentNode.insertBefore(loadingDiv, flightTable);
    flightTable.style.display = 'none';
}

// 隱藏載入中
function hideLoading() {
    const loadingDiv = document.querySelector('.loading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
    flightTable.style.display = '';
}

// 顯示錯誤訊息
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    flightTable.parentNode.insertBefore(errorDiv, flightTable);
    setTimeout(() => errorDiv.remove(), 3000);
}
