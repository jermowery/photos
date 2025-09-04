import { DatePipe } from '@angular/common';
import { Component, computed, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';
import { createApi } from 'unsplash-js';

const unsplashApi = createApi({
  accessKey: '6U2sy2FY2rvAYb4L3jjaEG6xzf88PEO_h4myO0Zpsfo',
});

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  imports: [DatePipe],
})
export class App {
  protected readonly title = signal('dashboard');
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
}
