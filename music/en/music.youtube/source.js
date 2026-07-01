// ============================================================
// YOUTUBE MUSIC ANDROID MODE – FIXED SEARCH
// ============================================================

// 1. إعدادات Android Music Headers (كما هي)
const ANDROID_MUSIC_HEADERS = {
    'User-Agent': 'com.google.android.apps.youtube.music/6.42.52 (Linux; U; Android 13; en-US; Pixel 6 Build/TP1A.220624.014)',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/json',
    'X-YouTube-Client-Name': '5',
    'X-YouTube-Client-Version': '6.42.52',
    'X-YouTube-Device-Model': 'Pixel 6',
    'X-YouTube-Device-Brand': 'Google',
    'Origin': 'https://music.youtube.com',
    'Referer': 'https://music.youtube.com',
    'Connection': 'keep-alive',
};

// 2. متغيرات InnerTube
let innertubeApiKey = null;
let innertubeClientVersion = "6.42.52";

// 3. جلب الإعدادات من YouTube Music
async function fetchMusicInnertubeConfig() {
    try {
        const response = await fetchv2("https://music.youtube.com", ANDROID_MUSIC_HEADERS);
        const html = await response.text();
        
        const apiKeyMatch = html.match(/INNERTUBE_API_KEY":"([^"]+)"/);
        if (apiKeyMatch) innertubeApiKey = apiKeyMatch[1];
        
        if (!innertubeApiKey) {
            innertubeApiKey = "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w";
        }
        
        console.log("✅ YouTube Music Android Config Loaded");
        return true;
    } catch (e) {
        console.log("⚠️ Using fallback Android Music config");
        innertubeApiKey = "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w";
        return true;
    }
}

// 4. دالة الاتصال بـ InnerTube
async function callMusicInnerTube(endpoint, data) {
    if (!innertubeApiKey) await fetchMusicInnertubeConfig();
    
    const url = `https://www.youtube.com/youtubei/v1/${endpoint}?key=${innertubeApiKey}`;
    const headers = {
        ...ANDROID_MUSIC_HEADERS,
        'X-YouTube-Client-Version': innertubeClientVersion,
    };
    
    const response = await fetchv2(url, headers, "POST", data);
    return await response.json();
}

// ============================================================
// 5. دالة البحث المصححة – تعتمد على هيكل F12 الحقيقي
// ============================================================

async function searchResults(keyword) {
    try {
        await fetchMusicInnertubeConfig();
        
        const data = {
            query: keyword,
            context: {
                client: {
                    clientName: "ANDROID_MUSIC",
                    clientVersion: innertubeClientVersion,
                    hl: "en",
                    gl: "US"
                }
            }
        };
        
        const response = await callMusicInnerTube('search', data);
        
        // ====== التصحيح الجوهري هنا ======
        // التنقل في الهيكل الصحيح لـ YouTube Music
        const tabbedSearch = response.contents?.tabbedSearchResultsRenderer;
        if (!tabbedSearch) {
            console.log("⚠️ No tabbedSearchResultsRenderer found");
            return JSON.stringify([{ title: 'No results', image: '', href: '' }]);
        }
        
        // الحصول على أول تبويب (عادة "Songs" أو "All")
        const firstTab = tabbedSearch.tabs?.[0]?.tabRenderer;
        if (!firstTab) {
            console.log("⚠️ No tabs found");
            return JSON.stringify([{ title: 'No tabs', image: '', href: '' }]);
        }
        
        const sectionList = firstTab.content?.sectionListRenderer;
        if (!sectionList) {
            console.log("⚠️ No sectionListRenderer");
            return JSON.stringify([{ title: 'No section list', image: '', href: '' }]);
        }
        
        const results = [];
        
        // المرور على جميع الأقسام في sectionList
        for (const section of sectionList.contents || []) {
            const itemSection = section.itemSectionRenderer;
            if (!itemSection) continue;
            
            for (const content of itemSection.contents || []) {
                // ====== المفتاح: البحث عن musicShelfRenderer ======
                const shelf = content.musicShelfRenderer;
                if (!shelf) continue;
                
                // استخراج العناصر من الـ shelf
                for (const item of shelf.contents || []) {
                    const musicItem = item.musicResponsiveListItemRenderer;
                    if (!musicItem) continue;
                    
                    // استخراج العنوان (من أول flexColumn)
                    const titleColumn = musicItem.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer;
                    let title = titleColumn?.text?.runs?.[0]?.text || 'Unknown Title';
                    
                    // استخراج الفنان (من ثاني flexColumn) – نضيفه للعنوان لتمييز النتائج
                    const artistColumn = musicItem.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer;
                    let artist = artistColumn?.text?.runs?.[0]?.text || '';
                    
                    if (artist) {
                        title = `${title} - ${artist}`;
                    }
                    
                    // استخراج الصورة المصغرة
                    const thumbnail = musicItem.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url || '';
                    
                    // استخراج videoId (أساسي)
                    const videoId = musicItem.videoId || musicItem.playlistId || '';
                    
                    // بناء الرابط
                    let href = '';
                    if (videoId) {
                        href = `https://music.youtube.com/watch?v=${videoId}`;
                    } else {
                        // إذا لم يكن فيديو، قد يكون فناناً أو ألبوماً – نستخدم browseId
                        const browseId = musicItem.navigationEndpoint?.browseEndpoint?.browseId || '';
                        if (browseId) {
                            href = `https://music.youtube.com/browse/${browseId}`;
                        }
                    }
                    
                    if (title && href) {
                        results.push({
                            title: title,
                            image: thumbnail || 'https://via.placeholder.com/100',
                            href: href
                        });
                    }
                }
            }
        }
        
        // إذا لم تكن هناك نتائج، نحاول البحث في مكان آخر (بعض الإصدارات تستخدم videoRenderer)
        if (results.length === 0) {
            // محاولة بديلة: البحث في كل المحتويات
            for (const section of sectionList.contents || []) {
                const itemSection = section.itemSectionRenderer;
                if (!itemSection) continue;
                
                for (const content of itemSection.contents || []) {
                    const video = content.videoRenderer;
                    if (video) {
                        results.push({
                            title: video.title?.runs?.[0]?.text || 'Unknown',
                            image: video.thumbnail?.thumbnails?.[0]?.url || '',
                            href: `https://music.youtube.com/watch?v=${video.videoId}`
                        });
                    }
                }
            }
        }
        
        console.log(`✅ Found ${results.length} results`);
        return JSON.stringify(results.slice(0, 25));
        
    } catch (error) {
        console.log('Search error:', error);
        return JSON.stringify([{ 
            title: '⚠️ Search Error: ' + error.message, 
            image: '', 
            href: 'https://music.youtube.com' 
        }]);
    }
}

// ============================================================
// 6. باقي الدوال (بنفس المنطق المصحح)
// ============================================================

async function extractDetails(url) {
    try {
        const videoId = url.match(/v=([^&]+)/)?.[1];
        if (!videoId) {
            // محاولة استخراج browseId
            const browseId = url.match(/browse\/([^/?]+)/)?.[1];
            if (browseId) {
                return JSON.stringify([{
                    description: 'Browse page - use search for details',
                    aliases: 'YouTube Music',
                    airdate: 'N/A'
                }]);
            }
            throw new Error('Invalid URL');
        }
        
        const data = {
            videoId: videoId,
            context: {
                client: {
                    clientName: "ANDROID_MUSIC",
                    clientVersion: innertubeClientVersion
                }
            }
        };
        
        const response = await callMusicInnerTube('player', data);
        const videoDetails = response.videoDetails || {};
        const microformat = response.microformat?.microformatDataRenderer || {};
        
        return JSON.stringify([{
            description: videoDetails.shortDescription || 'No description',
            aliases: `Duration: ${videoDetails.lengthSeconds || 'N/A'}s`,
            airdate: `Views: ${videoDetails.viewCount || 'N/A'}`
        }]);
    } catch (error) {
        console.log('Details error:', error);
        return JSON.stringify([{ description: 'Error', aliases: 'Unknown', airdate: 'Unknown' }]);
    }
}

async function extractEpisodes(url) {
    try {
        const playlistId = url.match(/list=([^&]+)/)?.[1];
        if (!playlistId) return JSON.stringify([]);
        
        const data = {
            browseId: `VL${playlistId}`,
            context: {
                client: {
                    clientName: "ANDROID_MUSIC",
                    clientVersion: innertubeClientVersion
                }
            }
        };
        
        const response = await callMusicInnerTube('browse', data);
        const contents = response.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
        
        const episodes = [];
        for (const section of contents) {
            const items = section.itemSectionRenderer?.contents || [];
            for (const item of items) {
                const playlistItem = item.musicResponsiveListItemRenderer;
                if (playlistItem) {
                    const videoId = playlistItem.videoId || '';
                    const title = playlistItem.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || 'Track';
                    episodes.push({
                        href: videoId ? `https://music.youtube.com/watch?v=${videoId}` : '#',
                        number: title
                    });
                }
            }
        }
        
        return JSON.stringify(episodes.slice(0, 30));
    } catch (error) {
        console.log('Episodes error:', error);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(html) {
    try {
        const videoId = html.match(/watch\?v=([^"&]+)/)?.[1];
        if (!videoId) return JSON.stringify({ stream: null, subtitles: null });
        
        const data = {
            videoId: videoId,
            context: {
                client: {
                    clientName: "ANDROID_MUSIC",
                    clientVersion: innertubeClientVersion
                }
            }
        };
        
        const response = await callMusicInnerTube('player', data);
        const streamingData = response.streamingData || {};
        
        const formats = [...(streamingData.adaptiveFormats || []), ...(streamingData.formats || [])];
        
        // اختيار أفضل تنسيق صوتي
        const audioFormat = formats
            .filter(f => f.mimeType && f.mimeType.includes('audio/mp4'))
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        
        let streamUrl = audioFormat?.url || null;
        
        // إذا كان هناك توقيع، نحاول فكه
        if (!streamUrl && audioFormat?.signatureCipher) {
            const params = new URLSearchParams(audioFormat.signatureCipher);
            const baseUrl = params.get('url');
            const sig = params.get('s');
            if (baseUrl && sig) {
                streamUrl = `${baseUrl}&sig=${sig}`;
            }
        }
        
        return JSON.stringify({ stream: streamUrl, subtitles: null });
    } catch (error) {
        console.log('Stream error:', error);
        return JSON.stringify({ stream: null, subtitles: null });
    }
}

// 7. التهيئة
fetchMusicInnertubeConfig();
