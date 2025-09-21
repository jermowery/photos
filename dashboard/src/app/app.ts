import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, resource, OnDestroy, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
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
  imports: [DatePipe, MatProgressSpinner, DecimalPipe, MatIcon, MatProgressBar],
})
export class App implements OnDestroy {
  private readonly randomUnsplashImage = resource({
    loader: async () => {
      const { response } = await unsplashApi.photos.getRandom({
        count: 1,
        orientation: 'landscape',
        collectionIds: ['bofgKPsR7eg'], // Cute animals
      });
      const image = Array.isArray(response) ? response[0] : response;
      return image ?? null;
    },
  });
  protected readonly backgroundImageUrl = resource({
    params: () => {
      if (!this.randomUnsplashImage.hasValue()) {
        return null;
      }
      return this.randomUnsplashImage.value();
    },
    loader: async ({ params }) => {
      if (!params) {
        return null;
      }
      const url = new URL(params.urls.raw); // Validate URL
      url.searchParams.set('w', '1920');
      url.searchParams.set('h', '1080');
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('fm', 'webp');
      const urlString = url.toString();

      await fetch(urlString);

      return urlString;
    },
  });
  protected readonly backgroundImageUrlOrPrevious = linkedSignal({
    source: this.backgroundImageUrl.value,
    computation: (url, previous) => url ?? previous,
  });
  protected readonly backgroundImageMetdata = computed(() => {
    const image = this.randomUnsplashImage.value();
    if (!image) {
      return null;
    }
    const exifParts: string[] = [];
    if (image.exif.make) {
      exifParts.push(image.exif.make);
      if (image.exif.model) {
        exifParts.push(image.exif.model);
      }
    }
    if (image.exif.focal_length) {
      exifParts.push(`${image.exif.focal_length}mm`);
    }
    if (image.exif.aperture) {
      exifParts.push(`ƒ/${image.exif.aperture}`);
    }
    if (image.exif.exposure_time) {
      exifParts.push(`${image.exif.exposure_time}s`);
    }
    if (image.exif.iso) {
      exifParts.push(`ISO ${image.exif.iso}`);
    }
    return {
      description: image.alt_description,
      authorName: image.user.name,
      authorProfileImageUrl: image.user.profile_image.medium,
      location: image.location.city,
      exif: exifParts.length > 0 ? exifParts.join(', ') : null,
    };
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

  protected reloadPhoto() {
    this.randomUnsplashImage.reload();
  }
}
