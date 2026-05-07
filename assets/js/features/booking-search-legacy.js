function renderAgendamentoDrConsulta() {
  if (paginaArquivo() !== 'agendamento.html') return;
  const card = document.querySelector('.modal-agendamento-card');
  if (!card || card.dataset.drEnhanced === 'true') return;
  card.dataset.drEnhanced = 'true';
  card.classList.add('dr-booking-card');
  window.NLUX.drMode = window.NLUX.drMode || 'presencial';
  window.NLUX.drSearched = false;
  card.innerHTML = '';
  desenharBuscaDrConsulta();
}

function desenharBuscaDrConsulta() {
  const card = document.querySelector('.dr-booking-card');
  if (!card) return;
  const modo = window.NLUX.drMode || 'presencial';
  card.innerHTML = `
    <div class="dr-booking-title">Agende sua consulta</div>
    <div class="dr-search-card">
      <div class="dr-tabs">
        <button class="${modo === 'presencial' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('presencial')">Presencial</button>
        <button class="${modo === 'online' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('online')">Online</button>
      </div>
      <div class="dr-search-body">
        <label>Especialidade</label>
        <div class="dr-input-wrap">
          <span>⌕</span>
          <input id="drEspecialidadeBusca" value="" placeholder="Digite especialidade, exame ou médico..." />
        </div>
        <label>Plano ou cobertura</label>
        <select id="drPlanoBusca" class="dr-plan-select">${nlPlanoOptionsAgendamento(modo)}</select>
        <button class="dr-search-button" onclick="buscarAgendamentoNovo()">Buscar</button>
      </div>
    </div>
  `;
}

function selecionarModoAgendamentoNovo(modo) {
  window.NLUX.drMode = modo;
  if (window.NLUX.drSearched) {
    buscarAgendamentoNovo();
  } else {
    desenharBuscaDrConsulta();
  }
}

function nlPlanoOptionsAgendamento(modo, selecionado = 'Particular') {
  const planos = modo === 'online'
    ? ['Particular', ...NL_PLANOS.filter(plano => plano.servicos.includes('Teleconsulta')).map(plano => plano.nome)]
    : ['Particular', 'SUS', ...NL_PLANOS.map(plano => plano.nome)];
  return [...new Set(planos)].map(plano => `<option value="${nlSafeText(plano)}" ${plano === selecionado ? 'selected' : ''}>${nlSafeText(plano)}</option>`).join('');
}

function nlCoberturaFromPlano(plano) {
  if (plano === 'Particular' || plano === 'SUS') return plano;
  return NL_MEDICOS.flatMap(medico => medico.coberturas).find(cobertura => normalizarTexto(cobertura) === 'convenio') || 'Convênio';
}

function sincronizarFiltrosAgendamentoNovo() {
  const plano = document.getElementById('drFiltroPlano')?.value || document.getElementById('drPlanoBusca')?.value || agendamentoAtual.convenio || agendamentoAtual.cobertura || 'Particular';
  const unidade = NL_UNIDADES.find(item => item.nome === document.getElementById('drFiltroUnidade')?.value);
  const medico = NL_MEDICOS.find(item => item.nome === document.getElementById('drFiltroMedico')?.value);
  agendamentoAtual.cobertura = nlCoberturaFromPlano(plano);
  agendamentoAtual.convenio = normalizarTexto(agendamentoAtual.cobertura) === 'convenio' ? plano : '';
  if (unidade) {
    agendamentoAtual.unidade = unidade.nome;
    agendamentoAtual.endereco = unidade.endereco;
  }
  if (medico) {
    agendamentoAtual.medico = medico.nome;
    agendamentoAtual.crm = medico.crm;
    agendamentoAtual.especialidade = medico.especialidade;
  }
}

function buscarAgendamentoNovo() {
  const termo = normalizarTexto(document.getElementById('drEspecialidadeBusca')?.value || document.getElementById('drFiltroEspecialidade')?.value || '');
  const modo = window.NLUX.drMode || 'presencial';
  window.NLUX.drSearched = true;
  const tipo = modo === 'online' ? 'TELE' : 'CONS-ADULT';
  const planoSelecionado = document.getElementById('drPlanoBusca')?.value || document.getElementById('drFiltroPlano')?.value || 'Particular';
  const cobertura = nlCoberturaFromPlano(planoSelecionado);
  if (modo === 'online' && cobertura === 'SUS') {
    mostrarToast('Teleconsulta está disponível apenas para Particular e Convênio.', 'aviso');
    return;
  }
  const medicos = NL_MEDICOS.filter(medico => medico.tipos.includes(tipo) && medico.coberturas.includes(cobertura)).filter(medico => {
    const base = normalizarTexto(`${medico.especialidade} ${medico.nome}`);
    return !termo || base.includes(termo) || termo.includes('neuro') || termo.includes('consulta');
  });
  const medico = medicos[0] || NL_MEDICOS.find(item => item.tipos.includes(tipo) && item.coberturas.includes(cobertura)) || NL_MEDICOS[0];
  const unidades = NL_UNIDADES.filter(unidade =>
    unidade.modalidades.includes(tipo) &&
    unidade.coberturas.includes(cobertura) &&
    (normalizarTexto(cobertura) !== 'convenio' || unidade.convenios.includes(planoSelecionado))
  );
  const unidade = modo === 'online' ? (NL_UNIDADES.find(item => item.modalidades.includes('TELE')) || unidades[0]) : unidades[0];

  agendamentoAtual = {
    tipoNome: modo === 'online' ? 'Teleconsulta' : 'Consulta Neurológica',
    tipoCodigo: tipo,
    cobertura,
    convenio: normalizarTexto(cobertura) === 'convenio' ? planoSelecionado : '',
    unidade: unidade?.nome || '',
    endereco: unidade?.endereco || '',
    medico: medico.nome,
    crm: medico.crm,
    especialidade: medico.especialidade
  };

  desenharResultadoDrConsulta(medicos, unidades);
}

function desenharResultadoDrConsulta(medicos, unidades) {
  const card = document.querySelector('.dr-booking-card');
  if (!card) return;
  const modo = window.NLUX.drMode || 'presencial';
  const planoAtual = agendamentoAtual.convenio || agendamentoAtual.cobertura || 'Particular';
  const datas = gerarDatasAgendamentoNovo();
  card.innerHTML = `
    <div class="dr-results-layout">
      <aside class="dr-filter-card">
        <div class="dr-tabs compact">
          <button class="${modo === 'presencial' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('presencial')">Presencial</button>
          <button class="${modo === 'online' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('online')">Online</button>
        </div>
        <label>Especialidade</label>
        <select id="drFiltroEspecialidade" onchange="buscarAgendamentoNovo()"><option value="">Escolha a especialidade</option><option>Neurologia</option><option>Cefaleia e dor</option><option>Sono e cognição</option><option>Neuropediatria</option></select>
        <label>Plano ou cobertura</label>
        <select id="drFiltroPlano" onchange="buscarAgendamentoNovo()">${nlPlanoOptionsAgendamento(modo, planoAtual)}</select>
        <label>Onde voce quer ser atendido?</label>
        <select id="drFiltroUnidade" onchange="sincronizarFiltrosAgendamentoNovo()">${unidades.map(unidade => `<option ${unidade.nome === agendamentoAtual.unidade ? 'selected' : ''}>${nlSafeText(unidade.nome)}</option>`).join('')}</select>
        <button class="dr-location-button" type="button">Usar minha localização</button>
        <label>Profissional</label>
        <select id="drFiltroMedico" onchange="sincronizarFiltrosAgendamentoNovo()">${medicos.map(medico => `<option ${medico.nome === agendamentoAtual.medico ? 'selected' : ''}>${nlSafeText(medico.nome)}</option>`).join('')}</select>
        <button class="dr-search-button" onclick="buscarAgendamentoNovo()">Nova busca</button>
      </aside>
      <section class="dr-slots-card">
        <div class="dr-date-row">
          <button class="dr-arrow" type="button">‹</button>
          ${datas.map((data, index) => `<button class="dr-date ${index === 0 ? 'active' : ''}" onclick="selecionarDataAgendamentoNovo('${data.iso}', this)"><strong>${data.dia}</strong><span>${data.semana}</span></button>`).join('')}
          <button class="dr-arrow" type="button">›</button>
          <button class="dr-calendar-button" type="button">Ver calendário</button>
        </div>
        <div class="dr-doctor-line">
          <div class="doctor-photo small">${nlDoctorInitials(agendamentoAtual.medico)}</div>
          <div><strong>${nlSafeText(agendamentoAtual.medico)}</strong><span>${nlSafeText(agendamentoAtual.crm)} ? ${normalizarTexto(agendamentoAtual.cobertura) === 'convenio' ? nlSafeText(agendamentoAtual.convenio) : nlSafeText(agendamentoAtual.cobertura)}</span></div>
        </div>
        <div class="dr-unit-panel">
          <h3>${nlSafeText(agendamentoAtual.unidade)}</h3>
          <p>${nlSafeText(agendamentoAtual.endereco)}</p>
          <div class="dr-periods">
            <button onclick="selecionarSlotAgendamentoNovo('09/05', '08:30', this)">Manhã · 08:30</button>
            <button onclick="selecionarSlotAgendamentoNovo('09/05', '10:00', this)">Manhã · 10:00</button>
            <button onclick="selecionarSlotAgendamentoNovo('09/05', '14:30', this)">Tarde · 14:30</button>
            <button onclick="selecionarSlotAgendamentoNovo('09/05', '16:00', this)">Tarde · 16:00</button>
          </div>
        </div>
        <div class="dr-confirm-panel hidden" id="drConfirmPanel">
          <span id="drConfirmText"></span>
          <button class="btn btn-primary" onclick="confirmarAgendamentoNovo()">Confirmar horário</button>
        </div>
      </section>
    </div>
  `;
}

function gerarDatasAgendamentoNovo() {
  const semanas = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  return [7, 14, 28].map(offset => {
    const data = new Date();
    data.setDate(data.getDate() + offset);
    return {
      iso: data.toISOString().slice(0, 10),
      dia: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      semana: semanas[data.getDay()]
    };
  });
}

function selecionarDataAgendamentoNovo(iso, botao) {
  window.NLUX.selectedDateISO = iso;
  document.querySelectorAll('.dr-date').forEach(item => item.classList.remove('active'));
  botao?.classList.add('active');
}

function selecionarSlotAgendamentoNovo(dia, horario, botao) {
  document.querySelectorAll('.dr-periods button').forEach(item => item.classList.remove('active'));
  botao?.classList.add('active');
  agendamentoAtual.dia = dia;
  agendamentoAtual.horario = horario;
  iniciarHold(10 * 60);
  const panel = document.getElementById('drConfirmPanel');
  const text = document.getElementById('drConfirmText');
  if (text) text.textContent = `${agendamentoAtual.medico} · ${agendamentoAtual.unidade} · ${dia} às ${horario}`;
  panel?.classList.remove('hidden');
}

function confirmarAgendamentoNovo() {
  if (!agendamentoAtual.horario) {
    mostrarToast('Escolha um horário para confirmar.', 'aviso');
    return;
  }
  const usuario = lerJson(STORAGE_KEYS.usuarioAtual, null);
  const agendamentos = lerJson(STORAGE_KEYS.agendamentos, []);
  agendamentos.push({
    id: `AG-${Date.now()}`,
    status: 'CONFIRMADO',
    pacienteCpf: usuario?.cpf || 'visitante',
    pacienteNome: usuario?.nome || 'Paciente visitante',
    criadoEm: new Date().toISOString(),
    ...agendamentoAtual
  });
  salvarJson(STORAGE_KEYS.agendamentos, agendamentos);
  liberarHold(false);
  document.querySelector('.dr-slots-card')?.insertAdjacentHTML('beforeend', '<div class="dr-success">Agendamento confirmado. Você também pode acompanhar pela Área do Paciente.</div>');
  mostrarToast('Agendamento confirmado com sucesso.', 'sucesso');
}

