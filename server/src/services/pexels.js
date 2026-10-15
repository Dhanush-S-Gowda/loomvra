const PEXELS_BASE = "https://api.pexels.com/v1";

/**
 * Search Pexels for an image matching the given keyword and orientation.
 * Returns an original, sufficiently large image URL, or null if none found.
 *
 * @param {string} apiKey - Pexels API key
 * @param {string} keyword - Search keyword
 * @param {"landscape"|"portrait"|"square"} orientation - Image orientation
 * @returns {Promise<string|null>} The image URL or null
 */
export async function searchImage(apiKey, keyword, orientation) {
    const url = new URL(`${PEXELS_BASE}/search`);
    url.searchParams.set("query", keyword);
    url.searchParams.set("orientation", orientation);
    url.searchParams.set("per_page", "30");

    const response = await fetch(url.toString(), {
        headers: {
            Authorization: apiKey,
        },
    });

    if (!response.ok) {
        console.error(`Pexels API error: ${response.status} ${response.statusText}`);
        return null;
    }

    const data = await response.json();

    if (!data.photos || data.photos.length === 0) {
        console.warn(`No Pexels results for keyword: "${keyword}"`);
        return null;
    }

    // Prefer 1080p-native images, with 720p as a minimum fallback.
    const suitablePhoto =
        data.photos.find((photo) => photo.height >= 1080) ??
        data.photos.find((photo) => photo.height >= 720) ??
        data.photos.reduce((largest, photo) =>
            photo.height > largest.height ? photo : largest,
        );

    return suitablePhoto.src.original;
}

export async function searchImages(apiKey, keyword, orientation = "landscape", count = 5) {
    const url = new URL(`${PEXELS_BASE}/search`);
    url.searchParams.set("query", keyword);
    url.searchParams.set("orientation", orientation);
    url.searchParams.set("per_page", String(Math.min(Math.max(Number(count) || 5, 1), 8)));
    const response = await fetch(url.toString(), { headers: { Authorization: apiKey } });
    if (!response.ok) throw new Error(`Pexels API error: ${response.status}`);
    const data = await response.json();
    return (data.photos || []).map((photo) => ({
        id: photo.id,
        url: photo.src?.original,
        thumbnail: photo.src?.medium,
        alt: photo.alt || keyword,
        photographer: photo.photographer,
    }));
}
