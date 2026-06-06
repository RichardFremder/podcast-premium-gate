const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = 14;

module.exports = async (req, res) {
  if (event.httpMethod !== 'POST') {
    return res.status(405).json(JSON.parse(JSON.stringify({ error: 'Method not allowed' ))) };
  }

  try {
    const body = JSON.parse(event.body);
    const email = body.email;
    const prenom = body.prenom || '';

    if (!email) {
      return res.status(400).json(JSON.parse(JSON.stringify({ error: 'Email manquant' ))) };
    }

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify({
        email: email,
        attributes: { PRENOM: prenom },
        listIds: [BREVO_LIST_ID],
        updateEnabled: true
      })
    });

    if (response.status === 201 || response.status === 204) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true })
      };
    }

    const data = await response.json();
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: data.message || 'Erreur Brevo' })
    };

  } catch(e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
