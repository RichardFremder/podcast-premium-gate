const https = require('https');

const API_KEY = process.env.YOUTUBE_API_KEY;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';
const CHANNEL_ID = 'UCMkZzR3EhNfDalFMxhl4iKA';
const DB_MATINALE = '361011abd1298002bbb2cf4357ab9209';
const DB_AFTERWEEK = '361011abd1298079a1f2c88c7471f040';

function fetchUrl(url, options) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, options || {}, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
  });
}

function notionQuery(dbId) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ page_size: 1 });
    const options = {
      hostname: 'api.notion.com',
      path: `/v1/databases/${dbId}/query`,
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + NOTION_TOKEN,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getLives(eventType) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=${eventType}&type=video&order=date&maxResults=5&key=${API_KEY}`;
  return fetchUrl(url);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!API_KEY) return res.status(500).json({ error: 'YOUTUBE_API_KEY missing' });

  try {
    const [completed, upcoming, notionMat, notionAw] = await Promise.all([
      getLives('completed'),
      getLives('upcoming'),
      notionQuery(DB_MATINALE),
      notionQuery(DB_AFTERWEEK)
    ]);

    // Récupère l'image depuis Notion
    function getNotionImage(notionData) {
      if (!notionData.results) return null;
      for (const page of notionData.results) {
        const url = page.properties['Image URL'] && page.properties['Image URL'].url;
        if (url) return url;
      }
      return null;
    }

    const matinaleImage = getNotionImage(notionMat);
    const afterweekImage = getNotionImage(notionAw);

    const allCompleted = (completed.items || []).map(item => ({
      id: item.id.videoId,
      title: item.snippet.title.replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/À/g,'À').replace(/Ã©/g,'é').replace(/Ã¹/g,'ù').replace(/Ã /g,'à').replace(/Ã«/g,'ë'),
      thumbnail: item.snippet.thumbnails.medium.url,
      publishedAt: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));

    const allUpcoming = (upcoming.items || []).map(item => {
      const isAfter = item.snippet.title.toLowerCase().includes('after');
      return {
        id: item.id.videoId,
        title: item.snippet.title.replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/À/g,'À').replace(/Ã©/g,'é').replace(/Ã¹/g,'ù').replace(/Ã /g,'à').replace(/Ã«/g,'ë'),
        thumbnail: (isAfter ? afterweekImage : matinaleImage) || item.snippet.thumbnails.medium.url,
        scheduledAt: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      };
    });

    const matinaleCompleted = allCompleted.filter(v =>
      v.title.toLowerCase().includes('matinale') || v.title.toLowerCase().includes('matin')
    ).slice(0, 1);

    const matinaleUpcoming = allUpcoming.filter(v =>
      v.title.toLowerCase().includes('matinale') || v.title.toLowerCase().includes('matin')
    ).slice(0, 1);

    const afterweekUpcoming = allUpcoming.filter(v =>
      v.title.toLowerCase().includes('after') || v.title.toLowerCase().includes('week')
    ).slice(0, 1);

    return res.status(200).json({
        matinale: {
          last: matinaleCompleted[0] || (allCompleted[0] ? {...allCompleted[0], thumbnail: matinaleImage || allCompleted[0].thumbnail} : null),
          next: matinaleUpcoming[0] || (allUpcoming[0] ? {...allUpcoming[0], thumbnail: matinaleImage || allUpcoming[0].thumbnail} : null)
        },
        afterweek: {
          next: afterweekUpcoming[0] || (allUpcoming[1] ? {...allUpcoming[1], thumbnail: afterweekImage || allUpcoming[1].thumbnail} : null)
        }
      });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
