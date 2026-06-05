const https = require('https');

const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = 'UCMkZzR3EhNfDalFMxhl4iKA';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function getLives(eventType) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=${eventType}&type=video&order=date&maxResults=5&key=${API_KEY}`;
  return fetchUrl(url);
}

exports.handler = async function(event) {
  if (!API_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'YOUTUBE_API_KEY missing' }) };

  try {
    const [completed, upcoming] = await Promise.all([
      getLives('completed'),
      getLives('upcoming')
    ]);

    const allCompleted = (completed.items || []).map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      publishedAt: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));

    const allUpcoming = (upcoming.items || []).map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      scheduledAt: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));

    // La Matinale = mercredi, AfterWeek = jeudi
    // On tente de distinguer par le titre, sinon on retourne tout
    const matinaleCompleted = allCompleted.filter(v =>
      v.title.toLowerCase().includes('matinale') ||
      v.title.toLowerCase().includes('matin')
    ).slice(0, 1);

    const matinaleUpcoming = allUpcoming.filter(v =>
      v.title.toLowerCase().includes('matinale') ||
      v.title.toLowerCase().includes('matin')
    ).slice(0, 1);

    const afterweekUpcoming = allUpcoming.filter(v =>
      v.title.toLowerCase().includes('after') ||
      v.title.toLowerCase().includes('week')
    ).slice(0, 1);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        matinale: {
          last: matinaleCompleted[0] || allCompleted[0] || null,
          next: matinaleUpcoming[0] || allUpcoming.find(v => !v.title.toLowerCase().includes('after')) || null
        },
        afterweek: {
          next: afterweekUpcoming[0] || allUpcoming.find(v => !v.title.toLowerCase().includes('matin')) || null
        },
        debug: {
          completedCount: allCompleted.length,
          upcomingCount: allUpcoming.length
        }
      })
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
