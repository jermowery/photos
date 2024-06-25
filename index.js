debugger;

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?client_id=571566489456-ureuiro3o91lnkt60ehmn7leuku8kra5.apps.googleusercontent.com&redirect_uri=http://localhost:8080&response_type=token&scope=https://www.googleapis.com/auth/photoslibrary.readonly https://www.googleapis.com/auth/photoslibrary.sharing";

const accessToken = new URLSearchParams(window.location.hash.substring(1)).get(
  "access_token"
);

// file://wsl.localhost/Ubuntu-18.04/home/jermowery/photos/index.html#access_token=ya29.a0AXooCgvsFc1lU_4PVoz2NapHDVjrAFlaTeegBbAM69WLXNLZ24hpMj8GLUqxv6NN_tpRO8dyGtvbFBdawEkZp67lvIPFfLRAXl3Pt75328SUTCnK0kQcgjLWjVOgkW2tAocKB51GN0AESQ1NcdzmZiRy65qP5dcA5gaCgYKATMSARISFQHGX2MizZDt0LISBLF0m1yJwAOKEQ0169

// file:///home/jermowery/photos/index.html#access_token=ya29.a0AXooCgu56fevBu4WOq73PklTJVgNPUwi7e8K_b1Rs9z7dsVHK6e_xIccQtNQBOlemIO-FmLeusSeMGdocIuxxGGxZaa5yGjrK9gZyX-rYWbwNrDis7O17ANzLw0xaVJ3tlDIkkVJMEimQNzTdWYo4bqs1RKDAD9nXwaCgYKAQkSARISFQHGX2MiQdrjsfCBB0-qg1AOZacZ6g0169&token_type=Bearer&expires_in=3599&scope=https://www.googleapis.com/auth/photoslibrary.readonly%20https://www.googleapis.com/auth/photoslibrary.sharing

// google-chrome --disable-web-security --user-data-dir=/dev/null

if (!accessToken) {
  window.location.href = authUrl;
}

const listAlbumsUrl =
  "https://photoslibrary.googleapis.com/v1/albums?pageSize=50";

const searchUrl = "https://photoslibrary.googleapis.com/v1/mediaItems:search";

(async () => {
  // try {
  //   let albumsResponse = await fetch(listAlbumsUrl, {
  //     headers: {
  //       Authorization: `Bearer ${accessToken}`,
  //       "Content-Type": "application/json",
  //     },
  //     method: "GET",
  //   });

  //   let albums = await albumsResponse.json();

  //   console.error(albums);

  //   // while (albums.nextPageToken) {
  //   //   albumsResponse = await fetch(listAlbumsUrl, {
  //   //     headers: {
  //   //       Authorization: `Bearer ${accessToken}`,
  //   //       "Content-Type": "application/json",
  //   //     },

  //   //     method: "GET",
  //   //   });
  //   // }
  // } catch (e) {
  //   console.error("Failed to fetch albums", e);
  //   return;
  // }

  const photos = [];

  try {
    await addPhotos(photos);
  } catch (e) {
    console.error("failed to get all photos", e);
  }

  const output = JSON.stringify(photos, undefined, 2);
  console.log(output);

  const file = new File([output], "photos_dump.json", {
    type: "application/json",
  });

  const link = document.createElement("a");
  const url = URL.createObjectURL(file);

  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
})();

async function addPhotos(photos, nextPageToken) {
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
    photos.push({
      url: mediaItem.baseUrl,
      description: mediaItem.description,
      creationTime: mediaItem.mediaMetadata?.creationTime,
      aperture: mediaItem.mediaMetadata?.photo?.apertureFNumber,
      focalLength: mediaItem.mediaMetadata?.photo?.focalLength,
      iso: mediaItem.mediaMetadata?.photo?.isoEquivalent,
      shutterSpeed: mediaItem.mediaMetadata?.photo?.exposureTime,
      cameraMake: mediaItem.mediaMetadata?.photo?.cameraMake,
      cameraModel: mediaItem.mediaMetadata?.photo?.cameraModel,
      creator: mediaItem.contributorInfo?.displayName,
    });
  }

  const countElement = document.getElementById("count");
  countElement.textContent = photos.length;

  if (results.nextPageToken) {
    await addPhotos(photos, results.nextPageToken);
  }
}
