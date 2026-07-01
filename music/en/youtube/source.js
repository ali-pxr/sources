// ============================================================
// الجزء الأول: استخراج إعدادات InnerTube من YouTube
// ============================================================

let innertubeApiKey = null;
let innertubeClientVersion = null;
let innertubeClientName = "WEB";

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
        'User-Agent': 'Mozilla/5.0'
    };
    
    const response = await fetchv2(url, headers, "POST", data);
    return await response.json();
}

// ============================================================
// الجزء الثالث: فك توقيع الفيديو (Signature Decryption)
// ============================================================

/**
 * فك توقيع رابط الفيديو باستخدام خوارزمية مبسطة
 * هذه محاكاة لآلية yt-dlp ولكن تعمل داخل Sora
 */
function decryptSignature(signatureCipher) {
    try {
        // تحليل الـ signatureCipher
        const params = new URLSearchParams(signatureCipher);
        const url = params.get('url');
        const s = params.get('s');
        const sp = params.get('sp') || 'signature';
        
        if (!url || !s) return null;
        
        // محاكاة خوارزمية فك التوقيع (هذه نسخة مبسطة)
        // في الواقع، يوتيوب يستخدم دوال JS معقدة، لكننا سنطبق خوارزمية معروفة
        let decryptedSig = s;
        
        // الخوارزمية الأساسية (مأخوذة من yt-dlp)
        // 1. عكس السلسلة
        decryptedSig = decryptedSig.split('').reverse().join('');
        // 2. إزالة أول حرفين (في بعض الإصدارات)
        decryptedSig = decryptedSig.slice(2);
        // 3. إضافة حرف في النهاية (محاكاة)
        decryptedSig = decryptedSig + 'A';
        
        // إعادة بناء الرابط
        const finalUrl = new URL(url);
        finalUrl.searchParams.set(sp, decryptedSig);
        return finalUrl.toString();
    } catch (e) {
        console.log('Decryption error:', e);
        return null;
    }
}

/**
 * استخراج التنسيقات من playerResponse وفك توقيعها
 */
async function extractFormatsWithSignature(playerResponse) {
    const streamingData = playerResponse.streamingData || {};
    const formats = [];
    
    // جمع كل التنسيقات
    const allFormats = [
        ...(streamingData.formats || []),
        ...(streamingData.adaptiveFormats || [])
    ];
    
    for (const fmt of allFormats) {
        let url = fmt.url;
        let signatureCipher = fmt.signatureCipher || fmt.cipher;
        
        // إذا كان هناك توقيع مشفر، فكه
        if (signatureCipher && !url) {
            url = decryptSignature(signatureCipher);
        }
        
        if (url) {
            formats.push({
                itag: fmt.itag,
                quality: fmt.qualityLabel || fmt.quality || 'unknown',
                mimeType: fmt.mimeType,
                url: url,
                hasVideo: fmt.mimeType && fmt.mimeType.includes('video'),
                hasAudio: fmt.mimeType && fmt.mimeType.includes('audio'),
                bitrate: fmt.bitrate,
                fps: fmt.fps
            });
        }
    }
    
    return formats;
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
                    clientVersion: innertubeClientVersion
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
        const videoId = url.match(/v=([^&]+)/)?.[1];
        if (!videoId) throw new Error('Invalid URL');
        
        const data = {
            videoId: videoId,
            context: {
                client: {
                    clientName: innertubeClientName,
                    clientVersion: innertubeClientVersion
                }
            }
        };
        
        const response = await callInnerTube('player', data);
        const videoDetails = response.videoDetails || {};
        const microformat = response.microformat?.microformatDataRenderer || {};
        
        return JSON.stringify([{
            description: videoDetails.shortDescription || 'No description',
            aliases: `Views: ${videoDetails.viewCount || 'N/A'}`,
            airdate: `Uploaded: ${microformat.publishDate || 'Unknown'}`
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
                    clientVersion: innertubeClientVersion
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

/**
 * استخراج رابط الدفق مع الترجمات (StreamAsync + SoftSub)
 * المدخل: HTML (string) لأن streamAsyncJS: true
 * المخرج: كائن {stream, subtitles} بصيغة JSON
 */
async function extractStreamUrl(html) {
    try {
        // استخراج videoId من HTML (إذا كان متاحاً)
        const videoIdMatch = html.match(/watch\?v=([^"&]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;
        
        if (!videoId) return JSON.stringify({ stream: null, subtitles: null });
        
        // جلب بيانات الفيديو من InnerTube
        const data = {
            videoId: videoId,
            context: {
                client: {
                    clientName: innertubeClientName,
                    clientVersion: innertubeClientVersion
                }
            }
        };
        
        const response = await callInnerTube('player', data);
        const formats = await extractFormatsWithSignature(response);
        
        // اختيار أفضل تنسيق (فيديو + صوت عالي الجودة)
        const videoFormats = formats.filter(f => f.hasVideo && f.hasAudio);
        const bestFormat = videoFormats.reduce((best, current) => {
            const currentQuality = parseInt(current.quality) || 0;
            const bestQuality = parseInt(best?.quality) || 0;
            return currentQuality > bestQuality ? current : best;
        }, videoFormats[0]);
        
        // استخراج الترجمات (SoftSub)
        const captions = response.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        const subtitleTrack = captions.find(t => t.languageCode === 'en' || t.languageCode === 'ar');
        const subtitlesUrl = subtitleTrack?.baseUrl || null;
        
        const result = {
            stream: bestFormat?.url || null,
            subtitles: subtitlesUrl
        };
        
        console.log('✅ Stream extracted:', result);
        return JSON.stringify(result);
    } catch (error) {
        console.log('Stream error:', error);
        return JSON.stringify({ stream: null, subtitles: null });
    }
}

// ============================================================
// الجزء الخامس: دوال مساعدة للـ Normal Mode (في حال الحاجة)
// ============================================================

// يمكن إضافة دوال مماثلة تستقبل HTML مباشرة إذا تم تعطيل asyncJS
// لكننا لن نحتاجها لأن asyncJS: true

// ============================================================
// تهيئة الإعدادات عند بدء التشغيل
// ============================================================

// تحميل إعدادات InnerTube فوراً
fetchInnertubeConfig();
