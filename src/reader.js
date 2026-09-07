import './styles.css';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { getMagazineById } from './services/magazineService';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const readerRoot = document.querySelector('#reader-app');
const params = new URLSearchParams(window.location.search);
const publicationId = params.get('id');

let publication = null;
let pdfDocument = null;
let currentPage = 1;
let totalPages = 0;
let zoom = 0.82;
let isDarkMode = false;
let isRendering = false;
let pageTurnDirection = 'next';
let touchStartX = 0;
let touchStartY = 0;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isPdfPublication(item) {
  const type = item?.contentFileType ?? '';
  const name = item?.contentFileName ?? '';
  const url = item?.pdfUrl ?? '';

  return type.includes('pdf') || name.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf');
}

function renderShell(content) {
  document.body.classList.toggle('reader-dark', isDarkMode);
  readerRoot.innerHTML = content;
}

function renderLoading(message = 'Yukleniyor...') {
  renderShell(`
    <main class="reader-loading">
      <div>
        <p class="eyebrow">Okuyucu</p>
        <h1>${escapeHtml(message)}</h1>
        <p>Icerik hazirlaniyor.</p>
      </div>
    </main>
  `);
}

function renderError(message) {
  renderShell(`
    <main class="reader-loading reader-loading--error">
      <div>
        <p class="eyebrow">Hata</p>
        <h1>Okuma sayfasi acilamadi</h1>
        <p>${escapeHtml(message)}</p>
        <a class="reader-button" href="/">Ana sayfaya don</a>
      </div>
    </main>
  `);
}

function toolbarTemplate() {
  return `
    <header class="reader-toolbar">
      <div class="reader-title">
        <a href="/" aria-label="Ana sayfaya don">E-Dergi</a>
        <span>${escapeHtml(publication.title)}</span>
      </div>
      <div class="reader-controls" aria-label="Okuma kontrolleri">
        <button type="button" data-action="previous" aria-label="Onceki sayfa">‹</button>
        <label class="reader-page-input">
          <input id="page-input" type="number" min="1" max="${totalPages || 1}" value="${currentPage}" />
          <span>/ ${totalPages || 1}</span>
        </label>
        <button type="button" data-action="next" aria-label="Sonraki sayfa">›</button>
        <button type="button" data-action="zoom-out" aria-label="Kucult">-</button>
        <span class="reader-zoom">${Math.round(zoom * 100)}%</span>
        <button type="button" data-action="zoom-in" aria-label="Buyut">+</button>
        <button type="button" data-action="theme" aria-label="Karanlik mod">${isDarkMode ? 'Aydinlik' : 'Karanlik'}</button>
        <button type="button" data-action="fullscreen" aria-label="Tam ekran">Tam ekran</button>
        <a href="${escapeHtml(publication.pdfUrl)}" download target="_blank" rel="noreferrer">Indir</a>
        <a href="/" class="reader-exit" aria-label="Çıkış">Çıkış</a>
      </div>
      <a href="/" class="reader-exit-mobile" aria-label="Çıkış">Çıkış</a>
    </header>
    <div class="reader-mobile-strip">
      <button type="button" data-action="zoom-out" aria-label="Kucult">-</button>
      <span>${Math.round(zoom * 100)}%</span>
      <button type="button" data-action="zoom-in" aria-label="Buyut">+</button>
      <button type="button" data-action="theme" aria-label="Karanlik mod">${isDarkMode ? 'Aydinlik' : 'Karanlik'}</button>
    </div>
  `;
}

function renderReaderFrame() {
  renderShell(`
    ${toolbarTemplate()}
    <main class="reader-stage">
      <div class="reader-canvas-wrap">
        <canvas
          id="pdf-canvas"
          class="page-turn-${pageTurnDirection}"
          aria-label="${escapeHtml(publication.title)} sayfasi"
        ></canvas>
      </div>
    </main>
    <footer class="reader-bottom-bar">
      <button type="button" data-action="previous">Onceki</button>
      <span>Sayfa ${currentPage} / ${totalPages || 1}</span>
      <button type="button" data-action="next">Sonraki</button>
    </footer>
  `);

  bindReaderEvents();
}

async function renderPdfPage() {
  if (!pdfDocument || isRendering) {
    return;
  }

  isRendering = true;
  const canvas = document.querySelector('#pdf-canvas');
  const context = canvas.getContext('2d');
  const page = await pdfDocument.getPage(currentPage);
  const baseViewport = page.getViewport({ scale: 1 });
  const availableWidth = Math.min(window.innerWidth - 48, 780);
  const responsiveScale = Math.max(0.45, Math.min(1.15, availableWidth / baseViewport.width));
  const viewport = page.getViewport({ scale: responsiveScale * zoom });

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.classList.remove('page-turn-ready');

  await page.render({
    canvasContext: context,
    viewport
  }).promise;

  requestAnimationFrame(() => {
    canvas.classList.add('page-turn-ready');
  });

  isRendering = false;
}

async function openPdf() {
  renderLoading('PDF yukleniyor...');

  pdfDocument = await pdfjsLib.getDocument({
    url: publication.pdfUrl,
    withCredentials: false
  }).promise;
  totalPages = pdfDocument.numPages;
  currentPage = 1;

  renderReaderFrame();
  await renderPdfPage();
}

function renderFallbackReader() {
  renderShell(`
    ${toolbarTemplate()}
    <main class="reader-stage">
      <section class="reader-fallback">
        <img src="${escapeHtml(publication.coverUrl)}" alt="${escapeHtml(publication.title)} kapagi" />
        <div>
          <p class="eyebrow">${escapeHtml(publication.publicationType === 'book' ? 'Kitap' : 'E-dergi')}</p>
          <h1>${escapeHtml(publication.title)}</h1>
          <p>${escapeHtml(publication.description ?? '')}</p>
          <a class="reader-button" href="${escapeHtml(publication.pdfUrl)}" target="_blank" rel="noreferrer">
            Icerigi ac
          </a>
        </div>
      </section>
    </main>
  `);

  bindReaderEvents();
}

async function changePage(pageNumber) {
  const nextPage = Math.min(Math.max(pageNumber, 1), totalPages);

  if (nextPage === currentPage) {
    return;
  }

  pageTurnDirection = nextPage > currentPage ? 'next' : 'previous';
  currentPage = nextPage;
  renderReaderFrame();
  await renderPdfPage();
}

async function changeZoom(nextZoom) {
  zoom = Math.min(Math.max(nextZoom, 0.5), 1.8);
  renderReaderFrame();
  await renderPdfPage();
}

function bindReaderEvents() {
  document.querySelectorAll('[data-action]').forEach((control) => {
    control.addEventListener('click', async () => {
      const action = control.dataset.action;

      if (action === 'previous') {
        await changePage(currentPage - 1);
      }

      if (action === 'next') {
        await changePage(currentPage + 1);
      }

      if (action === 'zoom-in') {
        await changeZoom(zoom + 0.15);
      }

      if (action === 'zoom-out') {
        await changeZoom(zoom - 0.15);
      }

      if (action === 'theme') {
        isDarkMode = !isDarkMode;
        renderReaderFrame();
        await renderPdfPage();
      }

      if (action === 'fullscreen') {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      }
    });
  });

  document.querySelector('#page-input')?.addEventListener('change', async (event) => {
    await changePage(Number(event.target.value));
  });

  const stage = document.querySelector('.reader-stage');

  stage?.addEventListener(
    'touchstart',
    (event) => {
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    },
    { passive: true }
  );

  stage?.addEventListener(
    'touchend',
    async (event) => {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      if (Math.abs(deltaX) < 54 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
        return;
      }

      if (deltaX < 0) {
        await changePage(currentPage + 1);
      } else {
        await changePage(currentPage - 1);
      }
    },
    { passive: true }
  );
}

window.addEventListener('resize', async () => {
  if (pdfDocument) {
    renderReaderFrame();
    await renderPdfPage();
  }
});

async function init() {
  if (!publicationId) {
    renderError('Yayin kimligi bulunamadi.');
    return;
  }

  try {
    renderLoading('Yayin yukleniyor...');
    publication = await getMagazineById(publicationId);

    if (!publication?.pdfUrl) {
      renderError('Bu yayinin okuma dosyasi bulunamadi.');
      return;
    }

    if (isPdfPublication(publication)) {
      await openPdf();
      return;
    }

    totalPages = 1;
    renderFallbackReader();
  } catch (error) {
    console.error(error);
    renderError(error?.message ?? 'Beklenmeyen bir hata olustu.');
  }
}

init();
