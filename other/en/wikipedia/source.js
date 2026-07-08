const WIKI = "https://ar.wikipedia.org";

const API = `${WIKI}/w/api.php`;
const REST = `${WIKI}/api/rest_v1`;

async function searchResults(keyword) {
    try {
        const searchUrl =
            `${API}?action=query` +
            `&list=search` +
            `&srsearch=${encodeURIComponent(keyword)}` +
            `&srlimit=20` +
            `&format=json` +
            `&origin=*`;

        const response = await fetch(searchUrl);
        const data = await response.json();

        const results = await Promise.all(
            data.query.search.map(async item => {

                try {
                    const summary = await fetch(
                        `${REST}/page/summary/${encodeURIComponent(item.title)}`
                    ).then(r => r.json());


                    return {
                        title: summary.title,
                        href: `${WIKI}/wiki/${encodeURIComponent(item.title)}`,
                        image: summary.thumbnail
                            ? summary.thumbnail.source
                            : "",
                    };

                } catch {
                    return null;
                }
            })
        );


        return JSON.stringify(results.filter(Boolean));


    } catch (e) {

        console.log("Search error: " + e);

        return JSON.stringify([]);
    }
}



async function extractDetails(url) {

    try {

        const title = decodeURIComponent(
            url.split("/wiki/")[1]
        );


        const response = await fetch(
            `${REST}/page/summary/${encodeURIComponent(title)}`
        );


        const data = await response.json();


        return JSON.stringify([
            {
                description:
                    data.extract || "لا يوجد وصف",

                aliases:
                    "",

                airdate:
                    data.description || ""
            }
        ]);


    } catch (e) {

        console.log("Details error: " + e);

        return JSON.stringify([
            {
                description: "تعذر تحميل المعلومات",
                aliases: "",
                airdate: ""
            }
        ]);
    }
}



async function extractEpisodes(url) {

    try {

        const title = decodeURIComponent(
            url.split("/wiki/")[1]
        );


        const response = await fetch(
            `${API}?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*`
        );


        const data = await response.json();


        const html =
            data.parse.text["*"];


        const videos =
            html.match(
                /https?:\/\/upload\.wikimedia\.org\/[^"' ]+\.(webm|ogg|mp4)/gi
            ) || [];


        return JSON.stringify(
            videos.map((v, i) => ({
                number: i + 1,
                href: v
            }))
        );


    } catch(e) {

        return JSON.stringify([]);
    }
}



async function extractStreamUrl(url) {

    return url;
}
