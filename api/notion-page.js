const NOTION_TOKEN = process.env.NOTION_TOKEN;
module.exports = async (req, res) {
  const pageId = event.queryStringParameters && event.queryStringParameters.id;
  if (!pageId) {
    return res.status(400).json(JSON.parse(JSON.stringify({ error: 'Missing id parameter' ))) };
  }

  try {
    const response = await fetch('https://api.notion.com/v1/pages/' + pageId, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + NOTION_TOKEN,
        'Notion-Version': '2022-06-28'
      }
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
  } catch(e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
