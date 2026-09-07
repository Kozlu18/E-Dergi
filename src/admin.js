import './styles.css';
import { supabase } from './supabase';
import {
  createMagazine,
  deleteMagazine,
  getAllMagazines,
  removePublicationFiles,
  updateMagazine,
  uploadPublicationFile
} from './services/magazineService';

const adminRoot = document.querySelector('#admin-app');
const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;

let currentUser = null;
let isAdmin = false;
let library = [];
let isLoadingLibrary = false;
let adminView = 'library';
let editingMagazineId = null;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function parseTags(value) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseFeatures(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((features, line) => {
      const separatorIndex = line.indexOf(':');

      if (separatorIndex === -1) {
        return features;
      }

      const key = line.slice(0, separatorIndex).trim();
      const featureValue = line.slice(separatorIndex + 1).trim();

      if (key && featureValue) {
        features[key] = featureValue;
      }

      return features;
    }, {});
}

function isSelectedFile(file) {
  return file instanceof File && file.size > 0;
}

function getEditingMagazine() {
  return library.find((magazine) => magazine.id === editingMagazineId) ?? null;
}

function featuresToText(features) {
  if (!features || typeof features !== 'object') {
    return '';
  }

  return Object.entries(features)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

function renderShell(content) {
  document.body.classList.remove('login-screen-body');
  document.body.classList.add('admin-shell-body');

  adminRoot.innerHTML = `
    <header class="topbar admin-topbar">
      <a class="brand" href="/" aria-label="E-Dergi ana sayfa">E-Dergi Admin</a>
      <nav class="nav" aria-label="Admin menu">
        ${isAdmin ? '<button class="nav-button" type="button" data-view="library">Kitapligim</button>' : ''}
        <a href="/">Siteye Don</a>
        ${currentUser ? '<button class="nav-button" type="button" data-action="logout">Cikis Yap</button>' : ''}
      </nav>
    </header>
    <main>${content}</main>
  `;

  bindSharedEvents();
}

function renderLogin() {
  document.body.classList.remove('admin-shell-body');
  document.body.classList.add('login-screen-body');

  adminRoot.innerHTML = `
    <section class="login-screen">
      <div class="login-modal" role="region" aria-label="Admin giris paneli">
        <aside class="login-brand-panel">
          <a class="login-logo" href="/" aria-label="E-Dergi ana sayfa">
            <span class="login-logo__mark">E</span>
            <span>E-Dergi</span>
          </a>
          <div class="login-brand-copy">
            <h1>Yonetim Paneli Giris</h1>
            <p>Yonetici hesabinla giris yaparak dergileri, kitapligini ve yayin bilgilerini yonetebilirsin.</p>
          </div>
          <div class="login-security">
            <span class="login-security__icon">!</span>
            <span>Guvenli Yonetim Altyapisi</span>
          </div>
        </aside>

        <div class="login-form-panel">
          <a class="login-close" href="/" aria-label="Admin panelini kapat">x</a>
          <form class="login-form" id="login-form">
            <div class="login-form__header">
              <h2>Giris Yap</h2>
              <p>Lutfen yonetici bilgilerinizi giriniz.</p>
            </div>

            <label>
              E-posta
              <span class="login-input">
                <span aria-hidden="true">@</span>
                <input name="email" type="email" autocomplete="email" placeholder="admin@edergi.com" required />
              </span>
            </label>

            <label>
              <span class="login-label-row">
                Sifre
                <a href="/" aria-label="Sifre sifirlama sayfasina git">Sifremi Unuttum</a>
              </span>
              <span class="login-input">
                <span aria-hidden="true">*</span>
                <input name="password" type="password" autocomplete="current-password" placeholder="********" required />
              </span>
            </label>

            <label class="remember-row">
              <input name="remember" type="checkbox" />
              <span>Beni Hatirla</span>
            </label>

            <button class="login-submit" type="submit">Giris Yap</button>
            <p class="form-message" id="login-message"></p>
          </form>
          <p class="login-footer">(c) 2026 E-Dergi Yonetim Paneli</p>
        </div>
      </div>
    </section>
  `;

  document.querySelector('#login-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.get('email').trim(),
        password: formData.get('password')
      });

      if (error) {
        throw error;
      }

      showMessage('login-message', 'Giris basarili.', 'success');
    } catch (error) {
      console.error(error);
      showMessage('login-message', 'E-posta veya sifre hatali.', 'error');
    }
  });
}

function renderNoAccess() {
  renderShell(`
    <section class="admin-page admin-page--center">
      <div class="admin-intro">
        <p class="eyebrow">Yetki yok</p>
        <h1>Bu hesap admin degil</h1>
        <p>${escapeHtml(currentUser?.email)} hesabi admin e-postasi ile eslesmiyor.</p>
        <button class="secondary-button" type="button" data-action="logout">Cikis Yap</button>
      </div>
    </section>
  `);
}

function renderBootScreen() {
  document.body.classList.remove('login-screen-body');
  document.body.classList.add('admin-shell-body');

  adminRoot.innerHTML = `
    <main class="admin-boot">
      <div>
        <p class="eyebrow">Yonetim</p>
        <h1>Admin paneli yukleniyor</h1>
        <p>Oturum bilgileri kontrol ediliyor.</p>
      </div>
    </main>
  `;
}

function renderFatalError(error) {
  document.body.classList.remove('login-screen-body');
  document.body.classList.add('admin-shell-body');

  adminRoot.innerHTML = `
    <main class="admin-boot admin-boot--error">
      <div>
        <p class="eyebrow">Hata</p>
        <h1>Admin paneli acilamadi</h1>
        <p>${escapeHtml(getErrorMessage(error))}</p>
      </div>
    </main>
  `;
}

function libraryCard(magazine) {
  const statusLabel = magazine.status === 'published' ? 'Yayinda' : 'Taslak';
  const tags = Array.isArray(magazine.tags) ? magazine.tags : [];
  const publicationType = magazine.publicationType === 'book' ? 'Kitap' : 'E-dergi';

  return `
    <article class="library-card">
      <img src="${escapeHtml(magazine.coverUrl)}" alt="${escapeHtml(magazine.title)} kapagi" />
      <div class="library-card__body">
        <div class="library-card__meta">
          <span>${escapeHtml(publicationType)}</span>
          <span class="status-pill status-pill--small">${statusLabel}</span>
        </div>
        <h3>${escapeHtml(magazine.title)}</h3>
        <p>${escapeHtml(magazine.description ?? '')}</p>
        <div class="library-card__details">
          <span>${escapeHtml(magazine.category ?? 'Genel')}</span>
          <span>Sayi: ${escapeHtml(magazine.issueNumber ?? '-')}</span>
          <span>Sayfa: ${escapeHtml(magazine.pageCount ?? '-')}</span>
          <span>Dil: ${escapeHtml(magazine.language ?? '-')}</span>
        </div>
        <div class="tag-list">
          ${tags.slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
        </div>
        <a class="magazine-card__button" href="/reader.html?id=${encodeURIComponent(magazine.id)}">
          Oku
        </a>
        <div class="library-card__actions">
          <button type="button" data-edit-id="${escapeHtml(magazine.id)}">Düzenle</button>
          <button class="danger-button" type="button" data-delete-id="${escapeHtml(magazine.id)}">Sil</button>
        </div>
      </div>
    </article>
  `;
}

function renderMagazineForm() {
  const editingMagazine = getEditingMagazine();
  const isEditing = Boolean(editingMagazine);
  const tagsValue = Array.isArray(editingMagazine?.tags) ? editingMagazine.tags.join(', ') : '';
  const featuresValue = featuresToText(editingMagazine?.features);

  return `
    <form class="form-card magazine-form modern-form" id="magazine-form">
      <div class="form-section-title">
        <span>1</span>
        <div>
          <h3>Yayin bilgileri</h3>
          <p>Okuyucularin kitaplikta gorecegi temel alanlar.</p>
        </div>
      </div>

      <div class="form-grid">
        <label>
          Yayin turu
          <select name="publicationType">
            <option value="magazine" ${editingMagazine?.publicationType !== 'book' ? 'selected' : ''}>E-dergi</option>
            <option value="book" ${editingMagazine?.publicationType === 'book' ? 'selected' : ''}>Kitap</option>
          </select>
        </label>
        <label>
          Yayin durumu
          <select name="status">
            <option value="published" ${editingMagazine?.status === 'published' ? 'selected' : ''}>Yayinda</option>
            <option value="draft" ${editingMagazine?.status !== 'published' ? 'selected' : ''}>Taslak</option>
          </select>
        </label>
        <label>
          Yayin adi
          <input name="title" type="text" value="${escapeHtml(editingMagazine?.title ?? '')}" placeholder="Mayis sayisi, Bilim atlası..." required />
        </label>
        <label>
          Kategori
          <input name="category" type="text" value="${escapeHtml(editingMagazine?.category ?? '')}" placeholder="Kultur, teknoloji, roman..." required />
        </label>
        <label>
          Sayi no
          <input name="issueNumber" type="text" value="${escapeHtml(editingMagazine?.issueNumber ?? '')}" placeholder="1" />
        </label>
        <label>
          Cilt / yil
          <input name="volume" type="text" value="${escapeHtml(editingMagazine?.volume ?? '')}" placeholder="2026" />
        </label>
        <label>
          Sayfa sayisi
          <input name="pageCount" type="number" min="1" value="${escapeHtml(editingMagazine?.pageCount ?? '')}" placeholder="32" />
        </label>
        <label>
          Dil
          <input name="language" type="text" value="${escapeHtml(editingMagazine?.language ?? 'Turkce')}" />
        </label>
      </div>

      <label>
        Aciklama
        <textarea name="description" rows="4" placeholder="Yayinin kisa tanitimi..." required>${escapeHtml(editingMagazine?.description ?? '')}</textarea>
      </label>

      <div class="form-section-title">
        <span>2</span>
        <div>
          <h3>Dosya ve gorunum</h3>
          <p>Kapak ve okuma dosyasini Supabase Storage'a yukle.</p>
        </div>
      </div>

      <label class="file-field">
        Kapak gorseli
        <input name="coverFile" type="file" accept="image/*" ${isEditing ? '' : 'required'} />
        <span>${isEditing ? `Mevcut: ${escapeHtml(editingMagazine.coverFileName ?? 'kapak dosyasi')}. Degistirmek istersen yeni dosya sec.` : 'JPG, PNG veya WebP kapak gorseli sec.'}</span>
      </label>
      <label class="file-field">
        Kitap / e-dergi dosyasi
        <input name="contentFile" type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" ${isEditing ? '' : 'required'} />
        <span>${isEditing ? `Mevcut: ${escapeHtml(editingMagazine.contentFileName ?? 'icerik dosyasi')}. Degistirmek istersen yeni dosya sec.` : 'PDF veya EPUB dosyasi yukle.'}</span>
      </label>

      <div class="form-section-title">
        <span>3</span>
        <div>
          <h3>Detaylar</h3>
          <p>Filtreleme ve tanitim icin ek ozellikler.</p>
        </div>
      </div>

      <label>
        Etiketler
        <input name="tags" type="text" value="${escapeHtml(tagsValue)}" placeholder="okul, kultur, mayis" />
      </label>
      <label>
        Ozellikler
        <textarea name="features" rows="5" placeholder="Format: PDF&#10;Seviye: Lise&#10;Tema: Bilim">${escapeHtml(featuresValue)}</textarea>
      </label>

      <div class="form-actions">
        <button class="secondary-button" type="button" data-view="library">Vazgec</button>
        <button type="submit">${isEditing ? 'Degisiklikleri Kaydet' : 'Yayini Kaydet'}</button>
      </div>
      <p class="form-message" id="magazine-message"></p>
    </form>
  `;
}

function renderLibrary() {
  const publishedCount = library.filter((magazine) => magazine.status === 'published').length;
  const draftCount = library.filter((magazine) => magazine.status !== 'published').length;

  renderShell(`
    <section class="dashboard-hero">
      <div>
        <p class="eyebrow">Kitapligim</p>
        <h1>Yuklu kitaplar ve e-dergiler</h1>
        <p>${escapeHtml(currentUser.email)} hesabi ile yayin arsivini yonetiyorsun.</p>
      </div>
      <div class="stat-grid" aria-label="Kitaplik ozeti">
        <div class="stat-card">
          <strong>${library.length}</strong>
          <span>Toplam yayin</span>
        </div>
        <div class="stat-card">
          <strong>${publishedCount}</strong>
          <span>Yayinda</span>
        </div>
        <div class="stat-card">
          <strong>${draftCount}</strong>
          <span>Taslak</span>
        </div>
      </div>
    </section>

    <section class="admin-workspace admin-workspace--library">
      <div class="library-section">
        <div class="section__header toolbar-header">
          <div>
            <p class="eyebrow">Arsiv</p>
            <h2>Kitapligim</h2>
          </div>
          <div class="toolbar-actions">
            ${isLoadingLibrary ? '<span class="status-pill">Yukleniyor</span>' : ''}
            <button class="add-publication-button" type="button" data-view="create">
              <span>+</span>
              Yeni yayin
            </button>
          </div>
        </div>
        ${library.length > 0
      ? `<div class="library-grid">${library.map(libraryCard).join('')}</div>`
      : `<div class="empty-state">
                <strong>Kitapligin henuz bos</strong>
                <span>Ilk e-dergi veya kitabi eklemek icin Yeni yayin butonunu kullan.</span>
                <button class="add-publication-button" type="button" data-view="create">
                  <span>+</span>
                  Yeni yayin ekle
                </button>
              </div>`
    }
      </div>
    </section>
  `);
}

function renderCreatePage() {
  renderShell(`
    <section class="create-page-hero">
      <button class="back-button" type="button" data-view="library">Kitapliga don</button>
      <div>
        <p class="eyebrow">Yeni yayin</p>
        <h1>${editingMagazineId ? 'Yayini duzenle' : 'E-dergi ya da kitap ekle'}</h1>
        <p>${editingMagazineId ? 'Yayin bilgilerini guncelle, gerekirse kapak veya icerik dosyasini degistir.' : 'Kapak ve okuma dosyasini yukleyerek yayini Supabase uzerinden kitapliga ekle.'}</p>
      </div>
    </section>

    <section class="create-page">
      <aside class="create-tips">
        <h2>Yayin kontrol listesi</h2>
        <ul>
          <li>Kapak gorseli net ve okunabilir olsun.</li>
          <li>PDF veya EPUB dosyasi yukleyebilirsin.</li>
          <li>Taslak secersen yayin sadece admin kitapliginda kalir.</li>
          <li>Ozellikleri her satira Anahtar: Deger seklinde yaz.</li>
        </ul>
      </aside>
      ${renderMagazineForm()}
    </section>
  `);
  bindMagazineForm();
}

function showMessage(id, message, type = 'info') {
  const element = document.querySelector(`#${id}`);

  if (!element) {
    return;
  }

  element.textContent = message;
  element.dataset.type = type;
}

function getErrorMessage(error) {
  return error?.message || error?.error_description || 'Bilinmeyen hata';
}

async function loadLibrary() {
  isLoadingLibrary = true;

  try {
    library = await getAllMagazines();
  } catch (error) {
    console.error(error);
    library = [];
  } finally {
    isLoadingLibrary = false;
  }
}

function bindMagazineForm() {
  document.querySelector('#magazine-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const coverFile = formData.get('coverFile');
    const contentFile = formData.get('contentFile');
    const editingMagazine = getEditingMagazine();

    try {
      if (!editingMagazine && (!isSelectedFile(coverFile) || !isSelectedFile(contentFile))) {
        showMessage('magazine-message', 'Kapak ve icerik dosyasi secmelisin.', 'error');
        return;
      }

      showMessage('magazine-message', 'Yayin kaydediliyor...', 'info');
      const [coverUpload, contentUpload] = await Promise.all([
        isSelectedFile(coverFile) ? uploadPublicationFile(coverFile, 'covers') : Promise.resolve(null),
        isSelectedFile(contentFile) ? uploadPublicationFile(contentFile, 'contents') : Promise.resolve(null)
      ]);

      const payload = {
        publicationType: formData.get('publicationType'),
        title: formData.get('title').trim(),
        category: formData.get('category').trim(),
        issueNumber: formData.get('issueNumber').trim(),
        volume: formData.get('volume').trim(),
        pageCount: Number(formData.get('pageCount')) || null,
        language: formData.get('language').trim(),
        description: formData.get('description').trim(),
        coverUrl: coverUpload?.url,
        coverPath: coverUpload?.path,
        coverFileName: coverUpload?.name,
        pdfUrl: contentUpload?.url,
        contentPath: contentUpload?.path,
        contentFileName: contentUpload?.name,
        contentFileType: contentUpload?.contentType,
        contentFileSize: contentUpload?.size,
        tags: parseTags(formData.get('tags')),
        features: parseFeatures(formData.get('features')),
        status: formData.get('status'),
        publishedAt: editingMagazine?.publishedAt
      };

      if (editingMagazine) {
        await updateMagazine(editingMagazine.id, payload);

        const oldPaths = [];
        if (coverUpload) oldPaths.push(editingMagazine.coverPath);
        if (contentUpload) oldPaths.push(editingMagazine.contentPath);
        await removePublicationFiles(oldPaths);
      } else {
        await createMagazine(payload);
      }

      form.reset();
      await loadLibrary();
      adminView = 'library';
      editingMagazineId = null;
      renderLibrary();
    } catch (error) {
      console.error(error);
      showMessage(
        'magazine-message',
        `Yayin kaydedilemedi: ${getErrorMessage(error)}`,
        'error'
      );
    }
  });
}

function bindSharedEvents() {
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      adminView = button.dataset.view;
      if (adminView === 'library') {
        editingMagazineId = null;
      }
      if (adminView === 'create') {
        if (!button.dataset.editId) {
          editingMagazineId = null;
        }
        renderCreatePage();
        return;
      }

      renderLibrary();
    });
  });

  document.querySelectorAll('[data-edit-id]').forEach((button) => {
    button.addEventListener('click', () => {
      editingMagazineId = button.dataset.editId;
      adminView = 'create';
      renderCreatePage();
    });
  });

  document.querySelectorAll('[data-delete-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const magazine = library.find((item) => item.id === button.dataset.deleteId);

      if (!magazine) {
        return;
      }

      const confirmed = window.confirm(`"${magazine.title}" yayini silinsin mi?`);

      if (!confirmed) {
        return;
      }

      try {
        await deleteMagazine(magazine.id);
        await removePublicationFiles([magazine.coverPath, magazine.contentPath]);
        await loadLibrary();
        renderLibrary();
      } catch (error) {
        console.error(error);
        window.alert(`Yayin silinemedi: ${getErrorMessage(error)}`);
      }
    });
  });

  document.querySelectorAll('[data-action="logout"]').forEach((button) => {
    button.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.href = '/';
    });
  });
}

async function renderAdminState() {
  if (!currentUser) {
    renderLogin();
    return;
  }

  if (!isAdmin) {
    renderNoAccess();
    return;
  }

  await loadLibrary();
  if (adminView === 'create') {
    renderCreatePage();
    return;
  }

  renderLibrary();
}

async function syncAdminSession(session) {
  currentUser = session?.user ?? null;
  isAdmin = Boolean(currentUser?.email && adminEmail && currentUser.email === adminEmail);
  await renderAdminState();
}

async function initAdmin() {
  renderBootScreen();

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    await syncAdminSession(data.session);
  } catch (error) {
    console.error(error);
    renderFatalError(error);
  }
}

supabase.auth.onAuthStateChange((_event, session) => {
  setTimeout(() => {
    syncAdminSession(session).catch((error) => {
      console.error(error);
      renderFatalError(error);
    });
  }, 0);
});

initAdmin();
