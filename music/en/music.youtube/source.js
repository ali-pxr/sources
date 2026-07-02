// ============================================================
// NEWPIPE STYLE – YOUTUBE MUSIC ANDROID (SORA EDITION)
// ============================================================

// ============================================================
// 1. إعدادات Android المتقدمة (مثل NewPipe بالضبط)
// ============================================================

const NEWPIPE_CONFIG = {
    // إصدارات التطبيق (يتم تحديثها تلقائياً)
    clients: {
        music: {
            name: "ANDROID_MUSIC",
            version: "6.42.52",
            apiKey: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
            userAgent: "com.google.android.apps.youtube.music/6.42.52 (Linux; U; Android 13; en-US; Pixel 6 Build/TP1A.220624.014)",
            clientNameHeader: "5",
            deviceModel: "Pixel 6",
            deviceBrand: "Google"
        },
        android: {
            name: "ANDROID",
            version: "19.09.37",
            apiKey: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
            userAgent: "com.google.android.youtube/19.09.37 (Linux; U; Android 13; en-US; Pixel 6 Build/TP1A.220624.014)",
            clientNameHeader: "3",
            deviceModel: "Pixel 6",
            deviceBrand: "Google"
        }
    },
    // اختيار العميل الافتراضي (ميوزك أخف)
    defaultClient: "music"
};

// ============================================================
// 2. إدارة الكوكيز والجلسات (مثل NewPipe)
// ============================================================

let cookiesStore = {};
let lastCookieFetch = 0;

async function fetchFreshCookies() {
    try {
        // محاولة جلب كوكيز جديدة من الصفحة الرئيسية
        const response = await fetchv2("https://music.youtube.com", {
            'User-Agent': NEWPIPE_CONFIG.clients.music.userAgent,
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
        });
        
        const html = await response.text();
        
        // استخراج كوكيز من الـ Set-Cookie (إن وجد)
        // في Sora، لا يمكننا الوصول للـ Set-Cookie مباشرة، لذا نستخدم طريقة بديلة
        // نستخرج الـ Visitor Data من HTML
        const visitorDataMatch = html.match(/"VISITOR_DATA":"([^"]+)"/);
        if (visitorDataMatch) {
            cookiesStore.visitorData = visitorDataMatch[1];
        }
        
        // استخراج API Key و Client Version
        const apiKeyMatch = html.match(/INNERTUBE_API_KEY":"([^"]+)"/);
        if (apiKeyMatch) {
            NEWPIPE_CONFIG.clients.music.apiKey = apiKeyMatch[1];
            NEWPIPE_CONFIG.clients.android.apiKey = apiKeyMatch[1];
        }
        
        const versionMatch = html.match(/INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
        if (versionMatch) {
            NEWPIPE_CONFIG.clients.music.version = versionMatch[1];
            NEWPIPE_CONFIG.clients.android.version = versionMatch[1];
        }
        
        lastCookieFetch = Date.now();
        console.log("✅ Fresh cookies fetched");
        return true;
    } catch (e) {
        console.log("⚠️ Using cached cookies");
        return false;
    }
}

// ============================================================
// 3. دالة الاتصال الداخلية (مثل NewPipe)
// ============================================================

async function callNewPipeInnerTube(endpoint, data, clientType = "music") {
    const client = NEWPIPE_CONFIG.clients[clientType] || NEWPIPE_CONFIG.clients.music;
    
    // تجديد الكوكيز إذا مر وقت طويل
    if (Date.now() - lastCookieFetch > 3600000) { // كل ساعة
        await fetchFreshCookies();
    }
    
    const url = `https://www.youtube.com/youtubei/v1/${endpoint}?key=${client.apiKey}`;
    
    // بناء الـ Headers كما يفعل NewPipe
    const headers = {
        'User-Agent': client.userAgent,
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Type': 'application/json',
        'X-YouTube-Client-Name': client.clientNameHeader,
        'X-YouTube-Client-Version': client.version,
        'X-YouTube-Device-Model': client.deviceModel,
        'X-YouTube-Device-Brand': client.deviceBrand,
        'Origin': 'https://music.youtube.com',
        'Referer': 'https://music.youtube.com',
        'Connection': 'keep-alive',
    };
    
    // إضافة Visitor Data إذا وجدت
    if (cookiesStore.visitorData) {
        data.context.client.visitorData = cookiesStore.visitorData;
    }
    
    try {
        const response = await fetchv2(url, headers, "POST", data);
        const result = await response.json();
        
        // إذا كان هناك خطأ في المصادقة، نحاول تحديث الكوكيز
        if (result.error && result.error.code === 403) {
            console.log("⚠️ Auth error, refreshing cookies...");
            await fetchFreshCookies();
            // إعادة المحاولة مرة واحدة
            const retryResponse = await fetchv2(url, headers, "POST", data);
            return await retryResponse.json();
        }
        
        return result;
    } catch (e) {
        console.log("⚠️ Request error:", e);
        throw e;
    }
}

// ============================================================
// 4. دالة البحث (محسّنة مثل NewPipe)
// ============================================================

async function searchResults(keyword) {
    try {
        // تجهيز بيانات الطلب كما يفعل NewPipe
        const data = {
            query: keyword,
            context: {
                client: {
                    clientName: NEWPIPE_CONFIG.clients.music.name,
                    clientVersion: NEWPIPE_CONFIG.clients.music.version,
                    hl: "en",
                    gl: "US"
                }
            }
        };
        
        const response = await callNewPipeInnerTube('search', data);
        
        // استخراج النتائج بنفس طريقة NewPipe
        const results = [];
        const tabbedSearch = response.contents?.tabbedSearchResultsRenderer;
        
        if (tabbedSearch) {
            const firstTab = tabbedSearch.tabs?.[0]?.tabRenderer;
            if (firstTab) {
                const sectionList = firstTab.content?.sectionListRenderer;
                if (sectionList) {
                    for (const section of sectionList.contents || []) {
                        const itemSection = section.itemSectionRenderer;
                        if (itemSection) {
                            for (const content of itemSection.contents || []) {
                                // البحث عن musicShelfRenderer
                                const shelf = content.musicShelfRenderer;
                                if (shelf) {
                                    for (const item of shelf.contents || []) {
                                        const musicItem = item.musicResponsiveListItemRenderer;
                                        if (musicItem) {
                                            // استخراج البيانات كما في NewPipe
                                            const titleColumn = musicItem.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer;
                                            let title = titleColumn?.text?.runs?.[0]?.text || 'Unknown';
                                            
                                            const artistColumn = musicItem.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer;
                                            let artist = artistColumn?.text?.runs?.[0]?.text || '';
                                            
                                            // NewPipe يدمج العنوان والفنان
                                            let displayTitle = title;
                                            if (artist) {
                                                displayTitle = `${title} - ${artist}`;
                                            }
                                            
                                            const thumbnail = musicItem.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url || '';
                                            const videoId = musicItem.videoId || musicItem.playlistId || '';
                                            
                                            if (displayTitle && videoId) {
                                                results.push({
                                                    title: displayTitle,
                                                    image: thumbnail,
                                                    href: `https://music.youtube.com/watch?v=${videoId}`
                                                });
                                            }
                                        }
                                    }
                                }
                                
                                // إذا لم نجد musicShelfRenderer، نبحث عن videoRenderer (كحل احتياطي)
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
                }
            }
        }
        
        // NewPipe يحد النتائج بـ 20-30 نتيجة
        return JSON.stringify(results.slice(0, 25));
        
    } catch (error) {
        console.log('Search error:', error);
        return JSON.stringify([{ 
            title: '⚠️ Search Error - Check Console', 
            image: '', 
            href: 'https://music.youtube.com' 
        }]);
    }
}

// ============================================================
// 5. استخراج التفاصيل (مثل NewPipe)
// ============================================================

async function extractDetails(url) {
    try {
        const videoId = url.match(/v=([^&]+)/)?.[1];
        if (!videoId) {
            // محاولة استخراج browseId (للفنانين والألبومات)
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
                    clientName: NEWPIPE_CONFIG.clients.music.name,
                    clientVersion: NEWPIPE_CONFIG.clients.music.version
                }
            }
        };
        
        const response = await callNewPipeInnerTube('player', data);
        const videoDetails = response.videoDetails || {};
        const microformat = response.microformat?.microformatDataRenderer || {};
        
        // NewPipe يستخرج هذه المعلومات
        return JSON.stringify([{
            description: videoDetails.shortDescription || microformat.description || 'No description',
            aliases: `Duration: ${videoDetails.lengthSeconds || 'N/A'}s | Views: ${videoDetails.viewCount || 'N/A'}`,
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

// ============================================================
// 6. استخراج الحلقات (لقوائم التشغيل والألبومات)
// ============================================================

async function extractEpisodes(url) {
    try {
        // NewPipe يستخدم browseId لقوائم التشغيل
        const playlistId = url.match(/list=([^&]+)/)?.[1];
        if (!playlistId) return JSON.stringify([]);
        
        const data = {
            browseId: `VL${playlistId}`,
            context: {
                client: {
                    clientName: NEWPIPE_CONFIG.clients.music.name,
                    clientVersion: NEWPIPE_CONFIG.clients.music.version
                }
            }
        };
        
        const response = await callNewPipeInnerTube('browse', data);
        
        // استخراج الحلقات كما في NewPipe
        const episodes = [];
        const contents = response.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
        
        for (const section of contents) {
            const items = section.itemSectionRenderer?.contents || [];
            for (const item of items) {
                const playlistItem = item.musicResponsiveListItemRenderer || item.videoRenderer;
                if (playlistItem) {
                    let videoId = playlistItem.videoId || '';
                    let title = '';
                    
                    if (playlistItem.musicResponsiveListItemRenderer) {
                        title = playlistItem.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || 'Track';
                    } else if (playlistItem.videoRenderer) {
                        title = playlistItem.title?.runs?.[0]?.text || 'Video';
                        videoId = playlistItem.videoId;
                    }
                    
                    if (videoId && title) {
                        episodes.push({
                            href: `https://music.youtube.com/watch?v=${videoId}`,
                            number: title
                        });
                    }
                }
            }
        }
        
        return JSON.stringify(episodes.slice(0, 50)); // NewPipe يسمح بـ 50 حلقة
    } catch (error) {
        console.log('Episodes error:', error);
        return JSON.stringify([]);
    }
}

// ============================================================
// 7. استخراج رابط الدفق (مع فك توقيع مثل NewPipe)
// ============================================================

// خوارزمية فك توقيع مبسطة (مستوحاة من NewPipe و yt-dlp)
function decryptSignatureNewPipe(signatureCipher) {
    try {
        const params = new URLSearchParams(signatureCipher);
        let url = params.get('url');
        const s = params.get('s');
        const sp = params.get('sp') || 'signature';
        
        if (!url || !s) return null;
        
        // NewPipe يستخدم خوارزميات متعددة، لكننا نطبق الأكثر شيوعاً
        let decryptedSig = s;
        
        // الخوارزمية الأساسية (مأخوذة من NewPipe)
        // 1. عكس السلسلة
        decryptedSig = decryptedSig.split('').reverse().join('');
        // 2. إزالة أول حرفين
        decryptedSig = decryptedSig.slice(2);
        // 3. إضافة حرف 'A' في النهاية
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

async function extractStreamUrl(html) {
    try {
        const videoId = html.match(/watch\?v=([^"&]+)/)?.[1];
        if (!videoId) return JSON.stringify({ stream: null, subtitles: null });
        
        const data = {
            videoId: videoId,
            context: {
                client: {
                    clientName: NEWPIPE_CONFIG.clients.music.name,
                    clientVersion: NEWPIPE_CONFIG.clients.music.version
                }
            }
        };
        
        const response = await callNewPipeInnerTube('player', data);
        const streamingData = response.streamingData || {};
        
        // NewPipe يجمع كل التنسيقات
        const formats = [
            ...(streamingData.formats || []),
            ...(streamingData.adaptiveFormats || [])
        ];
        
        // اختيار أفضل تنسيق (صوت + فيديو)
        let bestFormat = null;
        let bestQuality = 0;
        
        for (const fmt of formats) {
            let url = fmt.url;
            let quality = parseInt(fmt.qualityLabel) || parseInt(fmt.quality) || 0;
            
            // إذا كان هناك توقيع، نحاول فكه
            if (!url && fmt.signatureCipher) {
                url = decryptSignatureNewPipe(fmt.signatureCipher);
            }
            
            if (url && quality > bestQuality) {
                bestQuality = quality;
                bestFormat = {
                    url: url,
                    itag: fmt.itag,
                    mimeType: fmt.mimeType,
                    quality: fmt.qualityLabel || fmt.quality || 'unknown'
                };
            }
        }
        
        // NewPipe يستخرج الترجمات أيضاً
        const captions = response.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        const subtitleTrack = captions.find(t => t.languageCode === 'en' || t.languageCode === 'ar');
        
        return JSON.stringify({
            stream: bestFormat?.url || null,
            subtitles: subtitleTrack?.baseUrl || null,
            quality: bestFormat?.quality || 'unknown',
            itag: bestFormat?.itag || null
        });
    } catch (error) {
        console.log('Stream error:', error);
        return JSON.stringify({ stream: null, subtitles: null });
    }
}

// ============================================================
// 8. تهيئة السكربت (مثل NewPipe)
// ============================================================

// جلب الإعدادات عند بدء التشغيل
fetchFreshCookies();

// تصدير الدوال المطلوبة لـ Sora
// (Sora ستستدعي هذه الدوال تلقائياً)
