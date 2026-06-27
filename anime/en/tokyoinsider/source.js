async function searchResults(keyword) {
    try {
      const response = await fetch("https://www.tokyoinsider.com/anime/list");
      const html = await response;
      const regex = /<div class="c_h2b?">\s*<img[^>]*>\s*<a href="([^"]+)">([^<]+)<\/a>/g;
      let match;
      const animeList = [];
      while ((match = regex.exec(html)) !== null) {
        animeList.push({
          title: match[2].trim(),
          href: `https://www.tokyoinsider.com${match[1]}`
        });
      }
      const filteredResults = animeList.filter(anime =>
        anime.title.toLowerCase().includes(keyword.toLowerCase())
      );
      const transformedResults = await Promise.all(filteredResults.map(async (anime) => {
        const animePageResponse = await fetch(anime.href);
        const animePageHtml = await animePageResponse.text();
        const imageRegex = /<meta property="og:image" content="([^"]+)"/;
        const imageMatch = imageRegex.exec(animePageHtml);
        if (!imageMatch) {
          console.log("No valid image match found for:", anime.title);
        }
        const imageUrl = imageMatch ? imageMatch[1] : "";
        return {
          title: anime.title,
          image: imageUrl,
          href: `https://www.tokyoinsider.com/anime/o/${anime.title.replace(/\s+/g, "_")}`
        };
      }));
      console.log(transformedResults);
      return JSON.stringify(transformedResults);
    } catch (error) {
      console.log("Fetch error:", error);
      return JSON.stringify([{ title: "Error", image: "", href: "" }]);
    }
  }  

  async function extractDetails(url) {
    try {
        const response = await fetch(url);
        const pageHtml = await response;

        const descriptionRegex = /<td[^>]*>\s*<b>Summary:<\/b>\s*<\/td>\s*<td[^>]*>(.*?)<\/td>/s;        
        const descriptionMatch = pageHtml.match(descriptionRegex);

        const transformedResults = [{
            description: descriptionMatch ? descriptionMatch[1].trim() : 'No description available',
            aliases: 'N/A',
            airdate: 'N/A',
        }];
        console.log(transformedResults);

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error:', error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'N/A',
            airdate: 'N/A',
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        const response = await fetch(url);
        const data = await response;

        const hrefRegex = /<a class="download-link" href="([^"]+)">.*?<em>episode<\/em>.*?<strong>(\d+)<\/strong>/g;

        let hrefMatch;
        const episodes = [];

        while ((hrefMatch = hrefRegex.exec(data)) !== null) {
            episodes.push({
                href: `https://www.tokyoinsider.com${hrefMatch[1]}`,
                number: hrefMatch[2]
            });
        }
        console.log(episodes.reverse());

        return JSON.stringify(episodes.reverse());

    } catch (error) {
        console.log('Fetch error:', error);
    }
}

async function extractStreamUrl(url) {
    try {
        const response = await fetch(url);
        const data = await response;

        const match = data.match(/href="([^"]+\.mp4)"/);
        console.log(match ? match[1] : null);
        return match ? match[1] : null;
    } catch (error) {
        console.log('Fetch error:', error);
        return null;
    }
}
