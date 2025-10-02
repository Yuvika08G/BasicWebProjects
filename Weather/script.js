
const WEATHER_CACHE = new Map();
const CACHE_DURATION = 10 * 60 * 1000; 

const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const weatherCard = document.getElementById('weatherCard');
const cityName = document.getElementById('cityName');
const temperature = document.getElementById('temperature');
const humidity = document.getElementById('humidity');
const condition = document.getElementById('condition');
const weatherIcon = document.getElementById('weatherIcon');
const message = document.getElementById('message');

const weatherIcons = {
    '01d': '☀️',
    '01n': '🌙', 
    '02d': '🌤️', 
    '02n': '☁️', 
    '03d': '⛅', 
    '03n': '☁️', 
    '04d': '☁️', 
    '04n': '☁️', 
    '09d': '🌦️', 
    '09n': '🌧️', 
    '10d': '🌦️', 
    '10n': '🌧️', 
    '11d': '⛈️', 
    '11n': '⛈️', 
    '13d': '❄️',
    '13n': '❄️', 
    '50d': '🌫️', 
    '50n': '🌫️'  
};

searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});
async function handleSearch() {
    const city = cityInput.value.trim();
    
    if (!city) {
        showMessage('Please enter a city name');
        return;
    }
    
    showLoading();
    
    try {
        const weatherData = await fetchWeatherData(city);
        displayWeatherData(weatherData);
    } catch (error) {
        showError('City not found or network error. Please try again.');
        console.error('Error fetching weather data:', error);
    }
}
async function fetchWeatherData(city) {
    const cacheKey = city.toLowerCase().trim();
    
    if (WEATHER_CACHE.has(cacheKey)) {
        const cached = WEATHER_CACHE.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }
    }
    const promises = [
        fetchFromWeatherAPI(city),
        fetchFromOpenMeteo(city),
        fetchFromWttr(city)
    ];
    
    try {
        const data = await Promise.any(promises);
        
        WEATHER_CACHE.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });
        
        return data;
    } catch (error) {
        throw new Error('Unable to fetch weather data from any source');
    }
}
async function fetchFromWeatherAPI(city) {
    const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=demo&q=${encodeURIComponent(city)}&aqi=no`);
    
    if (!response.ok) throw new Error('WeatherAPI failed');
    
    const data = await response.json();
    return {
        name: `${data.location.name}, ${data.location.country}`,
        main: {
            temp: Math.round(data.current.temp_f),
            humidity: data.current.humidity
        },
        weather: [{
            description: data.current.condition.text.toLowerCase(),
            icon: getWeatherIconFromDescription(data.current.condition.text.toLowerCase())
        }]
    };
}
async function fetchFromOpenMeteo(city) {
   
    const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    
    if (!geoResponse.ok) throw new Error('Geocoding failed');
    
    const geoData = await geoResponse.json();
    if (!geoData.results || geoData.results.length === 0) {
        throw new Error('City not found');
    }
    
    const { latitude, longitude, name, country } = geoData.results[0];
    
    
    const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit&timezone=auto`);
    
    if (!weatherResponse.ok) throw new Error('Weather fetch failed');
    
    const weatherData = await weatherResponse.json();
    const current = weatherData.current_weather;
    
    return {
        name: `${name}, ${country}`,
        main: {
            temp: Math.round(current.temperature),
            humidity: 65
        },
        weather: [{
            description: getWeatherDescription(current.weathercode),
            icon: getWeatherIconFromCode(current.weathercode)
        }]
    };
}

async function fetchFromWttr(city) {
    const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
    
    if (!response.ok) throw new Error('Wttr failed');
    
    const data = await response.json();
    const current = data.current_condition[0];
    const location = data.nearest_area[0];
    
    return {
        name: `${location.areaName[0].value}, ${location.country[0].value}`,
        main: {
            temp: Math.round(parseInt(current.temp_F)),
            humidity: parseInt(current.humidity)
        },
        weather: [{
            description: current.weatherDesc[0].value.toLowerCase(),
            icon: getWeatherIconFromDescription(current.weatherDesc[0].value.toLowerCase())
        }]
    };
}

function getWeatherDescription(code) {
    const descriptions = {
        0: 'clear sky',
        1: 'mainly clear',
        2: 'partly cloudy',
        3: 'overcast',
        45: 'fog',
        48: 'depositing rime fog',
        51: 'light drizzle',
        53: 'moderate drizzle',
        55: 'dense drizzle',
        61: 'slight rain',
        63: 'moderate rain',
        65: 'heavy rain',
        71: 'slight snow',
        73: 'moderate snow',
        75: 'heavy snow',
        95: 'thunderstorm',
        96: 'thunderstorm with hail',
        99: 'thunderstorm with heavy hail'
    };
    return descriptions[code] || 'clear sky';
}


function getWeatherIconFromCode(code) {
    if (code === 0) return '01d';
    if (code <= 3) return '02d';
    if (code >= 45 && code <= 48) return '50d';
    if (code >= 51 && code <= 55) return '09d';
    if (code >= 61 && code <= 65) return '10d';
    if (code >= 71 && code <= 75) return '13d';
    if (code >= 95) return '11d';
    return '01d';
}

function getWeatherIconFromDescription(description) {
    const desc = description.toLowerCase();
    if (desc.includes('clear') || desc.includes('sunny')) return '01d';
    if (desc.includes('cloud')) return '03d';
    if (desc.includes('rain') || desc.includes('drizzle')) return '10d';
    if (desc.includes('thunder')) return '11d';
    if (desc.includes('snow')) return '13d';
    if (desc.includes('mist') || desc.includes('fog')) return '50d';
    return '01d'; 
}

function displayWeatherData(data) {
    
    message.style.display = 'none';
    
    cityName.textContent = data.name;
    cityName.style.display = 'block';
    
    temperature.textContent = `${Math.round(data.main.temp)}°F`;
    temperature.style.display = 'block';
    
    humidity.textContent = `Humidity: ${data.main.humidity}%`;
    humidity.style.display = 'block';
    
    condition.textContent = capitalizeWords(data.weather[0].description);
    condition.style.display = 'block';
    const iconCode = data.weather[0].icon || getWeatherIconFromDescription(data.weather[0].description);
    weatherIcon.textContent = weatherIcons[iconCode] || '🌤️';
    weatherIcon.style.display = 'block';

    weatherCard.classList.remove('loading', 'error');

    searchBtn.disabled = false;
    searchBtn.textContent = 'Get Weather';

    cityInput.value = '';
}

function showLoading() {
    weatherCard.classList.add('loading');
    message.textContent = 'Fetching weather data...';
    message.style.display = 'block';

    searchBtn.disabled = true;
    searchBtn.textContent = 'Loading...';

    hideWeatherElements();
}

function showError(errorMessage) {
    weatherCard.classList.remove('loading');
    weatherCard.classList.add('error');
    message.textContent = errorMessage;
    message.style.display = 'block';

    searchBtn.disabled = false;
    searchBtn.textContent = 'Get Weather';

    hideWeatherElements();

    setTimeout(() => {
        weatherCard.classList.remove('error');
    }, 3000);
}

function showMessage(msg) {
    message.textContent = msg;
    message.style.display = 'block';
    hideWeatherElements();
}

function hideWeatherElements() {
    cityName.style.display = 'none';
    temperature.style.display = 'none';
    humidity.style.display = 'none';
    condition.style.display = 'none';
    weatherIcon.style.display = 'none';
}
function capitalizeWords(str) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
}
function init() {

    hideWeatherElements();
    showMessage('Please enter a city to get weather information');
}

init();

const popularCities = ['New York', 'London', 'Tokyo', 'Paris', 'Sydney', 'Mumbai', 'Berlin', 'Moscow'];

cityInput.addEventListener('input', (e) => {
    const value = e.target.value.toLowerCase();
    if (value.length > 2) {

    }
});
