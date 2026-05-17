const BREVO_API_KEY = process.env.BREVO_API_KEY || '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';
const BREVO_LIST_ID = parseInt(process.env.BREVO_LIST_ID || '14');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  try {
    const { email, prenom } = JSON.parse(event.body);

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Email requis' }) };
    }

    const payload = {
      email: email,
      listIds: [BREVO_LIST_ID],
      updateEnabled: true
    };

    if (prenom) {
      payload.attributes = { PRENOM: prenom };
    }

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 201 || response.status === 204) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Inscription réussie' })
      };
    }

    const data = await response.json();
    
    // Contact already exists - still success
    if (response.status === 400 && data.code === 'duplicate_parameter') {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Vous êtes déjà inscrit' })
      };
    }

    throw new Error(data.message || 'Erreur Brevo');

  } catch(e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: e.message })
    };
  }
};
