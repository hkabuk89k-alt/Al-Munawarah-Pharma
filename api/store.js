import { put, list } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: 'store-data.json' });
      if (blobs.length > 0) {
        const response = await fetch(blobs[0].url + '?t=' + Date.now());
        const data = await response.json();
        return res.status(200).json(data);
      }
      return res.status(200).json({ categories: null, items: null });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    const { password, action, payload } = req.body;

    if (password !== 'N78963a756W') {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }

    try {
      if (action === 'uploadImage') {
        const base64Data = payload.base64.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = await put(`products/${Date.now()}-${payload.filename}`, buffer, {
          access: 'public',
          contentType: 'image/jpeg',
        });
        return res.status(200).json({ url: blob.url });
      }

      if (action === 'saveData') {
        const blob = await put('store-data.json', JSON.stringify(payload), {
          access: 'public',
          addRandomSuffix: false,
          contentType: 'application/json',
        });
        return res.status(200).json({ success: true, url: blob.url });
      }

      return res.status(400).json({ error: 'إجراء غير معروف' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
