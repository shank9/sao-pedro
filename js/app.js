(() => {
  'use strict';
  const IDLE_MS = 60_000;
  const LAUNCH_PRODUCT_ID = 'semirreboque-bau-bk-edition';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const view = $('#view');
  let products = [];
  let currentProduct = null;
  let activeCategory = 'Todos';
  let currentTab = 'overview';
  let idleTimer = null;
  let toastTimer = null;

  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function truckSvg(product = {}, unique = 'truck', facingRight = false) {
    const safeId = String(unique).replace(/[^a-zA-Z0-9_-]/g, '-');
    const id = String(product.id || '');
    const isBitrem = id.startsWith('bitrem-') || product.category === 'Bitrens';
    const kind = id.includes('porta-container') ? 'container'
      : id.includes('carga-seca') ? 'cargo'
      : id.includes('bau-bk-edition') ? 'black'
      : id.includes('bau') ? 'box'
      : id.includes('sider') ? 'sider'
      : id.includes('graneleiro') ? 'grain'
      : 'cargo';

    const wheel = (x, y, r) => `
      <g transform="translate(${x} ${y})">
        <circle r="${r}" fill="#080a0d" stroke="#444852" stroke-width="${Math.max(2, r * .18)}"/>
        <circle r="${r * .67}" fill="#aeb3bd" stroke="#e0e2e7" stroke-width="${Math.max(1, r * .05)}"/>
        <circle r="${r * .39}" fill="#3b404a"/>
        <circle r="${r * .16}" fill="#e5e7eb"/>
        <g stroke="#777d88" stroke-width="1.5" stroke-linecap="round">
          <path d="M-${r*.36} -${r*.31} l${r*.2} ${r*.2} M${r*.27} -${r*.35} l-${r*.15} ${r*.22} M${r*.35} ${r*.25} l-${r*.22} -${r*.08} M-${r*.3} ${r*.31} l${r*.16} -${r*.2}"/>
        </g>
      </g>`;

    const cabin = `
      <g class="tractor-cab">
        <path d="M30 157 L42 125 Q47 108 65 107 L105 107 Q118 108 129 123 L147 145 L151 177 L34 177 Z" fill="url(#${safeId}-cab)" stroke="#e7e9ee" stroke-width="2"/>
        <path d="M56 115 H99 Q108 115 117 128 L130 143 H48 Z" fill="#253744" stroke="#657785" stroke-width="2"/>
        <path d="M104 116 L126 141 H108 Z" fill="#91aabd" opacity=".75"/>
        <path d="M42 157 H147" stroke="#606570" stroke-width="3"/>
        <path d="M35 161 H148 V174 H35Z" fill="#ed1c24"/>
        <path d="M40 177 H85 L80 187 H39Z" fill="#333741"/>
        <rect x="28" y="150" width="9" height="15" rx="2" fill="#e8e9ed"/>
        <rect x="139" y="148" width="9" height="7" rx="2" fill="#f7b75c"/>
        <path d="M67 143 V159" stroke="#8b929c" stroke-width="2"/>
        <rect x="50" y="173" width="78" height="5" rx="2" fill="#8a909a"/>
      </g>`;

    function trailerBody(x, w, y, h, suffix, mini = false) {
      const bottom = y + h;
      const ridgeLines = [];
      if (kind === 'box' || kind === 'black') {
        const fill = kind === 'black' ? '#202329' : '#d5d9df';
        const sideStroke = kind === 'black' ? '#59606a' : '#f3f4f6';
        for (let yy = y + 8; yy < bottom - 3; yy += mini ? 5 : 6) {
          ridgeLines.push(`<path d="M${x+5} ${yy} H${x+w-4}" stroke="${kind === 'black' ? '#080a0e' : '#9aa0aa'}" stroke-opacity=".56" stroke-width="1.4"/>`);
        }
        return `
          <g class="body-box ${kind}">
            <path d="M${x} ${y+7} Q${x} ${y} ${x+9} ${y} H${x+w-9} Q${x+w} ${y} ${x+w} ${y+8} V${bottom} H${x}Z" fill="${fill}" stroke="${sideStroke}" stroke-width="1.8"/>
            ${ridgeLines.join('')}
            <path d="M${x+2} ${y+5} H${x+w-2}" stroke="#fff" stroke-opacity=".8" stroke-width="2"/>
            <path d="M${x+w-25} ${y+3} V${bottom}" stroke="${kind === 'black' ? '#848993' : '#777e89'}" stroke-width="2"/>
            <path d="M${x+w-19} ${y+5} V${bottom-2} M${x+w-10} ${y+5} V${bottom-2}" stroke="${kind === 'black' ? '#7a8089' : '#a1a7b0'}" stroke-width="1.5"/>
            <path d="M${x+w-22} ${y+h*.38} h7 M${x+w-22} ${y+h*.65} h7" stroke="#ed1c24" stroke-width="2"/>
            ${kind === 'black' ? `<path d="M${x+5} ${bottom-9} H${x+w-28}" stroke="#ed1c24" stroke-width="2.4"/><text x="${x+w*.56}" y="${y+h*.56}" fill="#f4f4f6" font-size="${mini ? 7 : 10}" font-weight="800" text-anchor="middle" letter-spacing="1">SÃO PEDRO</text>` : ''}
            <path d="M${x+3} ${bottom} H${x+w-3}" stroke="#ed1c24" stroke-width="3"/>
          </g>`;
      }

      if (kind === 'sider') {
        const straps = [];
        for (let xx = x + 16; xx < x + w - 8; xx += mini ? 24 : 38) {
          straps.push(`<path d="M${xx} ${y+12} V${bottom-5}" stroke="#a5abb5" stroke-opacity=".52" stroke-width="2"/><path d="M${xx-3} ${bottom-12} h6" stroke="#d5d8df" stroke-width="2"/>`);
        }
        return `
          <g class="body-sider">
            <path d="M${x} ${y+14} Q${x+8} ${y+2} ${x+20} ${y+4} L${x+w-8} ${y} Q${x+w} ${y} ${x+w} ${y+12} V${bottom} H${x}Z" fill="#292d35" stroke="#a0a6b0" stroke-width="1.5"/>
            <path d="M${x+3} ${y+14} L${x+w-4} ${y+10}" stroke="#e5e7eb" stroke-width="2"/>
            ${straps.join('')}
            <path d="M${x+3} ${bottom-12} H${x+w-3}" stroke="#a6acb5" stroke-width="3"/>
            <path d="M${x+3} ${bottom-5} H${x+w-3}" stroke="#ed1c24" stroke-width="3"/>
            <text x="${x+w*.51}" y="${y+h*.59}" fill="#f4f4f6" font-size="${mini ? 7 : 10}" font-weight="800" text-anchor="middle" letter-spacing="1">SÃO PEDRO</text>
            <path d="M${x+w-15} ${y+12} V${bottom}" stroke="#d4d7dc" stroke-width="3"/>
          </g>`;
      }

      if (kind === 'grain') {
        const divisions = [];
        for (let xx = x + 18; xx < x + w - 5; xx += mini ? 22 : 34) {
          divisions.push(`<path d="M${xx} ${y+24} V${bottom-2}" stroke="#6c727b" stroke-width="1.5"/>`);
        }
        return `
          <g class="body-grain">
            <path d="M${x} ${y+28} Q${x+12} ${y+3} ${x+35} ${y+5} L${x+w-38} ${y+5} Q${x+w-12} ${y+4} ${x+w} ${y+28} V${y+36} H${x}Z" fill="#252a30" stroke="#707780" stroke-width="1.8"/>
            <path d="M${x+4} ${y+30} Q${x+w/2} ${y+17} ${x+w-4} ${y+30} V${bottom} H${x+4}Z" fill="#aeb4bd" stroke="#e0e3e7" stroke-width="1.5"/>
            <path d="M${x+5} ${y+43} H${x+w-5} M${x+5} ${y+55} H${x+w-5}" stroke="#777e88" stroke-width="2"/>
            ${divisions.join('')}
            <path d="M${x+4} ${bottom-4} H${x+w-4}" stroke="#ed1c24" stroke-width="3"/>
            <path d="M${x} ${y+31} H${x+w}" stroke="#252a30" stroke-width="3"/>
          </g>`;
      }

      if (kind === 'container') {
        const locks = [];
        for (let xx = x + 15; xx < x + w - 8; xx += mini ? 30 : 44) {
          locks.push(`<path d="M${xx} ${y-4} v9 h8 v-9" fill="#c8cdd5" stroke="#777e89" stroke-width="1.5"/><circle cx="${xx+4}" cy="${y+1}" r="1.6" fill="#ed1c24"/>`);
        }
        const beams = [];
        for (let xx = x + 22; xx < x + w - 6; xx += mini ? 20 : 27) {
          beams.push(`<path d="M${xx} ${y+8} v9" stroke="#9da3ad" stroke-width="2"/>`);
        }
        return `
          <g class="body-container">
            <path d="M${x} ${y+8} H${x+w} V${y+19} H${x}Z" fill="#30343c" stroke="#a3a9b2" stroke-width="1.5"/>
            <path d="M${x+8} ${y+3} H${x+w-8}" stroke="#e0e3e8" stroke-width="3"/>
            ${locks.join('')}${beams.join('')}
            <path d="M${x+3} ${y+19} H${x+w-3}" stroke="#ed1c24" stroke-width="3"/>
            <path d="M${x+22} ${y+20} v16 M${x+w-22} ${y+20} v16" stroke="#bec3cc" stroke-width="4"/>
            <path d="M${x+12} ${y+36} H${x+30} M${x+w-30} ${y+36} H${x+w-12}" stroke="#aab0b9" stroke-width="4"/>
          </g>`;
      }

      // Carga seca: implemento aberto com fueiros, painéis baixos e piso aparente.
      const panels = [];
      for (let xx = x + 22; xx < x + w - 5; xx += mini ? 22 : 33) {
        panels.push(`<path d="M${xx} ${y+13} V${bottom-7}" stroke="#828994" stroke-width="1.8"/>`);
      }
      return `
        <g class="body-cargo">
          <path d="M${x} ${y+10} H${x+w} V${bottom-8} H${x}Z" fill="#cbd0d8" stroke="#f1f2f5" stroke-width="1.8"/>
          <path d="M${x+3} ${y+16} H${x+w-3}" stroke="#f9fafb" stroke-width="3"/>
          ${panels.join('')}
          <path d="M${x+3} ${bottom-8} H${x+w-3}" stroke="#343943" stroke-width="5"/>
          <path d="M${x+3} ${bottom-3} H${x+w-3}" stroke="#ed1c24" stroke-width="3"/>
          <path d="M${x+5} ${y+2} V${bottom-3} M${x+w-5} ${y+2} V${bottom-3}" stroke="#e4e7ec" stroke-width="4"/>
          <path d="M${x+12} ${y+2} H${x+w-12}" stroke="#fff" stroke-width="3"/>
        </g>`;
    }

    const ground = `<ellipse cx="355" cy="224" rx="315" ry="13" fill="#000" opacity=".34"/><path d="M22 223 H676" stroke="#5d626d" stroke-opacity=".45" stroke-width="2"/>`;
    const trailer = isBitrem
      ? `<g class="bitrem-set">
          ${trailerBody(151, 205, kind === 'cargo' ? 111 : kind === 'container' ? 143 : 87, kind === 'cargo' ? 48 : kind === 'container' ? 24 : 69, 'a', true)}
          <path d="M348 176 H382 L395 189 H360Z" fill="#555b65" stroke="#aeb4bd" stroke-width="2"/>
          <path d="M355 183 H392" stroke="#ed1c24" stroke-width="2"/>
          ${trailerBody(390, 233, kind === 'cargo' ? 111 : kind === 'container' ? 143 : 87, kind === 'cargo' ? 48 : kind === 'container' ? 24 : 69, 'b', true)}
          <path d="M151 176 H359 M390 176 H629" stroke="#c8cdd5" stroke-width="6" stroke-linecap="round"/>
          <path d="M152 183 H358 M391 183 H628" stroke="#4c515b" stroke-width="4"/>
        </g>`
      : `<g class="semi-set">
          ${trailerBody(151, 475, kind === 'cargo' ? 102 : kind === 'container' ? 142 : kind === 'grain' ? 77 : 75, kind === 'cargo' ? 58 : kind === 'container' ? 25 : kind === 'grain' ? 91 : 91, 'single', false)}
          <path d="M151 176 H632" stroke="#c8cdd5" stroke-width="6" stroke-linecap="round"/>
          <path d="M165 184 H621" stroke="#4b505a" stroke-width="4"/>
          <path d="M187 184 v14 M605 184 v14" stroke="#bfc4cc" stroke-width="4"/>
          <path d="M180 199 h38 l-5 7 h-33z" fill="#333842"/><path d="M590 199 h31 l-5 7 h-26z" fill="#333842"/>
        </g>`;

    const trailerWheels = isBitrem
      ? [284, 310, 336, 513, 539, 565].map(x => wheel(x, 204, 15)).join('')
      : [478, 523, 568].map(x => wheel(x, 204, 22)).join('');
    const brandLine = kind === 'container'
      ? `<text x="396" y="137" fill="#cbd1da" font-size="8" font-weight="800" letter-spacing="1.5">PORTA-CONTÊINER</text>`
      : '';

    return `<svg viewBox="0 0 700 245" role="img" aria-label="Representação vetorial do ${escapeHtml(product.name || 'implemento rodoviário São Pedro')}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${safeId}-cab" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4f5f7"/><stop offset=".54" stop-color="#b7bdc7"/><stop offset="1" stop-color="#686e79"/></linearGradient>
        <linearGradient id="${safeId}-metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e5e8ed"/><stop offset="1" stop-color="#8d949f"/></linearGradient>
      </defs>
      ${facingRight ? '<g transform="translate(700 0) scale(-1 1)">' : '<g>'}
      ${ground}
      ${trailer}
      ${cabin}
      <path d="M144 178 H170 L184 191 H153Z" fill="#5e646e" stroke="#adb3bc" stroke-width="2"/>
      ${wheel(78, 204, 22)}
      ${trailerWheels}
      <path d="M34 229 H648" stroke="#ffffff" stroke-opacity=".09" stroke-width="1"/>
      ${brandLine}
      </g>
    </svg>`;
  }

  function showScreen(screenName) {
    $$('.screen', view).forEach(screen => screen.classList.toggle('hidden', screen.dataset.screen !== screenName));
    const selected = $(`[data-screen="${screenName}"]`, view);
    if (selected) selected.scrollTop = 0;
    // Alguns WebViews antigos não aceitam FocusOptions; a navegação não deve parar por isso.
    try { view.focus({ preventScroll: true }); } catch (_) { try { view.focus(); } catch (_) {} }
    setClockLabel(screenName);
    resetIdleTimer();
  }

  function setClockLabel(screenName) {
    const labels = {home:'TOQUE PARA EXPLORAR', categories:'ESCOLHA UMA CATEGORIA', catalog:'ESCOLHA UM PRODUTO', detail:'EXPLORE OS DETALHES', qr:'APONTE A CÂMERA DO CELULAR'};
    $('#clock-label').textContent = labels[screenName] || labels.home;
  }

  function resetIdleTimer() {
    window.clearTimeout(idleTimer);

    // Não encerra a experiência enquanto o vídeo estiver aberto.
    const videoDialog = $('#black-edition-video-dialog');

    if (videoDialog && videoDialog.open) {
        return;
    }

    idleTimer = window.setTimeout(() => {
        const sheetDialog = $('#sheet-dialog');

        if (sheetDialog && sheetDialog.open && typeof sheetDialog.close === 'function') {
            sheetDialog.close();
        }

        currentProduct = null;
        showScreen('home');

    }, IDLE_MS);
}

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.add('hidden'), 2800);
  }

  function renderHomeArt() {
    // Use uma ilustração vetorial de um semirreboque baú como peça principal da abertura.
    // As fotos dos PDFs continuam disponíveis na aba "Ficha original" de cada produto.
    const heroProduct = products.find(product => product.id === 'semirreboque-bau') || products[0] || {};
    // Padroniza a orientação com o cavalo mecânico à esquerda e o implemento atrás, à direita.
    // A mesma orientação é usada na tela inicial, nas categorias, no QR e nas páginas de produto.
    $('#hero-truck').innerHTML = truckSvg(heroProduct, 'hero-carreta-left', false);
    $('#qr-truck').innerHTML = truckSvg(heroProduct, 'qrside-carreta-left', false);
    const homeProductCount = $('#home-product-count');
    if (homeProductCount) homeProductCount.textContent = String(products.length).padStart(2, '0');
  }

  function renderCategories() {
    const allItem = {
      key: 'Todos', variant: 'all', kicker: 'CATÁLOGO COMPLETO', badge: `${products.length} produtos`,
      title: 'Todos os produtos',
      description: 'Explore todos os implementos e configurações do portfólio São Pedro.',
      sampleId: 'semirreboque-carga-seca', actionLabel: 'EXPLORAR PORTFÓLIO', ariaLabel: 'Ver todos os produtos'
    };
    const launchProduct = products.find(product => product.id === LAUNCH_PRODUCT_ID);
    const launchItem = {
      key: 'launch', variant: 'launch', kicker: 'PRODUTO DE LANÇAMENTO', badge: 'EM DESTAQUE',
      title: launchProduct ? launchProduct.name : 'Semirreboque Baú Black Edition',
      description: 'Design exclusivo, acabamento preto e a robustez São Pedro em uma versão que chama atenção.',
      sampleId: LAUNCH_PRODUCT_ID, actionLabel: 'CONHECER O LANÇAMENTO', ariaLabel: 'Abrir o Semirreboque Baú Black Edition — produto de lançamento'
    };
    const items = [allItem, launchItem];
    $('#category-grid').innerHTML = items.map(item => {
      const sample = products.find(product => product.id === item.sampleId) || products[0] || {};
      return `<button class="category-card category-card-${item.variant}" type="button" data-category-entry="${escapeHtml(item.key)}" aria-label="${escapeHtml(item.ariaLabel)}">
        <div class="category-card-top"><span class="category-kicker">${escapeHtml(item.kicker)}</span><span class="category-count">${escapeHtml(item.badge)}</span></div>
        <div class="category-art">
  <img
    class="category-product-image"
    src="${escapeHtml(sample.image || '')}"
    alt="${escapeHtml(sample.name || item.title)}"
    loading="lazy"
    decoding="async"
  >
</div>
        <div class="category-card-copy"><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p></div>
        <div class="category-card-bottom"><span>${escapeHtml(item.actionLabel)}</span><span class="category-arrow" aria-hidden="true">↗</span></div>
      </button>`;
    }).join('');
  }

  function renderCatalog() {
    const filteredProducts = activeCategory === 'Todos'
      ? products
      : products.filter(product => product.category === activeCategory);

    $('#product-grid').innerHTML = filteredProducts.map((product, index) => `
      <button class="product-card" data-product="${escapeHtml(product.id)}" aria-label="Ver detalhes de ${escapeHtml(product.name)}">
        <div class="card-top"><span class="product-tag">${escapeHtml(product.isLaunch ? 'Lançamento' : product.tag)}</span><span class="product-index">${String(index + 1).padStart(2,'0')} / ${String(filteredProducts.length).padStart(2,'0')}</span></div>
        <div class="product-art vehicle-art">
  <img
    class="product-card-image"
    src="${escapeHtml(product.image || '')}"
    alt="${escapeHtml(product.name)}"
    loading="lazy"
    decoding="async"
  >
</div>
        <h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.subtitle || product.category)}</p>
        <div class="card-bottom"><span>VER DETALHES</span><span aria-hidden="true">↗</span></div>
      </button>`).join('');
  }

  function titleMarkup(name) {
    const words = name.split(' ');
    if (words.length <= 1) return `<span>${escapeHtml(name)}.</span>`;
    const first = words.shift();
    return `${escapeHtml(first)}<br><span>${escapeHtml(words.join(' '))}.</span>`;
  }

  function openProduct(id) {
    currentProduct = products.find(product => product.id === id) || products[0];
    if (!currentProduct) return;
    currentTab = 'overview';
    $('#detail-counter').textContent = `PRODUTO ${String(products.indexOf(currentProduct) + 1).padStart(2,'0')} / ${String(products.length).padStart(2,'0')}`;
    $('#detail-title').innerHTML = titleMarkup(currentProduct.name);
    $('#detail-description').textContent = currentProduct.description;
    $('#detail-category').textContent = (currentProduct.category || 'SÃO PEDRO').toUpperCase();
    $('#detail-badge').textContent = currentProduct.isLaunch ? 'PRODUTO DE LANÇAMENTO' : (currentProduct.tag || 'LINHA SÃO PEDRO').toUpperCase();
    // Controle de exibição do botão Black Edition.
const isBlackEdition = currentProduct.id === LAUNCH_PRODUCT_ID;

const videoButton = $('#black-edition-video-button');
const detailScreen = $('.detail-screen');

if (videoButton) {
    videoButton.style.setProperty(
        'display',
        isBlackEdition ? 'flex' : 'none',
        'important'
    );

    videoButton.setAttribute('aria-hidden', String(!isBlackEdition));
    videoButton.tabIndex = isBlackEdition ? 0 : -1;
}

if (detailScreen) {
    detailScreen.classList.toggle(
        'has-black-edition-video',
        isBlackEdition
    );
}

    $('#detail-art').innerHTML = `
      <img
        class="detail-product-image"
        src="${escapeHtml(currentProduct.image || '')}"
        alt="${escapeHtml(currentProduct.name)}"
        loading="eager"
        decoding="async"
      >
    `;
    renderDetailTab();
    showScreen('detail');
  }

  function renderDetailTab() {
    $$('.detail-tab').forEach(tab => {
      const active = tab.dataset.tab === currentTab;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    const panel = $('#detail-tab-panel');
    if (!currentProduct) { panel.textContent = ''; return; }

    if (currentTab === 'overview') {
      const facts = (currentProduct.summary || []).map((item, i) => `
        <li class="overview-fact"><span class="fact-index">${String(i + 1).padStart(2, '0')}</span><span>${escapeHtml(item)}</span></li>`).join('');
      panel.innerHTML = `<div class="detail-overview"><p class="overview-intro">${escapeHtml(currentProduct.description || '')}</p><ul class="overview-list">${facts}</ul><p class="overview-note">As especificações podem variar conforme a configuração selecionada. Consulte a ficha técnica original nesta página.</p></div>`;
    } else if (currentTab === 'specs') {
      const sections = currentProduct.sections || [];
      panel.innerHTML = `<div class="spec-sections">${sections.map((section, i) => `
        <section class="spec-section"><div class="spec-section-heading"><span>${String(i + 1).padStart(2, '0')}</span><h3>${escapeHtml(section.title)}</h3></div><ul>${(section.items || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`).join('')}</div>`;
    } else if (currentTab === 'configs') {
      const dims = currentProduct.dimensions || {};
      const headers = dims.headers || [];
      const rows = dims.rows || [];
      const notes = dims.notes || [];
      panel.innerHTML = `<div class="dimensions-panel">${headers.length && rows.length ? `
        <div class="dimensions-title"><span>CONFIGURAÇÕES DISPONÍVEIS</span><small>Conforme ficha técnica</small></div>
        <div class="table-scroll"><table class="dimensions-table"><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
        ${notes.length ? `<div class="dimension-notes"><h3>Cotas e observações do desenho</h3><ul>${notes.map(note => `<li>${escapeHtml(note)}</li>`).join('')}</ul></div>` : ''}
        <p class="overview-note">As dimensões estão apresentadas conforme o material recebido. Para medidas complementares e leitura do desenho, abra a ficha técnica original.</p></div>`;
    } else if (currentTab === 'sheet') {
      
      const imagePath = String(currentProduct.sheetImage || '').trim();
      panel.innerHTML = imagePath ? `<div class="original-sheet-card"><div class="original-sheet-head"><div><strong>Ficha técnica fornecida pela São Pedro</strong><span>Imagem completa da segunda página do PDF original.</span></div><button type="button" class="secondary-button" data-action="sheet-zoom">Ampliar ficha ↗</button></div><button type="button" class="original-sheet-preview" data-action="sheet-zoom" aria-label="Ampliar ficha técnica original"><img src="${escapeHtml(imagePath)}" alt="Ficha técnica original de ${escapeHtml(currentProduct.name)}" loading="lazy"></button></div>` : '<p>Ficha técnica original ainda não disponível para este produto.</p>';
    }
    else if (currentTab === 'gallery') {
    const images = Array.isArray(currentProduct.gallery)
        ? currentProduct.gallery.filter(
            image => typeof image === 'string' && image.trim()
          )
        : [];

    if (!images.length) {
        panel.innerHTML = `
            <div class="gallery-empty">
                <p>Nenhuma imagem disponível para este produto.</p>
            </div>
        `;
        return;
    }

   panel.innerHTML = `
    <div class="product-gallery">
        ${images.map((image, index) => `
            <button
                type="button"
                class="product-gallery-item"
                data-gallery-zoom="${index}"
                aria-label="Ampliar foto ${index + 1} de ${escapeHtml(currentProduct.name)}"
            >
                <img
                    src="${escapeHtml(image)}"
                    alt="${escapeHtml(currentProduct.name)} - Foto ${index + 1}"
                    loading="lazy"
                >
            </button>
        `).join('')}
    </div>
`;
}
  }

  function openSheetDialog() {
    if (!currentProduct || !currentProduct.sheetImage) return;
    const dialog = $('#sheet-dialog');
    $('#sheet-dialog-title').textContent = `${currentProduct.name} — ficha técnica original`;
    $('#sheet-dialog-image').src = currentProduct.sheetImage;
    $('#sheet-dialog-image').alt = `Ficha técnica original de ${currentProduct.name}`;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', 'open');
    resetIdleTimer();
  }

function openGalleryDialog(index) {
    if (!currentProduct || !Array.isArray(currentProduct.gallery)) return;

    const images = currentProduct.gallery.filter(
        image => typeof image === 'string' && image.trim()
    );

    const image = images[Number(index)];

    if (!image) return;

    const dialog = $('#gallery-dialog');

    $('#gallery-dialog-title').textContent =
        `${currentProduct.name} — Foto ${Number(index) + 1}`;

    $('#gallery-dialog-image').src = image;

    $('#gallery-dialog-image').alt =
        `${currentProduct.name} - Imagem ampliada`;

    if (typeof dialog.showModal === 'function') {
        dialog.showModal();
    } else {
        dialog.setAttribute('open', 'open');
    }

    resetIdleTimer();
}

function closeGalleryDialog() {
    const dialog = $('#gallery-dialog');

    if (typeof dialog.close === 'function' && dialog.open) {
        dialog.close();
    } else {
        dialog.removeAttribute('open');
    }

    $('#gallery-dialog-image').src = '';

    resetIdleTimer();
}


function openBlackEditionVideo() {

    if (!currentProduct || currentProduct.id !== LAUNCH_PRODUCT_ID) {
        return;
    }

    const dialog = $('#black-edition-video-dialog');
    const video = $('#black-edition-video');

    if (!dialog || !video) {
        return;
    }

    if (typeof dialog.showModal === 'function') {
        dialog.showModal();
    } else {
        dialog.setAttribute('open', 'open');
    }

    video.muted = true;
    video.loop = true;
    video.playsInline = true;

    const playPromise = video.play();

    if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(error => {
            console.warn(
                'Não foi possível iniciar o vídeo Black Edition:',
                error
            );
        });
    }

    resetIdleTimer();
}


function stopBlackEditionVideo() {

    const video = $('#black-edition-video');

    if (video) {
        video.pause();

        try {
            video.currentTime = 0;
        } catch (_) {}
    }

    resetIdleTimer();
}


function closeBlackEditionVideo() {

    const dialog = $('#black-edition-video-dialog');

    if (dialog && typeof dialog.close === 'function' && dialog.open) {
        dialog.close();
    } else {
        if (dialog) {
            dialog.removeAttribute('open');
        }

        stopBlackEditionVideo();
    }
}
  function closeSheetDialog() {
    const dialog = $('#sheet-dialog');
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    resetIdleTimer();
  }

  function showQr() {
    if (!currentProduct) return;
    $('#qr-product-name').textContent = currentProduct.name;
    const frame = $('#qr-frame');
    const help = $('#qr-help');
    const imagePath = String(currentProduct.qrImage || '').trim();

    frame.innerHTML = `<div class="qr-placeholder"><div class="qr-placeholder-mark">SP</div><strong>QR CODE</strong><span>A imagem estática do QR Code será adicionada aqui.</span></div>`;
    if (!imagePath) {
      help.textContent = 'Configure o caminho da imagem no campo qrImage de public/data/products.json.';
    } else {
      const image = new Image();
      image.alt = `QR Code para o material de ${currentProduct.name}`;
      image.onload = () => {
        frame.replaceChildren(image);
        help.textContent = 'Aponte a câmera do celular para acessar o material deste produto.';
      };
      image.onerror = () => {
        frame.innerHTML = `<div class="qr-placeholder"><div class="qr-placeholder-mark">SP</div><strong>IMAGEM PENDENTE</strong><span>Adicione o arquivo de QR Code estático no caminho configurado para este produto.</span></div>`;
        help.textContent = `Arquivo esperado: ${imagePath}`;
      };
      image.src = imagePath;
    }
    showScreen('qr');
  }


  function navigateAction(action) {
    switch (action) {

        case 'home':
            currentProduct = null;
            showScreen('home');
            break;

        case 'categories':
            renderCategories();
            showScreen('categories');
            break;

        case 'catalog':
            renderCatalog();
            showScreen('catalog');
            break;

        case 'detail':
            if (currentProduct) {
                showScreen('detail');
            } else {
                showScreen('categories');
            }
            break;

        case 'sheet-zoom':
            openSheetDialog();
            break;

        case 'close-gallery':
            closeGalleryDialog();
            break;

        case 'open-black-edition-video':
            openBlackEditionVideo();
            break;

        case 'close-black-edition-video':
            closeBlackEditionVideo();
            break;

        case 'close-sheet':
            closeSheetDialog();
            break;

        default:
            break;
    }
}

  

  function bindEvents() {
    // Liga os controles críticos diretamente, além da delegação usada pelo restante da interface.
    // Isso torna os botões de QR menos dependentes do manipulador global de cliques.
    const qrButton = $('#qr-button');
    if (qrButton) qrButton.addEventListener('click', event => {
      event.stopPropagation();
      showQr();
    });
    const qrBackButton = $('#qr-back-button');
    if (qrBackButton) qrBackButton.addEventListener('click', event => {
      event.stopPropagation();
      navigateAction('detail');
    });

    document.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      if (!target) return;
      const action = target.closest('[data-action]');
      // Clique em uma imagem da galeria para ampliar
const galleryImage = target.closest('[data-gallery-zoom]');

if (galleryImage) {
    openGalleryDialog(galleryImage.dataset.galleryZoom);
    return;
}
      if (action) { navigateAction(action.dataset.action); return; }
      const categoryEntry = target.closest('[data-category-entry]');
      if (categoryEntry) {
        const entry = categoryEntry.dataset.categoryEntry;
        if (entry === 'launch') {
          activeCategory = 'Todos';
          const launchProduct = products.find(product => product.id === LAUNCH_PRODUCT_ID);
          if (launchProduct) {
            openProduct(LAUNCH_PRODUCT_ID);
          } else {
            showToast('O produto de lançamento não foi encontrado no catálogo.');
          }
          return;
        }
        activeCategory = 'Todos';
        renderCatalog();
        showScreen('catalog');
        return;
      }
      const product = target.closest('[data-product]');
      if (product) { openProduct(product.dataset.product); return; }
      const tab = target.closest('[data-tab]');
      if (tab) { currentTab = tab.dataset.tab; renderDetailTab(); resetIdleTimer(); return; }
      if (target.closest('#qr-button')) { showQr(); return; }
      if (target.closest('#brand-home, #home-button')) { navigateAction('home'); }
    });
    $('#sheet-dialog').addEventListener('click', event => { if (event.target === $('#sheet-dialog')) closeSheetDialog(); });
    $('#gallery-dialog').addEventListener('click', event => {
    if (event.target === $('#gallery-dialog')) {
        closeGalleryDialog();
    }
});
// Eventos da janela de vídeo Black Edition.
const videoDialog = $('#black-edition-video-dialog');

videoDialog.addEventListener('click', event => {
    if (event.target === videoDialog) {
        closeBlackEditionVideo();
    }
});

// Também interrompe o vídeo quando a janela é fechada pelo teclado.
videoDialog.addEventListener('close', () => {
    stopBlackEditionVideo();
});
    ['pointerdown','keydown','input','change','wheel'].forEach(name => document.addEventListener(name, () => resetIdleTimer(), {passive:true}));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) resetIdleTimer(); });
  }

  async function init() {
    // Sempre comece na tela inicial, mesmo se o WebView mantiver recursos antigos em cache.
    showScreen('home');
    try {
      products = window.PRODUCTS;

if (!Array.isArray(products) || products.length === 0) {
    throw new Error(
        'O catálogo não foi carregado. Confira o arquivo data/products.js.'
    );
}
      
      // Este produto é o lançamento definido para a experiência do totem.
      products.forEach(product => { product.isLaunch = product.id === LAUNCH_PRODUCT_ID; });
      renderHomeArt();
      
      // Inicializa o vídeo institucional da tela inicial.
      const homeVideo = $('#home-loop-video');
      const homeFallback = $('#home-video-fallback');

      if (homeVideo) {
        const revealVideo = () => {
          if (homeVideo.readyState < 2 || homeVideo.error) return;

          homeVideo.classList.add('is-ready');

          if (homeFallback) {
            homeFallback.classList.add('hidden');
          }
        };

        const restoreFallback = () => {
          homeVideo.classList.remove('is-ready');

          if (homeFallback) {
            homeFallback.classList.remove('hidden');
          }
        };

        homeVideo.muted = true;
        homeVideo.defaultMuted = true;
        homeVideo.loop = true;
        homeVideo.autoplay = true;
        homeVideo.playsInline = true;

        homeVideo.addEventListener('loadeddata', revealVideo);
        homeVideo.addEventListener('canplay', revealVideo);
        homeVideo.addEventListener('playing', revealVideo);

        homeVideo.addEventListener('error', () => {
          restoreFallback();
          console.error(
            'Erro ao carregar o vídeo institucional:',
            homeVideo.currentSrc,
            homeVideo.error
          );
        });

        // Trata também o caso em que o vídeo já carregou.
        revealVideo();

        const playPromise = homeVideo.play();

        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.then(revealVideo).catch(error => {
            console.warn('Falha ao iniciar o vídeo:', error);
            revealVideo();
          });
        }
      }

      renderCategories();
      renderCatalog();
      bindEvents();
      showScreen('home');
    } catch (error) {
      view.innerHTML = `<section class="screen success-screen"><div class="eyebrow"><span class="eyebrow-line"></span> CATÁLOGO</div><h1>Não foi possível<br><span>iniciar.</span></h1><p class="lead-copy">${escapeHtml(error.message)} Confira se data/products.js e as pastas do projeto estão nos locais corretos.</p></section>`;
    }
  }

  init();
})();
