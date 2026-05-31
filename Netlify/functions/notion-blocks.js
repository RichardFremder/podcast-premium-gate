const NOTION_TOKEN = process.env.NOTION_TOKEN;

exports.handler = async function(event) {
  const pageId = event.queryStringParameters && event.queryStringParameters.id;
  if (!pageId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing id parameter' }) };
  }

  try {
    const response = await fetch('https://api.notion.com/v1/blocks/' + pageId + '/children?page_size=100', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + NOTION_TOKEN,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=300'
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
