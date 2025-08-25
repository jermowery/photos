import { Component, computed, resource, signal } from '@angular/core';
import { createApi } from 'unsplash-js';

const unsplashApi = createApi({
  accessKey: '6U2sy2FY2rvAYb4L3jjaEG6xzf88PEO_h4myO0Zpsfo',
});

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
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
    return image.urls.full;
  });
}
