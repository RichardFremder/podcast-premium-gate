const Stripe = require('stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let email;
  try {
    ({ email } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corps de requête invalide' }) };
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email invalide' }) };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });

  try {
    // Cherche tous les clients avec cet email (il peut y en avoir plusieurs)
    const customers = await stripe.customers.list({
      email: email.toLowerCase().trim(),
      limit: 10,
    });

    console.log(`Clients trouvés pour ${email}: ${customers.data.length}`);

    if (customers.data.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ active: false }),
      };
    }

    for (const customer of customers.data) {
      console.log(`Vérification client: ${customer.id} (${customer.email})`);

      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10,
      });

      console.log(`Abonnements trouvés: ${subscriptions.data.length}`);
      subscriptions.data.forEach(s => console.log(`  - status: ${s.status}, id: ${s.id}`));

      const hasAccess = subscriptions.data.some(s =>
        ['active', 'trialing', 'past_due'].includes(s.status)
      );

      if (hasAccess) {
        return {
          statusCode: 200,
          body: JSON.stringify({ active: true }),
        };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ active: false }),
    };

  } catch (err) {
    console.error('Stripe error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur lors de la vérification' }),
    };
  }
};
