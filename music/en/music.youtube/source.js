// ============================================================
// YOUTUBE MUSIC ANDROID MODE – SORA EDITION
// ============================================================

// 1. إعدادات Android Music Headers
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

// 2. متغيرات InnerTube (ستُستخرج ديناميكياً)
let innertubeApiKey = null;
let innertubeClientVersion = "6.42.52";

// 3. جلب الإعدادات من YouTube Music (بدلاً من YouTube العادي)
async function fetchMusicInnertubeConfig() {
    try {
        const response = await fetchv2("https://music.youtube.com", ANDROID_MUSIC_HEADERS);
        const html = await response.text();
        
        // استخراج API Key من الصفحة
        const apiKeyMatch = html.match(/INNERTUBE_API_KEY":"([^"]+)"/);
        if (apiKeyMatch) innertubeApiKey = apiKeyMatch[1];
        
        if (!innertubeApiKey) {
            // استخدام مفتاح عام معروف لأندرويد ميوزك
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

// 4. دالة الاتصال بـ InnerTube كـ Android Music
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

// 5. دالة البحث (خاصة بأندرويد ميوزك)
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
        const items = response.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
        
        const results = [];
        for (const section of items) {
            const itemSection = section.itemSectionRenderer?.contents || [];
            for (const item of itemSection) {
                // في ميوزك، غالباً ما يكون النوع "musicResponsiveListItemRenderer"
                const musicItem = item.musicResponsiveListItemRenderer || item.videoRenderer;
                if (musicItem) {
                    const title = musicItem.title?.runs?.[0]?.text || 
                                 musicItem.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || 
                                 'No Title';
                    const videoId = musicItem.videoId || musicItem.playlistId || '';
                    const thumb = musicItem.thumbnail?.thumbnails?.[0]?.url || '';
                    
                    results.push({
                        title: title,
                        image: thumb,
                        href: `https://music.youtube.com/watch?v=${videoId}`
                    });
                }
            }
        }
        
        return JSON.stringify(results.slice(0, 20));
    } catch (error) {
        console.log('Search error:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

// 6. استخراج التفاصيل (تنسيق أخف)
async function extractDetails(url) {
    try {
        const videoId = url.match(/v=([^&]+)/)?.[1];
        if (!videoId) throw new Error('Invalid URL');
        
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

// 7. استخراج الحلقات (قوائم التشغيل الموسيقية)
async function extractEpisodes(url) {
    try {
        // للموسيقى، غالباً نستخرج من قائمة تشغيل أو ألبوم
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
                        href: `https://music.youtube.com/watch?v=${videoId}`,
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

// 8. استخراج رابط الدفق الصوتي (أسهل بكثير في أندرويد)
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
        
        // في أندرويد ميوزك، التنسيقات الصوتية غالباً تأتي مباشرة بدون توقيع
        const formats = [...(streamingData.adaptiveFormats || [])];
        
        // اختيار أفضل تنسيق صوتي (AAC عالي الجودة)
        const audioFormat = formats
            .filter(f => f.mimeType && f.mimeType.includes('audio/mp4'))
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        
        let streamUrl = audioFormat?.url || null;
        
        // إذا كان هناك توقيع، نحاول فكه (لكن نادراً ما يحدث في أندرويد)
        if (!streamUrl && audioFormat?.signatureCipher) {
            const params = new URLSearchParams(audioFormat.signatureCipher);
            const baseUrl = params.get('url');
            const sig = params.get('s');
            if (baseUrl && sig) {
                // خوارزمية بسيطة لأندرويد (غالباً لا تحتاج)
                streamUrl = `${baseUrl}&sig=${sig}`;
            }
        }
        
        // لا توجد ترجمات في ميوزك عادة
        return JSON.stringify({ 
            stream: streamUrl, 
            subtitles: null 
        });
    } catch (error) {
        console.log('Stream error:', error);
        return JSON.stringify({ stream: null, subtitles: null });
    }
}

// 9. تهيئة الإعدادات عند البدء
fetchMusicInnertubeConfig();