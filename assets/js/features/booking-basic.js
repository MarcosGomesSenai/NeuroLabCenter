function buscarSite() {
  const termo = normalizarTexto(document.getElementById('busca')?.value || '');
  if (!termo) {
    alert('Digite algo para buscar. Ex: enxaqueca, EEG, unidade, convênio ou teleconsulta.');
    return;
  }
  registrarBuscaRecente(document.getElementById('busca')?.value || termo);
  if (termo.includes('convenio') || termo.includes('plano')) return navegarPara('convenios.html');
  if (termo.includes('sobre') || termo.includes('clinica')) return navegarPara('sobre.html');
  if (termo.includes('online') || termo.includes('chat') || termo.includes('teleconsulta')) return navegarPara('teleconsulta.html');
  if (termo.includes('exame') || termo.includes('eeg') || termo.includes('eletro') || termo.includes('polissonografia')) return navegarPara('exames.html');
  if (termo.includes('unidade') || termo.includes('cep') || termo.includes('cidade') || termo.includes('endereco')) return navegarPara('unidades.html');
  navegarPara('especialidades.html');
}

function selecionarTipo(nome, codigo) {
  agendamentoAtual.tipoNome = nome;
  agendamentoAtual.tipoCodigo = codigo;
  agendamentoAtual.unidade = '';
  agendamentoAtual.medico = '';
  agendamentoAtual.dia = '';
  agendamentoAtual.horario = '';
  document.querySelectorAll('#agStep1 .tipo-btn').forEach(btn => btn.classList.remove('selected'));
  document.activeElement?.classList.add('selected');

  const btnSus = document.getElementById('btnSUS');
  const avisoTeleSus = document.getElementById('avisoTeleSus');
  if (btnSus) btnSus.disabled = codigo === 'TELE';
  if (avisoTeleSus) avisoTeleSus.classList.toggle('hidden', codigo !== 'TELE');
  irParaPasso(2);
}

function selecionarCobertura(cobertura) {
  if (agendamentoAtual.tipoCodigo === 'TELE' && cobertura === 'SUS') {
    alert('Teleconsulta não está disponível pelo SUS. Escolha Particular ou Convênio.');
    return;
  }
  agendamentoAtual.cobertura = cobertura;
  agendamentoAtual.convenio = '';
  document.querySelectorAll('#agStep2 .tipo-btn').forEach(btn => btn.classList.remove('selected'));
  document.activeElement?.classList.add('selected');

  const convenioSelect = document.getElementById('convenioSelect');
  if (convenioSelect) convenioSelect.classList.toggle('hidden', cobertura !== 'Convênio');
  if (cobertura === 'Convênio') return;

  renderUnidadesAgendamento();
  irParaPasso(3);
}

function confirmarConvenio() {
  const convenio = document.getElementById('convenioNome')?.value;
  if (!convenio) {
    alert('Selecione um convênio para continuar.');
    return;
  }
  agendamentoAtual.convenio = convenio;
  renderUnidadesAgendamento();
  irParaPasso(3);
}

function buscarUnidadePorCep() {
  const cep = somenteDigitos(document.getElementById('agCep')?.value || '');
  if (cep.length !== 8) {
    alert('Digite um CEP válido com 8 números.');
    return;
  }
  renderUnidadesAgendamento();
}

function renderUnidadesAgendamento() {
  const container = document.getElementById('unidadesDisponiveis');
  if (!container) return;

  const tipo = agendamentoAtual.tipoCodigo || 'CONS-ADULT';
  const cobertura = agendamentoAtual.cobertura || 'Particular';
  const convenio = agendamentoAtual.convenio;
  const unidades = NL_UNIDADES.filter(unidade =>
    unidade.modalidades.includes(tipo) &&
    unidade.coberturas.includes(cobertura) &&
    (!convenio || unidade.convenios.includes(convenio))
  );

  container.innerHTML = unidades.map(unidade => `
    <div class="unidade-card" onclick="selecionarUnidade('${unidade.nome.replace(/'/g, "\\'")}', '${unidade.endereco.replace(/'/g, "\\'")}')">
      <strong>${unidade.nome}</strong>
      <small>${unidade.endereco}</small>
      <div class="unit-meta">
        <span>${unidade.distancia}</span>
        <span>${unidade.coberturas.join(' · ')}</span>
      </div>
      <div class="tags" style="margin-top:10px;">${unidade.modalidades.map(item => `<span class="tag">${item === 'TELE' ? 'Teleconsulta' : item === 'EXAM' ? 'Exames' : 'Consulta'}</span>`).join('')}</div>
    </div>
  `).join('') || '<div class="safe-note">Nenhuma unidade disponível para essa combinação. Volte e escolha outra cobertura.</div>';
  container.classList.remove('hidden');
}

function selecionarUnidade(nome, endereco) {
  agendamentoAtual.unidade = nome;
  agendamentoAtual.endereco = endereco;
  agendamentoAtual.medico = '';
  document.querySelectorAll('.unidade-card').forEach(card => card.classList.remove('selected'));
  Array.from(document.querySelectorAll('.unidade-card')).find(card => card.textContent.includes(nome))?.classList.add('selected');
  renderMedicosAgendamento();
  irParaPasso(4);
}

function renderMedicosAgendamento() {
  const container = document.querySelector('#agStep4 .medicos-grid');
  if (!container) return;

  const tipo = agendamentoAtual.tipoCodigo || 'CONS-ADULT';
  const cobertura = agendamentoAtual.cobertura || 'Particular';
  const unidade = agendamentoAtual.unidade;
  const medicos = NL_MEDICOS.filter(medico =>
    medico.tipos.includes(tipo) &&
    medico.coberturas.includes(cobertura) &&
    medico.unidades.includes(unidade)
  );

  const label = document.getElementById('ag4Label');
  if (label) label.textContent = `${agendamentoAtual.tipoNome || ''} · ${cobertura} · ${unidade || ''}`;

  container.innerHTML = medicos.map(medico => `
    <div class="medico-card" onclick="selecionarMedico('${medico.nome.replace(/'/g, "\\'")}','${medico.crm}','${medico.especialidade.replace(/'/g, "\\'")}',${medico.rating},${medico.avaliacoes})">
      <div class="medico-avatar">${medico.nome.split(' ').slice(0, 2).map(p => p[0]).join('').replace('D', '')}</div>
      <div class="medico-info">
        <strong>${medico.nome}</strong>
        <small>${medico.crm} · ${medico.especialidade}</small>
        <div class="medico-rating">★ ${medico.rating} <span>(${medico.avaliacoes} avaliações)</span></div>
        <div class="doctor-meta"><span>${medico.coberturas.join(' · ')}</span></div>
      </div>
    </div>
  `).join('') || '<div class="safe-note">Nenhum médico disponível para essa combinação. Tente outra unidade ou cobertura.</div>';
}

function selecionarMedico(nome, crm, especialidade, rating, avaliacoes) {
  agendamentoAtual.medico = nome;
  agendamentoAtual.crm = crm;
  agendamentoAtual.especialidade = especialidade;
  agendamentoAtual.rating = rating;
  agendamentoAtual.avaliacoes = avaliacoes;
  document.querySelectorAll('.medico-card').forEach(card => card.classList.remove('selected'));
  Array.from(document.querySelectorAll('.medico-card')).find(card => card.textContent.includes(nome))?.classList.add('selected');
  renderCalendarioAgendamento();
  irParaPasso(5);
}

function renderCalendarioAgendamento() {
  const container = document.querySelector('#agStep5 .calendario-grid');
  if (!container) return;

  const base = new Date();
  base.setDate(base.getDate() + window.NLUX.calendarOffset * 7);
  const fmtMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  const fmtSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
  const fmtDia = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' });

  const days = Array.from({ length: 14 }, (_, index) => {
    const data = new Date(base);
    data.setDate(base.getDate() + index);
    const iso = data.toISOString().slice(0, 10);
    const disabled = data.getDay() === 0 || index < 1;
    return { data, iso, disabled };
  });

  container.innerHTML = `
    <div class="calendar-shell">
      <div class="calendar-toolbar">
        <strong>${fmtMes.format(base)}</strong>
        <div class="calendar-nav">
          <button type="button" onclick="mudarSemanaCalendario(-1)" aria-label="Semana anterior">‹</button>
          <button type="button" onclick="mudarSemanaCalendario(1)" aria-label="Próxima semana">›</button>
        </div>
      </div>
      <div class="calendar-days">
        ${days.map(day => `
          <button type="button" class="calendar-day ${day.disabled ? 'disabled' : ''} ${window.NLUX.selectedDateISO === day.iso ? 'active' : ''}" ${day.disabled ? 'disabled' : ''} onclick="selecionarDataCalendario('${day.iso}')">
            <small>${fmtSemana.format(day.data)}</small>
            <strong>${fmtDia.format(day.data)}</strong>
          </button>
        `).join('')}
      </div>
      <div class="slots-panel" id="slotsPanel">
        <strong>Horários disponíveis</strong>
        <div class="slots-grid">${renderSlotsDisponiveis()}</div>
      </div>
    </div>
  `;
}

function mudarSemanaCalendario(direcao) {
  window.NLUX.calendarOffset = Math.max(0, window.NLUX.calendarOffset + direcao);
  renderCalendarioAgendamento();
}

function selecionarDataCalendario(iso) {
  window.NLUX.selectedDateISO = iso;
  window.NLUX.selectedSlot = '';
  delete agendamentoAtual.horario;
  agendamentoAtual.dataISO = iso;
  const data = new Date(`${iso}T00:00:00`);
  agendamentoAtual.dia = data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  renderCalendarioAgendamento();
}

function renderSlotsDisponiveis() {
  if (!window.NLUX.selectedDateISO) return '<span class="safe-note">Escolha uma data no calendário.</span>';
  const tipo = agendamentoAtual.tipoCodigo;
  const slots = tipo === 'TELE'
    ? ['09:00', '10:30', '14:00', '15:30', '17:00']
    : tipo === 'EXAM'
      ? ['07:30', '08:30', '10:00', '13:30', '15:00']
      : ['08:00', '09:30', '11:00', '14:00', '16:30'];
  return slots.map((slot, index) => {
    const ocupado = index === 2 && agendamentoAtual.cobertura === 'SUS';
    return `<button type="button" class="slot-btn ${window.NLUX.selectedSlot === slot ? 'active' : ''}" ${ocupado ? 'disabled' : ''} onclick="selecionarHorario('${agendamentoAtual.dia}', '${slot}', this)">${slot}</button>`;
  }).join('');
}

function selecionarHorario(dia, horario, elemento) {
  agendamentoAtual.dia = dia;
  agendamentoAtual.horario = horario;
  window.NLUX.selectedSlot = horario;
  document.querySelectorAll('.slot-btn,.horario-btn').forEach(btn => btn.classList.remove('active', 'selected'));
  elemento?.classList.add('active', 'selected');
  iniciarHold(10 * 60);
  document.getElementById('btnAvancarPasso6')?.classList.remove('hidden');
}

function aprimorarTeleconsulta() {
  if (paginaArquivo() !== 'teleconsulta.html') return;
  const section = document.querySelector('.consulta-grid-full');
  if (!section || document.querySelector('.flow-access-card')) return;
  section.insertAdjacentHTML('beforeend', `
    <div class="flow-access-card">
      <div>
        <h3>Onde acessar a consulta depois de agendar?</h3>
        <p>O acesso fica na Área do Paciente, em Próximas consultas. O botão Entrar na sala aparece 15 minutos antes do horário, junto com teste de câmera, microfone e chat da consulta.</p>
      </div>
      <a class="btn btn-light" href="area-paciente.html">Abrir Área do Paciente</a>
    </div>
  `);
}

function confirmarConsultaOnline() {
  const nome = document.getElementById('agendaNome')?.value.trim();
  const especialidade = document.getElementById('agendaEspecialidade')?.value;
  const data = document.getElementById('agendaData')?.value;
  const horario = document.getElementById('agendaHorario')?.value;
  const confirmacao = document.getElementById('agendaConfirmacao');
  const resumo = document.getElementById('agendaResumo');

  if (!especialidade) {
    alert('Escolha a especialidade para agendar.');
    return;
  }

  if (!nome || !data || !horario) {
    alert('Preencha nome, data e horário para agendar.');
    return;
  }

  const dataFormatada = new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR');
  if (resumo) {
    resumo.innerHTML = `<strong>${nome}</strong>, sua teleconsulta de ${especialidade} ficou marcada para <strong>${dataFormatada} às ${horario}</strong>. O acesso também ficará disponível na Área do Paciente 15 minutos antes do horário.`;
  }
  confirmacao?.classList.remove('hidden');
  confirmacao?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

