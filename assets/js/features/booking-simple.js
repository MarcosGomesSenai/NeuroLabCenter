/* ============================================================
   NEUROLAB BOOKING SIMPLE - modelo compacto estilo consulta
   ============================================================ */
function prepararPainelAcoesBootstrap() {
  document.getElementById('nlActionPanel')?.remove();
  document.querySelector('.nl-action-fab')?.remove();
}

function abrirPainelAcoesBootstrap() {}

function renderPainelAcoesBootstrap() {}

function nlBookingBuscaSimples(estado = nlBookingState()) {
  const termo = normalizarTexto(estado.termo || '');
  const tipo = nlBookingTipoPorTermo(estado.termo, estado.modo);
  const cobertura = nlCoberturaFromPlano(estado.plano || 'Particular');
  const termoGenerico = !termo || termo.includes('neuro') || termo.includes('consulta');

  let unidades = NL_UNIDADES.filter((unidade) => {
    const atendeTipo = unidade.modalidades.includes(tipo);
    const atendeCobertura = unidade.coberturas.includes(cobertura);
    const atendeConvenio = cobertura !== 'Convênio' || unidade.convenios.includes(estado.plano);
    const atendeModo = estado.modo !== 'online' || unidade.modalidades.includes('TELE');
    const texto = normalizarTexto(`${unidade.nome} ${unidade.endereco} ${(unidade.recursos || []).join(' ')}`);
    return atendeTipo && atendeCobertura && atendeConvenio && atendeModo && (termoGenerico || texto.includes(termo) || tipo === 'TELE');
  });

  let medicos = NL_MEDICOS.filter((medico) => {
    const atendeTipo = medico.tipos.includes(tipo);
    const atendeCobertura = medico.coberturas.includes(cobertura);
    const atendeModo = estado.modo !== 'online' || medico.tipos.includes('TELE');
    const texto = normalizarTexto(`${medico.nome} ${medico.especialidade} ${medico.crm}`);
    const atendeTermo = termoGenerico || texto.includes(termo) || (tipo === 'EXAM' && medico.tipos.includes('EXAM'));
    return atendeTipo && atendeCobertura && atendeModo && atendeTermo;
  });

  if (estado.unidade) {
    medicos = medicos.filter((medico) => tipo === 'TELE' || medico.unidades.includes(estado.unidade));
  }

  if (!unidades.length) {
    unidades = NL_UNIDADES.filter((unidade) => unidade.modalidades.includes(tipo) && unidade.coberturas.includes(cobertura));
  }

  if (!medicos.length) {
    medicos = NL_MEDICOS.filter((medico) => medico.tipos.includes(tipo) && medico.coberturas.includes(cobertura));
  }

  return { tipo, cobertura, unidades, medicos };
}

function nlBookingDatasCurtas(baseIso = nlBookingState().dataISO || nlBookingMinDate()) {
  const base = new Date(`${baseIso}T00:00:00`);
  const inicio = Number.isNaN(base.getTime()) ? new Date(`${nlBookingMinDate()}T00:00:00`) : base;
  const datas = [];
  let offset = 0;

  while (datas.length < 5 && offset < 21) {
    const data = new Date(inicio);
    data.setDate(inicio.getDate() + offset);
    offset += 1;
    if (data.getDay() === 0) continue;
    datas.push({
      iso: data.toISOString().slice(0, 10),
      dia: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      semana: data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
    });
  }

  return datas;
}

function nlBookingSugestoesOptions() {
  const base = [
    ...nlBookingEspecialidades().map(item => item.label),
    ...NL_MEDICOS.map(item => item.nome),
    ...NL_UNIDADES.map(item => item.nome),
    'EEG',
    'Eletroneuromiografia',
    'Polissonografia',
    'Enxaqueca',
    'Sono'
  ];
  return [...new Set(base)].map(item => `<option value="${nlSafeText(item)}"></option>`).join('');
}

function renderAgendamentoDrConsulta() {
  if (paginaArquivo() !== 'agendamento.html') return;
  const card = document.querySelector('.modal-agendamento-card');
  if (!card) return;

  card.dataset.bookingV2 = 'true';
  card.className = 'modal-card modal-agendamento-card dr-booking-card nl-booking-v2 nl-booking-simple';

  const titulo = document.querySelector('body.page-agendamento .section-title h2');
  const subtitulo = document.querySelector('body.page-agendamento .section-title p');
  if (titulo) titulo.textContent = 'Agende sua consulta';
  if (subtitulo) subtitulo.textContent = 'Escolha a modalidade, filtre por plano, unidade ou profissional e selecione um horário disponível.';

  const estado = nlBookingState();
  estado.modo = estado.modo || 'presencial';
  estado.termo = estado.termo === 'Neurologia' ? '' : (estado.termo || '');
  estado.plano = estado.plano || 'Particular';
  estado.dataISO = estado.dataISO || nlBookingMinDate();
  window.NLUX.drSearched = true;
  buscarAgendamentoNovo();
}

function desenharBuscaDrConsulta() {
  buscarAgendamentoNovo();
}

function selecionarModoAgendamentoNovo(modo) {
  const estado = nlBookingState();
  estado.modo = modo;
  if (modo === 'online' && nlCoberturaFromPlano(estado.plano) === 'SUS') {
    estado.plano = 'Particular';
    mostrarToast('Teleconsulta disponível apenas nas modalidades Particular e Convênio.', 'aviso');
  }
  estado.unidade = modo === 'online' ? 'Santo André - Centro' : '';
  estado.medico = '';
  buscarAgendamentoNovo();
}

function buscarAgendamentoNovo() {
  const estado = nlBookingState();
  estado.termo = (document.getElementById('drFiltroEspecialidade')?.value ?? document.getElementById('drEspecialidadeBusca')?.value ?? estado.termo ?? '').trim();
  estado.plano = document.getElementById('drFiltroPlano')?.value || document.getElementById('drPlanoBusca')?.value || estado.plano || 'Particular';
  estado.unidade = document.getElementById('drFiltroUnidade')?.value || estado.unidade || '';
  estado.medico = document.getElementById('drFiltroMedico')?.value || estado.medico || '';
  estado.dataISO = document.getElementById('bookingCalendarDate')?.value || estado.dataISO || nlBookingMinDate();

  if (estado.modo === 'online' && nlCoberturaFromPlano(estado.plano) === 'SUS') {
    estado.plano = 'Particular';
    mostrarToast('Teleconsulta disponível apenas nas modalidades Particular e Convênio.', 'aviso');
  }

  registrarBuscaRecente(estado.termo);
  const busca = nlBookingBuscaSimples(estado);
  const unidade = busca.unidades.find(item => item.nome === estado.unidade) || busca.unidades[0];
  const medico = busca.medicos.find(item => item.nome === estado.medico) || busca.medicos[0];

  estado.unidade = unidade?.nome || '';
  estado.medico = medico?.nome || '';

  agendamentoAtual = {
    tipoNome: nlBookingLabelTipo(busca.tipo),
    tipoCodigo: busca.tipo,
    cobertura: busca.cobertura,
    convenio: busca.cobertura === 'Convênio' ? estado.plano : '',
    unidade: unidade?.nome || '',
    endereco: unidade?.endereco || '',
    medico: medico?.nome || '',
    crm: medico?.crm || '',
    especialidade: medico?.especialidade || '',
    dataISO: estado.dataISO,
    dia: nlBookingFormatarData(estado.dataISO),
    horario: ''
  };

  desenharResultadoDrConsulta(busca.medicos, busca.unidades, busca.tipo);
}

function desenharResultadoDrConsulta(medicos, unidades, tipoAtual = nlBookingTipoPorTermo(nlBookingState().termo, nlBookingState().modo)) {
  const card = document.querySelector('.nl-booking-v2');
  if (!card) return;

  const estado = nlBookingState();
  const datas = nlBookingDatasCurtas(estado.dataISO);
  const semResultado = !medicos.length || !unidades.length;

  card.innerHTML = `
    <div class="nl-dr-booking">
      <aside class="nl-dr-sidebar">
        <div class="nl-dr-tabs" role="tablist" aria-label="Modalidade">
          <button class="${estado.modo === 'presencial' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('presencial')">⌂ Presencial</button>
          <button class="${estado.modo === 'online' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('online')">▣ Online</button>
        </div>

        <div class="nl-dr-fields">
          <label for="drFiltroEspecialidade">Especialidade</label>
          <input id="drFiltroEspecialidade" class="form-control" list="bookingSugestoes" value="${nlSafeText(estado.termo)}" placeholder="Digite especialidade, exame ou médico" onkeydown="if(event.key==='Enter') buscarAgendamentoNovo()">
          <datalist id="bookingSugestoes">${nlBookingSugestoesOptions()}</datalist>

          <label for="drFiltroPlano">Plano ou cobertura</label>
          <select id="drFiltroPlano" class="form-select" onchange="buscarAgendamentoNovo()">${nlPlanoOptionsAgendamento(estado.modo, estado.plano)}</select>

          <label for="drFiltroUnidade">Onde você quer ser atendido?</label>
          <select id="drFiltroUnidade" class="form-select" onchange="selecionarUnidadeAgendamentoV2(this.value)">
            ${unidades.map(unidade => `<option value="${nlSafeText(unidade.nome)}" ${unidade.nome === agendamentoAtual.unidade ? 'selected' : ''}>${nlSafeText(unidade.nome)}</option>`).join('')}
          </select>

          <button type="button" class="nl-dr-location" onclick="mostrarToast('Usamos sua localização para priorizar as unidades mais próximas.', 'info')">● Usar minha localização</button>

          <label for="drFiltroMedico">Profissional</label>
          <select id="drFiltroMedico" class="form-select" onchange="selecionarMedicoAgendamentoV2(this.value)">
            ${medicos.map(medico => `<option value="${nlSafeText(medico.nome)}" ${medico.nome === agendamentoAtual.medico ? 'selected' : ''}>${nlSafeText(medico.nome)}</option>`).join('')}
          </select>

          <button class="btn btn-primary nl-dr-search" onclick="buscarAgendamentoNovo()">⌕ Nova busca</button>
        </div>
      </aside>

      <main class="nl-dr-result">
        ${semResultado ? nlBookingEmptyState() : `
          <div class="nl-dr-datebar">
            <button type="button" class="nl-dr-arrow" onclick="mudarDatasAgendamentoSimples(-3)" aria-label="Datas anteriores">‹</button>
            <div class="nl-dr-date-list" id="bookingDateStrip">
              ${datas.map(data => `
                <button class="nl-dr-date ${data.iso === estado.dataISO ? 'active' : ''}" onclick="selecionarDataAgendamentoNovo('${data.iso}')">
                  <strong>${data.dia}</strong>
                  <span>${data.semana}</span>
                </button>
              `).join('')}
            </div>
            <button type="button" class="nl-dr-arrow" onclick="mudarDatasAgendamentoSimples(3)" aria-label="Próximas datas">›</button>
            <label class="nl-dr-calendar">
              <span>▦ ver calendário</span>
              <input id="bookingCalendarDate" type="date" min="${nlBookingMinDate()}" max="${nlBookingMaxDate()}" value="${estado.dataISO}" onchange="selecionarDataAgendamentoNovo(this.value)">
            </label>
          </div>

          <div class="nl-dr-doctor">
            <span class="doctor-photo small">${nlDoctorInitials(agendamentoAtual.medico)}</span>
            <div>
              <strong id="bookingSummaryTitle">${nlSafeText(agendamentoAtual.medico)}</strong>
              <small>${nlSafeText(agendamentoAtual.crm)} · ${nlSafeText(agendamentoAtual.especialidade)}</small>
            </div>
          </div>

          <section class="nl-dr-unit-card">
            <div>
              <h3 id="bookingSummaryMeta">${nlSafeText(agendamentoAtual.unidade)}</h3>
              <p>${nlSafeText(agendamentoAtual.endereco)}</p>
              <span>${nlSafeText(agendamentoAtual.convenio || agendamentoAtual.cobertura)} · ${nlSafeText(nlBookingLabelTipo(tipoAtual))}</span>
            </div>
            <div class="nl-dr-slots" id="bookingSlotArea">${renderSlotsAgendamentoV2()}</div>
          </section>

          <section class="nl-dr-confirm hidden" id="drConfirmPanel">
            <span id="drConfirmText"></span>
            <button class="btn btn-primary" onclick="confirmarAgendamentoNovo()">Confirmar</button>
          </section>
        `}
      </main>
    </div>
  `;
}

function renderSlotsAgendamentoV2() {
  const estado = nlBookingState();
  const tipo = agendamentoAtual.tipoCodigo || nlBookingTipoPorTermo(estado.termo, estado.modo);
  const cobertura = agendamentoAtual.cobertura || nlCoberturaFromPlano(estado.plano);
  const manha = tipo === 'EXAM' ? ['07:30', '08:20', '09:10', '10:40'] : ['08:00', '09:00', '10:30', '11:30'];
  const tarde = tipo === 'TELE' ? ['14:00', '15:00', '16:30', '17:30'] : ['13:30', '14:30', '15:40', '16:50'];
  const sus = ['07:00', '08:00', '09:00', '10:00'];
  const grupos = cobertura === 'SUS'
    ? [{ label: 'Manhã', slots: sus }]
    : [{ label: 'Manhã', slots: manha }, { label: 'Tarde', slots: tarde }];

  return grupos.map(grupo => `
    <div class="booking-slot-group">
      <strong>${grupo.label}</strong>
      <div>
        ${grupo.slots.map((slot, index) => {
          const ocupado = cobertura === 'SUS' && index === 2;
          return `<button class="booking-slot ${window.NLUX.selectedSlot === slot ? 'active' : ''}" ${ocupado ? 'disabled' : ''} onclick="selecionarSlotAgendamentoNovo('${agendamentoAtual.dia}', '${slot}', this)">${slot}${ocupado ? '<small>ocupado</small>' : ''}</button>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function mudarDatasAgendamentoSimples(delta) {
  const estado = nlBookingState();
  const data = new Date(`${estado.dataISO || nlBookingMinDate()}T00:00:00`);
  data.setDate(data.getDate() + delta);
  const min = new Date(`${nlBookingMinDate()}T00:00:00`);
  if (data < min) data.setTime(min.getTime());
  selecionarDataAgendamentoNovo(data.toISOString().slice(0, 10));
}

function selecionarUnidadeAgendamentoV2(nome) {
  const estado = nlBookingState();
  estado.unidade = nome;
  estado.medico = '';
  buscarAgendamentoNovo();
}

function selecionarMedicoAgendamentoV2(nome) {
  const estado = nlBookingState();
  estado.medico = nome;
  buscarAgendamentoNovo();
}

function selecionarDataAgendamentoNovo(iso) {
  const estado = nlBookingState();
  const data = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(data.getTime()) || data.getDay() === 0) {
    mostrarToast('Escolha uma data de segunda a sábado.', 'aviso');
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

  const strip = document.getElementById('bookingDateStrip');
  if (strip) {
    strip.innerHTML = nlBookingDatasCurtas(iso).map(dataItem => `
      <button class="nl-dr-date ${dataItem.iso === estado.dataISO ? 'active' : ''}" onclick="selecionarDataAgendamentoNovo('${dataItem.iso}')">
        <strong>${dataItem.dia}</strong>
        <span>${dataItem.semana}</span>
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

