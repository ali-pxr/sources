const PLACEHOLDER_IMAGE = "https://media.istockphoto.com/id/1147544807/vector/thumbnail-image-vector-graphic.jpg";

const API_BASE = "https://nyrvhfehnenscndsjuep.supabase.co/functions/v1/soundcloud";

async function searchResults(keyword) {
    try {
        const response = await fetch(
            `${API_BASE}?action=search&q=${encodeURIComponent(keyword)}`
        );

        const json = await response.json();

        const results = (json.tracks || []).map(track => ({
            title: track.title,
            image: track.cover || PLACEHOLDER_IMAGE,
            href: String(track.scId)
        }));

        console.log(JSON.stringify(results));
        return JSON.stringify(results);
    } catch (error) {
        console.error(error);
        return JSON.stringify([]);
    }
}

async function extractDetails(trackId) {
    try {
        const response = await fetch(
            `${API_BASE}?action=search&q=${encodeURIComponent(trackId)}&limit=1`
        );

        const json = await response.json();
        const track = json.tracks?.[0];

        const details = [{
            description: track?.title || "N/A",
            aliases: track?.artist || "Unknown Artist",
            airdate: "N/A"
        }];

        console.log(JSON.stringify(details));
        return JSON.stringify(details);
    } catch {
        return JSON.stringify([]);
    }
}

async function extractEpisodes(trackId) {
    return JSON.stringify([
        {
            number: 1,
            href: trackId
        }
    ]);
}

async function extractStreamUrl(trackId) {
    try {
        const response = await fetch(
            `${API_BASE}?action=stream&trackId=${trackId}`
        );

        const json = await response.json();

        const result = {
            streams: [
                "Audio",
                json.url
            ]
        };

        console.log(JSON.stringify(result));
        return JSON.stringify(result);
    } catch (error) {
        console.error(error);
        return null;
    }
}
