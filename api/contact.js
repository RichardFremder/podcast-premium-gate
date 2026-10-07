// /api/contact — Formulaire de contact timeline-story.fr
// Envoie le message par email transactionnel Brevo.
// Variables d'environnement Vercel :
//   BREVO_API_KEY        (déjà en place pour la newsletter)
//   CONTACT_TO_EMAIL     adresse(s) qui reçoivent les messages, séparées par des virgules
//   CONTACT_FROM_EMAIL   expéditeur VALIDÉ dans Brevo (Senders & IP), ex. contact@timeline-story.fr

const SUBJECTS = [
  'Question sur un épisode ou un contenu',
  'Abonnement Premium',
  'Proposer une intervention (historien, auteur)',
  'Partenariat, publicité, presse',
  'Signaler un problème technique',
  'Autre'
];

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { BREVO_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } = process.env;
  if (!BREVO_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
    return res.status(500).json({ error: 'Le formulaire est momentanément indisponible' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Requête invalide' });
  }

  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().slice(0, 200);
  const subject = SUBJECTS.includes(body.subject) ? body.subject : 'Autre';
  const message = String(body.message || '').trim().slice(0, 5000);

  // Anti-spam : champ piège rempli ou formulaire envoyé en moins de 3 s → on fait semblant d'accepter
  if (body.website || (typeof body.elapsed === 'number' && body.elapsed < 3000)) {
    return res.status(200).json({ ok: true });
  }

  if (!name) return res.status(400).json({ error: "Merci d'indiquer votre nom" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Adresse email invalide' });
  if (message.length < 10) return res.status(400).json({ error: 'Votre message est un peu court' });

  const to = CONTACT_TO_EMAIL.split(',').map(a => ({ email: a.trim() })).filter(a => a.email);
  const date = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">
      <p><strong>Objet :</strong> ${esc(subject)}<br>
      <strong>De :</strong> ${esc(name)} &lt;${esc(email)}&gt;<br>
      <strong>Reçu le :</strong> ${esc(date)}</p>
      <hr style="border:none;border-top:1px solid #ddd">
      <p style="white-space:pre-wrap">${esc(message)}</p>
      <hr style="border:none;border-top:1px solid #ddd">
      <p style="font-size:12px;color:#777">Envoyé depuis timeline-story.fr/contact.html — répondez directement à cet email pour écrire à l'expéditeur.</p>
    </div>`;

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Timeline Story — Contact', email: CONTACT_FROM_EMAIL },
        to,
        replyTo: { email, name },
        subject: `[Contact] ${subject} — ${name}`,
        htmlContent: html,
        textContent: `Objet : ${subject}\nDe : ${name} <${email}>\nReçu le : ${date}\n\n${message}`,
        tags: ['contact-site']
      })
    });
    if (!r.ok) {
      console.error('Brevo contact error', r.status, await r.text());
      return res.status(502).json({ error: "L'envoi a échoué, veuillez réessayer dans un instant" });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Contact handler error', e);
    return res.status(500).json({ error: 'Une erreur est survenue, veuillez réessayer' });
  }
};
