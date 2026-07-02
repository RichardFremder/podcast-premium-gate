const https = require('https');

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = 'UCMkZzR3EhNfDalFMxhl4iKA';
const MAX_RESULTS = 4;

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#233;/g, 'é')
    .replace(/&#232;/g, 'è')
    .replace(/&#224;/g, 'à')
    .replace(/&#231;/g, 'ç');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Cache CDN Vercel 24h : l'API YouTube n'est appelée qu'une fois par jour max
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');

  if (!API_KEY) return res.status(500).json({ error: 'YOUTUBE_API_KEY missing' });

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&type=video&order=date&maxResults=${MAX_RESULTS}&key=${API_KEY}`;
    const data = await fetchUrl(url);

    if (data.error) {
      return res.status(200).json({ videos: [], debug: data.error.message || data.error });
    }

    const videos = (data.items || [])
      .filter(item => item.id && item.id.videoId)
      .map(item => ({
        id: item.id.videoId,
        title: decodeEntities(item.snippet.title),
        thumbnail: item.snippet.thumbnails.medium.url,
        publishedAt: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));

    return res.status(200).json({ videos });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
