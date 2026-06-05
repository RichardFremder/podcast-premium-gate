const https = require('https');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';

const FEEDS = [
  {
    name: '5.000 ans d\'Histoire',
    rss: 'https://feeds.audiomeans.fr/feed/b4de9333-deb0-4c99-82e3-3c21cfac3f2a.xml',
    dbId: '313011abd129808da0facfbe4684e31c'
  },
  {
    name: 'Les Interviews Histoire',
    rss: 'https://feeds.audiomeans.fr/feed/3dd7da91-1386-44a5-ad2b-108ac7086e0a.xml',
    dbId: '315011abd12980548fbbcab01c3f7a69'
  },
  {
    name: 'Cinq Minutes d\'Histoire',
    rss: 'https://feeds.audiomeans.fr/feed/db9500f3-fa94-4948-adab-340fc9980c6c.xml',
    dbId: '3150

cat > ~/Desktop/podcast-premium-gate/netlify/functions/cron-import.js << 'EOF'
const https = require('https');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';

const FEEDS = [
  {
    name: '5.000 ans d\'Histoire',
    rss: 'https://feeds.audiomeans.fr/feed/b4de9333-deb0-4c99-82e3-3c21cfac3f2a.xml',
    dbId: '313011abd129808da0facfbe4684e31c'
  },
  {
    name: 'Les Interviews Histoire',
    rss: 'https://feeds.audiomeans.fr/feed/3dd7da91-1386-44a5-ad2b-108ac7086e0a.xml',
    dbId: '315011abd12980548fbbcab01c3f7a69'
  },
  {
    name: 'Cinq Minutes d\'Histoire',
    rss: 'https://feeds.audiomeans.fr/feed/db9500f3-fa94-4948-adab-340fc9980c6c.xml',
    dbId: '315011abd12980b59f1ddfc511af1bb7'
  },
  {
    name: 'Histoires de Business',
    rss: 'https://feeds.audiomeans.fr/feed/f455c695-8a88-40fd-b8f2-7ab517df29b5.xml',
    dbId: '361011abd129803ba8a0ddfe0a5a95c6'
  },
  {
    name: 'La Planete des Hommes',
    rss: 'https://feeds.audiomeans.fr/feed/8056a31b-a92a-4eb6-bf1f-7ba3bf49c189.xml',
    dbId: '361011abd12980ee8501dde3e8243aeb'
  },
  {
    name: 'PhilosoFoot',
    rss: 'https://feeds.audiomeans.fr/feed/68a18ed4-1845-4a49-bf01-d8d3f3f67f25.xml',
    dbId: '361011abd12980e28749ce70b00a3cef'
  },
  {
    name: 'Le Saviez-vous',
    rss: 'https://feeds.audiomeans.fr/feed/da2ba7d5-4019-4f11-b613-dc17fafce4a8.xml',
    dbId: '361011abd12980da968ac8d4687aa4c2'
  },
  {
    name: 'La Grande Illusion',
    rss: 'https://feeds.audiomeans.fr/feed/8760b923-29b8-4323-8474-85907da43854.xml',
    dbId: '361011abd1298093aa4ee10269cc72e6'
  },
  {
    name: 'La Playlist de...',
    rss: 'https://feeds.audiomeans.fr/feed/abd09c68-7c00-49cb-9d55-13e5d016125d.xml',
    dbId: '361011abd129809ca961e554f4688ca1'
  },
  {
    name: 'Histoire Xtraordinaire',
    rss: 'https://feeds.audiomeans.fr/feed/9291e90b-6772-4d4a-8abe-9e150bc8f40f.xml',
    dbId: '361011abd129800d907dedc27ea788d6'
  },
  {
    name: 'Atmospheres',
    rss: 'https://feeds.audiomeans.fr/feed/8cd4636f-62f0-4aff-9602-aabcb95f9ac7.xml',
    dbId: '376011abd12980cf9274eccaf3e6efae'
  },
  {
    name: 'Le BookTok',
    rss: 'https://feeds.audiomeans.fr/feed/12873be2-e4f8-412b-921a-62fbd2f8c8cf.xml',
    dbId: '376011abd129801ea35ff6fa6e375575'
  },
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function notionRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'api.notion.com',
      path, method,
      headers: {
        'Authorization': 'Bearer ' + NOTION_TOKEN,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/);
    const pubDateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/);
    const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || block.match(/<description>([\s\S]*?)<\/description>/);
    const durationMatch = block.match(/<itunes:duration>(.*?)<\/itunes:duration>/);
    const imageMatch = block.match(/<itunes:image href="(.*?)"/) || block.match(/<media:thumbnail url="(.*?)"/);
    const enclosureMatch = block.match(/<enclosure url="(.*?)"/);
    if (!titleMatch || !pubDateMatch) continue;
    const date = new Date(pubDateMatch[1].trim());
    if (isNaN(date)) continue;
    let desc = descMatch ? descMatch[1].trim() : '';
    desc = desc.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
    if (desc.length > 2000) desc = desc.substring(0, 2000);
    let duree = durationMatch ? durationMatch[1].trim() : '';
    if (duree && /^\d+$/.test(duree)) {
      const secs = parseInt(duree);
      duree = Math.floor(secs/60) + "'" + String(secs%60).padStart(2,'0');
    }
    items.push({
      titre: titleMatch[1].trim(), date, dateISO: date.toISOString().split('T')[0],
      desc, duree, image: imageMatch ? imageMatch[1] : '', audio: enclosureMatch ? enclosureMatch[1] : ''
    });
  }
  return items;
}

async function getExistingTitles(dbId) {
  const titles = new Set();
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionRequest('POST', '/v1/databases/' + dbId + '/query', body);
    if (data.results) data.results.forEach(p => {
      const t = p.properties.Titre?.title?.[0]?.plain_text;
      if (t) titles.add(t.toLowerCase().trim());
    });
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return titles;
}

async function createEpisode(dbId, ep) {
  const properties = {
    'Titre': { title: [{ text: { content: ep.titre } }] },
    'Date mise en ligne radio': { date: { start: ep.dateISO } },
    'Visible': { checkbox: true }
  };
  if (ep.desc) properties['Description'] = { rich_text: [{ text: { content: ep.desc } }] };
  if (ep.duree) properties['Temps'] = { rich_text: [{ text: { content: ep.duree } }] };
  if (ep.image) properties['Image URL'] = { url: ep.image };
  if (ep.audio) properties['Lien audio'] = { url: ep.audio };
  return notionRequest('POST', '/v1/pages', { parent: { database_id: dbId }, properties });
}

async function processFeed(feed) {
  console.log('Processing: ' + feed.name);
  const xml = await fetchUrl(feed.rss);
  const allItems = parseRSS(xml);

  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 30);
  const recentItems = allItems.filter(ep => ep.date >= dateFrom);

  if (recentItems.length === 0) {
    console.log('  No recent episodes for ' + feed.name);
    return 0;
  }

  const existingTitles = await getExistingTitles(feed.dbId);
  let imported = 0;

  for (const ep of recentItems) {
    if (existingTitles.has(ep.titre.toLowerCase().trim())) continue;
    const result = await createEpisode(feed.dbId, ep);
    if (result.id) {
      console.log('  Imported: ' + ep.titre.substring(0, 60));
      imported++;
    }
    await new Promise(r => setTimeout(r, 350));
  }

  console.log('  ' + imported + ' new episodes for ' + feed.name);
  return imported;
}

exports.handler = async function(event, context) {
  if (!NOTION_TOKEN) {
    return { statusCode: 500, body: 'NOTION_TOKEN missing' };
  }

  console.log('Starting scheduled RSS import - ' + new Date().toISOString());
  let total = 0;

  for (const feed of FEEDS) {
    try {
      const count = await processFeed(feed);
      total += count;
    } catch(e) {
      console.error('Error for ' + feed.name + ': ' + e.message);
    }
  }

  console.log('Import complete. Total: ' + total);
  return { statusCode: 200, body: 'Import complete. ' + total + ' new episodes.' };
};
