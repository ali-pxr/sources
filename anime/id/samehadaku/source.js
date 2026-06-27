function searchResults(html) {
    const results = [];

    const filmListRegex = /<article[^>]*class="animpost[\s\S]*?<\/article>/g;
    const items = html.match(filmListRegex) || [];

    items.forEach((itemHtml) => {
        const titleMatch = itemHtml.match(/<h2>([^<]+)<\/h2>/);
        const hrefMatch = itemHtml.match(/<a[^>]*href="([^"]+)"[^>]*>/);
        const imgMatch = itemHtml.match(/<img[^>]+src="([^"]+)"[^>]+class="anmsa"/);

        const title = titleMatch ? titleMatch[1].trim() : '';
        const href = hrefMatch ? hrefMatch[1].trim() : '';
        const imageUrl = imgMatch ? imgMatch[1].trim() : '';

        if (title && href) {
            results.push({ title, href, image: imageUrl });
        }
    });
    console.log(results);
    return results;
}

function extractDetails(html) {
    const details = [];
 
    const descriptionMatch = html.match(/<div class="entry-content entry-content-single" itemprop="description">\s*<p>([\s\S]*?)<\/p>/);
    const description = descriptionMatch ? descriptionMatch[1].trim() : 'N/A';
 
    const japaneseMatch = html.match(/<span><b>Japanese<\/b>\s*([^<]+)<\/span>/);
    const aliases = japaneseMatch ? japaneseMatch[1].trim() : 'N/A';
 
    const airdateMatch = html.match(/<span><b>Released:<\/b>\s*([^<]+)<\/span>/);
    const airdate = airdateMatch ? airdateMatch[1].trim() : 'N/A';
 
    if (description && airdate) {
        details.push({
            description: description,
            aliases: aliases,
            airdate: airdate
        });
    }
 
    console.log(details); 
    return details;
 }
 

 function extractEpisodes(html) {
    const episodes = [];
    const regex = /<li>.*?<a href="([^"]+)".*?>(\d+)<\/a>.*?<span class="date">([^<]+)<\/span>/g;
    
    let match;
    while ((match = regex.exec(html)) !== null) {
        episodes.push({
            href: match[1],
            number: match[2],
        });
    }
    console.log(episodes.reverse());
    return episodes.reverse();
}

function extractStreamUrl(html) {
    const scriptRegex = /VIDEO_CONFIG\s*=\s*({.*?"streams":\[\{.*?"play_url":"([^"]+)".*?\}.*?\]})/s;
    const match = html.match(scriptRegex);
    const streamUrl = match ? match[2] : null;
    console.log(streamUrl); 
    return streamUrl;
}





