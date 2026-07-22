const PEXELS_BASE = "https://api.pexels.com/v1";

/**
 * Search Pexels for an image matching the given keyword and orientation.
 * Returns the first result's medium-sized image URL, or null if none found.
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
    url.searchParams.set("per_page", "1");

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

    // Return the medium-sized image URL
    return data.photos[0].src.medium;
}