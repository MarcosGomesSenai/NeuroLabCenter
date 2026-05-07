/* ============================================================
   AGENDAMENTO V2 - busca real, calendario e layout responsivo
   ============================================================ */
function nlBookingEspecialidades() {
  return [
    { label: 'Neurologia', termo: 'neurologia consulta neuro' },
    { label: 'Cefaleia e enxaqueca', termo: 'cefaleia enxaqueca dor cabeca' },
    { label: 'Sono e cognição', termo: 'sono cognicao memoria insonia' },
    { label: 'Neuropediatria', termo: 'neuropediatria infantil crianca' },
    { label: 'Exames neurológicos', termo: 'exame eeg enmg polissonografia diagnostico' }
  ];
}

function nlBookingTipoPorTermo(termo, modo) {
  const texto = normalizarTexto(termo);
  if (modo === 'online') return 'TELE';
  if (texto.includes('exame') || texto.includes('eeg') || texto.includes('enmg') || texto.includes('polissonografia')) return 'EXAM';
  if (texto.includes('infantil') || texto.includes('pediatria') || texto.includes('crianca')) return 'CONS-INF';
  return 'CONS-ADULT';
}

function nlBookingLabelTipo(tipo) {
  const mapa = {
    TELE: 'Teleconsulta',
    EXAM: 'Exame Diagnóstico',
    'CONS-INF': 'Consulta Neurológica Infantil',
    'CONS-ADULT': 'Consulta Neurológica'
  };
  return mapa[tipo] || 'Consulta Neurológica';
}

function nlBookingState() {
  if (!window.NLUX.booking) {
    const _urlParams = new URLSearchParams(window.location.search);
    const _modoURL = _urlParams.get('modo') === 'online' ? 'online' : 'presencial';
    window.NLUX.booking = {
      modo: _modoURL,
      termo: '',
      plano: 'Particular',
      unidade: _modoURL === 'online' ? 'Santo André - Centro' : '',
      medico: '',
      dataISO: ''
    };
  }
  return window.NLUX.booking;
}

function nlBookingMinDate() {
  const data = new Date();
  data.setDate(data.getDate() + 1);
  return data.toISOString().slice(0, 10);
}

function nlBookingMaxDate() {
  const data = new Date();
  data.setDate(data.getDate() + 90);
  return data.toISOString().slice(0, 10);
}

function nlBookingFormatarData(iso, options = { weekday: 'short', day: '2-digit', month: 'short' }) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', options);
}

function nlBookingBusca(estado = nlBookingState()) {
  const termo = normalizarTexto(estado.termo || '');
  const tipo = nlBookingTipoPorTermo(estado.termo, estado.modo);
  const cobertura = nlCoberturaFromPlano(estado.plano || 'Particular');
  const termoGenerico = !termo || termo.includes('neuro') || termo.includes('consulta');

  const unidades = NL_UNIDADES.filter(unidade => {
    const atendeTipo = unidade.modalidades.includes(tipo);
    const atendeCobertura = unidade.coberturas.includes(cobertura);
    const atendeConvenio = normalizarTexto(cobertura) !== 'convenio' || unidade.convenios.includes(estado.plano);
    const atendeModo = estado.modo !== 'online' || unidade.modalidades.includes('TELE');
    const busca = normalizarTexto(`${unidade.nome} ${unidade.endereco} ${unidade.recursos?.join(' ') || ''}`);
    return atendeTipo && atendeCobertura && atendeConvenio && atendeModo && (!estado.unidade || unidade.nome === estado.unidade || busca.includes(termo) || termoGenerico || tipo === 'TELE');
  });

  const unidadeNomes = new Set(unidades.map(unidade => unidade.nome));
  const medicos = NL_MEDICOS.filter(medico => {
    const atendeTipo = medico.tipos.includes(tipo);
    const atendeCobertura = medico.coberturas.includes(cobertura);
    const atendeUnidade = !unidadeNomes.size || medico.unidades.some(unidade => unidadeNomes.has(unidade)) || tipo === 'TELE';
    const busca = normalizarTexto(`${medico.nome} ${medico.especialidade} ${medico.crm}`);
    const atendeTermo = termoGenerico || busca.includes(termo) || (tipo === 'EXAM' && medico.tipos.includes('EXAM'));
    return atendeTipo && atendeCobertura && atendeUnidade && atendeTermo;
  });

  return { tipo, cobertura, unidades, medicos };
}

function renderAgendamentoDrConsulta() {
  if (paginaArquivo() !== 'agendamento.html') return;
  const card = document.querySelector('.modal-agendamento-card');
  if (!card || card.dataset.bookingV2 === 'true') return;
  card.dataset.bookingV2 = 'true';
  card.className = 'modal-card modal-agendamento-card dr-booking-card nl-booking-v2';
  const estado = nlBookingState();
  estado.dataISO = estado.dataISO || nlBookingMinDate();
  desenharBuscaDrConsulta();
}

function desenharBuscaDrConsulta() {
  const card = document.querySelector('.nl-booking-v2');
  if (!card) return;
  const estado = nlBookingState();
  card.innerHTML = `
    <section class="booking-hero-panel">
      <div>
        <span class="badge text-bg-info">Agendamento NeuroLab</span>
        <h1>Encontre consulta, exame ou teleconsulta em poucos cliques.</h1>
        <p>Pesquise por especialidade, médico, exame, unidade ou plano. Depois escolha a data diretamente no calendário.</p>
      </div>
      <div class="booking-trust">
        <strong>Hold de 10 min</strong>
        <span>O horário fica reservado enquanto você confirma.</span>
      </div>
    </section>
    <section class="booking-search-panel">
      <div class="booking-mode" role="tablist" aria-label="Modalidade">
        <button class="${estado.modo === 'presencial' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('presencial')">Presencial</button>
        <button class="${estado.modo === 'online' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('online')">Online</button>
      </div>
      <div class="booking-search-grid">
        <div class="field-main">
          <label for="drEspecialidadeBusca">O que você precisa?</label>
          <div class="booking-input-icon">
            <span>⌕</span>
            <input id="drEspecialidadeBusca" class="form-control" value="${nlSafeText(estado.termo)}" placeholder="Digite especialidade, exame ou médico..." onkeydown="if(event.key==='Enter') buscarAgendamentoNovo()">
          </div>
        </div>
        <div>
          <label for="drPlanoBusca">Plano ou cobertura</label>
          <select id="drPlanoBusca" class="form-select">${nlPlanoOptionsAgendamento(estado.modo, estado.plano)}</select>
        </div>
        <button class="btn btn-primary booking-search-btn" onclick="buscarAgendamentoNovo()">Buscar horários</button>
      </div>
      <div class="booking-quick-chips">
        ${nlBookingEspecialidades().map(item => `<button onclick="document.getElementById('drEspecialidadeBusca').value='${item.label}'; buscarAgendamentoNovo()">${item.label}</button>`).join('')}
      </div>
    </section>
  `;
}

function selecionarModoAgendamentoNovo(modo) {
  const estado = nlBookingState();
  estado.modo = modo;
  if (modo === 'online' && estado.plano === 'SUS') estado.plano = 'Particular';
  estado.dataISO = estado.dataISO || nlBookingMinDate();
  if (window.NLUX.drSearched) buscarAgendamentoNovo();
  else desenharBuscaDrConsulta();
}

function buscarAgendamentoNovo() {
  const estado = nlBookingState();
  estado.termo = (document.getElementById('drEspecialidadeBusca')?.value ?? document.getElementById('drFiltroEspecialidade')?.value ?? estado.termo ?? '').trim();
  estado.plano = document.getElementById('drPlanoBusca')?.value || document.getElementById('drFiltroPlano')?.value || estado.plano || 'Particular';
  estado.unidade = document.getElementById('drFiltroUnidade')?.value || document.querySelector('.booking-unit-card.active')?.dataset.unit || estado.unidade || '';
  estado.medico = document.getElementById('drFiltroMedico')?.value || document.querySelector('.booking-doctor-card.active')?.dataset.doctor || estado.medico || '';
  estado.dataISO = document.getElementById('bookingCalendarDate')?.value || estado.dataISO || nlBookingMinDate();
  window.NLUX.drSearched = true;
  registrarBuscaRecente(estado.termo);

  if (estado.modo === 'online' && nlCoberturaFromPlano(estado.plano) === 'SUS') {
    mostrarToast('Teleconsulta disponível apenas para Particular e Convênio.', 'aviso');
    estado.plano = 'Particular';
  }

  const busca = nlBookingBusca(estado);
  const unidade = busca.unidades.find(item => item.nome === estado.unidade) || busca.unidades[0];
  const medico = busca.medicos.find(item => item.nome === estado.medico) || busca.medicos[0];

  agendamentoAtual = {
    tipoNome: nlBookingLabelTipo(busca.tipo),
    tipoCodigo: busca.tipo,
    cobertura: busca.cobertura,
    convenio: normalizarTexto(busca.cobertura) === 'convenio' ? estado.plano : '',
    unidade: unidade?.nome || '',
    endereco: unidade?.endereco || '',
    medico: medico?.nome || '',
    crm: medico?.crm || '',
    especialidade: medico?.especialidade || '',
    dataISO: estado.dataISO,
    dia: nlBookingFormatarData(estado.dataISO)
  };

  desenharResultadoDrConsulta(busca.medicos, busca.unidades, busca.tipo);
}

function desenharResultadoDrConsulta(medicos, unidades, tipoAtual = nlBookingTipoPorTermo(nlBookingState().termo, nlBookingState().modo)) {
  const card = document.querySelector('.nl-booking-v2');
  if (!card) return;
  const estado = nlBookingState();
  const planoAtual = estado.plano || 'Particular';
  const datas = gerarDatasAgendamentoNovo(estado.dataISO);
  const semResultado = !medicos.length || !unidades.length;

  card.innerHTML = `
    <div class="booking-shell">
      <aside class="booking-filter-panel">
        <div class="booking-mode compact" role="tablist" aria-label="Modalidade">
          <button class="${estado.modo === 'presencial' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('presencial')">Presencial</button>
          <button class="${estado.modo === 'online' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('online')">Online</button>
        </div>
        <label>Busca</label>
        <input id="drFiltroEspecialidade" class="form-control" value="${nlSafeText(estado.termo)}" onkeydown="if(event.key==='Enter') buscarAgendamentoNovo()">
        <label>Plano ou cobertura</label>
        <select id="drFiltroPlano" class="form-select" onchange="buscarAgendamentoNovo()">${nlPlanoOptionsAgendamento(estado.modo, planoAtual)}</select>
        <label>Unidade</label>
        <select id="drFiltroUnidade" class="form-select" onchange="selecionarUnidadeAgendamentoV2(this.value)">
          ${unidades.map(unidade => `<option value="${nlSafeText(unidade.nome)}" ${unidade.nome === agendamentoAtual.unidade ? 'selected' : ''}>${nlSafeText(unidade.nome)}</option>`).join('')}
        </select>
        <label>Médico</label>
        <select id="drFiltroMedico" class="form-select" onchange="selecionarMedicoAgendamentoV2(this.value)">
          ${medicos.map(medico => `<option value="${nlSafeText(medico.nome)}" ${medico.nome === agendamentoAtual.medico ? 'selected' : ''}>${nlSafeText(medico.nome)}</option>`).join('')}
        </select>
        <button class="btn btn-primary w-100 mt-3" onclick="buscarAgendamentoNovo()">Atualizar busca</button>
        <button class="btn btn-light w-100 mt-2" onclick="window.NLUX.drSearched=false; desenharBuscaDrConsulta()">Nova pesquisa</button>
      </aside>
      <main class="booking-results-panel">
        ${semResultado ? nlBookingEmptyState() : `
          <section class="booking-result-summary">
            <div>
              <span class="badge text-bg-info">${nlSafeText(nlBookingLabelTipo(tipoAtual))}</span>
              <h2>${nlSafeText(agendamentoAtual.medico || 'Escolha um profissional')}</h2>
              <p>${nlSafeText(agendamentoAtual.unidade || 'Selecione uma unidade')} · ${nlSafeText(planoAtual)}</p>
            </div>
            <div class="booking-summary-kpi"><strong>${medicos.length}</strong><span>profissionais</span></div>
            <div class="booking-summary-kpi"><strong>${unidades.length}</strong><span>unidades</span></div>
          </section>
          <section class="booking-picker-grid">
            <div>
              <div class="booking-section-title">Unidades disponíveis</div>
              <div class="booking-unit-list">
                ${unidades.map(unidade => `
                  <button class="booking-unit-card ${unidade.nome === agendamentoAtual.unidade ? 'active' : ''}" data-unit="${nlSafeText(unidade.nome)}" onclick="selecionarUnidadeAgendamentoV2('${unidade.nome.replace(/'/g, "\\'")}')">
                    <strong>${nlSafeText(unidade.nome)}</strong>
                    <span>${nlSafeText(unidade.endereco)}</span>
                    <small>${nlSafeText(unidade.distancia)} · ${unidade.coberturas.join(', ')}</small>
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
                    <span><strong>${nlSafeText(medico.nome)}</strong><small>${nlSafeText(medico.crm)} · ${nlSafeText(medico.especialidade)}</small></span>
                    <em>${medico.rating.toFixed(1)}</em>
                  </button>
                `).join('')}
              </div>
            </div>
          </section>
          <section class="booking-calendar-panel">
            <div class="booking-calendar-head">
              <div>
                <div class="booking-section-title">Calendário e horários</div>
                <p>Escolha uma data nos próximos 90 dias. Domingos ficam bloqueados.</p>
              </div>
              <input id="bookingCalendarDate" class="form-control" type="date" min="${nlBookingMinDate()}" max="${nlBookingMaxDate()}" value="${estado.dataISO}" onchange="selecionarDataAgendamentoNovo(this.value)">
            </div>
            <div class="booking-date-strip">
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
              <strong>Horário selecionado</strong>
              <span id="drConfirmText"></span>
            </div>
            <button class="btn btn-primary" onclick="confirmarAgendamentoNovo()">Confirmar agendamento</button>
          </section>
        `}
      </main>
    </div>
  `;
}

function nlBookingEmptyState() {
  return `
    <section class="booking-empty-state">
      <h2>Nenhum horário encontrado com esses filtros.</h2>
      <p>Digite uma especialidade, exame, médico ou altere a modalidade para Online.</p>
      <div class="booking-quick-chips justify-content-center">
        ${nlBookingEspecialidades().map(item => `<button onclick="document.getElementById('drFiltroEspecialidade').value='${item.label}'; buscarAgendamentoNovo()">${item.label}</button>`).join('')}
      </div>
      <button class="btn btn-primary mt-3" onclick="window.NLUX.drSearched=false; desenharBuscaDrConsulta()">Voltar para busca inicial</button>
    </section>
  `;
}

function gerarDatasAgendamentoNovo(baseIso = nlBookingState().dataISO || nlBookingMinDate()) {
  const base = new Date(`${baseIso}T00:00:00`);
  const inicio = Number.isNaN(base.getTime()) ? new Date(`${nlBookingMinDate()}T00:00:00`) : base;
  return Array.from({ length: 10 }, (_, index) => {
    const data = new Date(inicio);
    data.setDate(inicio.getDate() + index);
    const iso = data.toISOString().slice(0, 10);
    return {
      iso,
      disabled: data.getDay() === 0,
      dia: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      semana: data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
    };
  });
}

function selecionarUnidadeAgendamentoV2(nome) {
  const estado = nlBookingState();
  estado.unidade = nome;
  document.querySelectorAll('.booking-unit-card').forEach(card => card.classList.toggle('active', card.dataset.unit === nome));
  const select = document.getElementById('drFiltroUnidade');
  if (select) select.value = nome;
  const unidade = NL_UNIDADES.find(item => item.nome === nome);
  if (unidade) {
    agendamentoAtual.unidade = unidade.nome;
    agendamentoAtual.endereco = unidade.endereco;
  }
  buscarAgendamentoNovo();
}

function selecionarMedicoAgendamentoV2(nome) {
  const estado = nlBookingState();
  estado.medico = nome;
  document.querySelectorAll('.booking-doctor-card').forEach(card => card.classList.toggle('active', card.dataset.doctor === nome));
  const select = document.getElementById('drFiltroMedico');
  if (select) select.value = nome;
  const medico = NL_MEDICOS.find(item => item.nome === nome);
  if (medico) {
    agendamentoAtual.medico = medico.nome;
    agendamentoAtual.crm = medico.crm;
    agendamentoAtual.especialidade = medico.especialidade;
  }
  buscarAgendamentoNovo();
}

function selecionarDataAgendamentoNovo(iso) {
  const estado = nlBookingState();
  const data = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(data.getTime()) || data.getDay() === 0) {
    mostrarToast('Escolha uma data válida de segunda a sábado.', 'aviso');
    return;
  }
  estado.dataISO = iso;
  agendamentoAtual.dataISO = iso;
  agendamentoAtual.dia = nlBookingFormatarData(iso);
  agendamentoAtual.horario = '';
  window.NLUX.selectedSlot = '';
  buscarAgendamentoNovo();
}

function renderSlotsAgendamentoV2() {
  const estado = nlBookingState();
  const tipo = agendamentoAtual.tipoCodigo || nlBookingTipoPorTermo(estado.termo, estado.modo);
  const cobertura = agendamentoAtual.cobertura || nlCoberturaFromPlano(estado.plano);
  const turnoManha = tipo === 'EXAM' ? ['07:30', '08:20', '09:10', '10:40'] : ['08:00', '09:00', '10:30', '11:30'];
  const turnoTarde = tipo === 'TELE' ? ['14:00', '15:00', '16:30', '17:30'] : ['13:30', '14:30', '15:40', '16:50'];
  const turnoSus = ['07:00', '08:00', '09:00', '10:00'];
  const grupos = cobertura === 'SUS'
    ? [{ label: 'Turno SUS', slots: turnoSus }]
    : [{ label: 'Manhã', slots: turnoManha }, { label: 'Tarde', slots: turnoTarde }];

  return grupos.map(grupo => `
    <div class="booking-slot-group">
      <strong>${grupo.label}</strong>
      <div>
        ${grupo.slots.map((slot, index) => {
          const ocupado = index === 2 && cobertura === 'SUS';
          return `<button class="booking-slot ${window.NLUX.selectedSlot === slot ? 'active' : ''}" ${ocupado ? 'disabled' : ''} onclick="selecionarSlotAgendamentoNovo('${agendamentoAtual.dia}', '${slot}', this)">${slot}${ocupado ? '<small>ocupado</small>' : ''}</button>`;
        }).join('')}
      </div>
    </div>
  `).join('');
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
  panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function confirmarAgendamentoNovo() {
  if (!agendamentoAtual.medico || !agendamentoAtual.unidade || !agendamentoAtual.horario) {
    mostrarToast('Escolha unidade, médico, data e horário para confirmar.', 'aviso');
    return;
  }
  const usuario = lerJson(STORAGE_KEYS.usuarioAtual, null);
  const agendamentos = lerJson(STORAGE_KEYS.agendamentos, []);
  const registro = {
    id: `AG-${Date.now()}`,
    status: 'CONFIRMADO',
    pacienteCpf: usuario?.cpf || 'visitante',
    pacienteNome: usuario?.nome || 'Paciente visitante',
    criadoEm: new Date().toISOString(),
    ...agendamentoAtual
  };
  agendamentos.push(registro);
  salvarJson(STORAGE_KEYS.agendamentos, agendamentos);
  liberarHold(false);
  const card = document.querySelector('.nl-booking-v2');
  if (card) {
    card.innerHTML = `
      <section class="booking-success-panel">
        <div class="sucesso-icon">✓</div>
        <h2>Agendamento confirmado</h2>
        <p>Você receberá a confirmação pelos canais cadastrados. O atendimento também aparecerá na Área do Paciente.</p>
        <div class="resumo-agendamento">${nlResumoBookingHtml(registro)}</div>
        <div class="booking-success-actions">
          <a class="btn btn-primary" href="area-paciente.html">Abrir Área do Paciente</a>
          <button class="btn btn-light" onclick="window.NLUX.drSearched=false; agendamentoAtual={}; desenharBuscaDrConsulta()">Novo agendamento</button>
        </div>
      </section>
    `;
  }
  mostrarToast('Agendamento confirmado com sucesso.', 'sucesso');
}

function nlResumoBookingHtml(dados) {
  return `
    <div class="resumo-row"><span class="resumo-label">Atendimento</span><span class="resumo-val">${nlSafeText(dados.tipoNome)}</span></div>
    <div class="resumo-row"><span class="resumo-label">Médico</span><span class="resumo-val">${nlSafeText(dados.medico)} · ${nlSafeText(dados.crm)}</span></div>
    <div class="resumo-row"><span class="resumo-label">Unidade</span><span class="resumo-val">${nlSafeText(dados.unidade)}</span></div>
    <div class="resumo-row"><span class="resumo-label">Data</span><span class="resumo-val">${nlSafeText(dados.dia)} às ${nlSafeText(dados.horario)}</span></div>
    <div class="resumo-row"><span class="resumo-label">Cobertura</span><span class="resumo-val">${nlSafeText(dados.convenio || dados.cobertura)}</span></div>
  `;
}

