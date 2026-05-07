/* ============================================================
   NEUROLAB BOOKING FINAL PASS - agendamento sem menu lateral
   ============================================================ */
function prepararPainelAcoesBootstrap() {
  if (document.getElementById('nlActionPanel')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <button class="nl-action-fab btn btn-light" type="button" onclick="abrirPainelAcoesBootstrap()" data-bs-toggle="tooltip" data-bs-title="Abrir atalhos">
      <span class="nl-action-fab-icon">+</span>
      <span>Atalhos</span>
    </button>
    <div class="offcanvas offcanvas-end nl-action-offcanvas" tabindex="-1" id="nlActionPanel" aria-labelledby="nlActionPanelTitle">
      <div class="offcanvas-header">
        <div>
          <span class="badge text-bg-info">NeuroLab</span>
          <h5 class="offcanvas-title" id="nlActionPanelTitle">Atalhos rapidos</h5>
          <small>Acesso rapido aos fluxos principais.</small>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Fechar"></button>
      </div>
      <div class="offcanvas-body" id="nlActionPanelBody"></div>
    </div>
  `);
  renderPainelAcoesBootstrap();
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
    <section class="nl-action-profile">
      <div>
        <strong>${nlSafeText(usuario?.nome || 'Visitante')}</strong>
        <span>${usuario?.cpf ? 'Conta conectada' : 'Entre para salvar agendamentos e preferencias.'}</span>
      </div>
      <div class="progress" role="progressbar" aria-label="Perfil completo" aria-valuenow="${progresso}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar" style="width:${progresso}%">${progresso}%</div>
      </div>
    </section>

    <section class="nl-action-primary">
      <button class="btn btn-primary" onclick="abrirAgendamento()">Agendar consulta</button>
      <a class="btn btn-light" href="area-paciente.html">Minha area</a>
    </section>

    <section class="nl-action-grid">
      <a href="medicos.html">
        <strong>Medicos</strong>
        <span>${favoritos.length} favorito(s)</span>
      </a>
      <a href="unidades.html">
        <strong>Unidades</strong>
        <span>Mapas e estrutura</span>
      </a>
      <a href="convenios.html">
        <strong>Convenios</strong>
        <span>${lerJson('neurolab_planos_comparar', []).length}/3 comparados</span>
      </a>
      <a href="teleconsulta.html">
        <strong>Teleconsulta</strong>
        <span>Particular e convenio</span>
      </a>
    </section>

    <section class="nl-ui-card nl-action-preferences">
      <strong>Preferencias de leitura</strong>
      <label class="form-check form-switch">
        <input class="form-check-input" type="checkbox" role="switch" id="prefContraste" ${prefs.contraste ? 'checked' : ''} onchange="atualizarPreferenciaInterface('contraste', this.checked)">
        <span class="form-check-label">Alto contraste</span>
      </label>
      <label class="form-check form-switch">
        <input class="form-check-input" type="checkbox" role="switch" id="prefFonte" ${prefs.fonteGrande ? 'checked' : ''} onchange="atualizarPreferenciaInterface('fonteGrande', this.checked)">
        <span class="form-check-label">Fonte maior</span>
      </label>
    </section>

    <section class="nl-ui-card">
      <strong>Buscas recentes</strong>
      <div class="nl-recent-searches">
        ${buscas.length ? buscas.slice(0, 6).map(item => `<button class="nl-recent-chip" onclick="rebuscarComandoRapido('${encodeURIComponent(item)}')">${nlSafeText(item)}</button>`).join('') : '<span class="text-muted small">Nenhuma busca recente ainda.</span>'}
      </div>
    </section>
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
  botao.innerHTML = '<span>Agendar</span>';
  botao.addEventListener('click', abrirAgendamento);
  document.body.appendChild(botao);
}

function desenharResultadoDrConsulta(medicos, unidades, tipoAtual = nlBookingTipoPorTermo(nlBookingState().termo, nlBookingState().modo)) {
  const card = document.querySelector('.nl-booking-v2');
  if (!card) return;
  const estado = nlBookingState();
  const planoAtual = estado.plano || 'Particular';
  const datas = gerarDatasAgendamentoNovo(estado.dataISO);
  const semResultado = !medicos.length || !unidades.length;

  card.innerHTML = `
    <div class="booking-shell booking-shell-final">
      <aside class="booking-filter-panel booking-filter-panel-final">
        <div class="booking-mode compact" role="tablist" aria-label="Modalidade">
          <button class="${estado.modo === 'presencial' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('presencial')">Presencial</button>
          <button class="${estado.modo === 'online' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('online')">Online</button>
        </div>
        <div class="booking-filter-field booking-filter-field-wide">
          <label for="drFiltroEspecialidade">Busca</label>
          <input id="drFiltroEspecialidade" class="form-control" value="${nlSafeText(estado.termo)}" placeholder="Digite especialidade, exame ou médico..." onkeydown="if(event.key==='Enter') buscarAgendamentoNovo()">
        </div>
        <div class="booking-filter-field">
          <label for="drFiltroPlano">Plano</label>
          <select id="drFiltroPlano" class="form-select" onchange="buscarAgendamentoNovo()">${nlPlanoOptionsAgendamento(estado.modo, planoAtual)}</select>
        </div>
        <div class="booking-filter-field">
          <label for="drFiltroUnidade">Unidade</label>
          <select id="drFiltroUnidade" class="form-select" onchange="selecionarUnidadeAgendamentoV2(this.value)">
            ${unidades.map(unidade => `<option value="${nlSafeText(unidade.nome)}" ${unidade.nome === agendamentoAtual.unidade ? 'selected' : ''}>${nlSafeText(unidade.nome)}</option>`).join('')}
          </select>
        </div>
        <div class="booking-filter-field">
          <label for="drFiltroMedico">Medico</label>
          <select id="drFiltroMedico" class="form-select" onchange="selecionarMedicoAgendamentoV2(this.value)">
            ${medicos.map(medico => `<option value="${nlSafeText(medico.nome)}" ${medico.nome === agendamentoAtual.medico ? 'selected' : ''}>${nlSafeText(medico.nome)}</option>`).join('')}
          </select>
        </div>
        <div class="booking-filter-actions">
          <button class="btn btn-primary" onclick="buscarAgendamentoNovo()">Atualizar</button>
          <button class="btn btn-light" onclick="window.NLUX.drSearched=false; desenharBuscaDrConsulta()">Nova busca</button>
        </div>
      </aside>

      <main class="booking-results-panel booking-results-panel-final">
        ${semResultado ? nlBookingEmptyState() : `
          <section class="booking-result-summary booking-result-summary-final">
            <div>
              <span class="badge text-bg-info">${nlSafeText(nlBookingLabelTipo(tipoAtual))}</span>
              <h2 id="bookingSummaryTitle">${nlSafeText(agendamentoAtual.medico || 'Escolha um profissional')}</h2>
              <p id="bookingSummaryMeta">${nlSafeText(agendamentoAtual.unidade || 'Selecione uma unidade')} &middot; ${nlSafeText(planoAtual)}</p>
            </div>
            <div class="booking-summary-tags">
              <span>${medicos.length} profissionais</span>
              <span>${unidades.length} unidades</span>
              <span>Hold 10 min</span>
            </div>
          </section>

          <section class="booking-picker-grid booking-picker-grid-final">
            <div>
              <div class="booking-section-title">Unidades disponiveis</div>
              <div class="booking-unit-list">
                ${unidades.map(unidade => `
                  <button class="booking-unit-card ${unidade.nome === agendamentoAtual.unidade ? 'active' : ''}" data-unit="${nlSafeText(unidade.nome)}" onclick="selecionarUnidadeAgendamentoV2('${unidade.nome.replace(/'/g, "\\'")}')">
                    <strong>${nlSafeText(unidade.nome)}</strong>
                    <span>${nlSafeText(unidade.endereco)}</span>
                    <small>${nlSafeText(unidade.distancia)} &middot; ${unidade.coberturas.join(', ')}</small>
                  </button>
                `).join('')}
              </div>
            </div>
            <div>
              <div class="booking-section-title">Profissionais</div>
              <div class="booking-doctor-list">
                ${medicos.map(medico => `
                  <button class="booking-doctor-card ${medico.nome === agendamentoAtual.medico ? 'active' : ''}" data-doctor="${nlSafeText(medico.nome)}" onclick="selecionarMedicoAgendamentoV2('${medico.nome.replace(/'/g, "\\'")}')">
                    <span class="doctor-photo small">${nlDoctorInitials(medico.nome)}</span>
                    <span><strong>${nlSafeText(medico.nome)}</strong><small>${nlSafeText(medico.crm)} &middot; ${nlSafeText(medico.especialidade)}</small></span>
                    <em>${medico.rating.toFixed(1)}</em>
                  </button>
                `).join('')}
              </div>
            </div>
          </section>

          <section class="booking-calendar-panel booking-calendar-panel-final">
            <div class="booking-calendar-head">
              <div>
                <div class="booking-section-title">Calendario e horarios</div>
                <p>Escolha uma data nos proximos 90 dias. Domingos ficam bloqueados automaticamente.</p>
              </div>
              <input id="bookingCalendarDate" class="form-control" type="date" min="${nlBookingMinDate()}" max="${nlBookingMaxDate()}" value="${estado.dataISO}" onchange="selecionarDataAgendamentoNovo(this.value)">
            </div>
            <div class="booking-date-strip" id="bookingDateStrip">
              ${datas.map(data => `
                <button class="booking-date-card ${data.iso === estado.dataISO ? 'active' : ''} ${data.disabled ? 'disabled' : ''}" ${data.disabled ? 'disabled' : ''} onclick="selecionarDataAgendamentoNovo('${data.iso}')">
                  <span>${data.semana}</span>
                  <strong>${data.dia}</strong>
                </button>
              `).join('')}
            </div>
            <div class="booking-slot-area" id="bookingSlotArea">${renderSlotsAgendamentoV2()}</div>
          </section>

          <section class="booking-confirm-box hidden" id="drConfirmPanel">
            <div>
              <strong>Horario selecionado</strong>
              <span id="drConfirmText"></span>
            </div>
            <button class="btn btn-primary" onclick="confirmarAgendamentoNovo()">Confirmar agendamento</button>
          </section>
        `}
      </main>
    </div>
  `;
}

function atualizarResumoBookingV3() {
  const titulo = document.getElementById('bookingSummaryTitle');
  const meta = document.getElementById('bookingSummaryMeta');
  const estado = nlBookingState();
  if (titulo) titulo.textContent = agendamentoAtual.medico || 'Escolha um profissional';
  if (meta) meta.textContent = `${agendamentoAtual.unidade || 'Selecione uma unidade'} · ${estado.plano || agendamentoAtual.cobertura || 'Particular'}`;
  const confirmText = document.getElementById('drConfirmText');
  if (confirmText && agendamentoAtual.horario) {
    confirmText.textContent = `${agendamentoAtual.medico} · ${agendamentoAtual.unidade} · ${agendamentoAtual.dia} às ${agendamentoAtual.horario}`;
  }
}

function selecionarUnidadeAgendamentoV2(nome) {
  const estado = nlBookingState();
  estado.unidade = nome;
  const unidade = NL_UNIDADES.find(item => item.nome === nome);
  if (unidade) {
    agendamentoAtual.unidade = unidade.nome;
    agendamentoAtual.endereco = unidade.endereco;
  }

  const tipo = agendamentoAtual.tipoCodigo || nlBookingTipoPorTermo(estado.termo, estado.modo);
  const medicoAtual = NL_MEDICOS.find(item => item.nome === agendamentoAtual.medico);
  if (medicoAtual && tipo !== 'TELE' && !medicoAtual.unidades.includes(nome)) {
    const proximoMedico = NL_MEDICOS.find(item => item.tipos.includes(tipo) && item.unidades.includes(nome) && item.coberturas.includes(agendamentoAtual.cobertura || nlCoberturaFromPlano(estado.plano)));
    if (proximoMedico) {
      agendamentoAtual.medico = proximoMedico.nome;
      agendamentoAtual.crm = proximoMedico.crm;
      agendamentoAtual.especialidade = proximoMedico.especialidade;
      estado.medico = proximoMedico.nome;
      const medicoSelect = document.getElementById('drFiltroMedico');
      if (medicoSelect) medicoSelect.value = proximoMedico.nome;
    }
  }

  document.querySelectorAll('.booking-unit-card').forEach(card => card.classList.toggle('active', card.dataset.unit === nome));
  document.querySelectorAll('.booking-doctor-card').forEach(card => card.classList.toggle('active', card.dataset.doctor === agendamentoAtual.medico));
  const select = document.getElementById('drFiltroUnidade');
  if (select) select.value = nome;
  agendamentoAtual.horario = '';
  window.NLUX.selectedSlot = '';
  document.getElementById('drConfirmPanel')?.classList.add('hidden');
  atualizarResumoBookingV3();
  const slotArea = document.getElementById('bookingSlotArea');
  if (slotArea) slotArea.innerHTML = renderSlotsAgendamentoV2();
}

function selecionarMedicoAgendamentoV2(nome) {
  const estado = nlBookingState();
  estado.medico = nome;
  const medico = NL_MEDICOS.find(item => item.nome === nome);
  if (medico) {
    agendamentoAtual.medico = medico.nome;
    agendamentoAtual.crm = medico.crm;
    agendamentoAtual.especialidade = medico.especialidade;
    if (agendamentoAtual.tipoCodigo !== 'TELE' && agendamentoAtual.unidade && !medico.unidades.includes(agendamentoAtual.unidade)) {
      const proximaUnidade = NL_UNIDADES.find(unidade => medico.unidades.includes(unidade.nome));
      if (proximaUnidade) {
        agendamentoAtual.unidade = proximaUnidade.nome;
        agendamentoAtual.endereco = proximaUnidade.endereco;
        estado.unidade = proximaUnidade.nome;
        const unidadeSelect = document.getElementById('drFiltroUnidade');
        if (unidadeSelect) unidadeSelect.value = proximaUnidade.nome;
      }
    }
  }

  document.querySelectorAll('.booking-doctor-card').forEach(card => card.classList.toggle('active', card.dataset.doctor === nome));
  document.querySelectorAll('.booking-unit-card').forEach(card => card.classList.toggle('active', card.dataset.unit === agendamentoAtual.unidade));
  const select = document.getElementById('drFiltroMedico');
  if (select) select.value = nome;
  agendamentoAtual.horario = '';
  window.NLUX.selectedSlot = '';
  document.getElementById('drConfirmPanel')?.classList.add('hidden');
  atualizarResumoBookingV3();
  const slotArea = document.getElementById('bookingSlotArea');
  if (slotArea) slotArea.innerHTML = renderSlotsAgendamentoV2();
}

function selecionarDataAgendamentoNovo(iso) {
  const estado = nlBookingState();
  const data = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(data.getTime()) || data.getDay() === 0) {
    mostrarToast('Escolha uma data valida de segunda a sabado.', 'aviso');
    return;
  }
  estado.dataISO = iso;
  agendamentoAtual.dataISO = iso;
  agendamentoAtual.dia = nlBookingFormatarData(iso);
  agendamentoAtual.horario = '';
  window.NLUX.selectedSlot = '';
  liberarHold(false);

  const input = document.getElementById('bookingCalendarDate');
  if (input) input.value = iso;
  const datas = gerarDatasAgendamentoNovo(iso);
  const strip = document.getElementById('bookingDateStrip') || document.querySelector('.booking-date-strip');
  if (strip) {
    strip.innerHTML = datas.map(item => `
      <button class="booking-date-card ${item.iso === estado.dataISO ? 'active' : ''} ${item.disabled ? 'disabled' : ''}" ${item.disabled ? 'disabled' : ''} onclick="selecionarDataAgendamentoNovo('${item.iso}')">
        <span>${item.semana}</span>
        <strong>${item.dia}</strong>
      </button>
    `).join('');
  }
  const slotArea = document.getElementById('bookingSlotArea');
  if (slotArea) slotArea.innerHTML = renderSlotsAgendamentoV2();
  document.getElementById('drConfirmPanel')?.classList.add('hidden');
}

function selecionarSlotAgendamentoNovo(dia, horario, botao) {
  document.querySelectorAll('.booking-slot').forEach(item => item.classList.remove('active'));
  botao?.classList.add('active');
  agendamentoAtual.dia = dia || nlBookingFormatarData(nlBookingState().dataISO);
  agendamentoAtual.horario = horario;
  window.NLUX.selectedSlot = horario;
  iniciarHold(10 * 60);
  const panel = document.getElementById('drConfirmPanel');
  const text = document.getElementById('drConfirmText');
  if (text) text.textContent = `${agendamentoAtual.medico} · ${agendamentoAtual.unidade} · ${agendamentoAtual.dia} às ${horario}`;
  panel?.classList.remove('hidden');
}

