import { DatePipe, DecimalPipe, JsonPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, resource } from '@angular/core';
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

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  imports: [DatePipe, MatProgressSpinner, JsonPipe, DecimalPipe],
})
export class App {
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
    () => {
      return `https://api.openweathermap.org/data/2.5/weather?lat=47.6208447&lon=-122.3457759&appid=${OPEN_WEATHER_MAP_API_KEY}&units=imperial`;
    },
    { parse: currentWeatherResponseSchema.parse },
  );

  constructor() {
    setInterval(
      () => {
        this.currentWeather.reload();
      },
      1_000 * 60 * 10,
    );
  }
}
