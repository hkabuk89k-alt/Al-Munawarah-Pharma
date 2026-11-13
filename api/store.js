import { put, list } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const DEFAULT_PASS = 'N78963a756W';

// دالة لجلب كلمة المرور الحالية (المخصصة أو الافتراضية)
async function getCurrentPassword() {
  try {
    const { blobs } = await list({ prefix: 'admin-auth.json' });
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url + '?t=' + Date.now());
      const data = await response.json();
      if (data && data.password) return data.password;
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_PASS;
}

export default async function handler(req, res) {
  // 1. جلب الأقسام والمنتجات للزوار
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

  // 2. عمليات لوحة التحكم
  if (req.method === 'POST') {
    const { password, action, payload } = req.body;
    const validPassword = await getCurrentPassword();

    if (password !== validPassword) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }

    try {
      // التحقق عند تسجيل الدخول فقط
      if (action === 'verifyLogin') {
        return res.status(200).json({ success: true });
      }

      // تغيير كلمة المرور وحفظ الجديدة في Vercel Blob
      if (action === 'changePassword') {
        const newPass = (payload.newPassword || '').trim();
        if (newPass.length < 4) {
          return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل' });
        }
        await put('admin-auth.json', JSON.stringify({ password: newPass }), {
          access: 'public',
          addRandomSuffix: false,
          contentType: 'application/json',
        });
        return res.status(200).json({ success: true });
      }

      // رفع صورة منتج
      if (action === 'uploadImage') {
        const base64Data = payload.base64.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = await put(`products/${Date.now()}-${payload.filename}`, buffer, {
          access: 'public',
          contentType: 'image/jpeg',
        });
        return res.status(200).json({ url: blob.url });
      }

      // حفظ الأقسام والمنتجات
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
