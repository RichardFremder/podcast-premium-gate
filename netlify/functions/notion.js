const NOTION_TOKEN = 'ntn_qX2964728737TqNlm3ebAoKwMRpBH0QiokSPzv1D6VLgBZ';
const SETTINGS_DB = '362011abd129803d8915f72f9c726d33';

exports.handler = async function(event) {
  const dbId = event.queryStringParameters && event.queryStringParameters.db;
  if (!dbId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing db parameter' }) };
  }

  const cursor = event.queryStringParameters && event.queryStringParameters.cursor;
  const isSettings = dbId === SETTINGS_DB;

  try {
    const body = { page_size: 20 };
    // Only filter by Visible for non-settings databases
    if (!isSettings) {
      body.filter = { property: 'Visible', checkbox: { equals: true } };
    }
    if (cursor) body.start_cursor = cursor;

    const response = await fetch('https://api.notion.com/v1/databases/' + dbId + '/query', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + NOTION_TOKEN,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
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
