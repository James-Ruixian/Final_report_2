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

    flights.forEach(flight => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${flight.AirlineID}${flight.FlightNumber}</td>
            <td>${flight.DepartureAirportID}</td>
            <td>${flight.ArrivalAirportID}</td>
            <td>${formatDateTime(flight.ScheduleTime)}</td>
            <td>${flight.Terminal || '-'}</td>
            <td>${getFlightStatus(flight.FlightStatus)}</td>
        `;
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
    if (!weather || !weather.length) {
        weatherData.innerHTML = '<p class="no-data">無天氣資料</p>';
        return;
    }

    const currentWeather = weather[0];
    weatherData.innerHTML = `
        <div class="weather-details">
            <p>溫度: ${currentWeather.Temperature}°C</p>
            <p>濕度: ${currentWeather.Humidity}%</p>
            <p>天氣狀況: ${currentWeather.WeatherDescription}</p>
            <p>觀測時間: ${formatDateTime(currentWeather.ObservationTime)}</p>
        </div>
    `;
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

// 填充航空公司選單
function populateAirlineSelect(airlines) {
    airlineSelect.innerHTML = '<option value="">請選擇航空公司</option>';
    airlines.forEach(airline => {
        const option = document.createElement('option');
        option.value = airline.AirlineID;
        option.textContent = `${airline.AirlineID} - ${airline.AirlineName.Zh_tw}`;
        airlineSelect.appendChild(option);
    });

    airlineSelect.addEventListener('change', filterFlightsByAirline);
}

// 設置航班搜尋
function setupFlightSearch() {
    flightSearch.addEventListener('input', (e) => {
        const searchText = e.target.value.toUpperCase();
        const rows = document.querySelectorAll('#flight-data tr');
        
        rows.forEach(row => {
            const flightNumber = row.cells[0]?.textContent.toUpperCase() || '';
            row.style.display = flightNumber.includes(searchText) ? '' : 'none';
        });
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
