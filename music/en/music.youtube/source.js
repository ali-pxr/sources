// invidious_inner_api.js - وحدة Sora الهجينة (InnerTube API + Invidious للبث)

// --- الإعدادات ---
const INVIDIOUS_API = "https://yt.omada.cafe/api/v1/";
const INNERTUBE_API = "https://www.youtube.com/youtubei/v1/";
const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"; // المفتاح العام ليوتيوب

// --- دوال مساعدة ---
function extractVideoId(url) {
    const match = url.match(/(?:videos\/|watch\?v=|\/v\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
}

// دالة لإنشاء الهيدرز المطلوبة لـ InnerTube
function getInnerTubeHeaders() {
    return {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-YouTube-Client-Name': '1',
        'X-YouTube-Client-Version': '2.20231219.04.00',
        'Origin': 'https://www.youtube.com',
        'Referer': 'https://www.youtube.com'
    };
}

// === دالة البحث ===
async function searchResults(keyword) {
    try {
        // 1. بناء طلب InnerTube للبحث
        const payload = {
            "context": {
                "client": {
                    "hl": "ar",
                    "gl": "SA",
                    "clientName": "WEB",
                    "clientVersion": "2.20231219.04.00"
                }
            },
            "query": keyword
        };

        const response = await fetchv2(
            `${INNERTUBE_API}search?key=${INNERTUBE_KEY}`,
            getInnerTubeHeaders(),
            "POST",
            payload
        );
        
        const data = await response.json();

        // 2. استخراج النتائج من استجابة InnerTube
        const results = [];
        const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        
        for (const section of contents) {
            const items = section?.itemSectionRenderer?.contents || [];
            for (const item of items) {
                const video = item?.videoRenderer;
                if (video) {
                    results.push({
                        title: video.title?.runs?.[0]?.text || "بدون عنوان",
                        image: video.thumbnail?.thumbnails?.[0]?.url || "",
                        href: `${INVIDIOUS_API}videos/${video.videoId}`
                    });
                }
            }
        }

        return JSON.stringify(results);
    } catch (error) {
        console.log("خطأ في البحث:", error);
        return JSON.stringify([{ title: 'حدث خطأ', image: '', href: '' }]);
    }
}

// === دالة جلب التفاصيل ===
async function extractDetails(url) {
    try {
        const videoId = extractVideoId(url);
        if (!videoId) throw new Error("معرف فيديو غير صالح");

        // 1. بناء طلب InnerTube لجلب تفاصيل الفيديو
        const payload = {
            "context": {
                "client": {
                    "hl": "ar",
                    "gl": "SA",
                    "clientName": "WEB",
                    "clientVersion": "2.20231219.04.00"
                }
            },
            "videoId": videoId
        };

        const response = await fetchv2(
            `${INNERTUBE_API}player?key=${INNERTUBE_KEY}`,
            getInnerTubeHeaders(),
            "POST",
            payload
        );
        
        const data = await response.json();

        // 2. استخراج التفاصيل من استجابة InnerTube
        const videoDetails = data?.videoDetails || {};
        const microformat = data?.microformat?.playerMicroformatRenderer || {};
        
        const details = [{
            description: videoDetails.shortDescription || microformat.description?.simpleText || "لا يوجد وصف",
            aliases: `المشاهدات: ${videoDetails.viewCount || 0}`,
            airdate: `النشر: ${microformat.publishDate || "غير معروف"}`
        }];

        return JSON.stringify(details);
    } catch (error) {
        console.log("خطأ في التفاصيل:", error);
        return JSON.stringify([{
            description: 'خطأ في تحميل الوصف',
            aliases: 'المشاهدات: غير معروفة',
            airdate: 'النشر: غير معروف'
        }]);
    }
}

// === دالة جلب الحلقات (تبقى كما هي) ===
async function extractEpisodes(url) {
    try {
        const videoId = extractVideoId(url);
        if (!videoId) return JSON.stringify([]);

        const episodes = [{
            href: url,
            number: "1"
        }];

        return JSON.stringify(episodes);
    } catch (error) {
        console.log("خطأ في جلب الحلقات:", error);
        return JSON.stringify([]);
    }
}

// === دالة جلب رابط البث (باستخدام Invidious فقط) ===
async function extractStreamUrl(url) {
    try {
        // استخدم Invidious فقط للحصول على الروابط المفككة
        const response = await fetchv2(url);
        const data = await response.json();

        let bestAudio = null;
        if (data.adaptiveFormats) {
            bestAudio = data.adaptiveFormats.find(f => f.itag === 251) ||
                        data.adaptiveFormats.find(f => f.itag === 140);
        }

        if (!bestAudio && data.formatStreams && data.formatStreams.length > 0) {
            bestAudio = data.formatStreams[0];
        }

        return bestAudio?.url || null;
    } catch (error) {
        console.log("خطأ في جلب رابط البث من Invidious:", error);
        return null;
    }
}
