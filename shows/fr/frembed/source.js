async function searchResults(keyword) {
    const tests = [];

    // eval
    try {
        const result = eval("1 + 2 + 3");
        tests.push("eval: OK (" + result + ")");
    } catch (e) {
        tests.push("eval: FAIL (" + e + ")");
    }

    // Function
    try {
        const fn = new Function("return 10 * 5;");
        tests.push("Function: OK (" + fn() + ")");
    } catch (e) {
        tests.push("Function: FAIL (" + e + ")");
    }

    // atob
    try {
        tests.push("atob: " + atob("SGVsbG8="));
    } catch (e) {
        tests.push("atob: FAIL");
    }

    // btoa
    try {
        tests.push("btoa: " + btoa("Hello"));
    } catch (e) {
        tests.push("btoa: FAIL");
    }

    // fetchv2
    try {
        const response = await fetchv2("https://httpbin.org/json");
        const json = await response.json();
        tests.push("fetchv2: OK");
        tests.push("json: " + Object.keys(json).join(", "));
    } catch (e) {
        tests.push("fetchv2: FAIL (" + e + ")");
    }

    return JSON.stringify(
        tests.map((t, i) => ({
            title: t,
            image: "",
            href: "https://example.com/test/" + i
        }))
    );
}

async function extractDetails(url) {
    return JSON.stringify([
        {
            description: "Sora environment test",
            aliases: url,
            airdate: new Date().toISOString()
        }
    ]);
}

async function extractEpisodes(url) {
    return JSON.stringify([
        {
            href: url,
            number: 1
        }
    ]);
}
 
async function extractStreamUrl(url) {
    return JSON.stringify({
        stream: url,
        subtitles: null
    });
}
