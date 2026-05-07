function aplicarIdentidadeVisualLegada() {
  const pagina = paginaArquivo();
  const classesPorPagina = {
    'index.html': 'page-home',
    'sobre.html': 'page-sobre',
    'especialidades.html': 'page-especialidades',
    'medicos.html': 'page-medicos',
    'exames.html': 'page-exames',
    'unidades.html': 'page-unidades',
    'convenios.html': 'page-convenios',
    'teleconsulta.html': 'page-teleconsulta',
    'area-paciente.html': 'page-paciente',
    'agendamento.html': 'page-agendamento',
    'termos-de-uso.html': 'page-legal',
    'politica-privacidade.html': 'page-legal'
  };

  document.body.classList.remove('nl-redesign');
  document.body.classList.add('nl-legacy', classesPorPagina[pagina] || 'page-interna');
  document.body.dataset.page = pagina.replace('.html', '') || 'home';
}

function prepararMenuResponsivo() {
  const menu = document.getElementById('menu');
  const botao = document.querySelector('.menu-btn');
  if (!menu || !botao || menu.dataset.enhanced === 'true') return;

  menu.dataset.enhanced = 'true';
  menu.id = menu.id || 'menu';
  botao.setAttribute('aria-controls', menu.id);
  botao.setAttribute('aria-expanded', String(menu.classList.contains('open')));

  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      menu.classList.remove('open');
      botao.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    menu.classList.remove('open');
    botao.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('click', (event) => {
    if (!menu.classList.contains('open')) return;
    if (event.target.closest('nav')) return;
    menu.classList.remove('open');
    botao.setAttribute('aria-expanded', 'false');
  });
}

function prepararNavbarFixa() {
  const topbar = document.querySelector('.topbar');
  const header = document.querySelector('header');
  const navbar = document.querySelector('.navbar');
  if (!header || header.dataset.fixedReady === 'true') return;
  header.dataset.fixedReady = 'true';

  const calcularAlturas = () => {
    const topbarVisivel = topbar && getComputedStyle(topbar).display !== 'none';
    const topbarAltura = topbarVisivel ? Math.ceil(topbar.getBoundingClientRect().height || 36) : 0;
    const headerAltura = Math.ceil((navbar || header).getBoundingClientRect().height || 78);
    const offset = topbarAltura + headerAltura;

    document.documentElement.style.setProperty('--nl-topbar-height', `${topbarAltura}px`);
    document.documentElement.style.setProperty('--nl-header-height', `${headerAltura}px`);
    document.documentElement.style.setProperty('--nl-fixed-offset', `${offset}px`);
    document.body.style.paddingTop = `${offset}px`;
    document.body.classList.add('nl-navbar-fixed-ready');
  };

  const atualizarSombra = () => {
    header.classList.toggle('navbar-scrolled', window.scrollY > 8);
  };

  calcularAlturas();
  atualizarSombra();
  setTimeout(calcularAlturas, 80);
  window.addEventListener('resize', calcularAlturas, { passive: true });
  window.addEventListener('scroll', atualizarSombra, { passive: true });
}

function aplicarAjustesBootstrapLegado() {
  document.querySelectorAll('.modal-card, .card, .quick-btn, .unidade-rica, .dashboard-section, .consulta-option-card, .exam-info-panel').forEach((elemento) => {
    elemento.classList.add('shadow-sm');
  });

  document.querySelectorAll('input, select, textarea').forEach((campo) => {
    const tipo = String(campo.getAttribute('type') || '').toLowerCase();
    if (['checkbox', 'radio', 'hidden', 'file', 'button', 'submit'].includes(tipo)) return;
    if (!campo.classList.contains('form-control') && !campo.classList.contains('form-select')) {
      campo.classList.add(campo.tagName === 'SELECT' ? 'form-select' : 'form-control');
    }
  });

  document.querySelectorAll('.page-hero, .hero').forEach((hero) => {
    if (!hero.dataset.enhanced) {
      hero.dataset.enhanced = 'true';
      hero.insertAdjacentHTML('beforeend', '<div class="page-ambient-line" aria-hidden="true"></div>');
    }
  });
}

