// ============================================================
// الجزء الأول: استخراج إعدادات InnerTube من YouTube
// ============================================================

let innertubeApiKey = null;
let innertubeClientVersion = null;
let innertubeClientName = "WEB";

// إعدادات Invidious (سنستخدمها فقط للبث)
const INVIDIOUS_API = "https://yt.omada.cafe/api/v1/";

async function fetchInnertubeConfig() {
    try {
        const response = await fetchv2("https://www.youtube.com", {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        });
        const html = await response.text();
        
        // استخراج المفتاح والإصدار من HTML
        const apiKeyMatch = html.match(/INNERTUBE_API_KEY":"([^"]+)"/);
        if (apiKeyMatch) innertubeApiKey = apiKeyMatch[1];
        
        const versionMatch = html.match(/INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
        if (versionMatch) innertubeClientVersion = versionMatch[1];
        
        // إذا فشل الاستخراج، استخدم قيماً افتراضية (قديمة لكنها تعمل غالباً)
        if (!innertubeApiKey) innertubeApiKey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
        if (!innertubeClientVersion) innertubeClientVersion = "2.20240101.00.00";
        
        console.log("✅ Innertube Config Loaded");
    } catch (e) {
        console.log("⚠️ Using fallback Innertube config");
        innertubeApiKey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
        innertubeClientVersion = "2.20240101.00.00";
    }
}

// ============================================================
// الجزء الثاني: الاتصال بـ InnerTube API
// ============================================================

async function callInnerTube(endpoint, data) {
    if (!innertubeApiKey) await fetchInnertubeConfig();
    
    const url = `https://www.youtube.com/youtubei/v1/${endpoint}?key=${innertubeApiKey}`;
    const headers = {
        'Content-Type': 'application/json',
        'X-YouTube-Client-Name': '1',
        'X-YouTube-Client-Version': innertubeClientVersion,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    
    const response = await fetchv2(url, headers, "POST", data);
    return await response.json();
}

// ============================================================
// الجزء الثالث: دوال مساعدة لاستخراج المعرفات
// ============================================================

function extractVideoIdFromUrl(url) {
    // يدعم روابط يوتيوب العادية وروابط Invidious
    const match = url.match(/(?:v=|\/videos\/|watch\?v=|\/v\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
}

function extractVideoIdFromHtml(html) {
    const match = html.match(/watch\?v=([^"&]+)/);
    return match ? match[1] : null;
}

// ============================================================
// الجزء الرابع: الدوال الأساسية لـ Sora (Async Mode)
// ============================================================

/**
 * البحث عن فيديوهات YouTube
 * المدخل: كلمة البحث (string)
 * المخرج: JSON مصفوفة من {title, image, href}
 */
async function searchResults(keyword) {
    try {
        await fetchInnertubeConfig();
        
        const data = {
            query: keyword,
            context: {
                client: {
                    clientName: innertubeClientName,
                    clientVersion: innertubeClientVersion,
                    hl: "ar",
                    gl: "SA"
                }
            }
        };
        
        const response = await callInnerTube('search', data);
        const items = response.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        
        const results = [];
        for (const section of items) {
            const itemSection = section.itemSectionRenderer?.contents || [];
            for (const item of itemSection) {
                const video = item.videoRenderer;
                if (video) {
                    results.push({
                        title: video.title?.runs?.[0]?.text || 'No Title',
                        image: video.thumbnail?.thumbnails?.[0]?.url || '',
                        // نستخدم رابط Invidious كـ "href" مؤقت، لكنه سيستخدم فقط لاستخراج المعرف
                        href: `https://www.youtube.com/watch?v=${video.videoId}`
                    });
                }
            }
        }
        
        return JSON.stringify(results.slice(0, 20)); // حد أقصى 20 نتيجة
    } catch (error) {
        console.log('Search error:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}

/**
 * استخراج تفاصيل الفيديو
 * المدخل: رابط الفيديو (string)
 * المخرج: JSON مصفوفة من {description, aliases, airdate}
 */
async function extractDetails(url) {
    try {
        const videoId = extractVideoIdFromUrl(url);
        if (!videoId) throw new Error('Invalid URL');
        
        const data = {
            videoId: videoId,
            context: {
                client: {
                    clientName: innertubeClientName,
                    clientVersion: innertubeClientVersion,
                    hl: "ar",
                    gl: "SA"
                }
            }
        };
        
        const response = await callInnerTube('player', data);
        const videoDetails = response.videoDetails || {};
        const microformat = response.microformat?.playerMicroformatRenderer || {};
        
        return JSON.stringify([{
            description: videoDetails.shortDescription || microformat.description?.simpleText || 'No description',
            aliases: `Views: ${videoDetails.viewCount || 'N/A'}`,
            airdate: `Uploaded: ${microformat.publishDate || microformat.uploadDate || 'Unknown'}`
        }]);
    } catch (error) {
        console.log('Details error:', error);
        return JSON.stringify([{
            description: 'Error loading details',
            aliases: 'Unknown',
            airdate: 'Unknown'
        }]);
    }
}

/**
 * استخراج قائمة الحلقات (للقنوات أو قوائم التشغيل)
 * المدخل: رابط القناة أو قائمة التشغيل (string)
 * المخرج: JSON مصفوفة من {href, number}
 */
async function extractEpisodes(url) {
    try {
        // إذا كان الرابط لقناة، نحاول استخراج فيديوهاتها
        const channelId = url.match(/@([^/]+)/)?.[1] || url.match(/channel\/([^/]+)/)?.[1];
        if (!channelId) return JSON.stringify([]);
        
        const data = {
            browseId: channelId.startsWith('UC') ? channelId : `UC${channelId}`,
            context: {
                client: {
                    clientName: innertubeClientName,
                    clientVersion: innertubeClientVersion,
                    hl: "ar",
                    gl: "SA"
                }
            }
        };
        
        const response = await callInnerTube('browse', data);
        const contents = response.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
        
        const episodes = [];
        for (const section of contents) {
            const items = section.itemSectionRenderer?.contents || [];
            for (const item of items) {
                const video = item.videoRenderer;
                if (video) {
                    episodes.push({
                        href: `https://www.youtube.com/watch?v=${video.videoId}`,
                        number: video.lengthText?.simpleText || '?'
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

// ============================================================
// الجزء الخامس: استخراج رابط البث عبر Invidious (الخطوة الوحيدة التي تستخدم Invidious)
// ============================================================

/**
 * استخراج رابط الدفق مع الترجمات (StreamAsync + SoftSub)
 * المدخل: HTML (string) لأن streamAsyncJS: true
 * المخرج: كائن {stream, subtitles} بصيغة JSON
 */
async function extractStreamUrl(html) {
    try {
        // 1. استخراج videoId من HTML
        const videoId = extractVideoIdFromHtml(html);
        if (!videoId) {
            // محاولة استخراج من الرابط إذا كان متاحاً في HTML
            const urlMatch = html.match(/https?:\/\/[^\s"']+v=([^&"'\s]+)/);
            const videoIdFromUrl = urlMatch ? urlMatch[1] : null;
            if (!videoIdFromUrl) return JSON.stringify({ stream: null, subtitles: null });
            // إعادة المحاولة مع المعرف المستخرج من الرابط
            return await extractStreamUrl(`https://www.youtube.com/watch?v=${videoIdFromUrl}`);
        }

        // 2. استخدام Invidious للحصول على الروابط المفككة
        const invidiousUrl = `${INVIDIOUS_API}videos/${videoId}`;
        console.log(`🌐 Fetching stream from Invidious: ${invidiousUrl}`);
        
        const response = await fetchv2(invidiousUrl);
        const data = await response.json();

        // 3. البحث عن أفضل رابط صوتي (نفس المنطق السابق)
        let bestAudio = null;
        if (data.adaptiveFormats) {
            // نفضل أعلى جودة صوتية (itag 251 = opus عالي الجودة)
            bestAudio = data.adaptiveFormats.find(f => f.itag === 251) ||
                        data.adaptiveFormats.find(f => f.itag === 140) ||
                        data.adaptiveFormats.find(f => f.itag === 250) ||
                        data.adaptiveFormats.find(f => f.itag === 249);
        }

        // إذا لم نجد صوتاً، نبحث عن رابط فيديو مع صوت (formatStreams)
        if (!bestAudio && data.formatStreams && data.formatStreams.length > 0) {
            // نفضل أعلى جودة فيديو مع صوت
            bestAudio = data.formatStreams.find(f => f.qualityLabel === '720p') ||
                        data.formatStreams.find(f => f.qualityLabel === '480p') ||
                        data.formatStreams[0];
        }

        // 4. استخراج الترجمات (SoftSub) من Invidious أيضاً
        let subtitlesUrl = null;
        if (data.captions && data.captions.length > 0) {
            // نفضل الترجمة العربية أو الإنجليزية
            const arabicSub = data.captions.find(c => c.language_code === 'ar');
            const englishSub = data.captions.find(c => c.language_code === 'en');
            const preferredSub = arabicSub || englishSub || data.captions[0];
            if (preferredSub && preferredSub.url) {
                // تأكد من أن الرابط كامل
                subtitlesUrl = preferredSub.url.startsWith('http') 
                    ? preferredSub.url 
                    : `${INVIDIOUS_API}${preferredSub.url}`;
            }
        }

        const result = {
            stream: bestAudio?.url || null,
            subtitles: subtitlesUrl
        };

        console.log(`✅ Stream extracted via Invidious for video ${videoId}`);
        return JSON.stringify(result);
    } catch (error) {
        console.log('Stream error (Invidious):', error);
        return JSON.stringify({ stream: null, subtitles: null });
    }
}

// ============================================================
// الجزء السادس: تهيئة الإعدادات عند بدء التشغيل
// ============================================================

// تحميل إعدادات InnerTube فوراً
fetchInnertubeConfig();

console.log('✅ YouTube Module (InnerTube + Invidious Stream) initialized');
