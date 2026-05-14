const NOTION_TOKEN = 'ntn_qX2964728737TqNlm3ebAoKwMRpBH0QiokSPzv1D6VLgBZ';

exports.handler = async function(event) {
  const dbId = event.queryStringParameters && event.queryStringParameters.db;
  if (!dbId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing db parameter' }) };
  }

  try {
    const response = await fetch('https://api.notion.com/v1/databases/' + dbId + '/query', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + NOTION_TOKEN,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: { property: 'Visible', checkbox: { equals: true } },
        page_size: 20
      })
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
