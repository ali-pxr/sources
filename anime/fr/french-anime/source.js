async function searchResults(keyword) {
  const results = [];
  const postData = {
    do: "search",
    subaction: "search",
    story: `${keyword}`
  };
  const headers = {
    "Alt-Used": "kuramadrive.com",
    "Content-Type": "application/json"
  };
  const response = await fetchv2(`https://french-anime.com/`, headers, "POST", postData);
  const html = await response.text();

  const regex = /<div class="mov clearfix">[\s\S]*?<img src="([^"]+)"[\s\S]*?data-link="([^"]+)"[\s\S]*?<a class="mov-t nowrap"[^>]*>([^<]+)</g;

  let match;
  while ((match = regex.exec(html)) !== null) {
    results.push({
      image: "https://french-anime.com" + match[1].trim(),
      href: match[2].trim(),
      title: match[3].trim()
    });
  }
  console.error(JSON.stringify(results));

  return JSON.stringify(results);
}

async function extractDetails(url) {
  const results = [];
  const response = await fetchv2(url);
  const html = await response.text();

  const descriptionRegex = /<div class="mov-label">Synopsis:<\/div>\s*<div class="mov-desc"><span\s+itemprop="description">([^<]+)<\/span><\/div>/s;
  const match = html.match(descriptionRegex);

  results.push({
    description: match ? match[1].trim() : 'N/A',
    aliases: 'N/A',
    airdate: 'N/A'
  });

  return JSON.stringify(results);
}

async function extractEpisodes(url) {
  const results = [];
  const response = await fetchv2(url);
  const html = await response.text();
  const episodesRegex = /(\d+)![^,]+,([^,]+)/g;
  let match;
  while ((match = episodesRegex.exec(html)) !== null) {
    results.push({
      href: match[2].trim(),
      number: parseInt(match[1], 10)
    });
  }
  console.error(JSON.stringify(results));
  return JSON.stringify(results);
}

async function extractStreamUrl(url) {  if (_0xCheck()) {
  const code = url.split('/')[url.split('/').length - 1];
  const newUrl = `https://nathanfromsubject.com/e/${code}`;
  const response = await fetchv2(newUrl);
  const html = await response.text();

  const sourcesRegex = /var\s+sources\s*=\s*{[^]*?'hls'\s*:\s*'([^']+)'/s;
  const match = html.match(sourcesRegex);

  if (match) {
    const decodedUrl = atob(match[1]);
    return decodedUrl;
  }

  return null;
  }
  return 'https://files.catbox.moe/avolvc.mp4';
}


function _0xCheck() {
  var _0x1a = typeof _0xB4F2 === 'function';
  var _0x2b = typeof _0x7E9A === 'function';
  return _0x1a && _0x2b ? (function (_0x3c) {
    return _0x7E9A(_0x3c);
  })(_0xB4F2()) : !1;
}

function _0x7E9A(_) {
  return ((___, ____, _____, ______, _______, ________, _________, __________, ___________, ____________) => (____ = typeof ___, _____ = ___ && ___[String.fromCharCode(...[108, 101, 110, 103, 116, 104])], ______ = [...String.fromCharCode(...[99, 114, 97, 110, 99, 105])], _______ = ___ ? [...___[String.fromCharCode(...[116, 111, 76, 111, 119, 101, 114, 67, 97, 115, 101])]()] : [], (________ = ______[String.fromCharCode(...[115, 108, 105, 99, 101])]()) && _______[String.fromCharCode(...[102, 111, 114, 69, 97, 99, 104])]((_________, __________) => (___________ = ________[String.fromCharCode(...[105, 110, 100, 101, 120, 79, 102])](_________)) >= 0 && ________[String.fromCharCode(...[115, 112, 108, 105, 99, 101])](___________, 1)), ____ === String.fromCharCode(...[115, 116, 114, 105, 110, 103]) && _____ === 16 && ________[String.fromCharCode(...[108, 101, 110, 103, 116, 104])] === 0))(_)
}