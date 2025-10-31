// React core hooks
import { useEffect, useRef, useState } from "react";
// Router
import { useNavigate } from "react-router";
// Components
import Navbar from "../../components/Navbar";
import { createEnhancedPopup } from "../../components/PopupContent";
import MarineVisualizer from "../../marineVisualizer/MarineVisualizer";
// Ports data
import mindanaoPorts from "../../data/ports.json";

export default function UserPage() {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const portMarkersRef = useRef([]);
  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showTemperature, setShowTemperature] = useState(true);
  const [showPressure, setShowPressure] = useState(false);
  const [showStorm, setShowStorm] = useState(false);
  const [showPorts, setShowPorts] = useState(true);
  const navigate = useNavigate();
  const [selectedLat, setSelectedLat] = useState(null);
  const [selectedLng, setSelectedLng] = useState(null);
  const [loadingType, setLoadingType] = useState(null);
  const [clickedLocation, setClickedLocation] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [showForecastPanel, setShowForecastPanel] = useState(false);
  const [showControlsPanel, setShowControlsPanel] = useState(false);

  // Convert degrees to compass direction
  const degToCompass = (deg) => {
    if (deg === null || deg === undefined) return "N/A";
    const directions = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];
    const idx = Math.floor(((deg % 360) + 360) / 22.5 + 0.5) % 16;
    return directions[idx];
  };

  // Get weather icon based on weather code
  const getWeatherIcon = (code, isDay = true) => {
    const weatherIcons = {
      0: isDay ? "☀️" : "🌙", // Clear sky
      1: isDay ? "🌤️" : "🌤️", // Mainly clear
      2: "⛅", // Partly cloudy
      3: "☁️", // Overcast
      45: "🌫️", // Fog
      48: "🌫️", // Depositing rime fog
      51: "🌦️", // Light drizzle
      53: "🌦️", // Moderate drizzle
      55: "🌧️", // Dense drizzle
      61: "🌦️", // Slight rain
      63: "🌧️", // Moderate rain
      65: "🌧️", // Heavy rain
      71: "🌨️", // Slight snow
      73: "🌨️", // Moderate snow
      75: "🌨️", // Heavy snow
      77: "🌨️", // Snow grains
      80: "🌦️", // Slight rain showers
      81: "🌧️", // Moderate rain showers
      82: "⛈️", // Violent rain showers
      85: "🌨️", // Slight snow showers
      86: "🌨️", // Heavy snow showers
      95: "⛈️", // Thunderstorm
      96: "⛈️", // Thunderstorm with slight hail
      99: "⛈️", // Thunderstorm with heavy hail
    };
    return weatherIcons[code] || "🌈";
  };

  // Get weather description
  const getWeatherDescription = (code) => {
    const codes = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      56: "Light freezing drizzle",
      57: "Dense freezing drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      66: "Light freezing rain",
      67: "Heavy freezing rain",
      71: "Slight snow",
      73: "Moderate snow",
      75: "Heavy snow",
      77: "Snow grains",
      80: "Slight rain showers",
      81: "Moderate rain showers",
      82: "Violent rain showers",
      85: "Slight snow showers",
      86: "Heavy snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm with slight hail",
      99: "Thunderstorm with heavy hail",
    };
    return codes[code] || `Code: ${code}`;
  };

  // Get port icon based on port type
  const getPortIcon = (portType) => {
    const L = window.L;
    if (!L) return null;

    const getIconColor = (type) => {
      switch (type) {
        case "International Container Port":
        case "International Port":
          return "#e74c3c";
        case "Base Port":
          return "#3498db";
        case "Container Terminal":
          return "#9b59b6";
        case "Terminal Port":
          return "#f39c12";
        case "Municipal Port":
          return "#2ecc71";
        case "Private Port":
          return "#95a5a6";
        default:
          return "#34495e";
      }
    };

    const getPortEmoji = (type) => {
      switch (type) {
        case "International Container Port":
        case "International Port":
          return "⚓";
        case "Base Port":
          return "🏭";
        case "Container Terminal":
          return "🚢";
        case "Terminal Port":
          return "⛴️";
        case "Municipal Port":
          return "🏘️";
        case "Private Port":
          return "🔒";
        default:
          return "📍";
      }
    };

    return L.divIcon({
      html: `
        <div style="
          background: ${getIconColor(portType)};
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
          border: 3px solid white;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          ${getPortEmoji(portType)}
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
      className: "port-marker",
    });
  };

  // Fetch 7-day forecast data
  const fetchForecastData = async (lat, lng) => {
    try {
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

      const response = await fetch(forecastUrl);
      if (response.ok) {
        const data = await response.json();
        setForecastData(data);
        setShowForecastPanel(true);
        return data;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch forecast data:", error);
      return null;
    }
  };

  // Fetch and display data for location
  const fetchLocationData = async (lat, lng, locationName, dataType) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    setLoading(true);
    setLoadingType(dataType);

    try {
      // Always fetch forecast data when clicking on map
      const forecastData = await fetchForecastData(lat, lng);

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto&wind_speed_unit=kmh&precipitation_unit=mm`;
      const waveUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=wave_height,wave_direction,swell_wave_height,swell_wave_direction,secondary_swell_wave_height,secondary_swell_wave_period&timezone=auto`;

      const [weatherResponse, waveResponse] = await Promise.all([
        fetch(weatherUrl),
        fetch(waveUrl),
      ]);

      const weatherData = weatherResponse.ok
        ? await weatherResponse.json()
        : null;
      const waveData = waveResponse.ok ? await waveResponse.json() : null;

      // Remove previous marker
      if (markerRef.current && mapRef.current.hasLayer(markerRef.current)) {
        mapRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }

      const L = window.L;
      if (!L) return;

      if (dataType === "weather" && weatherData?.current) {
        const formatValue = (value, unit = "", decimals = 1) => {
          if (value === null || value === undefined) return "N/A";
          if (typeof value === "number") {
            return decimals === 0
              ? `${Math.round(value)}${unit}`
              : `${value.toFixed(decimals)}${unit}`;
          }
          return `${value}${unit}`;
        };

        const popupContent = createEnhancedPopup(
          weatherData,
          waveData,
          lat,
          lng,
          getWeatherDescription,
          degToCompass,
          formatValue
        );

        const weatherIcon = L.divIcon({
          html: `<div style="background: linear-gradient(135deg, #ff6b6b, #ee5a52); color:white; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold; border:3px solid white; box-shadow:0 3px 10px rgba(0,0,0,0.3);">${
            weatherData.current.temperature_2m != null
              ? Math.round(weatherData.current.temperature_2m) + "°"
              : "?"
          }</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
        });

        markerRef.current = L.marker([lat, lng], { icon: weatherIcon })
          .addTo(mapRef.current)
          .bindPopup(popupContent, {
            maxWidth: 400,
            className: "weather-popup",
          })
          .openPopup();
      }

      // Center map on selected location
      mapRef.current.setView([lat, lng], 10);
    } catch (err) {
      console.error(`Data fetch failed for location:`, err);
    } finally {
      setLoading(false);
      setLoadingType(null);
      setClickedLocation(null);
    }
  };

  // Add port markers to map
  const addPortMarkers = (map) => {
    const L = window.L;
    if (!L || !mindanaoPorts?.ports_of_mindanao) return;

    removePortMarkers();

    mindanaoPorts.ports_of_mindanao.forEach((port) => {
      const icon = getPortIcon(port.type);
      if (!icon) return;

      const marker = L.marker([port.latitude, port.longitude], { icon }).addTo(
        map
      ).bindPopup(`
          <div style="min-width: 260px; padding: 12px;">
            <h3 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 16px; font-weight: bold;">
              ${port.port_name}
            </h3>
            <div style="color: #7f8c8d; font-size: 12px; margin-bottom: 8px;">
              📍 ${port.location}
            </div>
            <div style="color: #34495e; font-size: 12px; margin-bottom: 12px;">
              🏷️ Type: ${port.type}
            </div>
            
            <div style="display: grid; gap: 8px;">
              <button 
                onclick="window.viewWeatherData(${port.latitude}, ${
        port.longitude
      }, '${port.port_name.replace(/'/g, "\\'")}')"
                style="
                  padding: 10px 16px;
                  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
                  color: white;
                  border: none;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 12px;
                  font-weight: 600;
                "
              >
                🌤️ View Weather Data
              </button>
            </div>
          </div>
        `);

      portMarkersRef.current.push(marker);
    });

    // Add global functions
    window.viewWeatherData = async (lat, lng, locationName) => {
      await fetchLocationData(lat, lng, locationName, "weather");
    };

    window.viewDetailedForecast = async (lat, lng, locationName) => {
      await fetchLocationData(lat, lng, locationName, "weather");
    };

    window.closePopup = () => {
      if (markerRef.current) {
        markerRef.current.closePopup();
      }
    };
  };

  // Remove port markers from map
  const removePortMarkers = () => {
    const L = window.L;
    if (!L || !mapRef.current) return;

    portMarkersRef.current.forEach((marker) => {
      if (mapRef.current.hasLayer(marker)) {
        mapRef.current.removeLayer(marker);
      }
    });
    portMarkersRef.current = [];
  };

  // Toggle port markers visibility
  const togglePortMarkers = () => {
    if (!mapRef.current || !mapLoaded) return;

    if (showPorts) {
      removePortMarkers();
      setShowPorts(false);
    } else {
      addPortMarkers(mapRef.current);
      setShowPorts(true);
    }
  };

  // Layer toggle helpers
  const toggleLayer = (layerName, currentState, setState) => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const layer = map[layerName];
    if (currentState) {
      if (map.hasLayer(layer)) map.removeLayer(layer);
      setState(false);
    } else {
      layer?.addTo(map);
      setState(true);
    }
  };

  // Toggle controls panel
  const toggleControlsPanel = () => {
    setShowControlsPanel(!showControlsPanel);
  };

  useEffect(() => {
    const API_KEY = "60b8ffcce91b8ebdc127d1219e56e0f5";

    const loadLeaflet = async () => {
      try {
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href =
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
          document.head.appendChild(link);
        }

        if (!window.L) {
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
          script.onload = initializeMap;
          document.head.appendChild(script);
        } else {
          initializeMap();
        }
      } catch (error) {
        console.error("Failed to load Leaflet:", error);
      }
    };

    const initializeMap = () => {
  const L = window.L;
  if (!L) return console.error("Leaflet failed to load");

  const map = L.map("map").setView([8.0, 125.0], 6);
  mapRef.current = map;

  // Base tiles with dark theme
  L.tileLayer(
    `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=${import.meta.env.VITE_STADIA_API_KEY}`,
    {
      attribution:
        '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
    }
  ).addTo(map);

      // OpenWeatherMap layers
      const tempLayer = L.tileLayer(
        `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
        { opacity: 0.6 }
      );
      const pressureLayer = L.tileLayer(
        `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
        { opacity: 0.6 }
      );
      const precipitationLayer = L.tileLayer(
        `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${API_KEY}`,
        { opacity: 0.6 }
      );

      // Default: temperature
      tempLayer.addTo(map);

      // Store layers
      map.tempLayer = tempLayer;
      map.pressureLayer = pressureLayer;
      map.precipitationLayer = precipitationLayer;

      setMapLoaded(true);
      addPortMarkers(map);

      // Map click handler
      map.on("click", async (e) => {
        const { lat, lng } = e.latlng;

        // Fetch forecast data immediately on click
        await fetchForecastData(lat, lng);

        // Also fetch current weather data
        await fetchLocationData(lat, lng, "Selected Location", "weather");
      });
    };

    loadLeaflet();

    return () => {
      if (mapRef.current) mapRef.current.remove();
      delete window.viewWeatherData;
      delete window.viewDetailedForecast;
      delete window.closePopup;
    };
  }, []);

  // Horizontal Forecast Panel Component
  const ForecastPanel = () => {
    if (!showForecastPanel || !forecastData?.daily) return null;

    const { daily } = forecastData;
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-1000 max-w-[95vw]">
        <div className="border shadow-2xl bg-gradient-to-br from-white/10 to-white/5 border-white/20 rounded-2xl backdrop-blur-2xl">
          <div className="p-4">
            {/* Header - Glass Morphism Style */}
            <div className="relative flex items-center justify-center mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white">
                  7-DAY FORECAST
                </h3>
              </div>
              {/* Close Button */}
              <button
                onClick={() => setShowForecastPanel(false)}
                className="absolute right-0 flex items-center justify-center w-6 h-6 transition-all duration-200 border rounded-full bg-white/10 hover:bg-white/20 border-white/20"
              >
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Horizontal Forecast Items - Glass Morphism Cards */}
            <div className="flex justify-center gap-2 pb-2 overflow-x-auto scrollbar-hide">
              {daily.time.slice(0, 7).map((date, index) => {
                const dayName =
                  index === 0 ? "TODAY" : days[new Date(date).getDay()];
                const weatherIcon = getWeatherIcon(
                  daily.weather_code[index],
                  true
                );
                const maxTemp = Math.round(daily.temperature_2m_max[index]);
                const minTemp = Math.round(daily.temperature_2m_min[index]);
                const precipitation =
                  daily.precipitation_probability_max?.[index] || 0;

                return (
                  <div
                    key={index}
                    className="flex-shrink-0 w-20 p-3 transition-all duration-300 border shadow-lg bg-gradient-to-br from-white/15 to-white/5 border-white/20 rounded-xl backdrop-blur-sm hover:from-white/20 hover:to-white/10 hover:border-white/30"
                  >
                    <div className="space-y-2 text-center">
                      {/* Day */}
                      <div className="text-xs font-semibold tracking-wide text-white">
                        {dayName}
                      </div>

                      {/* Weather Icon */}
                      <div className="text-2xl filter drop-shadow-lg">
                        {weatherIcon}
                      </div>

                      {/* Precipitation - Only show if significant */}
                      {precipitation > 20 && (
                        <div className="flex items-center justify-center gap-1 px-2 py-1 text-xs rounded-full text-white/80 bg-white/10">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
                          </svg>
                          {precipitation}%
                        </div>
                      )}

                      {/* Temperatures */}
                      <div className="flex items-baseline justify-center gap-2">
                        <div className="text-lg font-bold text-white drop-shadow-sm">
                          {maxTemp}°
                        </div>
                        <div className="text-sm text-white/60">{minTemp}°</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hidden Scroll Indicator for Mobile */}
            <div className="flex justify-center mt-2">
              <div className="w-20 h-1 rounded-full bg-white/20"></div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  // Control Panel Component
  const ControlPanel = () => {
    if (!showControlsPanel) return null;

    return (
      <div className="fixed duration-300 top-52 right-4 z-1000 w-80 animate-in slide-in-from-right">
        <div className="border shadow-2xl bg-gradient-to-br from-white/10 to-white/5 border-white/20 rounded-2xl backdrop-blur-2xl">
          <div className="p-6">
            {/* Header - Glass Morphism Style */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shadow-lg bg-white/80"></div>
                <h3 className="text-xs font-semibold tracking-wide text-white">
                  MAP LAYERS
                </h3>
              </div>
              <button
                onClick={toggleControlsPanel}
                className="flex items-center justify-center w-6 h-6 transition-all duration-200 border rounded-full bg-white/10 hover:bg-white/20 border-white/20"
              >
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Control Items with Better Spacing */}
            <div className="flex gap-1.5 flex-column">
              <button
                onClick={() =>
                  toggleLayer("tempLayer", showTemperature, setShowTemperature)
                }
                className={`w-full px-4 py-2 rounded-4 rounded-2xl font-semibold text-white transition-all duration-300 border-2 backdrop-blur-sm text-left group ${
                  showTemperature
                    ? "bg-gradient-to-br from-white/20 to-white/10 border-white/40 shadow-lg"
                    : "bg-white/5 border-white/25 hover:bg-white/10 hover:border-white/35"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`text-2xl transition-transform duration-300 group-hover:scale-110 ${
                      showTemperature ? "scale-110" : "scale-100"
                    }`}
                  >
                    🌡️
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 text-sm font-semibold">
                      Temperature
                    </div>
                    <div className="text-xs opacity-70">
                      {showTemperature
                        ? "Layer visible on map"
                        : "Layer hidden"}
                    </div>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full border-2 border-white/50 transition-all duration-300 ${
                      showTemperature
                        ? "bg-green-400/80 border-green-400"
                        : "bg-transparent"
                    }`}
                  ></div>
                </div>
              </button>

              <button
                onClick={() =>
                  toggleLayer("pressureLayer", showPressure, setShowPressure)
                }
                className={`w-full px-4 py-2 rounded-4 rounded-2xl font-semibold text-white transition-all duration-300 border-2 backdrop-blur-sm text-left group ${
                  showPressure
                    ? "bg-gradient-to-br from-white/20 to-white/10 border-white/40 shadow-lg"
                    : "bg-white/5 border-white/25 hover:bg-white/10 hover:border-white/35"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`text-2xl transition-transform duration-300 group-hover:scale-110 ${
                      showPressure ? "scale-110" : "scale-100"
                    }`}
                  >
                    📊
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 text-sm font-semibold">Pressure</div>
                    <div className="text-xs opacity-70">
                      {showPressure ? "Layer visible on map" : "Layer hidden"}
                    </div>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full border-2 border-white/50 transition-all duration-300 ${
                      showPressure
                        ? "bg-green-400/80 border-green-400"
                        : "bg-transparent"
                    }`}
                  ></div>
                </div>
              </button>

              <button
                onClick={() =>
                  toggleLayer("precipitationLayer", showStorm, setShowStorm)
                }
                className={`w-full px-4 py-2 rounded-4 rounded-2xl font-semibold text-white transition-all duration-300 border-2 backdrop-blur-sm text-left group ${
                  showStorm
                    ? "bg-gradient-to-br from-white/20 to-white/10 border-white/40 shadow-lg"
                    : "bg-white/5 border-white/25 hover:bg-white/10 hover:border-white/35"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`text-2xl transition-transform duration-300 group-hover:scale-110 ${
                      showStorm ? "scale-110" : "scale-100"
                    }`}
                  >
                    ⛈️
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 text-sm font-semibold">
                      Storm Layers
                    </div>
                    <div className="text-xs opacity-70">
                      {showStorm ? "Layer visible on map" : "Layer hidden"}
                    </div>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full border-2 border-white/50 transition-all duration-300 ${
                      showStorm
                        ? "bg-green-400/80 border-green-400"
                        : "bg-transparent"
                    }`}
                  ></div>
                </div>
              </button>

              <button
                onClick={togglePortMarkers}
                className={`w-full px-4 py-2 rounded-4 rounded-2xl font-semibold text-white transition-all duration-300 border-2 backdrop-blur-sm text-left group ${
                  showPorts
                    ? "bg-gradient-to-br from-white/20 to-white/10 border-white/40 shadow-lg"
                    : "bg-white/5 border-white/25 hover:bg-white/10 hover:border-white/35"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`text-2xl transition-transform duration-300 group-hover:scale-110 ${
                      showPorts ? "scale-110" : "scale-100"
                    }`}
                  >
                    ⚓
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 text-sm font-semibold">Ports</div>
                    <div className="text-xs opacity-70">
                      {showPorts ? "Markers visible on map" : "Markers hidden"}
                    </div>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full border-2 border-white/50 transition-all duration-300 ${
                      showPorts
                        ? "bg-green-400/80 border-green-400"
                        : "bg-transparent"
                    }`}
                  ></div>
                </div>
              </button>

              {/* Logout Button with Different Styling */}
              <div className="pt-2">
                <button
                  onClick={() => navigate("/")}
                  className="w-full px-4 py-2 rounded-4 font-semibold text-white transition-all duration-300 border-2 border-white/25 bg-white/5 backdrop-blur-sm text-left group hover:bg-red-500/20 hover:border-red-400/50 hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl transition-transform duration-300 group-hover:scale-110">
                      ←
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 text-sm font-semibold">
                        Account Logout
                      </div>
                      <div className="text-xs opacity-70">
                        Return to login screen
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-transparent border-2 rounded-full border-white/50"></div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Updated Toggle Button with better positioning
  const ControlToggleButton = () => (
    <div className="fixed top-24 right-4 z-1000">
      <button
        onClick={toggleControlsPanel}
        className={`p-4 bg-gradient-to-br from-white/10 to-white/5 border rounded-4 backdrop-blur-2xl shadow-2xl hover:scale-105 transition-all duration-300 ${
          showControlsPanel ? "border-white/30 bg-white/20" : "border-white/20"
        }`}
      >
        {/* Hamburger/Layers Icon */}
        <div className="relative w-4 h-4">
          <div
            className={`absolute left-0 w-6 h-0.5 bg-white transition-all duration-300 ${
              showControlsPanel ? "rotate-45 top-3" : "top-1"
            }`}
          ></div>
          <div
            className={`absolute left-0 w-6 h-0.5 bg-white transition-all duration-300 ${
              showControlsPanel ? "opacity-0" : "opacity-100 top-3"
            }`}
          ></div>
          <div
            className={`absolute left-0 w-6 h-0.5 bg-white transition-all duration-300 ${
              showControlsPanel ? "-rotate-45 top-3" : "top-5"
            }`}
          ></div>
        </div>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0C0623] to-slate-800">
      {/* Navbar */}
      <Navbar />

      {/* Map */}
      <div id="map" className="absolute inset-0 z-0 mt-16" />
      <MarineVisualizer lat={selectedLat} lng={selectedLng} />

      {/* Control Toggle Button - Always accessible */}
      <ControlToggleButton />

      {/* Control Panel - Positioned below the toggle button */}
      <ControlPanel />

      {/* Forecast Panel */}
      <ForecastPanel />

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex items-center gap-4 p-6 border border-white/20 bg-white/10 rounded-2xl backdrop-blur-2xl">
            <div className="w-8 h-8 border-b-2 border-white rounded-full animate-spin"></div>
            <div className="text-lg text-white">
              Loading {loadingType === "weather" ? "Weather" : "Wave"} Data...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
