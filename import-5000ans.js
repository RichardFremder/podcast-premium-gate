#!/usr/bin/env node
/**
 * import-5000ans.js
 * Importe les nouveaux épisodes de 5.000 ans d'Histoire depuis le RSS Audiomeans
 * vers la base Notion, à partir du 16/05/2026.
 *
 * Usage : node import-5000ans.js
 */

require('dotenv').config();
const https = require('https');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';
const DB_ID = '313011abd129808da0facfbe4684e31c'; // 5000 ans d'Histoire
const RSS_URL = 'https://feeds.audiomeans.fr/feed/b4de9333-deb0-4c99-82e3-3c21cfac3f2a.xml';
const DATE_FROM = new Date('2026-05-16');

// ── Helpers ──────────────────────────────────────────────────────────────────

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
      path,
      method,
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

// Parse les items RSS
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                       block.match(/<title>(.*?)<\/title>/);
    const pubDateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/);
    const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
                      block.match(/<description>([\s\S]*?)<\/description>/);
    const durationMatch = block.match(/<itunes:duration>(.*?)<\/itunes:duration>/);
    const imageMatch = block.match(/<itunes:image href="(.*?)"/) ||
                       block.match(/<media:thumbnail url="(.*?)"/);
    const enclosureMatch = block.match(/<enclosure url="(.*?)"/);

    if (!titleMatch || !pubDateMatch) continue;

    const date = new Date(pubDateMatch[1].trim());
    if (isNaN(date)) continue;

    // Nettoyer la description HTML
    let desc = descMatch ? descMatch[1].trim() : '';
    desc = desc.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
    if (desc.length > 2000) desc = desc.substring(0, 2000);

    // Formater la durée
    let duree = durationMatch ? durationMatch[1].trim() : '';
    if (duree && /^\d+$/.test(duree)) {
      const secs = parseInt(duree);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      duree = m + "'" + (s < 10 ? '0' : '') + s;
    }

    items.push({
      titre: titleMatch[1].trim(),
      date: date,
      dateISO: date.toISOString().split('T')[0],
      desc: desc,
      duree: duree,
      image: imageMatch ? imageMatch[1] : '',
      audio: enclosureMatch ? enclosureMatch[1] : ''
    });
  }
  return items;
}

// Récupère les titres déjà dans Notion
async function getExistingTitles() {
  const titles = new Set();
  let cursor = undefined;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionRequest('POST', '/v1/databases/' + DB_ID + '/query', body);
    if (data.results) {
      data.results.forEach(page => {
        const t = page.properties.Titre && page.properties.Titre.title && page.properties.Titre.title[0]
          ? page.properties.Titre.title[0].plain_text : '';
        if (t) titles.add(t.toLowerCase().trim());
      });
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return titles;
}

// Crée un épisode dans Notion
async function createEpisode(ep) {
  const properties = {
    'Titre': { title: [{ text: { content: ep.titre } }] },
    'Date mise en ligne radio': { date: { start: ep.dateISO } },
    'Visible': { checkbox: true }
  };

  if (ep.desc) {
    properties['Description'] = { rich_text: [{ text: { content: ep.desc } }] };
  }
  if (ep.duree) {
    properties['Temps'] = { rich_text: [{ text: { content: ep.duree } }] };
  }
  if (ep.image) {
    properties['Image URL'] = { url: ep.image };
  }
  if (ep.audio) {
    properties['Lien audio'] = { url: ep.audio };
  }

  return notionRequest('POST', '/v1/pages', {
    parent: { database_id: DB_ID },
    properties
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!NOTION_TOKEN) {
    console.error('❌ NOTION_TOKEN manquant dans .env');
    process.exit(1);
  }

  console.log('🚀 Import des nouveaux épisodes 5.000 ans d\'Histoire\n');
  console.log('📅 À partir du : ' + DATE_FROM.toLocaleDateString('fr-FR'));

  // 1. Lire le RSS
  console.log('\n⏳ Lecture du flux RSS...');
  const xml = await fetchUrl(RSS_URL);
  const allItems = parseRSS(xml);
  console.log('  ' + allItems.length + ' épisodes trouvés dans le RSS');

  // 2. Filtrer par date
  const newItems = allItems.filter(ep => ep.date >= DATE_FROM);
  console.log('  ' + newItems.length + ' épisodes depuis le ' + DATE_FROM.toLocaleDateString('fr-FR'));

  if (newItems.length === 0) {
    console.log('\n✅ Aucun nouvel épisode à importer.');
    return;
  }

  // 3. Récupérer les titres existants dans Notion
  console.log('\n⏳ Vérification des doublons dans Notion...');
  const existingTitles = await getExistingTitles();
  console.log('  ' + existingTitles.size + ' épisodes déjà dans Notion');

  // 4. Importer les nouveaux
  let imported = 0;
  let skipped = 0;

  for (const ep of newItems) {
    if (existingTitles.has(ep.titre.toLowerCase().trim())) {
      console.log('  ⏭️  Déjà présent : ' + ep.titre.substring(0, 60));
      skipped++;
      continue;
    }

    const result = await createEpisode(ep);
    if (result.id) {
      console.log('  ✅ ' + ep.dateISO + ' — ' + ep.titre.substring(0, 60));
      imported++;
    } else {
      console.log('  ❌ Erreur pour : ' + ep.titre.substring(0, 60), result.message || '');
    }

    await new Promise(r => setTimeout(r, 350));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Terminé ! ' + imported + ' importés, ' + skipped + ' déjà présents');
}

main().catch(console.error);
