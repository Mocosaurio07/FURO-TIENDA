// api/webhook.js
// Stripe webhook → crea pedido en BigBuy tras pago exitoso
 
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
 
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
 
  let event;
  try {
    // Verificar firma del webhook
    const rawBody = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }
 
  // Solo procesar pagos completados
  if (event.type !== 'checkout.session.completed') {
    return res.json({ received: true });
  }
 
  const session = event.data.object;
  const metadata = session.metadata || {};
  
  try {
    // Parsear los items del pedido desde metadata
    const items = JSON.parse(metadata.items || '[]');
    const shipping = JSON.parse(metadata.shipping || '{}');
 
    if (!items.length) {
      console.log('No items in metadata');
      return res.json({ received: true });
    }
 
    // Crear pedido en BigBuy
    const BB_KEY = process.env.BIGBUY_API_KEY;
    const BB_URL = 'https://api.bigbuy.eu/rest';
 
    const bigbuyOrder = {
      order: {
        internalReference: session.payment_intent,
        language: 'es',
        paymentMethod: 'moneybox',
        carriers: [{ name: 'CORREOS' }],
        shippingAddress: {
          firstName: shipping.name?.split(' ')[0] || 'Cliente',
          lastName: shipping.name?.split(' ').slice(1).join(' ') || 'Furō',
          country: 'ES',
          postcode: shipping.zip || '28001',
          town: shipping.city || 'Madrid',
          address: shipping.address || 'Dirección pendiente',
          phone: '600000000',
          email: session.customer_email || 'pedido@furo.es',
          vatNumber: ''
        },
        products: items.map(item => ({
          reference: item.s,  // SKU BigBuy
          quantity: item.qty
        }))
      }
    };
 
    const orderRes = await fetch(`${BB_URL}/order/create.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BB_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bigbuyOrder)
    });
 
    const orderData = await orderRes.json();
 
    if (!orderRes.ok) {
      console.error('BigBuy error:', JSON.stringify(orderData));
      // No fallar el webhook aunque BigBuy falle — el cobro ya se realizó
    } else {
      console.log('BigBuy order created:', orderData);
    }
 
    res.json({ received: true, bigbuyOrder: orderData });
 
  } catch (err) {
    console.error('Webhook processing error:', err.message);
    res.json({ received: true, error: err.message });
  }
};
