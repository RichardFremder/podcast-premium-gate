const NOTION_TOKEN = process.env.NOTION_TOKEN;

const NO_FILTER_DBS = [
  '362011abd129803d8915f72f9c726d33', // Paramètres
  '362011abd1298026b0eac357b47036b2', // Équipe
  '362011abd129805ba540e25179bfd472', // Émissions
];

exports.handler = async function(event) {
  const dbId = event.queryStringParameters && event.queryStringParameters.db;
  if (!dbId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing db parameter' }) };
  }

  const cursor = event.queryStringParameters && event.queryStringParameters.cursor;
  const jour = event.queryStringParameters && event.queryStringParameters.jour;
  const noFilter = NO_FILTER_DBS.includes(dbId);

  try {
    const body = { page_size: 20 };

    if (!noFilter) {
      if (jour) {
        body.filter = {
          and: [
            { property: 'Visible', checkbox: { equals: true } },
            { property: 'Jour', select: { equals: jour } }
          ]
        };
      } else {
        body.filter = { property: 'Visible', checkbox: { equals: true } };
      }
    }

    if (cursor) body.start_cursor = cursor;
    if (!noFilter) body.sorts = [{ property: "Date mise en ligne radio", direction: "descending" }];

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
        'Cache-Control': noFilter ? 'no-cache' : 'public, s-maxage=300, stale-while-revalidate=600'
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
