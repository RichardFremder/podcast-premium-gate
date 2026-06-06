const NOTION_TOKEN = process.env.NOTION_TOKEN;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const pageId = req.query.id;
  if (!pageId) return res.status(400).json({ error: 'Missing id parameter' });

  try {
    const response = await fetch('https://api.notion.com/v1/pages/' + pageId, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + NOTION_TOKEN,
        'Notion-Version': '2022-06-28'
      }
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
