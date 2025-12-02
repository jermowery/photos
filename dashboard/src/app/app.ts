import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  Component,
  computed,
  resource,
  OnDestroy,
  linkedSignal,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { firstValueFrom, interval, map } from 'rxjs';
import { createApi } from 'unsplash-js';
import { z } from 'zod';
import 'onebusaway-sdk/shims/web';
import { ArrivalAndDepartureListResponse } from 'onebusaway-sdk/resources/arrival-and-departure';

const unsplashApi = createApi({
  accessKey: '6U2sy2FY2rvAYb4L3jjaEG6xzf88PEO_h4myO0Zpsfo',
});

const OPEN_WEATHER_MAP_API_KEY = '8c72a7709e2d03dad3384c8050906f83';
const ONE_BUS_AWAY_API_KEY = 'c396ee76-1981-4b4f-af23-0250e9a8a7cc';

function oneBusAwayRequestUrl(stopId: string) {
  return (
    `https://api.pugetsound.onebusaway.org/api/where/arrivals-and-departures-for-stop/` +
    `${stopId}.json?key=${ONE_BUS_AWAY_API_KEY}&minutesBefore=1`
  );
}

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

const oneBusAwayArivalAndDepartureListResponseSchema = z.object({
  currentTime: z.number(),
  data: z.object({
    entry: z.object({
      arrivalsAndDepartures: z.array(
        z.object({
          tripId: z.string(),
          scheduledArrivalTime: z.number(),
          predictedArrivalTime: z.number(),
          tripHeadsign: z.string(),
          routeShortName: z.string(),
        }),
      ),
    }),
  }),
});

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  imports: [DatePipe, MatProgressSpinner, DecimalPipe, MatIcon, MatProgressBar, NgTemplateOutlet],
})
export class App implements OnDestroy {
  private readonly httpClient = inject(HttpClient);

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

      const httpResponse = await firstValueFrom(
        this.httpClient.get(urlString, { responseType: 'blob' }),
      );
      await httpResponse.arrayBuffer(); // Wait for download to complete

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

  protected readonly southboundNextDepartures = httpResource(
    () => oneBusAwayRequestUrl('1_26510'),
    { parse: oneBusAwayArivalAndDepartureListResponseSchema.parse },
  );

  protected readonly northboundNextDepartures = httpResource(
    () => oneBusAwayRequestUrl('1_26860'),
    { parse: oneBusAwayArivalAndDepartureListResponseSchema.parse },
  );

  private readonly tenMinutesIntervalId = setInterval(
    () => {
      this.currentWeather.reload();
      this.currentAirQuality.reload();
    },
    1_000 * 60 * 10, // every 10 minutes
  );

  private readonly thirtySecondsIntervalId = setInterval(
    () => {
      this.southboundNextDepartures.reload();
    },
    1_000 * 60, // every 60 seconds
  );

  ngOnInit() {
    setTimeout(() => {
      setInterval(
        () => {
          this.northboundNextDepartures.reload();
        },
        1_000 * 60, // every 60 seconds
      );
    }, 1_000 * 30); // stagger by 30 seconds
  }

  ngOnDestroy() {
    clearInterval(this.tenMinutesIntervalId);
    clearInterval(this.thirtySecondsIntervalId);
  }

  protected reloadPhoto() {
    this.randomUnsplashImage.reload();
  }

  protected minutesUntil(timestamp: number, currentTime: number): number {
    return Math.round((timestamp - currentTime) / 60000);
  }
}
