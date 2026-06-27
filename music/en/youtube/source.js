const PLACEHOLDER_IMAGE =
  "https://media.istockphoto.com/id/1147544807/vector/thumbnail-image-vector-graphic.jpg";

const API_BASE =
  "https://nyrvhfehnenscndsjuep.supabase.co/functions/v1/youtube";

async function searchResults(keyword) {
  try {
    const response = await fetch(
      `${API_BASE}?action=search&q=${encodeURIComponent(keyword)}`
    );

    const json = await response.json();

    const results = (json.videos || []).map(video => ({
      title: video.title,
      image:
        video.thumbnail ||
        video.thumbnails?.[0]?.url ||
        PLACEHOLDER_IMAGE,
      href: video.videoId
    }));

    return JSON.stringify(results);
  } catch (error) {
    console.error(error);
    return JSON.stringify([]);
  }
}

async function extractDetails(videoId) {
  try {
    const response = await fetch(
      `${API_BASE}?action=video&id=${encodeURIComponent(videoId)}`
    );

    const json = await response.json();

    return JSON.stringify([
      {
        description: json.description || "",
        aliases: json.author || json.channel || "",
        airdate: json.publishDate || "N/A"
      }
    ]);
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

    const json = await response.json();

    return JSON.stringify({
      streams: [
        "Audio",
        json.url
      ]
    });
  } catch (error) {
    console.error(error);
    return null;
  }
}
