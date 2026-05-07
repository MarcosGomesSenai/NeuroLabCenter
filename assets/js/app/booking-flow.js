function selecionarTipo(nome, codigo) {
  agendamentoAtual = { tipoNome: nome, tipoCodigo: codigo };
  document.querySelectorAll('#agStep1 .tipo-btn').forEach(btn => btn.classList.remove('selected'));
  window.event?.currentTarget?.classList.add('selected');
  const avisoTeleSus = $('avisoTeleSus');
  const btnSus = $('btnSUS');
  if (avisoTeleSus) avisoTeleSus.classList.toggle('hidden', codigo !== 'TELE');
  if (btnSus) btnSus.disabled = codigo === 'TELE';
  irParaPasso(2);
}

function selecionarCobertura(cobertura) {
  if (agendamentoAtual.tipoCodigo === 'TELE' && cobertura === 'SUS') {
    mostrarToast('Teleconsulta não está disponível pelo SUS. Escolha Particular ou Convênio.', 'aviso');
    return;
  }

  document.querySelectorAll('#agStep2 .tipo-btn').forEach(btn => btn.classList.remove('selected'));
  window.event?.currentTarget?.classList.add('selected');
  agendamentoAtual.cobertura = cobertura;

  const convenioSelect = $('convenioSelect');
  if (cobertura === 'Convênio') {
    convenioSelect?.classList.remove('hidden');
    return;
  }

  if (convenioSelect) convenioSelect.classList.add('hidden');
  agendamentoAtual.convenio = '';
  
  if (agendamentoAtual.tipoCodigo === 'TELE') {
    agendamentoAtual.unidade = 'Teleconsulta Central';
    agendamentoAtual.endereco = 'Atendimento Online por Vídeo';
    irParaPasso(4);
  } else {
    irParaPasso(3);
  }
}

function confirmarConvenio() {
  const convenio = $('convenioNome')?.value;
  if (!convenio) {
    mostrarToast('Selecione um convênio para continuar.', 'aviso');
    return;
  }

  agendamentoAtual.convenio = convenio;
  if (agendamentoAtual.tipoCodigo === 'TELE') {
    agendamentoAtual.unidade = 'Teleconsulta Central';
    agendamentoAtual.endereco = 'Atendimento Online por Vídeo';
    irParaPasso(4);
  } else {
    irParaPasso(3);
  }
}

function voltarPasso() {
  if (agendamentoPasso > 1) {
    if (agendamentoAtual.tipoCodigo === 'TELE' && agendamentoPasso === 4) {
      irParaPasso(2);
    } else {
      irParaPasso(agendamentoPasso - 1);
    }
  }
}

function buscarUnidadePorCep() {
  const cep = somenteDigitos($('agCep')?.value);
  if (cep.length !== 8) {
    mostrarToast('Digite um CEP válido com 8 dígitos.', 'aviso');
    return;
  }
  $('unidadesDisponiveis')?.classList.remove('hidden');
}

function selecionarUnidade(nome, endereco) {
  agendamentoAtual.unidade = nome;
  agendamentoAtual.endereco = endereco;
  document.querySelectorAll('.unidade-card').forEach(card => card.classList.remove('selected'));
  window.event?.currentTarget?.classList.add('selected');
  const label = $('ag4Label');
  if (label) label.textContent = `${agendamentoAtual.tipoNome || ''} · ${agendamentoAtual.cobertura || ''} · ${nome}`;
  irParaPasso(4);
}

function selecionarMedico(nome, crm, especialidade, rating, avaliacoes) {
  agendamentoAtual.medico = nome;
  agendamentoAtual.crm = crm;
  agendamentoAtual.especialidade = especialidade;
  agendamentoAtual.rating = rating;
  agendamentoAtual.avaliacoes = avaliacoes;
  document.querySelectorAll('.medico-card').forEach(card => card.classList.remove('selected'));
  window.event?.currentTarget?.classList.add('selected');
  irParaPasso(5);
}

function selecionarHorario(dia, horario, elemento) {
  agendamentoAtual.dia = dia;
  agendamentoAtual.horario = horario;
  document.querySelectorAll('.horario-btn').forEach(btn => btn.classList.remove('selected'));
  elemento?.classList.add('selected');
  iniciarHold(10 * 60);
  $('btnAvancarPasso6')?.classList.remove('hidden');
}

function iniciarHold(segundos) {
  if (holdInterval) window.clearInterval(holdInterval);
  holdInterval = null;
  holdExpiraEm = Date.now() + segundos * 1000;
  $('holdTimer')?.classList.remove('hidden');
  atualizarHold();
  holdInterval = window.setInterval(atualizarHold, 1000);
}

function atualizarHold() {
  if (!holdExpiraEm) return;
  const restante = Math.max(0, Math.floor((holdExpiraEm - Date.now()) / 1000));
  const minutos = String(Math.floor(restante / 60)).padStart(2, '0');
  const segundos = String(restante % 60).padStart(2, '0');
  const label = $('holdHorarioLabel');
  const countdown = $('holdCountdown');

  if (label) label.textContent = `${agendamentoAtual.dia || ''} às ${agendamentoAtual.horario || ''}`;
  if (countdown) {
    countdown.textContent = `${minutos}:${segundos}`;
    countdown.classList.toggle('urgente', restante <= 60);
  }

  if (restante <= 0) {
    liberarHold();
    mostrarToast('Tempo esgotado. O horário foi liberado. Selecione novamente.', 'aviso', 5000);
    irParaPasso(5);
  }
}

function liberarHold(limparHorario = true) {
  if (holdInterval) window.clearInterval(holdInterval);
  holdInterval = null;
  holdExpiraEm = null;
  $('holdTimer')?.classList.add('hidden');
  $('btnAvancarPasso6')?.classList.add('hidden');
  document.querySelectorAll('.horario-btn').forEach(btn => btn.classList.remove('selected'));
  if (limparHorario) {
    delete agendamentoAtual.dia;
    delete agendamentoAtual.horario;
  }
}

function voltarPassoComHold() {
  liberarHold();
  if (agendamentoPasso > 1) irParaPasso(agendamentoPasso - 1);
}

function avancarParaConfirmacao() {
  if (!agendamentoAtual.dia || !agendamentoAtual.horario) {
    mostrarToast('Selecione um horário para continuar.', 'aviso');
    return;
  }

  preencherResumo('resumoAgendamento');
  const prepBox = $('prepExameBox');
  const prepLista = $('prepExameLista');
  const isExame = agendamentoAtual.tipoCodigo === 'EXAM';
  if (prepBox && prepLista) {
    prepBox.classList.toggle('hidden', !isExame);
    prepLista.innerHTML = isExame ? examesInfo[0].preparo.map(item => `<li>${item}</li>`).join('') : '';
  }
  irParaPasso(6);
}

function confirmarAgendamentoFinal() {
  if (!holdExpiraEm || holdExpiraEm < Date.now()) {
    mostrarToast('O horário reservado expirou. Selecione novamente.', 'aviso');
    liberarHold();
    irParaPasso(5);
    return;
  }

  // RB-012: Verificar limite de consultas
  const usuario = lerJson(STORAGE_KEYS.usuarioAtual, null);
  if (usuario && usuario.cpf && !verificarLimiteConsultas(usuario.cpf)) {
    mostrarToast('Limite de 3 consultas por mês atingido. Entre em contato com a clínica.', 'aviso', 6000);
    return;
  }

  // RB-031b: Verificar NO-SHOWs
  if (usuario && usuario.cpf && verificarNoShows(usuario.cpf)) {
    mostrarToast('Devido a faltas anteriores, seu agendamento requer aprovação da recepção.', 'aviso', 6000);
  }


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
  if (holdInterval) window.clearInterval(holdInterval);
  holdInterval = null;
  holdExpiraEm = null;
  preencherResumo('sucessoResumo', registro);
  irParaPasso('Sucesso');
}

function novoAgendamento() {
  agendamentoAtual = {};
  liberarHold();
  document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
  irParaPasso(1);
}

function irParaPasso(passo) {
  agendamentoPasso = typeof passo === 'number' ? passo : 6;
  document.querySelectorAll('.ag-step').forEach(step => step.classList.add('hidden'));
  const alvo = passo === 'Sucesso' ? $('agStepSucesso') : $(`agStep${passo}`);
  alvo?.classList.remove('hidden');

  const passoNumerico = passo === 'Sucesso' ? 6 : passo;
  document.querySelectorAll('.progress-step').forEach(step => {
    const numero = Number(step.dataset.step);
    step.classList.toggle('active', numero === passoNumerico);
    step.classList.toggle('done', numero < passoNumerico || passo === 'Sucesso');
  });

  const fill = $('progressFill');
  if (fill) fill.style.width = `${((passoNumerico - 1) / 5) * 100}%`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function preencherResumo(id, dados = agendamentoAtual) {
  const container = $(id);
  if (!container) return;
  const cobertura = dados.cobertura === 'Convênio' && dados.convenio ? `${dados.cobertura} (${dados.convenio})` : dados.cobertura;
  container.innerHTML = `
    <div class="resumo-row"><span class="resumo-label">Tipo</span><span class="resumo-val">${dados.tipoNome || '-'}</span></div>
    <div class="resumo-row"><span class="resumo-label">Cobertura</span><span class="resumo-val">${cobertura || '-'}</span></div>
    <div class="resumo-row"><span class="resumo-label">Unidade</span><span class="resumo-val">${dados.unidade || '-'}</span></div>
    <div class="resumo-row"><span class="resumo-label">Médico</span><span class="resumo-val">${dados.medico || '-'} ${dados.crm ? `· ${dados.crm}` : ''}</span></div>
    <div class="resumo-row"><span class="resumo-label">Data</span><span class="resumo-val">${dados.dia || '-'} às ${dados.horario || '-'}</span></div>
  `;
}

