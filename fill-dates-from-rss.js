#!/usr/bin/env node
/**
 * fill-dates-from-rss.js
 * Lit les flux RSS Audiomeans et remplit la propriété
 * "Date mise en ligne radio" dans les bases Notion correspondantes.
 *
 * Usage : node fill-dates-from-rss.js
 */

require('dotenv').config();
const https = require('https');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';

// ── Configuration : flux RSS → base Notion ──────────────────────────────────
const FEEDS = [
  {
    name: '5 Minutes d\'Histoire',
    rss: 'https://feeds.audiomeans.fr/feed/db9500f3-fa94-4948-adab-340fc9980c6c.xml',
    dbId: '315011abd12980b59f1ddfc511af1bb7'
  },
  {
    name: 'Histoires de Business',
    rss: 'https://feeds.audiomeans.fr/feed/f455c695-8a88-40fd-b8f2-7ab517df29b5.xml',
    dbId: '361011abd129803ba8a0ddfe0a5a95c6'
  },
  {
    name: 'Les Interviews Histoire',
    rss: 'https://feeds.audiomeans.fr/feed/3dd7da91-1386-44a5-ad2b-108ac7086e0a.xml',
    dbId: '315011abd12980548fbbcab01c3f7a69'
  },
  {
    name: 'La Planète des Hommes',
    rss: 'https://feeds.audiomeans.fr/feed/8056a31b-a92a-4eb6-bf1f-7ba3bf49c189.xml',
    dbId: '361011abd12980ee8501dde3e8243aeb'
  },
  {
    name: 'PhilosoFoot',
    rss: 'https://feeds.audiomeans.fr/feed/68a18ed4-1845-4a49-bf01-d8d3f3f67f25.xml',
    dbId: '361011abd12980e28749ce70b00a3cef'
  }
];

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

// Parse les items RSS et retourne { titre -> date ISO }
function parseRSS(xml) {
  const items = {};
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                       block.match(/<title>(.*?)<\/title>/);
    const pubDateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/);
    if (titleMatch && pubDateMatch) {
      const titre = titleMatch[1].trim();
      const date = new Date(pubDateMatch[1].trim());
      if (!isNaN(date)) {
        items[titre] = date.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    }
  }
  return items;
}

// Normalise un titre pour la comparaison (minuscules, sans ponctuation)
function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Récupère tous les pages d'une base Notion
async function getAllNotionPages(dbId) {
  const pages = [];
  let cursor = undefined;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionRequest('POST', '/v1/databases/' + dbId + '/query', body);
    if (data.results) pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return pages;
}

// Met à jour la date d'une page Notion
async function updateDate(pageId, dateStr) {
  return notionRequest('PATCH', '/v1/pages/' + pageId, {
    properties: {
      'Date mise en ligne radio': {
        date: { start: dateStr }
      }
    }
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function processFeed(feed) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📻 ' + feed.name);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1. Lire le RSS
  console.log('  Lecture du flux RSS...');
  const xml = await fetchUrl(feed.rss);
  const rssItems = parseRSS(xml);
  console.log('  ' + Object.keys(rssItems).length + ' épisodes trouvés dans le RSS');

  // 2. Récupérer les pages Notion
  console.log('  Lecture de la base Notion...');
  const pages = await getAllNotionPages(feed.dbId);
  console.log('  ' + pages.length + ' pages trouvées dans Notion');

  // 3. Faire correspondre et mettre à jour
  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const page of pages) {
    const props = page.properties;

    // Titre de la page Notion
    const titreNotion = props.Titre && props.Titre.title && props.Titre.title[0]
      ? props.Titre.title[0].plain_text
      : '';

    if (!titreNotion) { skipped++; continue; }

    // Vérifier si la date est déjà remplie
    const dateExistante = props['Date mise en ligne radio'] &&
                          props['Date mise en ligne radio'].date;
    if (dateExistante) { skipped++; continue; }

    // Chercher dans le RSS (correspondance exacte d'abord, puis normalisée)
    let dateRSS = rssItems[titreNotion];
    if (!dateRSS) {
      const normNotion = normalize(titreNotion);
      for (const [titreRSS, date] of Object.entries(rssItems)) {
        if (normalize(titreRSS) === normNotion) {
          dateRSS = date;
          break;
        }
      }
    }

    if (!dateRSS) {
      console.log('  ⚠️  Non trouvé dans RSS : ' + titreNotion.substring(0, 60));
      notFound++;
      continue;
    }

    // Mettre à jour Notion
    await updateDate(page.id, dateRSS);
    console.log('  ✅ ' + titreNotion.substring(0, 50) + ' → ' + dateRSS);
    updated++;

    // Pause pour éviter le rate limiting Notion
    await new Promise(r => setTimeout(r, 350));
  }

  console.log('\n  Résultat : ' + updated + ' mis à jour, ' + skipped + ' déjà remplis, ' + notFound + ' non trouvés');
}

async function main() {
  if (!NOTION_TOKEN) {
    console.error('❌ NOTION_TOKEN manquant dans .env');
    process.exit(1);
  }

  console.log('🚀 Remplissage des dates depuis les flux RSS\n');

  for (const feed of FEEDS) {
    try {
      await processFeed(feed);
    } catch (e) {
      console.error('❌ Erreur pour ' + feed.name + ' : ' + e.message);
    }
  }

  console.log('\n\n✅ Terminé !');
}

main();
