const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = 14;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, firstName } = body;
    if (!email) return res.status(400).json({ error: 'Missing email' });

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        attributes: { FIRSTNAME: firstName || '' },
        listIds: [BREVO_LIST_ID],
        updateEnabled: true
      })
    });
    // Brevo renvoie un corps vide (204) quand le contact existe déjà et est mis à jour
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) return res.status(response.status).json(data);
    res.status(200).json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
