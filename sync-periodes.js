#!/usr/bin/env node
/**
 * sync-periodes.js — Timeline Story
 * ─────────────────────────────────────────────────────────────────────────────
 * Lit la base Notion principale "5.000 ans d'Histoire" (alimentée par le RSS)
 * et réplique chaque épisode dans la base par période historique correspondante
 * (Antiquité / Moyen Âge / Époque Moderne / Époque Contemporaine).
 *
 * La détection de la période se fait par mots-clés dans le TITRE de l'épisode.
 * Pour affiner, vous pouvez aussi ajouter manuellement un champ "Période historique"
 * (Select) dans la base source — ce script le lira en priorité si présent.
 *
 * Usage  : node sync-periodes.js
 * Cron   : à lancer après cron-import.js (ex : 06h35 UTC via GitHub Actions)
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const https = require('https');

// ── Configuration ─────────────────────────────────────────────────────────────

const NOTION_TOKEN   = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';

/** Base source : la base principale alimentée par le flux RSS Audiomeans */
const SOURCE_DB_ID = '313011abd129808da0facfbe4684e31c'; // 5.000 ans d'Histoire (RSS)

/** Bases cibles créées le 27/06/2026 */
const PERIOD_DB = {
  'Antiquité':           'c0765a4ad10a4dd2b2825b392f5a2d38',
  'Moyen Âge':           '565c9b58e3994073beebbecbd364d0b9',
  'Époque Moderne':      'ef86c85092104df0aaec21b495c5734a',
  'Époque Contemporaine':'00fd4842aa3a45118c57eaf4ac66c1c6',
};

// ── Mots-clés pour détection automatique de la période ───────────────────────
// Priorité : le plus bas = vérifié en premier.
// Ajoutez ici les titres ou thèmes que vous connaissez déjà.

const KEYWORD_RULES = [
  // ── Antiquité (jusqu'au Ve s.) ──
  { period: 'Antiquité', keywords: [
    'antiquit', 'romain', 'rome', 'grec', 'grèce', 'grec', 'carthage',
    'egypt', 'égypt', 'pharaon', 'mésopotami', 'babylon', 'perse', 'perse',
    'spartiat', 'athèn', 'alexandre', 'hannibal', 'jules césar', 'césar',
    'auguste', 'néron', 'marc aurèle', 'cicéron', 'pompée', 'brutus',
    'cléopâtre', 'ramses', 'toutankhamon', 'achille', 'troie', 'homère',
    'platon', 'aristote', 'socrate', 'pythagore', 'archimède',
    'spartacus', 'légion', 'gaulois', 'vercingétorix', 'alésia',
    'phénicien', 'minoén', 'mycèn', 'sumer', 'akkad', 'assyri',
    'préhistoir', 'paléolithiq', 'néolithiq', 'mégalith', 'dolmen',
    'invasions barbares', 'attila', 'huns',
  ]},

  // ── Moyen Âge (Ve – XVe s.) ──
  { period: 'Moyen Âge', keywords: [
    'moyen âge', 'médiéval', 'féodal', 'seigneur', 'serf', 'croisade',
    'templier', 'hospitalier', 'chevalier', 'chevalerie', 'cathédrale',
    'charlemagne', 'clovis', 'mérovingi', 'carolingi', 'capétien',
    'saint-empire', 'otton', 'barbare', 'viking', 'normand',
    'islam médiéval', 'omeyyade', 'abbasside', 'bagdad médiéval',
    'jérusalem médiéval', 'byzance', 'byzantin', 'justinien',
    'richard cœur', 'saladin', 'jeanne d\'arc', 'guerre de cent ans',
    'peste noire', 'schisme', 'inquisition', 'cathare', 'albigeois',
    'génois', 'venise médiévale', 'hanse', 'mongol', 'gengis',
    'tamerlan', 'reconquista',
  ]},

  // ── Époque Moderne (XVe – fin XVIIIe s.) ──
  { period: 'Époque Moderne', keywords: [
    'renaissance', 'humanisme', 'réforme protestant', 'luther',
    'calvin', 'guerres de religion', 'édit de nantes',
    'colomb', 'découverte amérique', 'magellan', 'vasco de gama',
    'colonisation', 'conquistador', 'hernán cortés', 'pizarro',
    'louis xiv', 'louis xiii', 'louis xii', 'louis xi', 'louis x',
    'mazarin', 'richelieu', 'colbert', 'versailles', 'fronde',
    'henri iv', 'henri ii', 'henri iii', 'catherine de médicis',
    'charles quint', 'philippe ii espagne', 'armada',
    'newton', 'galilée', 'descartes', 'pascal', 'leibniz',
    'lumières', 'voltaire', 'rousseau', 'diderot', 'encyclopédie',
    'montesquieu', 'locke', 'kant', 'hume',
    'guerre de trente ans', 'traité westphalie',
    'glorieuse révolution', 'cromwell', 'charles ier angleterre',
    'frédéric le grand', 'pierre le grand', 'catherine ii',
    'marie-thérèse', 'habsbourg',
    'louisiana', 'nouvelle-france', 'esclavage',
    'xve siècle', 'xvie siècle', 'xviie siècle', 'xviiie siècle',
  ]},

  // ── Époque Contemporaine (1789 → nos jours) ──
  { period: 'Époque Contemporaine', keywords: [
    'révolution française', 'napoléon', 'empire français',
    'waterloo', 'trafalgar', 'austerlitz', 'jena',
    'restauration', 'louis xviii', 'charles x', 'louis-philippe',
    '1848', 'second empire', 'commune de paris', 'iii\u1d49 République',
    'troisième république', 'affaire dreyfus', 'boulanger',
    'première guerre', 'grande guerre', '14-18', '1914', '1918',
    'verdun', 'somme', 'marne',
    'années folles', 'entre-deux-guerres', 'montée du fascisme',
    'mussolini', 'hitler', 'nazisme', 'staline',
    'seconde guerre', '39-45', '1939', '1945', 'holocauste',
    'débarquement', 'résistance', 'vichy', 'de gaulle',
    'guerre froide', 'urss', 'soviétique', 'khrouchtchev',
    'mao', 'chine communiste', 'corée', 'vietnam',
    'décolonisation', 'indépendance', 'algérie',
    'mai 68', 'chute du mur', 'fin de l\'urss',
    'guerre du golfe', '11 septembre', 'guerre irak',
    'mondialisation', 'intelligence artificielle',
    'xixe siècle', 'xxe siècle', 'xxie siècle',
    '19ème', '20ème', '21ème',
  ]},
];

// ── Helpers Notion API ────────────────────────────────────────────────────────

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
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('JSON parse error: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Détection de la période ───────────────────────────────────────────────────

/**
 * Retourne le nom de la période historique détectée pour un épisode,
 * ou null si aucune règle ne correspond.
 * @param {string} titre
 * @param {string} description
 * @param {string|null} periodeManuelle  — valeur du champ "Période historique" si présent
 */
function detectPeriod(titre, description, periodeManuelle) {
  // 1. Priorité : champ manuel renseigné dans la base source
  if (periodeManuelle && PERIOD_DB[periodeManuelle]) return periodeManuelle;

  const haystack = (titre + ' ' + (description || '')).toLowerCase();

  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      if (haystack.includes(kw.toLowerCase())) return rule.period;
    }
  }
  return null; // non classé
}

// ── Lecture de la base source ─────────────────────────────────────────────────

async function fetchSourceEpisodes() {
  const episodes = [];
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionRequest('POST', '/v1/databases/' + SOURCE_DB_ID + '/query', body);

    if (data.object === 'error') throw new Error('Source DB: ' + data.message);

    for (const page of (data.results || [])) {
      const p = page.properties;
      const titre = p['Titre']?.title?.[0]?.plain_text || '';
      if (!titre) continue;

      episodes.push({
        notionId:       page.id,
        notionUrl:      page.url,
        titre,
        description:    p['Description']?.rich_text?.[0]?.plain_text || '',
        image:          p['Image URL']?.url || p['Image']?.url || '',
        audioUrl:       p['Lien audio']?.url || p['Audio URL']?.url || '',
        dateISO:        p['Date mise en ligne radio']?.date?.start || p['Date de publication']?.date?.start || '',
        duree:          p['Temps']?.rich_text?.[0]?.plain_text || p['Durée']?.rich_text?.[0]?.plain_text || '',
        visible:        p['Visible']?.checkbox ?? true,
        // champ optionnel si tu l'ajoutes plus tard à la base source
        periodeManuelle: p['Période historique']?.select?.name || null,
      });
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return episodes;
}

// ── Lecture des slugs déjà présents dans une base cible ──────────────────────

async function fetchExistingSlugSet(dbId) {
  // Retourne un Map: titre_minuscule -> { pageId, hasImage }
  const map = new Map();
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionRequest('POST', '/v1/databases/' + dbId + '/query', body);
    for (const page of (data.results || [])) {
      const t = page.properties['Titre']?.title?.[0]?.plain_text;
      const hasImage = !!(page.properties['Image']?.url);
      if (t) map.set(t.toLowerCase().trim(), { pageId: page.id, hasImage });
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return map;
}

// ── Mise à jour d'un champ Image sur une page existante ──────────────────────
async function patchImage(pageId, imageUrl) {
  return notionRequest('PATCH', '/v1/pages/' + pageId, {
    properties: { 'Image': { url: imageUrl } }
  });
}

// ── Création d'un épisode dans une base cible ─────────────────────────────────

async function createInTarget(dbId, ep, period) {
  const properties = {
    'Titre':        { title: [{ text: { content: ep.titre } }] },
    'Visible':      { checkbox: ep.visible },
    'Lien Notion source': { url: ep.notionUrl || null },
  };

  if (ep.description) properties['Description'] = { rich_text: [{ text: { content: ep.description.substring(0, 2000) } }] };
  if (ep.image)       properties['Image']        = { url: ep.image };
  if (ep.audioUrl)    properties['Audio URL']    = { url: ep.audioUrl };
  if (ep.duree)       properties['Durée']        = { rich_text: [{ text: { content: ep.duree } }] };
  if (ep.dateISO)     properties['Date de publication'] = { date: { start: ep.dateISO } };

  return notionRequest('POST', '/v1/pages', {
    parent: { database_id: dbId },
    properties
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!NOTION_TOKEN) {
    console.error('❌  NOTION_TOKEN manquant (vérifiez .env ou les secrets GitHub)');
    process.exit(1);
  }

  console.log('🔄  Sync périodes historiques — ' + new Date().toLocaleString('fr-FR'));
  console.log('📖  Lecture de la base source...\n');

  // 1. Charger tous les épisodes de la base source
  const episodes = await fetchSourceEpisodes();
  console.log('    ' + episodes.length + ' épisodes dans la base source\n');

  // 2. Charger les slugs existants dans chaque base cible (déduplication)
  console.log('🔍  Vérification des doublons dans les bases cibles...');
  const existingSlugs = {};
  for (const [periodName, dbId] of Object.entries(PERIOD_DB)) {
    existingSlugs[periodName] = await fetchExistingSlugSet(dbId);
    console.log('    ' + periodName + ' : ' + existingSlugs[periodName].size + ' épisodes déjà présents');
    await sleep(200);
  }
  console.log('');

  // 3. Classifier et synchroniser
  const stats = { synced: 0, skipped: 0, unclassified: 0, errors: 0 };
  const unclassified = [];

  for (const ep of episodes) {
    const period = detectPeriod(ep.titre, ep.description, ep.periodeManuelle);

    if (!period) {
      stats.unclassified++;
      unclassified.push(ep.titre);
      continue;
    }

    const slug = ep.titre.toLowerCase().trim();
    if (existingSlugs[period].has(slug)) {
      // Si l'image est manquante, on la patch
      const existing = existingSlugs[period].get(slug);
      if (!existing.hasImage && ep.image) {
        try {
          await patchImage(existing.pageId, ep.image);
          stats.patched = (stats.patched || 0) + 1;
        } catch(e) { /* silencieux */ }
        await sleep(350);
      } else {
        stats.skipped++;
      }
      continue;
    }

    try {
      const result = await createInTarget(PERIOD_DB[period], ep, period);
      if (result.id) {
        console.log('  ✅  [' + period + '] ' + ep.titre.substring(0, 65));
        existingSlugs[period].set(slug, { pageId: result.id, hasImage: true }); // évite les doublons intra-session
        stats.synced++;
      } else {
        console.log('  ❌  Erreur Notion : ' + (result.message || JSON.stringify(result).substring(0, 100)));
        stats.errors++;
      }
    } catch(e) {
      console.error('  ❌  Exception pour "' + ep.titre.substring(0, 50) + '" : ' + e.message);
      stats.errors++;
    }

    await sleep(350); // respecter le rate-limit Notion (3 req/s)
  }

  // 4. Rapport final
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  Terminé !');
  console.log('    Synchronisés    : ' + stats.synced);
  console.log('    Déjà présents   : ' + stats.skipped);
  console.log('    Non classifiés  : ' + stats.unclassified);
  console.log('    Erreurs         : ' + stats.errors);

  if (unclassified.length > 0) {
    console.log('\n⚠️  Épisodes non classifiés (à taguer manuellement ou à ajouter aux mots-clés) :');
    unclassified.forEach(t => console.log('    – ' + t));
  }
}

main().catch(err => {
  console.error('❌  Erreur fatale :', err);
  process.exit(1);
});
