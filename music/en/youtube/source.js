const PLACEHOLDER_IMAGE =
  "https://www.youtube.com/s/desktop/f506bd45/img/favicon_144x144.png";

const API_BASE =
  "https://nyrvhfehnenscndsjuep.supabase.co/functions/v1/youtube";

async function searchResults(keyword) {
  try {
    const response = await fetch(
      `${API_BASE}?action=search&q=${encodeURIComponent(keyword)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();

    const results = (json.tracks || []).map(track => ({
      title: track.title,
      image: track.cover || PLACEHOLDER_IMAGE,
      href: track.ytId
    }));

    console.log(JSON.stringify(results));
    return JSON.stringify(results);
  } catch (error) {
    console.error(error);
    return JSON.stringify([]);
  }
}

async function extractDetails(videoId) {
  try {
    const response = await fetch(
      `${API_BASE}?action=video&videoId=${encodeURIComponent(videoId)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();

    const details = [
      {
        description: json.title || "",
        aliases: json.artist || "",
        airdate: json.publishDate || "N/A"
      }
    ];

    console.log(JSON.stringify(details));
    return JSON.stringify(details);
  } catch (error) {
    console.error(error);
    return JSON.stringify([]);
  }
}

async function extractEpisodes(videoId) {
  return JSON.stringify([
    {
      number: 1,
      href: videoId
    }
  ]);
}

async function extractStreamUrl(videoId) {
  try {
    const response = await fetch(
      `${API_BASE}?action=stream&videoId=${encodeURIComponent(videoId)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();

    if (!json.url) {
      throw new Error("No stream URL returned.");
    }

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
