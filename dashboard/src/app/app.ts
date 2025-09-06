import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, resource, OnDestroy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { interval, map } from 'rxjs';
import { createApi } from 'unsplash-js';
import { z } from 'zod';

const unsplashApi = createApi({
  accessKey: '6U2sy2FY2rvAYb4L3jjaEG6xzf88PEO_h4myO0Zpsfo',
});

const OPEN_WEATHER_MAP_API_KEY = '8c72a7709e2d03dad3384c8050906f83';

const currentWeatherResponseSchema = z.object({
  weather: z
    .object({
      id: z.number(),
      main: z.string(),
      description: z.string(),
      icon: z.string(),
    })
    .array(),
  main: z.object({
    temp: z.number(),
    humidity: z.number(),
  }),
  wind: z.object({
    speed: z.number(),
  }),
});

const currentAirQualityResponseSchema = z.array(
  z.object({
    ParameterName: z.string(),
    AQI: z.number(),
    Category: z.object({
      Name: z.string(),
    }),
  }),
);

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  imports: [DatePipe, MatProgressSpinner, DecimalPipe],
})
export class App implements OnDestroy {
  private readonly repeatEveryMinute = toSignal(interval(1_000 * 60));
  private readonly randomUnsplashImage = resource({
    loader: async () =>
      await unsplashApi.photos.getRandom({
        query: 'cute animals',
        count: 1,
        contentFilter: 'high',
        orientation: 'landscape',
      }),
  });
  protected readonly backgroundImageUrl = computed<string | null>(() => {
    if (!this.randomUnsplashImage.hasValue()) {
      return null;
    }
    const response = this.randomUnsplashImage.value().response;
    const image = Array.isArray(response) ? response[0] : response;
    if (!image) {
      return null;
    }
    return image.urls.regular;
  });
  protected readonly currentDate = toSignal(interval(1_000 * 60).pipe(map(() => new Date())), {
    initialValue: new Date(),
  });
  protected readonly currentWeather = httpResource(
    () =>
      'https://api.openweathermap.org/data/2.5/weather?lat=47.6208447&lon=-122.3457759' +
      `&appid=${OPEN_WEATHER_MAP_API_KEY}&units=imperial`,
    { parse: currentWeatherResponseSchema.parse },
  );
  protected readonly currentAirQuality = httpResource(
    () =>
      'https://www.airnowapi.org/aq/observation/zipCode/current/?format=application/json' +
      '&zipCode=98109&distance=25&API_KEY=023C7554-7950-48FC-806C-28F20B534CFD',
    { parse: currentAirQualityResponseSchema.parse },
  );
  private readonly highestAqiAndCategory = computed(() => {
    if (!this.currentAirQuality.hasValue()) {
      return null;
    }
    const observations = this.currentAirQuality.value();
    if (observations.length === 0) {
      return null;
    }
    // Find the observation with the highest AQI
    const observation = observations.reduce((prev, current) =>
      prev.AQI > current.AQI ? prev : current,
    );
    return {
      aqi: observation.AQI,
      category: observation.Category.Name,
      parameter: observation.ParameterName,
    };
  });
  protected readonly aqiParameter = computed(() => {
    return this.highestAqiAndCategory()?.parameter ?? 'N/A';
  });
  protected readonly aqiCategory = computed(() => {
    return this.highestAqiAndCategory()?.category ?? 'Good';
  });
  protected readonly aqiCategoryIcon = computed(() => {
    const category = this.aqiCategory();
    let airQualityIcon = '🟢';
    switch (category) {
      case 'Good':
        airQualityIcon = '🟢';
        break;
      case 'Moderate':
        airQualityIcon = '🟡';
        break;
      case 'Unhealthy for Sensitive Groups':
        airQualityIcon = '🟠';
        break;
      case 'Unhealthy':
        airQualityIcon = '🔴';
        break;
      case 'Very Unhealthy':
        airQualityIcon = '🟣';
        break;
      case 'Hazardous':
        airQualityIcon = '⚫';
        break;
    }
    return airQualityIcon;
  });
  protected readonly aqi = computed(() => this.highestAqiAndCategory()?.aqi ?? 0);

  private readonly intervalId = setInterval(
    () => {
      this.currentWeather.reload();
      this.currentAirQuality.reload();
    },
    1_000 * 60 * 10, // every 10 minutes
  );

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }
}
