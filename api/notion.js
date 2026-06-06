const https = require('https');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';

function notionRequest(path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'api.notion.com',
      path, method: 'POST',
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const dbId = req.query.db;
  if (!dbId) return res.status(400).json({ error: 'Missing db parameter' });

  try {
    const body = { page_size: 100, sorts: [{ property: 'Date mise en ligne radio', direction: 'descending' }] };
    const cursor = req.query.cursor;
    if (cursor) body.start_cursor = cursor;

    const data = await notionRequest('/v1/databases/' + dbId + '/query', body);
    res.json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
