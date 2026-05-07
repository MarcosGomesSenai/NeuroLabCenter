const NL_ACOES_RAPIDAS = [
  { titulo: 'Agendar consulta', detalhe: 'Abrir fluxo de agendamento em 6 passos', href: 'agendamento.html', termos: 'agendar consulta horario medico unidade' },
  { titulo: 'Teleconsulta', detalhe: 'Consulta online particular ou convenio', href: 'teleconsulta.html', termos: 'online teleconsulta video' },
  { titulo: 'Area do Paciente', detalhe: 'Historico, exames, documentos e familia', href: 'area-paciente.html', termos: 'paciente historico exames documentos familia' },
  { titulo: 'Medicos', detalhe: 'Ver profissionais por especialidade', href: 'medicos.html', termos: 'medicos especialistas neurologia' },
  { titulo: 'Exames', detalhe: 'EEG, ENMG, polissonografia e preparo', href: 'exames.html', termos: 'exames eeg enmg polissonografia preparo' },
  { titulo: 'Unidades', detalhe: 'Enderecos, mapas e estrutura', href: 'unidades.html', termos: 'unidades mapa endereco unidade' },
  { titulo: 'Convenios', detalhe: 'Planos aceitos e cobertura', href: 'convenios.html', termos: 'convenios planos cobertura' },
  { titulo: 'Termos e privacidade', detalhe: 'LGPD, termos de uso e politica de privacidade', href: 'politica-privacidade.html', termos: 'termos privacidade lgpd dados' }
];

function prepararSugestoesBusca() {
  if (document.getElementById('nlBuscaSugestoes')) return;
  const datalist = document.createElement('datalist');
  datalist.id = 'nlBuscaSugestoes';
  datalist.innerHTML = [
    'Agendar consulta',
    'Teleconsulta',
    'EEG',
    'Eletroneuromiografia',
    'Polissonografia',
    'Enxaqueca',
    'Memoria',
    'Unimed',
    'Bradesco Saude',
    'Area do Paciente'
  ].map(item => `<option value="${item}"></option>`).join('');
  document.body.appendChild(datalist);
  document.querySelectorAll('#busca, #drEspecialidadeBusca, input[type="search"]').forEach(input => {
    input.setAttribute('list', 'nlBuscaSugestoes');
    input.setAttribute('autocomplete', 'off');
  });
}

function registrarBuscaRecente(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return;
  const recentes = lerJson('neurolab_buscas_recentes', []);
  const atualizados = [texto, ...recentes.filter(item => normalizarTexto(item) !== normalizarTexto(texto))].slice(0, 6);
  salvarJson('neurolab_buscas_recentes', atualizados);
}

function abrirComandoRapido() {
  let palette = document.getElementById('nlCommandPalette');
  if (!palette) {
    palette = document.createElement('div');
    palette.id = 'nlCommandPalette';
    palette.className = 'nl-command-palette';
    palette.innerHTML = `
      <div class="nl-command-card">
        <button class="nl-command-close" onclick="fecharComandoRapido()" aria-label="Fechar">x</button>
        <label for="nlCommandInput">Busca rapida</label>
        <input id="nlCommandInput" class="form-control" placeholder="Digite: agendar, exame, unidade, convenio..." oninput="filtrarComandoRapido(this.value)" onkeydown="executarComandoRapido(event)">
        <div class="nl-command-list" id="nlCommandList"></div>
      </div>
    `;
    document.body.appendChild(palette);
  }
  palette.classList.add('open');
  document.body.style.overflow = 'hidden';
  filtrarComandoRapido('');
  setTimeout(() => document.getElementById('nlCommandInput')?.focus(), 40);
}

function fecharComandoRapido() {
  document.getElementById('nlCommandPalette')?.classList.remove('open');
  if (!document.querySelector('.modal-overlay.open')) document.body.style.overflow = '';
}

function filtrarComandoRapido(valor = '') {
  const termo = normalizarTexto(valor);
  const lista = document.getElementById('nlCommandList');
  if (!lista) return;
  const recentes = lerJson('neurolab_buscas_recentes', []);
  const itens = NL_ACOES_RAPIDAS.filter(item => {
    const base = normalizarTexto(`${item.titulo} ${item.detalhe} ${item.termos}`);
    return !termo || base.includes(termo);
  });
  const htmlRecentes = !termo && recentes.length
    ? `<div class="nl-command-section">Recentes</div>${recentes.map(item => `<button class="nl-command-item compact" onclick="rebuscarComandoRapido('${encodeURIComponent(item)}')"><strong>${nlSafeText(item)}</strong><span>Buscar novamente</span></button>`).join('')}`
    : '';
  const htmlAcoes = itens.map((item, index) => `
    <button class="nl-command-item ${index === 0 ? 'active' : ''}" onclick="navegarPara('${item.href}')">
      <strong>${nlSafeText(item.titulo)}</strong>
      <span>${nlSafeText(item.detalhe)}</span>
    </button>
  `).join('');
  lista.innerHTML = `${htmlRecentes}${htmlAcoes}` || '<div class="safe-note">Nada encontrado. Tente buscar por consulta, exame, unidade ou convenio.</div>';
}

function rebuscarComandoRapido(valorCodificado) {
  const valor = decodeURIComponent(valorCodificado || '');
  const input = document.getElementById('nlCommandInput');
  if (input) {
    input.value = valor;
    filtrarComandoRapido(valor);
    input.focus();
    return;
  }
  registrarBuscaRecente(valor);
  const busca = document.getElementById('busca');
  if (busca) {
    busca.value = valor;
    buscarSite();
  }
}

function executarComandoRapido(event) {
  if (event.key === 'Escape') {
    fecharComandoRapido();
    return;
  }
  if (event.key !== 'Enter') return;
  registrarBuscaRecente(document.getElementById('nlCommandInput')?.value || '');
  const ativo = document.querySelector('#nlCommandList .nl-command-item.active') || document.querySelector('#nlCommandList .nl-command-item');
  ativo?.click();
}

function prepararAtalhosGlobais() {
  if (document.body.dataset.shortcutsReady === 'true') return;
  document.body.dataset.shortcutsReady = 'true';

  document.addEventListener('keydown', (event) => {
    const alvo = event.target;
    const digitando = alvo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      abrirComandoRapido();
      return;
    }
    if (event.key === '/' && !digitando && !document.querySelector('.modal-overlay.open')) {
      event.preventDefault();
      abrirComandoRapido();
      return;
    }
    if (event.key === 'Escape') fecharComandoRapido();
  });
}

