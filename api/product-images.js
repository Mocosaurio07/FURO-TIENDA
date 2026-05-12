// api/product-images.js
// Obtiene imágenes de productos desde BigBuy API
// Llamada: GET /api/product-images?sku=BB-XXXX
 
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
 
  const { sku } = req.query;
  if (!sku) return res.status(400).json({ error: 'SKU requerido' });
 
  try {
    const BB_KEY = process.env.BIGBUY_API_KEY;
    const BB_URL = 'https://api.bigbuy.eu/rest';
 
    // Primero buscar el producto por referencia
    const searchRes = await fetch(
      `${BB_URL}/catalog/productinformationbysku/${encodeURIComponent(sku)}.json`,
      { headers: { 'Authorization': `Bearer ${BB_KEY}` } }
    );
 
    if (!searchRes.ok) {
      // Si no encuentra por SKU, devolver imágenes vacías
      return res.json({ images: [] });
    }
 
    const product = await searchRes.json();
    const productId = product.id;
 
    // Obtener imágenes del producto
    const imgRes = await fetch(
      `${BB_URL}/catalog/productimages/${productId}.json`,
      { headers: { 'Authorization': `Bearer ${BB_KEY}` } }
    );
 
    if (!imgRes.ok) return res.json({ images: [] });
 
    const images = await imgRes.json();
    
    // Devolver las URLs de las imágenes ordenadas
    const urls = (Array.isArray(images) ? images : [images])
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(img => img.url || img.imageUrl || img.src)
      .filter(Boolean)
      .slice(0, 5); // máximo 5 imágenes
 
    res.json({ images: urls, productId });
 
  } catch (err) {
    console.error('BigBuy API error:', err.message);
    res.json({ images: [] });
  }
};
