const NOTION_TOKEN = process.env.NOTION_TOKEN;

// Toutes les bases épisodes à chercher
const SEARCH_DBS = [
  { id: '313011abd129808da0facfbe4684e31c', label: '5.000 ans d\'Histoire' },
  { id: '315011abd12980548fbbcab01c3f7a69', label: 'Les Interviews Histoire' },
  { id: '315011abd12980b59f1ddfc511af1bb7', label: '5 Minutes d\'Histoire' },
  { id: '361011abd1298002bbb2cf4357ab9209', label: 'La Matinale' },
  { id: '361011abd1298079a1f2c88c7471f040', label: 'L\'After Week' },
];

async function queryDB(dbId, label, query) {
  const body = {
    page_size: 100,
    filter: {
      and: [
        { property: 'Visible', checkbox: { equals: true } },
        {
          or: [
            { property: 'Titre', rich_text: { contains: query } },
            { property: 'Description', rich_text: { contains: query } },
          ]
        }
      ]
    }
  };

  const res = await fetch('https://api.notion.com/v1/databases/' + dbId + '/query', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + NOTION_TOKEN,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!data.results) return [];

  return data.results.map(function(item) {
    const props = item.properties;
    const titre = (props.Titre && props.Titre.title && props.Titre.title[0])
      ? props.Titre.title[0].plain_text : '';
    const desc = (props.Description && props.Description.rich_text && props.Description.rich_text[0])
      ? props.Description.rich_text[0].plain_text : '';
    const date = (props['Date mise en ligne radio'] && props['Date mise en ligne radio'].date)
      ? props['Date mise en ligne radio'].date.start : '';

    var image = '';
    if (props['Image URL'] && props['Image URL'].url) {
      image = props['Image URL'].url;
    } else if (props.Image && props.Image.files && props.Image.files[0]) {
      var f = props.Image.files[0];
      image = f.file ? f.file.url : (f.external ? f.external.url : '');
    }

    var audioUrl = '';
    if (props['Lien audio']) {
      if (props['Lien audio'].url) {
        audioUrl = props['Lien audio'].url;
      } else if (props['Lien audio'].files && props['Lien audio'].files[0]) {
        var af = props['Lien audio'].files[0];
        audioUrl = af.file ? af.file.url : (af.external ? af.external.url : '');
      }
    }

    return {
      id: item.id,
      titre: titre,
      desc: desc.length > 120 ? desc.substring(0, 120) + '…' : desc,
      date: date,
      image: image,
      audioUrl: audioUrl,
      emission: label
    };
  }).filter(function(r) { return r.titre.length > 0; });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const query = req.query.q;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'Query too short', results: [] });
  }

  if (!NOTION_TOKEN) {
    return res.status(500).json({ error: 'NOTION_TOKEN not set', results: [] });
  }

  try {
    const allResults = await Promise.all(
      SEARCH_DBS.map(function(db) { return queryDB(db.id, db.label, query.trim()); })
    );

    const flat = [].concat.apply([], allResults);

    flat.sort(function(a, b) {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date < b.date ? 1 : -1;
    });

    return res.status(200).json({ results: flat.slice(0, 20), total: flat.length });
  } catch(e) {
    return res.status(500).json({ error: e.message, results: [] });
  }
};
