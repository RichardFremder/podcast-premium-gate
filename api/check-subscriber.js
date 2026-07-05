const Stripe = require('stripe');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET' && req.query && req.query.debug === '1') {
    const key = process.env.STRIPE_SECRET_KEY || '';
    return res.status(200).json({
      keyPresent: key.length > 0,
      keyLength: key.length,
      keyPrefix: key.slice(0, 7)
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let email;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    ({ email } = body || {});
  } catch {
    return res.status(400).json({ error: 'Corps de requête invalide' });
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Email invalide' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });

  try {
    const customers = await stripe.customers.list({
      email: email.toLowerCase().trim(),
      limit: 10,
    });

    if (customers.data.length === 0) {
      return res.status(200).json({ active: false });
    }

    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10,
      });

      const hasAccess = subscriptions.data.some(s =>
        ['active', 'trialing', 'past_due'].includes(s.status)
      );

      if (hasAccess) {
        return res.status(200).json({ active: true });
      }
    }

    return res.status(200).json({ active: false });

  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
};
