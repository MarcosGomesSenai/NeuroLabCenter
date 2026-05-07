/* ============================================================
   NEUROLAB BOOKING GUIDE - sugestoes, CEP e calendario real
   ============================================================ */
function nlBookingSugestoesLista() {
  return [
    { label: 'Neurologia', detalhe: 'Consulta neurologica adulto' },
    { label: 'Cefaleia e enxaqueca', detalhe: 'Dor de cabeca, migranea e dor neuropatica' },
    { label: 'Sono e cognicao', detalhe: 'Insonia, memoria e Alzheimer' },
    { label: 'Neuropediatria', detalhe: 'Atendimento infantil e desenvolvimento' },
    { label: 'EEG', detalhe: 'Eletroencefalograma' },
    { label: 'Eletroneuromiografia', detalhe: 'ENMG e avaliacao neurofisiologica' },
    { label: 'Polissonografia', detalhe: 'Exame do sono' },
    ...NL_MEDICOS.map(medico => ({ label: medico.nome, detalhe: medico.especialidade }))
  ];
}

function nlBookingRenderSugestoes(termo = '') {
  const alvo = document.getElementById('bookingSpecialtySuggestions');
  if (!alvo) return;
  const texto = normalizarTexto(termo);
  const itens = nlBookingSugestoesLista()
    .filter(item => !texto || normalizarTexto(`${item.label} ${item.detalhe}`).includes(texto))
    .slice(0, 7);

  alvo.innerHTML = itens.map(item => `
    <button type="button" onmousedown="event.preventDefault(); selecionarSugestaoAgendamento('${item.label.replace(/'/g, "\\'")}')">
      <strong>${nlSafeText(item.label)}</strong>
      <span>${nlSafeText(item.detalhe)}</span>
    </button>
  `).join('') || '<small>Nenhuma opcao encontrada.</small>';
}

function mostrarSugestoesAgendamento() {
  const input = document.getElementById('drFiltroEspecialidade');
  const alvo = document.getElementById('bookingSpecialtySuggestions');
  if (!input || !alvo) return;
  nlBookingRenderSugestoes(input.value);
  alvo.classList.remove('hidden');
}

function filtrarSugestoesAgendamento(valor) {
  nlBookingRenderSugestoes(valor);
  document.getElementById('bookingSpecialtySuggestions')?.classList.remove('hidden');
}

function esconderSugestoesAgendamento() {
  setTimeout(() => document.getElementById('bookingSpecialtySuggestions')?.classList.add('hidden'), 120);
}

function selecionarSugestaoAgendamento(valor) {
  const estado = nlBookingState();
  const input = document.getElementById('drFiltroEspecialidade');
  estado.termo = valor;
  if (input) input.value = valor;
  document.getElementById('bookingSpecialtySuggestions')?.classList.add('hidden');
  estado.unidade = '';
  estado.medico = '';
  buscarAgendamentoNovo();
}

function nlBookingIsConvenio(plano) {
  const normal = normalizarTexto(plano || '');
  return normal && normal !== 'particular' && normal !== 'sus';
}

function nlBookingCoberturaAtual() {
  const plano = nlBookingState().plano || 'Particular';
  if (plano === 'Particular' || plano === 'SUS') return plano;
  return 'Convênio';
}

function selecionarCoberturaAgendamentoSimples(cobertura) {
  const estado = nlBookingState();
  if (estado.modo === 'online' && cobertura === 'SUS') {
    mostrarToast('Teleconsulta disponivel apenas nas modalidades Particular e Convenio.', 'aviso');
    return;
  }
  estado.plano = cobertura === 'Convênio'
    ? (nlBookingIsConvenio(estado.plano) ? estado.plano : 'Unimed')
    : cobertura;
  estado.unidade = estado.modo === 'online' ? 'Santo André - Centro' : '';
  estado.medico = '';
  buscarAgendamentoNovo();
}

function nlBookingPlanosConvenioOptions(selecionado) {
  const planos = NL_PLANOS
    .filter(plano => nlBookingState().modo !== 'online' || plano.servicos.includes('Teleconsulta'))
    .map(plano => plano.nome);
  return [...new Set(planos)].map(plano => `<option value="${nlSafeText(plano)}" ${plano === selecionado ? 'selected' : ''}>${nlSafeText(plano)}</option>`).join('');
}

function nlBookingCepPerfil(cep) {
  const digitos = somenteDigitos(cep);
  if (!digitos) return { label: 'Informe seu CEP para ordenar por proximidade.', preferencia: [] };
  if (digitos.startsWith('09')) return { label: 'Recomendadas para ABC Paulista', preferencia: ['Santo André', 'São Bernardo'] };
  if (digitos.startsWith('04')) return { label: 'Recomendadas para zona sul de São Paulo', preferencia: ['Moema', 'Paulista'] };
  if (digitos.startsWith('03')) return { label: 'Recomendadas para zona leste de São Paulo', preferencia: ['Tatuapé'] };
  if (digitos.startsWith('01')) return { label: 'Recomendadas para região central', preferencia: ['Paulista', 'Moema'] };
  return { label: 'Recomendadas por disponibilidade e distancia cadastrada', preferencia: [] };
}

function nlBookingDistanciaNumero(unidade) {
  const numero = parseFloat(String(unidade.distancia || '99').replace(',', '.'));
  return Number.isFinite(numero) ? numero : 99;
}

function nlBookingOrdenarUnidades(unidades, estado, tipo) {
  const cepInfo = nlBookingCepPerfil(estado.cep || '');
  const termo = normalizarTexto(estado.termo || '');
  return [...unidades].sort((a, b) => {
    const score = (unidade) => {
      const texto = normalizarTexto(`${unidade.nome} ${(unidade.recursos || []).join(' ')}`);
      const boostCep = cepInfo.preferencia.some(item => normalizarTexto(unidade.nome).includes(normalizarTexto(item))) ? -18 : 0;
      const boostEspecialidade = texto.includes(termo) || (tipo === 'EXAM' && unidade.modalidades.includes('EXAM')) ? -8 : 0;
      const boostTele = tipo === 'TELE' && unidade.modalidades.includes('TELE') ? -20 : 0;
      return nlBookingDistanciaNumero(unidade) + boostCep + boostEspecialidade + boostTele;
    };
    return score(a) - score(b);
  });
}

function buscarCepAgendamentoSimples() {
  const estado = nlBookingState();
  const input = document.getElementById('drFiltroCep');
  const cep = somenteDigitos(input?.value || '');
  if (cep.length < 8) {
    mostrarToast('Informe um CEP com 8 digitos para sugerirmos unidades proximas.', 'aviso');
    input?.focus();
    return;
  }
  estado.cep = input.value;
  estado.unidade = '';
  estado.medico = '';
  mostrarToast('Unidades reorganizadas por proximidade e especialidade.', 'sucesso', 2600);
  buscarAgendamentoNovo();
}

function abrirCalendarioAgendamento() {
  const input = document.getElementById('bookingCalendarDate');
  if (!input) return;
  input.focus();
  if (typeof input.showPicker === 'function') input.showPicker();
  else input.click();
}

function buscarAgendamentoNovo() {
  const estado = nlBookingState();
  estado.termo = (document.getElementById('drFiltroEspecialidade')?.value ?? estado.termo ?? '').trim();
  estado.cep = document.getElementById('drFiltroCep')?.value || estado.cep || '';
  estado.plano = document.getElementById('drFiltroPlano')?.value || estado.plano || 'Particular';
  estado.medico = document.getElementById('drFiltroMedico')?.value || estado.medico || '';
  estado.dataISO = document.getElementById('bookingCalendarDate')?.value || estado.dataISO || nlBookingMinDate();

  if (estado.modo === 'online' && nlCoberturaFromPlano(estado.plano) === 'SUS') {
    estado.plano = 'Particular';
    mostrarToast('Teleconsulta disponivel apenas nas modalidades Particular e Convenio.', 'aviso');
  }

  registrarBuscaRecente(estado.termo);
  const busca = nlBookingBuscaSimples(estado);
  busca.unidades = nlBookingOrdenarUnidades(busca.unidades, estado, busca.tipo);

  const unidade = busca.unidades.find(item => item.nome === estado.unidade) || busca.unidades[0];
  let medicos = busca.medicos;
  if (unidade && busca.tipo !== 'TELE') {
    medicos = medicos.filter(medico => medico.unidades.includes(unidade.nome));
    if (!medicos.length) medicos = busca.medicos;
  }
  const medico = medicos.find(item => item.nome === estado.medico) || medicos[0] || busca.medicos[0];

  estado.unidade = unidade?.nome || '';
  estado.medico = medico?.nome || '';

  agendamentoAtual = {
    tipoNome: nlBookingLabelTipo(busca.tipo),
    tipoCodigo: busca.tipo,
    cobertura: nlCoberturaFromPlano(estado.plano),
    convenio: nlBookingIsConvenio(estado.plano) ? estado.plano : '',
    unidade: unidade?.nome || '',
    endereco: unidade?.endereco || '',
    medico: medico?.nome || '',
    crm: medico?.crm || '',
    especialidade: medico?.especialidade || '',
    dataISO: estado.dataISO,
    dia: nlBookingFormatarData(estado.dataISO),
    horario: ''
  };

  desenharResultadoDrConsulta(medicos, busca.unidades, busca.tipo);
}

function desenharResultadoDrConsulta(medicos, unidades, tipoAtual = nlBookingTipoPorTermo(nlBookingState().termo, nlBookingState().modo)) {
  const card = document.querySelector('.nl-booking-v2');
  if (!card) return;

  const estado = nlBookingState();
  const datas = nlBookingDatasCurtas(estado.dataISO);
  const semResultado = !medicos.length || !unidades.length;
  const coberturaAtual = nlBookingCoberturaAtual();
  const cepInfo = nlBookingCepPerfil(estado.cep);

  card.innerHTML = `
    <div class="nl-dr-booking">
      <aside class="nl-dr-sidebar">
        <div class="nl-dr-tabs" role="tablist" aria-label="Modalidade">
          <button class="${estado.modo === 'presencial' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('presencial')">⌂ Presencial</button>
          <button class="${estado.modo === 'online' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('online')">▣ Online</button>
        </div>

        <div class="nl-dr-fields">
          <label for="drFiltroEspecialidade">Especialidade</label>
          <div class="nl-specialty-combo">
            <input id="drFiltroEspecialidade" class="form-control" value="${nlSafeText(estado.termo)}" placeholder="Digite especialidade, exame ou médico" autocomplete="off" onfocus="mostrarSugestoesAgendamento()" oninput="filtrarSugestoesAgendamento(this.value)" onblur="esconderSugestoesAgendamento()" onkeydown="if(event.key==='Enter') buscarAgendamentoNovo()">
            <div id="bookingSpecialtySuggestions" class="nl-dr-suggestions hidden"></div>
          </div>

          <label>Plano ou cobertura</label>
          <div class="nl-coverage-options">
            <button type="button" class="${coberturaAtual === 'Particular' ? 'active' : ''}" onclick="selecionarCoberturaAgendamentoSimples('Particular')">Particular</button>
            <button type="button" class="${coberturaAtual === 'Convênio' ? 'active' : ''}" onclick="selecionarCoberturaAgendamentoSimples('Convênio')">Convênio</button>
            <button type="button" class="${coberturaAtual === 'SUS' ? 'active' : ''}" ${estado.modo === 'online' ? 'disabled' : ''} onclick="selecionarCoberturaAgendamentoSimples('SUS')">SUS</button>
          </div>
          ${coberturaAtual === 'Convênio' ? `
            <select id="drFiltroPlano" class="form-select nl-plan-select" onchange="buscarAgendamentoNovo()">
              ${nlBookingPlanosConvenioOptions(estado.plano)}
            </select>
          ` : ''}

          <label for="drFiltroCep">Onde você quer ser atendido?</label>
          <div class="nl-cep-row">
            <input id="drFiltroCep" class="form-control" value="${nlSafeText(estado.cep || '')}" placeholder="Digite seu CEP" maxlength="9" oninput="mascararCep(this)" onkeydown="if(event.key==='Enter') buscarCepAgendamentoSimples()">
            <button type="button" class="btn btn-light" onclick="buscarCepAgendamentoSimples()">Buscar</button>
          </div>
          <small class="nl-cep-hint">${nlSafeText(cepInfo.label)}</small>

          <div class="nl-unit-recommendations">
            ${unidades.slice(0, 4).map((unidade, index) => `
              <button type="button" class="${unidade.nome === agendamentoAtual.unidade ? 'active' : ''}" onclick="selecionarUnidadeAgendamentoV2('${unidade.nome.replace(/'/g, "\\'")}')">
                <strong>${nlSafeText(unidade.nome)}</strong>
                <span>${index === 0 ? 'Recomendada · ' : ''}${nlSafeText(unidade.distancia)} · ${nlSafeText((unidade.recursos || ['Agenda disponível']).slice(0, 2).join(', '))}</span>
              </button>
            `).join('')}
          </div>

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
            <div class="nl-dr-calendar-wrap">
              <button type="button" class="nl-dr-calendar" onclick="abrirCalendarioAgendamento()">▦ ver calendário</button>
              <input id="bookingCalendarDate" class="nl-hidden-calendar" type="date" min="${nlBookingMinDate()}" max="${nlBookingMaxDate()}" value="${estado.dataISO}" onchange="selecionarDataAgendamentoNovo(this.value)">
            </div>
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
  nlBookingRenderSugestoes(estado.termo);
}

function selecionarUnidadeAgendamentoV2(nome) {
  const estado = nlBookingState();
  estado.unidade = nome;
  estado.medico = '';
  buscarAgendamentoNovo();
}

