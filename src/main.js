import './styles.css';
import { getPublishedMagazines } from './services/magazineService';

const appRoot = document.querySelector('#app');

const sampleMagazines = [
  {
    id: 'sample-1',
    title: 'Mayis Sayisi',
    description: 'Okul, kultur, teknoloji ve sanat yazilarindan olusan ornek e-dergi sayisi.',
    category: 'Kultur',
    issueNumber: '1',
    volume: '2026',
    pageCount: 32,
    tags: ['okul', 'kultur', 'sanat'],
    features: {
      format: 'PDF',
      seviye: 'Tum okuyucular'
    },
    coverUrl:
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'sample-2',
    title: 'Teknoloji Ozel',
    description: 'Yapay zeka, web uygulamalari ve dijital yayin dunyasina kisa bir bakis.',
    category: 'Teknoloji',
    issueNumber: '2',
    volume: '2026',
    pageCount: 24,
    tags: ['teknoloji', 'web', 'supabase'],
    features: {
      format: 'PDF',
      seviye: 'Lise ve uzeri'
    },
    coverUrl:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80'
  }
];

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function magazineCard(magazine) {
  const tags = Array.isArray(magazine.tags) ? magazine.tags : [];
  const features = magazine.features && typeof magazine.features === 'object' ? magazine.features : {};

  return `
    <article class="magazine-card">
      <img
        class="magazine-card__cover"
        src="${escapeHtml(magazine.coverUrl)}"
        alt="${escapeHtml(magazine.title)} kapagi"
      />
      <div class="magazine-card__body">
        <div class="magazine-card__meta">
          <span>${escapeHtml(magazine.category ?? 'Genel')}</span>
          <span>Sayi ${escapeHtml(magazine.issueNumber ?? '-')}</span>
        </div>
        <h3>${escapeHtml(magazine.title)}</h3>
        <p>${escapeHtml(magazine.description ?? '')}</p>
        <dl class="feature-list">
          ${Object.entries(features)
            .slice(0, 3)
            .map(
              ([key, value]) => `
                <div>
                  <dt>${escapeHtml(key)}</dt>
                  <dd>${escapeHtml(value)}</dd>
                </div>
              `
            )
            .join('')}
        </dl>
        <div class="tag-list">
          ${tags.slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
        </div>
        <a class="magazine-card__button" href="/reader.html?id=${encodeURIComponent(magazine.id)}">
          Oku
        </a>
      </div>
    </article>
  `;
}

function renderLayout(magazines, isDemoData = false) {
  appRoot.innerHTML = `
    <header class="topbar">
      <a class="brand" href="/" aria-label="E-Dergi ana sayfa">E-Dergi</a>
      <nav class="nav" aria-label="Ana menu">
        <a href="#dergiler">Dergiler</a>
        <a href="/admin.html">Admin</a>
      </nav>
    </header>

    <main>
      <section class="hero">
        <div class="hero__content">
          <p class="eyebrow">Dijital yayin platformu</p>
          <h1>Dergileri yayinla, okuyucularin tek yerden ulassin.</h1>
          <p class="hero__text">
            Supabase tabanli e-dergi vitrini. Admin paneli ayri sayfada dergi ekleme ve kitaplik yonetimi icin hazir.
          </p>
          <div class="hero__actions">
            <a class="hero__button" href="#dergiler">Dergileri Gor</a>
            <a class="ghost-button" href="/admin.html">Admin Girisi</a>
          </div>
        </div>
      </section>

      <section class="section" id="dergiler">
        <div class="section__header">
          <div>
            <p class="eyebrow">Yayinlar</p>
            <h2>Son dergiler</h2>
          </div>
          ${isDemoData ? '<span class="status-pill">Ornek veri</span>' : ''}
        </div>
        <div class="magazine-grid">
          ${magazines.map(magazineCard).join('')}
        </div>
      </section>
    </main>
  `;
}

async function init() {
  try {
    const magazines = await getPublishedMagazines();
    renderLayout(magazines.length > 0 ? magazines : sampleMagazines, magazines.length === 0);
  } catch (error) {
    console.error(error);
    renderLayout(sampleMagazines, true);
  }
}

init();
