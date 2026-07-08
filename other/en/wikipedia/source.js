const API = "https://en.wikipedia.org/w/api.php";

async function searchResults(keyword) {
    const url =
        `${API}?action=parse&page=List_of_films_in_the_public_domain_in_the_United_States` +
        `&prop=links&format=json&origin=*`;

    const response = await fetch(url);
    const data = await response.json();

    const links = data.parse.links.filter(link =>
        link.ns === 0 &&
        link["*"].toLowerCase().includes(keyword.toLowerCase())
    );

    const results = await Promise.all(
        links.map(async (link) => {
            try {
                const summary = await fetch(
                    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(link["*"])}`
                ).then(r => r.json());

                return {
                    title: summary.title,
                    href: summary.content_urls.desktop.page,
                    image: summary.thumbnail?.source ?? "",
                };
            } catch {
                return null;
            }
        })
    );

    return JSON.stringify(results.filter(Boolean));
}
