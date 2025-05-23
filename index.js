const weatherEndpoint =
  "https://api.weather.gov/gridpoints/SEW/124,69/forecast/hourly";
const airQualityEndpoint =
  "https://www.airnowapi.org/aq/observation/zipCode/current/?format=application/json&zipCode=98109&distance=25&API_KEY=023C7554-7950-48FC-806C-28F20B534CFD";

async function setDateAndTime() {
  const time = document.getElementById("time");
  time.textContent = new Date().toLocaleTimeString("en-US", {
    timeStyle: "short",
  });

  const date = document.getElementById("date");
  date.textContent = new Date().toLocaleDateString("en-US", {
    weekday: `long`,
    month: `long`,
    day: `numeric`,
    year: `numeric`,
  });

  const airQualityResponsePromise = fetch(airQualityEndpoint);

  const weatherResponsePromise = fetch(weatherEndpoint);
  const weatherResponse = await weatherResponsePromise;
  const weatherData = await weatherResponse.json();
  const weatherPeriods = weatherData.properties.periods;
  const period = weatherPeriods.find((period) => {
    const startTime = new Date(period.startTime).getTime();
    const endTime = new Date(period.endTime).getTime();
    const now = Date.now();

    return now >= startTime && now <= endTime;
  });

  const tempertureElement = document.getElementById("temperature");
  tempertureElement.innerHTML = `&nbsp;${period.temperature}°F/${Math.round(
    (period.temperature - 32) * (5 / 9)
  )}°C, ${period.shortForecast}`;
  const tempertureIconElement = document.getElementById("temperature-icon");
  tempertureIconElement.src = period.icon;

  const airQualityResponse = await airQualityResponsePromise;
  const airQualityData = await airQualityResponse.json();
  const { AQI, Category } = airQualityData.find(
    (data) => data.ParameterName === "PM2.5"
  );
  const airQualityName = Category.Name;
  let airQualityIcon = "🟢";
  switch (airQualityName) {
    case "Good":
      airQualityIcon = "🟢";
      break;
    case "Moderate":
      airQualityIcon = "🟡";
      break;
    case "Unhealthy for Sensitive Groups":
      airQualityIcon = "🟠";
      break;
    case "Unhealthy":
      airQualityIcon = "🔴";
      break;
    case "Very Unhealthy":
      airQualityIcon = "🟣";
      break;
    case "Hazardous":
      airQualityIcon = "⚫";
      break;
  }

  const airQualityElement = document.getElementById("air-quality");
  airQualityElement.textContent = `${airQualityIcon} ${AQI} AQI, ${airQualityName}`;
}

setDateAndTime();

setInterval(() => {
  setDateAndTime();
}, 1000 * 60);
