#!/usr/bin/env node
/**
 * sync-periodes.js — Timeline Story
 * ─────────────────────────────────────────────────────────────────────────────
 * Lit TOUTES les bases sources (5000 ans, Interviews, Business, Planète,
 * Saviez-vous, PhilosoFoot) et réplique chaque épisode dans la base par
 * période historique correspondante (Antiquité / Moyen Âge / Moderne /
 * Contemporaine), en détectant la période par mots-clés dans le titre.
 *
 * Pour affiner manuellement : ajouter un champ "Période historique" (Select)
 * dans n'importe quelle base source — ce script le lira en priorité.
 *
 * Usage  : node sync-periodes.js
 * Cron   : GitHub Actions nightly après cron-import.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const https = require('https');

// ── Bases sources ─────────────────────────────────────────────────────────────
const SOURCE_DBS = [
  { id: '313011abd129808da0facfbe4684e31c', name: '5000 ans d\'Histoire',   audioField: 'Lien audio', dateField: 'Date mise en ligne radio' },
  { id: '315011abd12980548fbbcab01c3f7a69', name: 'Les Interviews Histoire', audioField: 'Lien audio', dateField: 'Date mise en ligne radio' },
  { id: '361011abd129803ba8a0ddfe0a5a95c6', name: 'Histoires de Business',  audioField: 'Lien audio', dateField: 'Date mise en ligne radio' },
  { id: '361011abd12980ee8501dde3e8243aeb', name: 'La Planète des Hommes',  audioField: 'Lien audio', dateField: 'Date mise en ligne radio' },
  { id: '361011abd12980da968ac8d4687aa4c2', name: 'Le Saviez-vous',         audioField: 'Lien audio', dateField: 'Date mise en ligne radio' },
  { id: '361011abd12980e28749ce70b00a3cef', name: 'PhilosoFoot',             audioField: 'Lien audio', dateField: 'Date mise en ligne radio' },
];

// ── Bases cibles par période ──────────────────────────────────────────────────
const PERIOD_DB = {
  'Antiquité':            'c0765a4ad10a4dd2b2825b392f5a2d38',
  'Moyen Âge':            '565c9b58e3994073beebbecbd364d0b9',
  'Époque Moderne':       'ef86c85092104df0aaec21b495c5734a',
  'Époque Contemporaine': '00fd4842aa3a45118c57eaf4ac66c1c6',
};

// ── Mots-clés de détection de période ────────────────────────────────────────
const KEYWORD_RULES = [
  { period: 'Antiquité', keywords: [
    'antiquit', 'romain', 'rome', 'grec', 'grèce', 'carthage',
    'egypt', 'égypt', 'pharaon', 'mésopotami', 'babylon', 'perse',
    'spartiat', 'athèn', 'alexandre', 'hannibal', 'jules césar', 'césar',
    'auguste', 'néron', 'marc aurèle', 'cicéron', 'pompée', 'brutus',
    'cléopâtre', 'ramses', 'toutankhamon', 'achille', 'troie', 'homère',
    'platon', 'aristote', 'socrate', 'pythagore', 'archimède',
    'spartacus', 'légion', 'gaulois', 'vercingétorix', 'alésia',
    'phénicien', 'minoén', 'mycèn', 'sumer', 'akkad', 'assyri',
    'préhistoir', 'paléolithiq', 'néolithiq', 'mégalith', 'dolmen',
    'invasions barbares', 'attila', 'huns', 'göbekli', 'empire romain',
    'carthaginois', 'punique', 'hérodote', 'thucydide', 'péricles',
    'alexandre le grand', 'ptolémée', 'séleucide', 'macédoine',
    'péloponnèse', 'marathon', 'thermopyles', 'salamine',
  ]},
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
    'tamerlan', 'reconquista', 'saint louis', 'blanche de castille',
    'philippe auguste', 'richard ier', 'frédéric barberousse',
    'innocent iii', 'boniface viii', 'empire ottoman naissant',
  ]},
  { period: 'Époque Moderne', keywords: [
    'renaissance', 'humanisme', 'réforme protestant', 'luther',
    'calvin', 'guerres de religion', 'édit de nantes',
    'colomb', 'découverte amérique', 'magellan', 'vasco de gama',
    'colonisation', 'conquistador', 'hernán cortés', 'pizarro',
    'louis xiv', 'louis xiii', 'louis xii', 'louis xi', 'louis x',
    'mazarin', 'richelieu', 'colbert', 'versailles', 'fronde',
    'henri iv', 'henri ii', 'henri iii', 'catherine de médicis',
    'charles quint', 'philippe ii', 'armada',
    'newton', 'galilée', 'descartes', 'pascal', 'leibniz',
    'lumières', 'voltaire', 'rousseau', 'diderot', 'encyclopédie',
    'montesquieu', 'locke', 'kant', 'hume',
    'guerre de trente ans', 'traité westphalie',
    'glorieuse révolution', 'cromwell', 'charles ier angleterre',
    'frédéric le grand', 'pierre le grand', 'catherine ii',
    'marie-thérèse', 'habsbourg', 'louisiane', 'nouvelle-france',
    'xve siècle', 'xvie siècle', 'xviie siècle', 'xviiie siècle',
    'léonard de vinci', 'michel-ange', 'raphaël', 'érasme',
    'machiavel', 'thomas more', 'montaigne', 'rabelais',
    'compagnie des indes', 'traite des esclaves', 'empire aztèque',
    'empire inca', 'empire ming', 'japon edo', 'empire moghol',
    'aldo manuzio', 'gutenberg', 'imprimerie',
  ]},
  { period: 'Époque Contemporaine', keywords: [
    'révolution française', 'napoléon', 'empire français',
    'waterloo', 'trafalgar', 'austerlitz', 'jena',
    'restauration', 'louis xviii', 'charles x', 'louis-philippe',
    '1848', 'second empire', 'commune de paris',
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
    'xixe siècle', 'xxe siècle', 'xxie siècle',
    '19ème', '20ème', '21ème', 'empire colonial', 'bismarck',
    'commune', 'tsar', 'révolution russe', 'lénine', 'trotski',
    'guerre espagne', 'franco', 'mussolini', 'roosevelt',
    'churchill', 'eisenhower', 'kennedy', 'nixon',
    // Émissions thématiques contemporaines
    'michelin', 'ford', 'boeing', 'tesla', 'standard oil',
    'rockefeller', 'carnegie', 'rothschild', 'morgan',
    'platini', 'maradona', 'pelé', 'zidane', 'football',
    'philosophie du sport', 'philosofoot',
    'climat', 'écologie', 'nucléaire', 'internet',
    'mondialisation', 'intelligence artificielle',
  ]},
];

// ── Helpers Notion API ────────────────────────────────────────────────────────
const NOTION_TOKEN   = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';

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
        catch(e) { reject(new Error('JSON parse: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Détection de la période ───────────────────────────────────────────────────
function detectPeriod(titre, description, periodeManuelle) {
  if (periodeManuelle && PERIOD_DB[periodeManuelle]) return periodeManuelle;
  const haystack = (titre + ' ' + (description || '')).toLowerCase();
  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      if (haystack.includes(kw.toLowerCase())) return rule.period;
    }
  }
  return null;
}

// ── Lecture d'une base source ─────────────────────────────────────────────────
async function fetchSourceEpisodes(db) {
  const episodes = [];
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionRequest('POST', '/v1/databases/' + db.id + '/query', body);
    if (data.object === 'error') throw new Error(db.name + ': ' + data.message);

    for (const page of (data.results || [])) {
      const p = page.properties;
      const titre = p['Titre']?.title?.[0]?.plain_text || '';
      if (!titre) continue;

      // Image : Image URL en priorité (champ url), sinon Image (files)
      let image = p['Image URL']?.url || '';
      if (!image && p['Image']?.files?.[0]) {
        const f = p['Image'].files[0];
        image = f.file?.url || f.external?.url || '';
      }

      // Audio
      const audioField = db.audioField || 'Lien audio';
      const audioUrl = p[audioField]?.url || '';

      // Date
      const dateField = db.dateField || 'Date mise en ligne radio';
      const dateISO = p[dateField]?.date?.start || '';

      // Durée
      const duree = p['Temps']?.rich_text?.[0]?.plain_text || p['Durée']?.rich_text?.[0]?.plain_text || '';

      // Description
      let desc = p['Description']?.rich_text?.[0]?.plain_text || '';
      if (desc.length > 2000) desc = desc.substring(0, 2000);

      // Visible
      const visible = p['Visible']?.checkbox ?? true;

      // Période manuelle (si champ ajouté un jour)
      const periodeManuelle = p['Période historique']?.select?.name || null;

      // Premium
      const premium = p['Premium']?.checkbox || false;

      episodes.push({
        notionId: page.id,
        notionUrl: page.url,
        titre, image, audioUrl, dateISO, duree, desc, visible,
        periodeManuelle, premium,
        emission: db.name,  // nom de l'émission source
      });
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return episodes;
}

// ── Lecture des pages existantes dans une base cible ─────────────────────────
// Retourne Map: titre_minuscule → { pageId, hasImage }
async function fetchExistingMap(dbId) {
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

// ── Patch image sur une page existante ───────────────────────────────────────
async function patchImage(pageId, imageUrl) {
  return notionRequest('PATCH', '/v1/pages/' + pageId, {
    properties: { 'Image': { url: imageUrl } }
  });
}

// ── Création d'un épisode dans une base cible ─────────────────────────────────
async function createInTarget(dbId, ep) {
  const properties = {
    'Titre':   { title: [{ text: { content: ep.titre } }] },
    'Visible': { checkbox: ep.visible },
    'Lien Notion source': { url: ep.notionUrl || null },
  };
  if (ep.image)   properties['Image']                = { url: ep.image };
  if (ep.desc)    properties['Description']           = { rich_text: [{ text: { content: ep.desc.substring(0, 2000) } }] };
  if (ep.audioUrl) properties['Audio URL']            = { url: ep.audioUrl };
  if (ep.duree)   properties['Durée']                 = { rich_text: [{ text: { content: ep.duree } }] };
  if (ep.dateISO) properties['Date de publication']   = { date: { start: ep.dateISO } };
  if (ep.emission) properties['Slug']                 = { rich_text: [{ text: { content: ep.emission } }] };

  return notionRequest('POST', '/v1/pages', {
    parent: { database_id: dbId },
    properties
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!NOTION_TOKEN) {
    console.error('❌  NOTION_TOKEN manquant');
    process.exit(1);
  }

  console.log('🔄  Sync toutes émissions → périodes — ' + new Date().toLocaleString('fr-FR'));

  // 1. Charger tous les épisodes de toutes les bases sources
  let allEpisodes = [];
  for (const db of SOURCE_DBS) {
    process.stdout.write('📖  ' + db.name + '...');
    try {
      const eps = await fetchSourceEpisodes(db);
      console.log(' ' + eps.length + ' épisodes');
      allEpisodes = allEpisodes.concat(eps);
    } catch(e) {
      console.log(' ❌ ' + e.message);
    }
    await sleep(200);
  }
  console.log('\n📦  Total : ' + allEpisodes.length + ' épisodes toutes émissions confondues\n');

  // 2. Charger les maps existantes dans chaque base cible
  console.log('🔍  Vérification des doublons dans les bases cibles...');
  const existingMaps = {};
  for (const [periodName, dbId] of Object.entries(PERIOD_DB)) {
    existingMaps[periodName] = await fetchExistingMap(dbId);
    console.log('    ' + periodName + ' : ' + existingMaps[periodName].size + ' entrées');
    await sleep(200);
  }
  console.log('');

  // 3. Classifier et synchroniser
  const stats = { synced: 0, skipped: 0, patched: 0, unclassified: 0, errors: 0 };
  const unclassified = [];

  for (const ep of allEpisodes) {
    const period = detectPeriod(ep.titre, ep.desc, ep.periodeManuelle);

    if (!period) {
      stats.unclassified++;
      unclassified.push('[' + ep.emission + '] ' + ep.titre);
      continue;
    }

    const slug = ep.titre.toLowerCase().trim();
    const existing = existingMaps[period].get(slug);

    if (existing) {
      // Déjà présent — patcher l'image si manquante
      if (!existing.hasImage && ep.image) {
        try {
          await patchImage(existing.pageId, ep.image);
          stats.patched++;
          existingMaps[period].set(slug, { pageId: existing.pageId, hasImage: true });
        } catch(e) { /* silencieux */ }
        await sleep(350);
      } else {
        stats.skipped++;
      }
      continue;
    }

    // Nouvel épisode — créer
    try {
      const result = await createInTarget(PERIOD_DB[period], ep);
      if (result.id) {
        console.log('  ✅  [' + period.replace('Époque ', '') + ' · ' + ep.emission.replace('Les ', '').replace('La ', '').split(' ')[0] + '] ' + ep.titre.substring(0, 55));
        existingMaps[period].set(slug, { pageId: result.id, hasImage: !!ep.image });
        stats.synced++;
      } else {
        console.log('  ❌  ' + (result.message || 'erreur inconnue') + ' — ' + ep.titre.substring(0, 40));
        stats.errors++;
      }
    } catch(e) {
      console.error('  ❌  Exception : ' + e.message);
      stats.errors++;
    }

    await sleep(350);
  }

  // 4. Rapport
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  Terminé !');
  console.log('    Synchronisés    : ' + stats.synced);
  console.log('    Images patchées : ' + stats.patched);
  console.log('    Déjà présents   : ' + stats.skipped);
  console.log('    Non classifiés  : ' + stats.unclassified);
  console.log('    Erreurs         : ' + stats.errors);

  if (unclassified.length > 0) {
    console.log('\n⚠️  Non classifiés (à taguer ou à ajouter aux mots-clés) :');
    unclassified.slice(0, 30).forEach(t => console.log('    – ' + t));
    if (unclassified.length > 30) console.log('    … et ' + (unclassified.length - 30) + ' autres');
  }
}

main().catch(err => {
  console.error('❌  Erreur fatale :', err);
  process.exit(1);
});
