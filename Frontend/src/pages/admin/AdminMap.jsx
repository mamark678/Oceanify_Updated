// src/pages/Admin/AdminMaps.jsx
import { createClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { createEnhancedPopup } from "../../components/PopupContent";
import mindanaoPorts from "../../data/ports.json";
import MarineVisualizer from "../../marineVisualizer/MarineVisualizer";

export default function AdminMaps() {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const warningMarkersRef = useRef([]);
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
  const [forecastData, setForecastData] = useState(null);
  const [showForecastPanel, setShowForecastPanel] = useState(false);
  const [showControlsPanel, setShowControlsPanel] = useState(false);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  const [clickedLocation, setClickedLocation] = useState(null);

  // Rescue button states
  const [showRescueConfirm, setShowRescueConfirm] = useState(false);
  const [rescueCountdown, setRescueCountdown] = useState(10);
  const [rescuePendingLocation, setRescuePendingLocation] = useState(null);
  const [rescuePendingReason, setRescuePendingReason] = useState(null);
  const [rescueActive, setRescueActive] = useState(false);

  // Alerts - CAREFUL: This is sensitive functionality
  const [alerts, setAlerts] = useState([]);

  // Current location state
  const [currentLocation, setCurrentLocation] = useState(null);

  // CONFIG: thresholds & grid step
  const GRID_STEP = 0.5;
  const THRESHOLDS = {
    wind_speed_kmh: 50,
    wind_gust_kmh: 70,
    precipitation_mm_h: 15,
    wave_height_m: 2.5,
  };

  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

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

  // Create wave data popup content
  const createWavePopup = (
    waveData,
    lat,
    lng,
    locationName = "Selected Location"
  ) => {
    const formatValue = (value, unit = "", decimals = 1) => {
      if (value === null || value === undefined) return "N/A";
      if (typeof value === "number") {
        return decimals === 0
          ? `${Math.round(value)}${unit}`
          : `${value.toFixed(decimals)}${unit}`;
      }
      return `${value}${unit}`;
    };

    return `
      <div style="min-width: 280px; padding: 12px;">
        <div style="text-align: center; margin-bottom: 16px;">
          <h3 style="margin: 0 0 4px 0; color: #2c3e50; font-size: 18px; font-weight: bold;">
            🌊 Wave Conditions
          </h3>
          <div style="color: #7f8c8d; font-size: 12px;">
            ${locationName}
          </div>
          <div style="color: #95a5a6; font-size: 11px; margin-top: 4px;">
            ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E
          </div>
        </div>

        <div style="background: linear-gradient(135deg, #74b9ff, #0984e3); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 24px; font-weight: bold; color: white;">
                ${formatValue(waveData?.current?.wave_height, " m", 1)}
              </div>
              <div style="font-size: 12px; color: rgba(255,255,255,0.9);">Wave Height</div>
            </div>
            <div style="font-size: 32px;">🌊</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          <div style="background: #f8f9fa; padding: 8px; border-radius: 6px; text-align: center;">
            <div style="font-size: 12px; color: #7f8c8d; margin-bottom: 4px;">Wave Direction</div>
            <div style="font-size: 14px; font-weight: bold; color: #2c3e50;">
              ${degToCompass(waveData?.current?.wave_direction)}
            </div>
          </div>
          <div style="background: #f8f9fa; padding: 8px; border-radius: 6px; text-align: center;">
            <div style="font-size: 12px; color: #7f8c8d; margin-bottom: 4px;">Swell Height</div>
            <div style="font-size: 14px; font-weight: bold; color: #2c3e50;">
              ${formatValue(waveData?.current?.swell_wave_height, " m", 1)}
            </div>
          </div>
        </div>

        <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <div style="font-size: 12px; font-weight: bold; color: #2c3e50; margin-bottom: 8px;">Swell Details</div>
          <div style="display: grid; gap: 6px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span style="color: #7f8c8d;">Primary Direction:</span>
              <span style="font-weight: bold; color: #2c3e50;">${degToCompass(
                waveData?.current?.swell_wave_direction
              )}</span>
            </div>
            <div style="display: flex; justify-content: between; font-size: 11px;">
              <span style="color: #7f8c8d;">Secondary Height:</span>
              <span style="font-weight: bold; color: #2c3e50;">${formatValue(
                waveData?.current?.secondary_swell_wave_height,
                " m",
                1
              )}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span style="color: #7f8c8d;">Secondary Period:</span>
              <span style="font-weight: bold; color: #2c3e50;">${formatValue(
                waveData?.current?.secondary_swell_wave_period,
                "s",
                1
              )}</span>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <button 
            onclick="window.viewWeatherData(${lat}, ${lng}, '${locationName.replace(
      /'/g,
      "\\'"
    )}')"
            style="
              flex: 1;
              padding: 8px 12px;
              background: linear-gradient(135deg, #ff6b6b, #ee5a52);
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 11px;
              font-weight: 600;
            "
          >
            View Weather
          </button>
          <button 
            onclick="window.closePopup()"
            style="
              padding: 8px 12px;
              background: #95a5a6;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 11px;
              font-weight: 600;
            "
          >
            Close
          </button>
        </div>
      </div>
    `;
  };

  /* -----------------------
     Rescue flow functions
     ----------------------- */

  const requestRescueAt = (lat, lng, reason = "Unknown") => {
    setRescuePendingLocation({ lat, lng });
    setRescuePendingReason(reason);
    setRescueCountdown(10);
    setShowRescueConfirm(true);
  };

  const confirmRescue = async (
    overrideLocation = null,
    overrideReason = null
  ) => {
    const loc = overrideLocation || rescuePendingLocation;
    const reason = overrideReason || rescuePendingReason || "Unknown";

    if (!loc) {
      alert("No location selected for rescue.");
      setShowRescueConfirm(false);
      return;
    }

    setShowRescueConfirm(false);
    setRescueActive(true);

    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation&timezone=auto&wind_speed_unit=kmh&precipitation_unit=mm`;
      const waveUrl = `https://api.open-meteo.com/v1/marine?latitude=${loc.lat}&longitude=${loc.lng}&current=wave_height,wave_direction&timezone=auto`;

      const [weatherRes, waveRes] = await Promise.all([
        fetch(weatherUrl),
        fetch(waveUrl),
      ]);

      const weatherData = weatherRes.ok ? await weatherRes.json() : null;
      const waveData = waveRes.ok ? await waveRes.json() : null;

      const emergencyData = {
        timestamp: new Date().toISOString(),
        latitude: loc.lat,
        longitude: loc.lng,
        reason,
        weather: weatherData?.current || {},
        marine: waveData?.current || {},
        note: "client-side rescue request (logged locally)",
      };

      let backendOk = false;
      try {
        const resp = await fetch("/api/emergency", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emergencyData),
        });
        if (resp.ok) backendOk = true;
      } catch (err) {
        console.warn("Backend unreachable. Falling back to local log.", err);
      }

      // Place SOS marker on map
      if (mapRef.current && window.L) {
        const L = window.L;
        const sosIcon = L.divIcon({
          html: `<div class="sos-icon">🆘</div>`,
          iconSize: [56, 56],
          iconAnchor: [28, 28],
        });

        L.marker([loc.lat, loc.lng], { icon: sosIcon })
          .addTo(mapRef.current)
          .bindPopup(
            `<div class="p-3 bg-gradient-to-br from-red-900/90 to-orange-900/70 rounded-xl border border-red-500/30 backdrop-blur-sm">
              <b class="text-white">🆘 EMERGENCY</b><br/>
              <span class="text-red-200">Reason: ${reason}</span><br/>
              <span class="text-blue-200 text-sm">${new Date().toLocaleString()}</span>
            </div>`
          )
          .openPopup();
      }

      // Save locally
      try {
        const logs = JSON.parse(localStorage.getItem("rescueLogs") || "[]");
        logs.unshift({
          ...emergencyData,
          persistedAt: new Date().toISOString(),
          backendOk,
        });
        localStorage.setItem("rescueLogs", JSON.stringify(logs));
      } catch (err) {
        console.warn("Failed to persist rescue log", err);
      }

      console.log("Rescue event logged:", { ...emergencyData, backendOk });
      alert(
        "🆘 Rescue request recorded. Admin has been notified (or saved locally)."
      );

      setTimeout(() => setRescueActive(false), 10000);
    } catch (err) {
      console.error("confirmRescue error:", err);
      alert("Failed to send rescue request — saved locally.");
      setRescueActive(false);
    }
  };

  const cancelRescue = () => {
    setShowRescueConfirm(false);
    setRescueCountdown(10);
    setRescuePendingLocation(null);
    setRescuePendingReason(null);
  };

  // Countdown effect
  useEffect(() => {
    if (showRescueConfirm && rescueCountdown > 0) {
      const t = setTimeout(() => setRescueCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    } else if (showRescueConfirm && rescueCountdown === 0) {
      confirmRescue();
    }
  }, [showRescueConfirm, rescueCountdown]);

  // Add port markers to map
  const addPortMarkers = (map) => {
    const L = window.L;
    if (!L || !mindanaoPorts?.ports_of_mindanao) return;

    // Clear existing port markers
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
            <div style="color: #7f8c8d; font-size: 11px; margin-bottom: 16px;">
              Coordinates: ${port.latitude.toFixed(
                4
              )}°N, ${port.longitude.toFixed(4)}°E
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
                  transition: all 0.2s ease;
                "
                onmouseover="this.style.transform='scale(1.02)'"
                onmouseout="this.style.transform='scale(1)'"
              >
                🌤️ View Weather Data
              </button>
              
              <button 
                onclick="window.viewWaveData(${port.latitude}, ${
        port.longitude
      }, '${port.port_name.replace(/'/g, "\\'")}')"
                style="
                  padding: 10px 16px;
                  background: linear-gradient(135deg, #74b9ff, #0984e3);
                  color: white;
                  border: none;
                  border-radius: 8px;
                  cursor: pointer;
                  font-size: 12px;
                  font-weight: 600;
                  transition: all 0.2s ease;
                "
                onmouseover="this.style.transform='scale(1.02)'"
                onmouseout="this.style.transform='scale(1)'"
              >
                🌊 View Wave Data
              </button>
            </div>
          </div>
        `);

      portMarkersRef.current.push(marker);
    });

    // Add global functions for data selection
    window.viewWeatherData = async (lat, lng, locationName) => {
      await fetchLocationData(lat, lng, locationName, "weather");
    };

    window.viewWaveData = async (lat, lng, locationName) => {
      await fetchLocationData(lat, lng, locationName, "waves");
    };

    window.selectDataType = async (lat, lng, dataType) => {
      await fetchLocationData(lat, lng, "Selected Location", dataType);
    };

    window.closePopup = () => {
      if (markerRef.current) {
        markerRef.current.closePopup();
      }
    };

    window.closeSelectionPopup = () => {
      if (markerRef.current) {
        mapRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
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
      } else if (dataType === "waves" && waveData?.current) {
        // Create wave data popup
        const wavePopupContent = createWavePopup(
          waveData,
          lat,
          lng,
          locationName
        );

        const waveIcon = L.divIcon({
          html: `<div style="background: linear-gradient(135deg, #74b9ff, #0984e3); color:white; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold; border:3px solid white; box-shadow:0 3px 10px rgba(0,0,0,0.3);">${
            waveData.current.wave_height != null
              ? waveData.current.wave_height.toFixed(1) + "m"
              : "🌊"
          }</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
        });

        markerRef.current = L.marker([lat, lng], { icon: waveIcon })
          .addTo(mapRef.current)
          .bindPopup(wavePopupContent, {
            maxWidth: 320,
            className: "wave-popup",
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

  /* -----------------------
     Map init + storm scanning
     ----------------------- */

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
      } catch (err) {
        console.error("Failed to load Leaflet", err);
      }
    };

    const clearWarningMarkers = () => {
      if (!mapRef.current) return;
      const L = window.L;
      (warningMarkersRef.current || []).forEach((m) => {
        try {
          if (mapRef.current.hasLayer(m)) mapRef.current.removeLayer(m);
        } catch (e) {}
      });
      warningMarkersRef.current = [];
    };

    const addWarningMarker = (lat, lng, summary, details = {}) => {
      if (!mapRef.current || !window.L) return;
      const L = window.L;

      const marker = L.circleMarker([lat, lng], {
        radius: 16,
        color: "#ff8c00",
        fillColor: "#ffb86b",
        fillOpacity: 0.8,
        weight: 3,
      }).addTo(mapRef.current);

      const popupHtml = `
        <div class="min-w-[240px] p-3 bg-gradient-to-br from-orange-900/90 to-yellow-900/70 rounded-xl border border-orange-500/30 backdrop-blur-sm">
          <h3 class="text-white font-bold mb-2 flex items-center gap-2">
            <span>⚠️</span>
            Strong Storm Area
          </h3>
          <div class="text-orange-200 text-sm mb-3">
            ${summary}
          </div>
          <div class="text-orange-300 text-xs mb-3 space-y-1">
            <div><b>Wind:</b> ${details.wind_speed ?? "N/A"} km/h</div>
            <div><b>Gust:</b> ${details.wind_gust ?? "N/A"} km/h</div>
            <div><b>Wave:</b> ${details.wave_height ?? "N/A"} m</div>
            <div><b>Precip:</b> ${details.precipitation ?? "N/A"} mm</div>
          </div>
          <div class="flex gap-2">
            <button class="request-rescue-btn flex-1 px-3 py-2 rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white font-semibold border-none cursor-pointer transition-all hover:scale-105" data-lat="${lat}" data-lng="${lng}">
              Request Rescue
            </button>
            <button class="view-more-btn flex-1 px-3 py-2 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 text-white border-none cursor-pointer transition-all hover:scale-105" data-lat="${lat}" data-lng="${lng}">
              Details
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      warningMarkersRef.current.push(marker);
    };

    const scanStormsInBounds = async () => {
      if (!mapRef.current || !window.L) return;
      const map = mapRef.current;
      clearWarningMarkers();

      const bounds = map.getBounds();
      const north = bounds.getNorth();
      const south = bounds.getSouth();
      const west = bounds.getWest();
      const east = bounds.getEast();

      const latSteps = [];
      for (
        let lat = Math.max(-89.5, south);
        lat <= Math.min(89.5, north);
        lat = +(lat + GRID_STEP).toFixed(6)
      ) {
        latSteps.push(lat);
      }
      const lngSteps = [];
      let normalizedWest = west;
      let normalizedEast = east;
      if (east < west) normalizedEast = east + 360;
      for (
        let lng = normalizedWest;
        lng <= normalizedEast;
        lng = +(lng + GRID_STEP).toFixed(6)
      ) {
        const normalizedLng = ((lng + 540) % 360) - 180;
        lngSteps.push(normalizedLng);
      }

      const points = [];
      for (const lat of latSteps) {
        for (const lng of lngSteps) {
          points.push({ lat, lng });
        }
      }

      const MAX_POINTS = 80;
      const chunked = points.slice(0, MAX_POINTS);

      const concurrency = 5;
      for (let i = 0; i < chunked.length; i += concurrency) {
        const batch = chunked.slice(i, i + concurrency);
        await Promise.all(
          batch.map(async (pt) => {
            try {
              const marineUrl = `https://api.open-meteo.com/v1/marine?latitude=${pt.lat}&longitude=${pt.lng}&current=wave_height&timezone=auto`;
              const marineRes = await fetch(marineUrl);
              if (!marineRes.ok) return;
              const marineJson = await marineRes.json();
              if (
                !marineJson?.current ||
                marineJson.current.wave_height == null
              ) {
                return;
              }

              const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${pt.lat}&longitude=${pt.lng}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation&timezone=auto&wind_speed_unit=kmh&precipitation_unit=mm`;
              const weatherRes = await fetch(weatherUrl);
              if (!weatherRes.ok) return;
              const weatherJson = await weatherRes.json();
              const w = weatherJson?.current || {};

              const wave_h = Number(marineJson.current.wave_height ?? 0);
              const wind_s = Number(w.wind_speed_10m ?? 0);
              const wind_g = Number(w.wind_gusts_10m ?? 0);
              const precip = Number(w.precipitation ?? 0);

              const isSevere =
                wave_h >= THRESHOLDS.wave_height_m ||
                wind_s >= THRESHOLDS.wind_speed_kmh ||
                wind_g >= THRESHOLDS.wind_gust_kmh ||
                precip >= THRESHOLDS.precipitation_mm_h;

              if (isSevere) {
                const summaryParts = [];
                if (wind_s >= THRESHOLDS.wind_speed_kmh)
                  summaryParts.push(`Wind ${Math.round(wind_s)} km/h`);
                if (wind_g >= THRESHOLDS.wind_gust_kmh)
                  summaryParts.push(`Gust ${Math.round(wind_g)} km/h`);
                if (wave_h >= THRESHOLDS.wave_height_m)
                  summaryParts.push(`Wave ${wave_h.toFixed(1)} m`);
                if (precip >= THRESHOLDS.precipitation_mm_h)
                  summaryParts.push(`Precip ${precip} mm`);
                const summary =
                  summaryParts.join(" • ") || "Strong marine conditions";

                addWarningMarker(pt.lat, pt.lng, summary, {
                  wind_speed: Math.round(wind_s),
                  wind_gust: Math.round(wind_g),
                  wave_height: wave_h,
                  precipitation: precip,
                });
              }
            } catch (err) {
              // ignore per-point errors
            }
          })
        );
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
      // Weather layers
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

      tempLayer.addTo(map);
      map.tempLayer = tempLayer;
      map.pressureLayer = pressureLayer;
      map.precipitationLayer = precipitationLayer;

      setMapLoaded(true);

      // Add port markers
      addPortMarkers(map);

      // Center on user if available
      navigator.geolocation.getCurrentPosition(
        ({ coords: { latitude, longitude } }) => {
          const userIcon = L.divIcon({
            html: `<div class="user-location-marker"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
          L.marker([latitude, longitude], { icon: userIcon }).addTo(map)
            .bindPopup(`
              <div class="p-3 bg-gradient-to-br from-blue-900/90 to-purple-900/70 rounded-xl border border-blue-500/30 backdrop-blur-sm">
                <div class="text-white font-bold flex items-center gap-2">
                  <span>📍</span>
                  Your Location
                </div>
                <div class="text-blue-200 text-sm mt-1">
                  ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E
                </div>
              </div>
            `);

          // Set current location and fetch forecast
          setCurrentLocation({ lat: latitude, lng: longitude });
          fetchForecastData(latitude, longitude);

          map.setView([latitude, longitude], 7);
        },
        (err) => console.warn("Geolocation error:", err),
        { enableHighAccuracy: true, timeout: 10000 }
      );

      // Map click handler
      map.on("click", async (e) => {
        const { lat, lng } = e.latlng;
        setSelectedLat(lat);
        setSelectedLng(lng);
        setLoading(true);

        try {
          // Fetch forecast data when clicking on map
          await fetchForecastData(lat, lng);

          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto&wind_speed_unit=kmh&precipitation_unit=mm`;
          const waveUrl = `https://api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=wave_height,wave_direction,swell_wave_height&timezone=auto`;

          const [weatherResponse, waveResponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(waveUrl),
          ]);
          const weatherData = weatherResponse.ok
            ? await weatherResponse.json()
            : null;
          const waveData = waveResponse.ok ? await waveResponse.json() : null;

          if (markerRef.current && map.hasLayer(markerRef.current)) {
            map.removeLayer(markerRef.current);
            markerRef.current = null;
          }

          if (weatherData?.current) {
            const { current } = weatherData;

            const formatValue = (value, unit = "", decimals = 1) =>
              value == null
                ? "N/A"
                : typeof value === "number"
                ? decimals === 0
                  ? `${Math.round(value)}${unit}`
                  : `${value.toFixed(decimals)}${unit}`
                : `${value}${unit}`;

            let popupContent = createEnhancedPopup(
              weatherData,
              waveData,
              lat,
              lng,
              getWeatherDescription,
              degToCompass,
              formatValue
            );

            // Add rescue buttons to popup
            const customButtons = `
              <div class="mt-3 flex gap-2">
                <button class="custom-rescue-btn flex-1 px-3 py-2 rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white font-semibold border-none cursor-pointer transition-all hover:scale-105" data-lat="${lat}" data-lng="${lng}">
                  Custom Rescue
                </button>
                <button class="quick-rescue-btn flex-1 px-3 py-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold border-none cursor-pointer transition-all hover:scale-105" data-lat="${lat}" data-lng="${lng}">
                  Quick Rescue
                </button>
              </div>`;

            markerRef.current = window.L.marker([lat, lng], {
              icon: window.L.divIcon({
                html: `<div class="weather-marker">${
                  current.temperature_2m != null
                    ? Math.round(current.temperature_2m) + "°"
                    : "?"
                }</div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 18],
              }),
            })
              .addTo(map)
              .bindPopup(popupContent + customButtons, {
                maxWidth: 420,
                className: "weather-popup",
              })
              .openPopup();
          }
        } catch (err) {
          console.warn("Weather fetch failed", err);
        } finally {
          setLoading(false);
        }
      });

      // Popup event handlers
      map.on("popupopen", function (e) {
        const container = e.popup && e.popup._contentNode;
        if (!container) return;

        const quick = container.querySelector(".quick-rescue-btn");
        if (quick) {
          quick.onclick = (ev) => {
            const lat = parseFloat(quick.dataset.lat);
            const lng = parseFloat(quick.dataset.lng);
            requestRescueAt(lat, lng, "Quick rescue (user clicked popup)");
          };
        }

        const customBtn = container.querySelector(".custom-rescue-btn");
        if (customBtn) {
          customBtn.onclick = () => {
            const lat = parseFloat(customBtn.dataset.lat);
            const lng = parseFloat(customBtn.dataset.lng);
            const reason = prompt(
              "Enter rescue reason (e.g. 'sinking', 'engine malfunction', 'medical emergency'):",
              "sinking"
            );
            if (reason) {
              requestRescueAt(lat, lng, reason);
            }
          };
        }

        const requestBtn = container.querySelector(".request-rescue-btn");
        if (requestBtn) {
          requestBtn.onclick = () => {
            const lat = parseFloat(requestBtn.dataset.lat);
            const lng = parseFloat(requestBtn.dataset.lng);
            requestRescueAt(lat, lng, "Storm area rescue request");
          };
        }

        const viewBtn = container.querySelector(".view-more-btn");
        if (viewBtn) {
          viewBtn.onclick = () => {
            const lat = parseFloat(viewBtn.dataset.lat);
            const lng = parseFloat(viewBtn.dataset.lng);
            map.setView([lat, lng], Math.max(map.getZoom(), 9));
          };
        }
      });

      // Initial scan and movement handlers
      setTimeout(() => {
        scanStormsInBounds();
      }, 1200);

      map.on("moveend", () => {
        clearWarningMarkers();
        scanStormsInBounds();
      });
    };

    loadLeaflet();

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
      }
    };
  }, []);

  // Layer toggle function
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

  // 🔹 Fixed: Fetch alerts from Laravel API
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        console.log("🔄 Fetching alerts from Laravel...");

        const response = await fetch("http://localhost:8000/api/alerts", {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        console.log("📡 Response status:", response.status);

        if (response.ok) {
          const data = await response.json();
          console.log("✅ Alerts fetched successfully:", data);
          setAlerts(data);
        } else {
          console.error("❌ Failed to fetch alerts:", response.status);
          setAlerts([]);
        }
      } catch (error) {
        console.error("❌ Error fetching alerts:", error);
        setAlerts([]);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);

    return () => clearInterval(interval);
  }, []);

  // Toggle controls panel
  const toggleControlsPanel = () => {
    setShowControlsPanel(!showControlsPanel);
    // Close alerts panel when opening controls
    if (!showControlsPanel) {
      setShowAlertsPanel(false);
    }
  };

  // Toggle alerts panel
  const toggleAlertsPanel = () => {
    setShowAlertsPanel(!showAlertsPanel);
    // Close controls panel when opening alerts
    if (!showAlertsPanel) {
      setShowControlsPanel(false);
    }
  };

  // Horizontal Forecast Panel Component
  const ForecastPanel = () => {
    // Use selected location if available, otherwise use current location
    const displayLocation =
      selectedLat !== null
        ? { lat: selectedLat, lng: selectedLng }
        : currentLocation;

    if (!showForecastPanel || !forecastData?.daily || !displayLocation)
      return null;

    const { daily } = forecastData;
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    // Get location name for display
    const getLocationName = () => {
      if (selectedLat !== null) {
        return "Selected Location";
      }
      return "Your Location";
    };

    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-1000 max-w-[95vw]">
        <div className="border shadow-2xl bg-gradient-to-br from-white/10 to-white/5 border-white/20 rounded-2xl backdrop-blur-2xl">
          <div className="p-4">
            {/* Header - Glass Morphism Style */}
            <div className="relative flex items-center justify-center mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white">
                  7-DAY FORECAST - {getLocationName()}
                </h3>
                <div className="text-xs text-white/60">
                  {displayLocation.lat.toFixed(2)}°N,{" "}
                  {displayLocation.lng.toFixed(2)}°E
                </div>
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

  // Alerts Panel Component
  const AlertsPanel = () => {
    if (!showAlertsPanel) return null;

    return (
      <div className="fixed duration-300 top-72 right-4 z-1000 w-80 animate-in slide-in-from-right">
        <div className="border shadow-2xl bg-gradient-to-br from-red-900/90 to-orange-900/70 border-red-500/30 rounded-2xl backdrop-blur-2xl">
          <div className="p-6">
            {/* Header - Glass Morphism Style */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-400 rounded-full shadow-lg"></div>
                <h3 className="text-sm font-semibold tracking-wide text-white">
                  MARINE ALERTS
                </h3>
              </div>
              <button
                onClick={toggleAlertsPanel}
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

            {/* Alerts Content */}
            <div className="space-y-3 overflow-y-auto max-h-64">
              {alerts.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mb-2 text-4xl">🌊</div>
                  <div className="mb-1 text-sm text-white/70">
                    No active alerts
                  </div>
                  <div className="text-xs text-white/50">
                    Storm warnings and safety notices will appear here
                  </div>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 border border-red-500/20 rounded-xl bg-gradient-to-br from-red-800/50 to-orange-800/30 backdrop-blur-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-xl">⚠️</div>
                      <div className="flex-1">
                        <div className="mb-1 text-sm font-semibold text-white">
                          {alert.title || "Alert"}
                        </div>
                        <div className="mb-2 text-sm text-white/90">
                          {alert.message}
                        </div>
                        <div className="text-xs text-red-200/80">
                          {new Date(alert.time).toLocaleString()} ({alert.type})
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Toggle Buttons
  const ControlToggleButton = () => (
    <div className="fixed flex flex-col gap-3 top-24 right-4 z-1000">
      {/* Layers Toggle */}
      <button
        onClick={toggleControlsPanel}
        className={`p-4 bg-gradient-to-br from-white/10 to-white/5 border rounded-2xl backdrop-blur-2xl shadow-2xl hover:scale-105 transition-all duration-300 ${
          showControlsPanel ? "border-white/30 bg-white/20" : "border-white/20"
        }`}
      >
        <div className="relative w-6 h-6">
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

      {/* Alerts Toggle */}
      <button
        onClick={toggleAlertsPanel}
        className={`p-4 bg-gradient-to-br from-red-500/20 to-orange-500/10 border rounded-2xl backdrop-blur-2xl shadow-2xl hover:scale-105 transition-all duration-300 ${
          showAlertsPanel
            ? "border-red-400/50 bg-red-500/30"
            : "border-red-500/30"
        }`}
      >
        <div className="relative flex items-center justify-center w-6 h-6">
          <div className="text-lg text-white">⚠️</div>
          {alerts.length > 0 && (
            <div className="absolute flex items-center justify-center w-5 h-5 bg-red-500 rounded-full -top-1 -right-1">
              <span className="text-xs font-bold text-white">
                {alerts.length}
              </span>
            </div>
          )}
        </div>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0C0623] to-slate-800">
      {/* Navbar - Fixed at the top */}
      <Navbar />

      {/* Map */}
      <div id="map" className="absolute inset-0 z-0" />

      <MarineVisualizer lat={selectedLat} lng={selectedLng} />

      {/* Toggle Buttons */}
      <ControlToggleButton />

      {/* Control Panel */}
      <ControlPanel />

      {/* Alerts Panel */}
      <AlertsPanel />

      {/* Forecast Panel */}
      <ForecastPanel />

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex items-center gap-4 p-6 border border-white/20 bg-white/10 rounded-2xl backdrop-blur-2xl">
            <div className="w-8 h-8 border-b-2 border-white rounded-full animate-spin"></div>
            <div className="text-lg text-white">Loading Weather Details...</div>
          </div>
        </div>
      )}

      {/* Rescue Confirmation Modal */}
      {showRescueConfirm && rescuePendingLocation && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-lg p-7 border-4 border-red-500 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-[0_24px_80px_rgba(239,68,68,0.25)]">
            <div className="mb-4 text-center">
              <div className="mb-2 text-6xl">🆘</div>
              <h2 className="mb-1 text-lg font-bold text-white">
                CONFIRM EMERGENCY RESCUE
              </h2>
              <p className="text-sm text-gray-400">
                Auto-sending in {rescueCountdown} second
                {rescueCountdown !== 1 ? "s" : ""}...
              </p>
            </div>

            <div className="p-3 mb-4 text-white rounded-lg bg-white/5">
              <p className="mb-1">
                <strong>📍 Location:</strong>{" "}
                {rescuePendingLocation.lat.toFixed(4)},{" "}
                {rescuePendingLocation.lng.toFixed(4)}
              </p>
              <p className="text-xs text-gray-300">
                Reason:{" "}
                <strong className="text-white">{rescuePendingReason}</strong>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => confirmRescue(null, null)}
                className="flex-1 py-3 font-bold text-white transition-all duration-200 rounded-lg bg-gradient-to-br from-red-500 to-red-600 hover:scale-105"
              >
                SEND NOW
              </button>
              <button
                onClick={cancelRescue}
                className="flex-1 py-3 font-bold text-white transition-all duration-200 bg-gray-600 rounded-lg hover:scale-105"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
