// const authorization_code =
//   "4/0ATx3LY4JWLV5vTNJa3RhqCAYpBgbN8FXhGgxWkOGPJM52w1HqdYsKMR54ySK3iwF73YWcA";
const clientId =
  "571566489456-ureuiro3o91lnkt60ehmn7leuku8kra5.apps.googleusercontent.com";
// const redirectUri = "http://localhost:8080";
// const scope =
//   "https://www.googleapis.com/auth/photoslibrary.readonly https://www.googleapis.com/auth/photoslibrary.sharing";
const tokenUrl = "https://oauth2.googleapis.com/token";
const clientSecret = "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";
const refreshToken =
  "1//05gP-BaXmwmfWCgYIARAAGAUSNwF-L9Ir5GAfhIcjtsWfxNZUoz51Yr0bAWnDRzwZZC5rxymgrPNEQMeRZu5QiL_7rRSqfDfBaiU";
const weatherEndpoint =
  "https://api.weather.gov/gridpoints/SEW/124,69/forecast/hourly";

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

  const weatherResponse = await fetch(weatherEndpoint);
  const weatherData = await weatherResponse.json();
  const weatherPeriods = weatherData.properties.periods;
  const period = weatherPeriods.find((period) => {
    const startTime = new Date(period.startTime).getTime();
    const endTime = new Date(period.endTime).getTime();
    const now = Date.now();

    return now >= startTime && now <= endTime;
  });

  const tempertureElement = document.getElementById("temperature");
  tempertureElement.textContent = `${period.temperature}°F, ${period.shortForecast}`;
}

setDateAndTime();

setInterval(() => {
  setDateAndTime();
}, 1000 * 60);

async function getAccessToken() {
  const tokenExpirationMillis =
    Number(localStorage.getItem("tokenExpiration")) || -1;
  const accessToken = localStorage.getItem("accessToken");

  // An access token exists and the expiration time is in the future.
  if (accessToken && tokenExpirationMillis > Date.now()) {
    return accessToken;
  }

  const body = new URLSearchParams();
  body.append("client_id", clientId);
  body.append("client_secret", clientSecret);
  body.append("refresh_token", refreshToken);
  body.append("grant_type", "refresh_token");

  const tokenResponse = await fetch(tokenUrl, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    body,
  });

  const { access_token, expires_in } = await tokenResponse.json();
  localStorage.setItem("accessToken", access_token);
  localStorage.setItem(
    "tokenExpiration",
    String(Date.now() + expires_in * 1000)
  );
  return access_token;
}

// const accessToken = new URLSearchParams(window.location.hash.substring(1)).get(
//   "access_token"
// );

// file://wsl.localhost/Ubuntu-18.04/home/jermowery/photos/index.html#access_token=ya29.a0AXooCgvsFc1lU_4PVoz2NapHDVjrAFlaTeegBbAM69WLXNLZ24hpMj8GLUqxv6NN_tpRO8dyGtvbFBdawEkZp67lvIPFfLRAXl3Pt75328SUTCnK0kQcgjLWjVOgkW2tAocKB51GN0AESQ1NcdzmZiRy65qP5dcA5gaCgYKATMSARISFQHGX2MizZDt0LISBLF0m1yJwAOKEQ0169

// file:///home/jermowery/photos/index.html#access_token=ya29.a0AXooCgu56fevBu4WOq73PklTJVgNPUwi7e8K_b1Rs9z7dsVHK6e_xIccQtNQBOlemIO-FmLeusSeMGdocIuxxGGxZaa5yGjrK9gZyX-rYWbwNrDis7O17ANzLw0xaVJ3tlDIkkVJMEimQNzTdWYo4bqs1RKDAD9nXwaCgYKAQkSARISFQHGX2MiQdrjsfCBB0-qg1AOZacZ6g0169&token_type=Bearer&expires_in=3599&scope=https://www.googleapis.com/auth/photoslibrary.readonly%20https://www.googleapis.com/auth/photoslibrary.sharing

// google-chrome --disable-web-security --user-data-dir=/dev/null

// http://localhost:8080/#access_token=ya29.a0AXooCgtCcfLDoCzxMrTPM5kaUEM_nybzVk-fh5yCogFH-WJvFTPLxcHhQBMyutNlLOGGbUrmyFDza43Xc70hPMi5Z4O-DLrRKb6jZvWAnVvf1IkUJShGxSbUgFtKA2gHyvjubUIapuEG3XrDCTqZGcMLB9PZ7gkDugaCgYKAbYSARISFQHGX2MitGmXhyVlnd6FGsX-_v7JTg0169&token_type=Bearer&expires_in=3599&scope=https://www.googleapis.com/auth/photoslibrary.readonly

const listAlbumsUrl =
  "https://photoslibrary.googleapis.com/v1/albums?pageSize=50";

const searchUrl = "https://photoslibrary.googleapis.com/v1/mediaItems:search";

async function updatePhoto() {
  const now = Date.now();
  const cacheExpirationTime = Number(localStorage.getItem("cacheExpiration"));
  if (now > cacheExpirationTime) {
    await setupPhotosCache();
    localStorage.setItem("cacheExpiration", String(now + 1000 * 60 * 60 * 24));
  }

  const photosRaw = localStorage.getItem("photos");

  if (!photosRaw) {
    console.error("No photos found!");
    return;
  }

  const photos = JSON.parse(photosRaw);

  if (photos.length === 0) {
    console.error("No photos found!");
    return;
  }

  const tenPercentOfArray = Math.floor(photos.length / 10);

  const shouldShowMoreRecentPhoto = Math.random() < 0.8;

  const index = shouldShowMoreRecentPhoto
    ? Math.floor(Math.random() * tenPercentOfArray)
    : Math.floor(Math.random() * (photos.length - tenPercentOfArray)) +
      tenPercentOfArray;

  const id = photos[index];

  const photo = await getPhoto(id);

  const url = `${photo.baseUrl}=w1920-h1080`;

  const preloadLink = document.createElement("link");
  preloadLink.href = url;
  preloadLink.rel = "preload";
  preloadLink.as = "image";
  document.head.appendChild(preloadLink);
  preloadLink.addEventListener("load", () => {
    document.body.style.backgroundImage = `url(${url})`;

    const photoDate = new Date(photo.mediaMetadata.creationTime);
    const photoDateElement = document.getElementById("photo-date");

    photoDateElement.textContent = photoDate.toLocaleDateString("en-US", {
      month: `long`,
      day: `numeric`,
      year: `numeric`,
    });

    const photoDescriptionElement =
      document.getElementById("photo-description");
    photoDescriptionElement.textContent = photo.description || "";

    const photoAuthorElement = document.getElementById("photo-author");
    photoAuthorElement.textContent = photo.contributorInfo?.displayName || "";

    const photoCameraInfoElement = document.getElementById("photo-camera-info");

    let photoInfo = "";

    if (photo.mediaMetadata.photo.cameraMake) {
      photoInfo += `${photo.mediaMetadata.photo.cameraMake} `;
    }
    if (photo.mediaMetadata.photo.cameraModel) {
      photoInfo += `${photo.mediaMetadata.photo.cameraModel} `;
    }
    if (photo.mediaMetadata.photo.focalLength) {
      photoInfo += `${photo.mediaMetadata.photo.focalLength}mm `;
    }
    if (photo.mediaMetadata.photo.apertureFNumber) {
      photoInfo += `f/${photo.mediaMetadata.photo.apertureFNumber} `;
    }

    photoCameraInfoElement.textContent = photoInfo;

    document.head.removeChild(preloadLink);
  });
}

updatePhoto();

setInterval(() => {
  updatePhoto();
}, 1000 * 10);

async function getPhoto(id) {
  const accessToken = await getAccessToken();
  const photoResponse = await fetch(
    `https://photoslibrary.googleapis.com/v1/mediaItems/${id}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return await photoResponse.json();
}

async function setupPhotosCache() {
  const photos = [];

  try {
    await addPhotos(photos);
  } catch (e) {
    console.error("failed to get all photos", e);
  }

  localStorage.setItem("photos", JSON.stringify(photos));
}

async function addPhotos(photos, nextPageToken) {
  const accessToken = await getAccessToken();
  const searchResponse = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      pageSize: 100,
      albumId:
        "AEZPKDpilFxZlbyNdWVyLtxkKGPaJDJHwzFSCY1OQBW30OUTslSBJEnrgLLGp9MWVTgK2BVPp87c",
      pageToken: nextPageToken,
    }),
  });

  const results = await searchResponse.json();

  if (!results.mediaItems) {
    console.error("Unexpected result value", results);
    return;
  }

  for (const mediaItem of results.mediaItems) {
    if (mediaItem.mimeType !== "image/jpeg") {
      continue;
    }
    photos.push(mediaItem.id);
  }

  if (results.nextPageToken) {
    await addPhotos(photos, results.nextPageToken);
  }
}
