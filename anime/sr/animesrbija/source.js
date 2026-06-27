function searchResults(html) {
    const results = [];
    const baseUrl = "https://www.animesrbija.com";
    const animeItems = html.match(/<div class="ani-item">.*?<\/h3><\/a><\/div>/gs) || [];
    
    animeItems.forEach(itemHtml => {
        const titleMatch = itemHtml.match(/<h3 class="ani-title"[^>]*>([^<]+)<\/h3>/);
        const hrefMatch = itemHtml.match(/<a href="([^"]+)"/);
        const imgMatch = itemHtml.match(/src="\/_next\/image\?url=([^&]+)&/);
        
        const title = titleMatch ? titleMatch[1].trim() : '';
        const href = hrefMatch ? baseUrl + hrefMatch[1].trim() : '';
        let imageUrl = '';
        if (imgMatch) {
            imageUrl = decodeURIComponent(imgMatch[1]);
            imageUrl = baseUrl + imageUrl;
        }
        if (title && href) {
            results.push({
                title,
                image: imageUrl,
                href
            });
        }
    });
    console.log(results);
    return results;
}

function extractDetails(html) {
    const details = [];

    const descriptionMatch = html.match(/<div class="anime-description">([\s\S]*?)<\/div>/);
    let description = descriptionMatch ? descriptionMatch[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/<br \/>\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() : '';


    const nameMatch = html.match(/<h2 class="anime-name[^>]*>([^<]+)<\/h2>/);
    const engNameMatch = html.match(/<h3 class="anime-eng-name">([^<]+)<\/h3>/);

    const airdateMatch = html.match(/<span class="bt">Datum:<\/span>([^<]+)/);
    let airdate = airdateMatch ? airdateMatch[1].trim() : '';

    let name = nameMatch ? nameMatch[1].trim() : '';
    let engName = engNameMatch ? engNameMatch[1].trim() : '';
    let aliases = name === engName ? 'N/A' : engName;

    if (description || airdate) {
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
    const baseUrl = 'https://www.animesrbija.com';    
    const episodeRegex = /<span class="anime-episode-num">([^<]+)<\/span><a class="anime-episode-link" href="([^"]+)">.*?<\/a>/g;
    
    let match;
    while ((match = episodeRegex.exec(html)) !== null) {
        const episodeText = match[1];  
        const href = baseUrl + match[2];
        
        let number;
        
        if (episodeText.toLowerCase() === 'film') {
            number = '1';  
        } else {
            const numberMatch = episodeText.match(/\d+/);
            number = numberMatch ? numberMatch[0] : '';
        }
        
        episodes.push({
            href: href,
            number: number
        });
    }
    
    episodes.reverse();
    console.log(episodes);
    return episodes;
}


function extractStreamUrl(html) {
    const player2Regex = /Player\s*2.*?(https?:\/\/[^\s"']+)/i;

    const match = html.match(player2Regex);
    if (match) {
        const player2Url = match[1].trim();
        console.log("URL", player2Url);
        return player2Url;
    } else {
        console.log("Link not found");
        return null;
    }
}

