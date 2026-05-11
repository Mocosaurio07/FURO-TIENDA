const Stripe = require('stripe');
 
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
 
  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const { items, origin } = req.body;
 
    const line_items = items.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: { name: item.n },
        unit_amount: Math.round(item.p * 100),
      },
      quantity: item.qty,
    }));
 
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${origin}/success.html`,
      cancel_url: origin,
      locale: 'es',
    });
 
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
 
