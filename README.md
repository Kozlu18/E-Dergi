# E-Dergi Web Uygulamasi

Supabase kullanan e-dergi ve kitap yonetim uygulamasi.

## Kurulum

1. Bagimliliklari yukleyin:

```bash
npm install
```

2. `.env.example` dosyasini `.env` olarak kopyalayin ve Supabase bilgilerinizi girin.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_STORAGE_BUCKET=publications
VITE_ADMIN_EMAIL=admin@example.com
```

3. Supabase Dashboard > SQL Editor ekraninda `supabase.schema.sql` dosyasini calistirin.
   SQL icindeki `admin@example.com` degerini kendi admin e-postanizla degistirin.

4. Supabase Dashboard > Authentication > Users ekranindan admin kullanicisini olusturun.

5. Gelistirme sunucusunu baslatin:

```bash
npm run dev
```

## Sayfalar

- `/`: Okuyucularin yayindaki e-dergileri gordugu ana sayfa.
- `/admin.html`: Admin girisi, Kitapligim listesi ve yeni e-dergi/kitap ekleme ekrani.
- `/reader.html?id=YAYIN_ID`: PDF okuma sayfasi. Sayfa gecisi, zoom, tam ekran ve karanlik mod kontrolleri icerir.

## Veri Yapisi

`magazines` tablosunda temel alanlar:

```js
{
  publication_type: 'magazine',
  title: 'Mayis Sayisi',
  description: 'Dergi aciklamasi',
  cover_url: 'Supabase Storage public URL',
  cover_path: 'covers/...',
  content_url: 'Supabase Storage public URL',
  content_path: 'contents/...',
  category: 'Kultur',
  issue_number: '1',
  volume: '2026',
  page_count: 32,
  language: 'Turkce',
  tags: ['okul', 'kultur'],
  features: {
    Format: 'PDF',
    Seviye: 'Lise'
  },
  status: 'published'
}
```

Kapak ve icerik dosyalari Supabase Storage'daki `publications` bucket'ina yuklenir. `published` yayinlar ana sayfada gorunur, `draft` yayinlar sadece admin kitapliginda kalir.
