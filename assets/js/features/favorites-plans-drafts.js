function prepararFavoritosMedicos() {
  const cards = document.querySelectorAll('.doctor-profile-card');
  if (!cards.length) return;
  const favoritos = lerJson('neurolab_medicos_favoritos', []);
  cards.forEach((card) => {
    if (card.dataset.favoriteReady === 'true') return;
    card.dataset.favoriteReady = 'true';
    const nome = card.querySelector('.doctor-profile-top strong')?.textContent?.trim();
    if (!nome) return;
    const ativo = favoritos.includes(nome);
    card.insertAdjacentHTML('afterbegin', `
      <button class="doctor-fav-btn ${ativo ? 'active' : ''}" type="button" onclick="alternarFavoritoMedico('${nome.replace(/'/g, "\\'")}', this)" aria-label="Favoritar m\u00e9dico" data-bs-toggle="tooltip" data-bs-title="Salvar m\u00e9dico favorito">
        ${ativo ? '\u2665' : '\u2661'}
      </button>
    `);
  });
}

function alternarFavoritoMedico(nome, botao) {
  const favoritos = lerJson('neurolab_medicos_favoritos', []);
  const existe = favoritos.includes(nome);
  const novos = existe ? favoritos.filter(item => item !== nome) : [...favoritos, nome];
  salvarJson('neurolab_medicos_favoritos', novos);
  botao.classList.toggle('active', !existe);
  botao.textContent = existe ? '\u2661' : '\u2665';
  mostrarToast(existe ? 'M\u00e9dico removido dos favoritos.' : 'M\u00e9dico salvo nos favoritos.', 'sucesso');
}

function prepararAcoesUnidades() {
  document.querySelectorAll('.unit-showcase-card').forEach((card) => {
    if (card.dataset.unitActionsReady === 'true') return;
    const endereco = card.querySelector('.unit-showcase-body > p')?.textContent?.trim();
    const body = card.querySelector('.unit-showcase-body');
    if (!endereco || !body) return;
    card.dataset.unitActionsReady = 'true';
    body.insertAdjacentHTML('beforeend', `
      <button class="btn btn-light btn-sm unit-copy-btn" type="button" onclick="copiarTextoNeuroLab('${endereco.replace(/'/g, "\\'")}', 'Endere\u00e7o copiado.')">Copiar endere\u00e7o</button>
    `);
  });
}

async function copiarTextoNeuroLab(texto, mensagem = 'Copiado.') {
  try {
    await navigator.clipboard.writeText(texto);
    mostrarToast(mensagem, 'sucesso');
  } catch (_) {
    mostrarToast(texto, 'info', 7000);
  }
}

function alternarComparacaoPlano(nome, botao) {
  const selecionados = lerJson('neurolab_planos_comparar', []);
  const existe = selecionados.includes(nome);
  const proximos = existe ? selecionados.filter(item => item !== nome) : [...selecionados, nome].slice(-3);
  salvarJson('neurolab_planos_comparar', proximos);
  botao?.closest('.plan-card-rich')?.classList.toggle('compare-selected', !existe);
  renderComparadorPlanos();
  mostrarToast(existe ? 'Plano removido da comparacao.' : 'Plano adicionado para comparar.', 'info');
}

function renderComparadorPlanos() {
  const grid = document.getElementById('planGrid');
  if (!grid) return;
  let painel = document.getElementById('nlPlanComparePanel');
  if (!painel) {
    grid.insertAdjacentHTML('beforebegin', '<div class="nl-plan-compare-panel hidden" id="nlPlanComparePanel"></div>');
    painel = document.getElementById('nlPlanComparePanel');
  }

  const selecionados = lerJson('neurolab_planos_comparar', []);
  document.querySelectorAll('.plan-card-rich').forEach(card => {
    const nome = card.querySelector('strong')?.textContent?.trim();
    const selecionado = selecionados.includes(nome);
    card.classList.toggle('compare-selected', selecionado);
    const botao = card.querySelector('.plan-card-actions button:last-child');
    if (botao) {
      botao.classList.toggle('btn-primary', selecionado);
      botao.classList.toggle('btn-outline-secondary', !selecionado);
      botao.textContent = selecionado ? 'Selecionado' : 'Comparar';
    }
  });

  if (!selecionados.length) {
    painel.classList.add('hidden');
    painel.innerHTML = '';
    return;
  }

  const planos = selecionados
    .map(nome => NL_PLANOS.find(plano => plano.nome === nome))
    .filter(Boolean);

  painel.classList.remove('hidden');
  painel.innerHTML = `
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <div>
        <span class="badge text-bg-info">Comparador</span>
        <h3>Planos selecionados</h3>
      </div>
      <button class="btn btn-sm btn-outline-secondary" onclick="salvarJson('neurolab_planos_comparar', []); renderComparadorPlanos()">Limpar</button>
    </div>
    <div class="table-responsive">
      <table class="table table-sm align-middle mb-0">
        <thead><tr><th>Plano</th><th>Servicos</th><th>Unidades</th></tr></thead>
        <tbody>
          ${planos.map(plano => `
            <tr>
              <td><strong>${nlSafeText(plano.nome)}</strong></td>
              <td>${plano.servicos.map(servico => `<span class="badge rounded-pill text-bg-light">${nlSafeText(servico)}</span>`).join(' ')}</td>
              <td>${plano.unidades.map(unidade => `<small class="d-inline-block me-2">${nlSafeText(unidade)}</small>`).join('')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function prepararRascunhoCadastro() {
  if (document.body.dataset.cadastroDraftReady === 'true') return;
  document.body.dataset.cadastroDraftReady = 'true';
  const ids = ['cadCpf', 'cadNascimento', 'cadNome', 'cadCelular', 'cadEmail', 'cadCpfAdol', 'cadNascAdol', 'cadNomeAdol', 'cadCelAdol', 'cadCpfResp'];
  const rascunho = lerJson('neurolab_cadastro_rascunho', {});
  ids.forEach(id => {
    const campo = document.getElementById(id);
    if (!campo) return;
    if (rascunho[id] && !campo.value) campo.value = rascunho[id];
    campo.addEventListener('input', salvarRascunhoCadastro);
  });
}

function salvarRascunhoCadastro() {
  const ids = ['cadCpf', 'cadNascimento', 'cadNome', 'cadCelular', 'cadEmail', 'cadCpfAdol', 'cadNascAdol', 'cadNomeAdol', 'cadCelAdol', 'cadCpfResp'];
  const dados = {};
  ids.forEach(id => {
    const campo = document.getElementById(id);
    if (campo?.value) dados[id] = campo.value;
  });
  salvarJson('neurolab_cadastro_rascunho', dados);
}

function limparRascunhoCadastro() {
  localStorage.removeItem('neurolab_cadastro_rascunho');
}

function aplicarPreferenciasInterface() {
  const prefs = lerJson('neurolab_ui_prefs', { contraste: false, fonteGrande: false });
  document.body.classList.toggle('nl-high-contrast', Boolean(prefs.contraste));
  document.body.classList.toggle('nl-font-large', Boolean(prefs.fonteGrande));
}

function atualizarPreferenciaInterface(chave, valor) {
  const prefs = lerJson('neurolab_ui_prefs', { contraste: false, fonteGrande: false });
  prefs[chave] = Boolean(valor);
  salvarJson('neurolab_ui_prefs', prefs);
  aplicarPreferenciasInterface();
  renderPainelAcoesBootstrap();
}

function calcularCompletudePerfil() {
  const usuario = lerJson(STORAGE_KEYS.usuarioAtual, null);
  let pontos = 0;
  if (usuario?.cpf) pontos += 25;
  if (usuario?.nome) pontos += 20;
  if (localStorage.getItem('neurolab_foto_perfil')) pontos += 20;
  if (lerJson('neurolab_dependentes', []).length) pontos += 20;
  if (lerJson(STORAGE_KEYS.agendamentos, []).length) pontos += 15;
  return Math.min(100, pontos);
}

