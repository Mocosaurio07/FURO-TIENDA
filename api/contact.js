
Copiar

const Anthropic = require('@anthropic-ai/sdk');
 
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
 
  try {
    const { nombre, email, motivo, mensaje } = req.body;
 
    // 1. Generar respuesta con IA
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `Eres el asistente de atención al cliente de Furō, una tienda online española de accesorios premium para mascotas.
Responde siempre en español, con tono cercano y amigable. Sé conciso (máximo 3 párrafos).
Información clave de la tienda:
- Envíos: 24-48h de preparación. Entrega 2-4 días hábiles en Península, 4-7 en Islas.
- Devoluciones: 14 días naturales desde recepción. Sin preguntas.
- Reembolso: 5-10 días hábiles tras recibir el producto devuelto.
- Email: ${process.env.STORE_EMAIL || 'hola@furo.es'}
- Productos defectuosos: devolución gratuita + reemplazo o reembolso completo.
Empieza siempre con "Hola [nombre]," y termina con "Un saludo,\nEl equipo de Furō 🐾"`,
      messages: [{
        role: 'user',
        content: `Motivo: ${motivo}\n\nMensaje del cliente:\n${mensaje}`
      }]
    });
 
    const respuestaIA = response.content[0].text;
 
    // 2. Enviar email al cliente vía Resend
    const resendKey = process.env.RESEND_API_KEY;
    const storeEmail = process.env.STORE_EMAIL || 'hola@furo.es';
 
    if (resendKey) {
      // Auto-respuesta al cliente
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `Furō <${storeEmail}>`,
          to: email,
          subject: `Re: ${motivo} — Furō`,
          text: respuestaIA
        })
      });
 
      // Notificación a la tienda
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `Formulario Furō <${storeEmail}>`,
          to: storeEmail,
          subject: `[Nuevo mensaje] ${motivo} — ${nombre}`,
          text: `De: ${nombre} <${email}>\nMotivo: ${motivo}\n\nMensaje:\n${mensaje}\n\n---\nRespuesta automática enviada:\n${respuestaIA}`
        })
      });
    }
 
    res.json({ ok: true, respuesta: respuestaIA });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
 
