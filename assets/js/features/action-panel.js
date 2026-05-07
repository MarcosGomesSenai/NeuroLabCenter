function prepararPainelAcoesBootstrap() {
  if (document.getElementById('nlActionPanel')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <button class="nl-action-fab btn btn-light" type="button" onclick="abrirPainelAcoesBootstrap()" data-bs-toggle="tooltip" data-bs-title="Abrir painel de acoes">Acoes</button>
    <div class="offcanvas offcanvas-end nl-action-offcanvas" tabindex="-1" id="nlActionPanel" aria-labelledby="nlActionPanelTitle">
      <div class="offcanvas-header">
        <div>
          <span class="badge text-bg-info">NeuroLab</span>
          <h5 class="offcanvas-title" id="nlActionPanelTitle">Painel rapido</h5>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Fechar"></button>
      </div>
      <div class="offcanvas-body" id="nlActionPanelBody"></div>
    </div>
  `);
  renderPainelAcoesBootstrap();
}

function abrirPainelAcoesBootstrap() {
  renderPainelAcoesBootstrap();
  const painel = document.getElementById('nlActionPanel');
  if (window.bootstrap?.Offcanvas && painel) {
    window.bootstrap.Offcanvas.getOrCreateInstance(painel).show();
  }
}

function renderPainelAcoesBootstrap() {
  const body = document.getElementById('nlActionPanelBody');
  if (!body) return;
  const usuario = lerJson(STORAGE_KEYS.usuarioAtual, null);
  const agendamentos = lerJson(STORAGE_KEYS.agendamentos, []);
  const favoritos = lerJson('neurolab_medicos_favoritos', []);
  const buscas = lerJson('neurolab_buscas_recentes', []);
  const prefs = lerJson('neurolab_ui_prefs', { contraste: false, fonteGrande: false });
  const progresso = calcularCompletudePerfil();

  body.innerHTML = `
    <div class="nl-action-user">
      <strong>${nlSafeText(usuario?.nome || 'Visitante')}</strong>
      <span>${usuario?.cpf ? 'Conta ativa' : 'Entre para salvar agendamentos e preferencias'}</span>
      <div class="progress mt-2" role="progressbar" aria-label="Perfil completo" aria-valuenow="${progresso}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar" style="width:${progresso}%">${progresso}%</div>
      </div>
    </div>
    <div class="list-group nl-action-list">
      <button class="list-group-item list-group-item-action" onclick="abrirAgendamento()">Agendar consulta <span>Fluxo completo</span></button>
      <a class="list-group-item list-group-item-action" href="area-paciente.html">Minha area <span>${agendamentos.length} agendamento(s)</span></a>
      <a class="list-group-item list-group-item-action" href="medicos.html">Medicos favoritos <span>${favoritos.length} salvo(s)</span></a>
      <a class="list-group-item list-group-item-action" href="convenios.html">Comparar convenios <span>${lerJson('neurolab_planos_comparar', []).length}/3</span></a>
    </div>
    <div class="nl-ui-card">
      <strong>Preferencias</strong>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" role="switch" id="prefContraste" ${prefs.contraste ? 'checked' : ''} onchange="atualizarPreferenciaInterface('contraste', this.checked)">
        <label class="form-check-label" for="prefContraste">Alto contraste</label>
      </div>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" role="switch" id="prefFonte" ${prefs.fonteGrande ? 'checked' : ''} onchange="atualizarPreferenciaInterface('fonteGrande', this.checked)">
        <label class="form-check-label" for="prefFonte">Fonte maior</label>
      </div>
    </div>
    <div class="nl-ui-card">
      <strong>Buscas recentes</strong>
      <div class="nl-recent-searches">
        ${buscas.length ? buscas.map(item => `<button class="nl-recent-chip" onclick="rebuscarComandoRapido('${encodeURIComponent(item)}')">${nlSafeText(item)}</button>`).join('') : '<span class="text-muted small">Nenhuma busca recente.</span>'}
      </div>
    </div>
  `;
}

function prepararBotaoAgendamentoContextual() {
  if (document.getElementById('nlQuickSchedule')) return;
  if (paginaArquivo() === 'agendamento.html') return;
  const botao = document.createElement('button');
  botao.id = 'nlQuickSchedule';
  botao.className = 'nl-quick-schedule btn btn-primary';
  botao.type = 'button';
  botao.setAttribute('data-bs-toggle', 'tooltip');
  botao.setAttribute('data-bs-title', 'Abrir agendamento');
  botao.textContent = 'Agendar';
  botao.addEventListener('click', abrirAgendamento);
  document.body.appendChild(botao);
}

function prepararComponentesBootstrap() {
  if (!window.bootstrap?.Tooltip) return;
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((elemento) => {
    if (!window.bootstrap.Tooltip.getInstance(elemento)) {
      new window.bootstrap.Tooltip(elemento);
    }
  });
}

function aplicarUxRefresh() {
  aplicarIdentidadeVisualLegada();
  aplicarPreferenciasInterface();
  montarNavbarComum();
  atualizarHeader();
  prepararMenuResponsivo();
  prepararNavbarFixa();
  aplicarAjustesBootstrapLegado();
  prepararValidacaoBootstrap();
  prepararForcaSenha();
  prepararRascunhoCadastro();
  prepararSugestoesBusca();
  prepararAtalhosGlobais();
  prepararBotaoVoltarTopo();
  prepararBotaoAgendamentoContextual();
  prepararPainelAcoesBootstrap();
  prepararHomeEnxuta();
  renderConveniosMelhorados();
  renderComparadorPlanos();
  renderUnidadesCompleta();
  renderTeleconsultaProfissional();
  renderPortalPacienteNovo();
  renderMedicosPage();
  prepararFavoritosMedicos();
  prepararAcoesUnidades();
  renderAgendamentoDrConsulta();
  prepararComponentesBootstrap();
  if (document.querySelector('#agStep5 .calendario-grid')) renderCalendarioAgendamento();
}

