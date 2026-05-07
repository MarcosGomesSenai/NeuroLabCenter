function abrirFilaEspera() {
  preencherResumo('filaResumo');
  if (!abrirModal('modalFilaEspera')) mostrarToast('Fila de espera registrada para o médico e unidade selecionados.', 'sucesso');
}

function confirmarFilaEspera() {
  const whatsapp = $('filaWhatsapp')?.value;
  if (somenteDigitos(whatsapp).length < 10) {
    mostrarToast('Informe um WhatsApp válido para receber a notificação.', 'aviso');
    return;
  }

  const fila = lerJson(STORAGE_KEYS.fila, []);
  fila.push({ id: `FE-${Date.now()}`, whatsapp, criadoEm: new Date().toISOString(), ...agendamentoAtual });
  salvarJson(STORAGE_KEYS.fila, fila);
  fecharModal('modalFilaEspera');
  mostrarToast('Você entrou na fila de espera! Será notificado por WhatsApp e SMS.', 'sucesso');
}

function criarEstrelas(container) {
  const campo = container.dataset.campo;
  container.innerHTML = '';
  for (let nota = 1; nota <= 5; nota++) {
    const estrela = document.createElement('button');
    estrela.type = 'button';
    estrela.className = 'estrela';
    estrela.textContent = '★';
    estrela.setAttribute('aria-label', `${nota} estrela${nota > 1 ? 's' : ''}`);
    estrela.addEventListener('click', () => {
      avaliacaoAtual[campo] = nota;
      [...container.children].forEach((item, index) => item.classList.toggle('ativa', index < nota));
      verificarAvaliacao();
    });
    container.appendChild(estrela);
  }
}

function criarNps(container) {
  container.innerHTML = '';
  for (let nota = 0; nota <= 10; nota++) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'nps-btn';
    botao.textContent = nota;
    botao.addEventListener('click', () => {
      avaliacaoAtual.nps = nota;
      [...container.children].forEach(item => item.classList.toggle('ativo', Number(item.textContent) === nota));
      verificarAvaliacao();
    });
    container.appendChild(botao);
  }
}

function verificarAvaliacao() {
  const pronto = avaliacaoAtual.medico && avaliacaoAtual.recepcao && avaliacaoAtual.agendamento && avaliacaoAtual.nps !== null;
  const btn = $('btnEnviarAvaliacao');
  if (btn) btn.disabled = !pronto;
  setHint('avaliacaoHint', pronto ? 'Tudo pronto para enviar.' : 'Preencha as três notas e o NPS.', pronto ? 'success' : 'info');
}

function atualizarCharCount() {
  const texto = $('avaliacaoComentario')?.value || '';
  const contador = $('charCount');
  if (contador) contador.textContent = `${texto.length} / 500`;
}

function enviarAvaliacao() {
  verificarAvaliacao();
  if ($('btnEnviarAvaliacao')?.disabled) return;

  const avaliacoes = lerJson(STORAGE_KEYS.avaliacoes, []);
  avaliacoes.push({
    id: `AV-${Date.now()}`,
    ...avaliacaoAtual,
    comentario: $('avaliacaoComentario')?.value || '',
    publicar: Boolean($('consentimentoPublicacao')?.checked),
    criadoEm: new Date().toISOString()
  });
  salvarJson(STORAGE_KEYS.avaliacoes, avaliacoes);
  fecharModal('modalAvaliacao');
  mostrarToast('Avaliação enviada com sucesso! Comentários seguem para moderação.', 'sucesso');
}

function aplicarModalDaUrl() {
  const params = new URLSearchParams(window.location.search);
  const modal = params.get('modal');
  if (modal === 'login') abrirModalLogin();
  if (modal === 'cadastro') abrirModalCadastro();
  if (modal === 'recuperar') abrirRecuperarSenha();
  if (modal === 'avaliacao') abrirModalAvaliacao();
}

function marcarNavAtiva() {
  const atual = paginaAtual();
  document.querySelectorAll('nav a, footer a').forEach(link => {
    const href = (link.getAttribute('href') || '').split('#')[0] || 'index.html';
    link.classList.toggle('active', href.toLowerCase() === atual);
  });
}

function renderDashboardAgendamentos() {
  const container = $('dashboardAgendamentos');
  if (!container) return;

  const usuario = lerJson(STORAGE_KEYS.usuarioAtual, null);
  const agendamentos = lerJson(STORAGE_KEYS.agendamentos, [])
    .filter(item => !usuario || item.pacienteCpf === usuario.cpf || item.pacienteCpf === 'visitante')
    .slice(-6)
    .reverse();

  if (!agendamentos.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span>📋</span>
        <p>Nenhum agendamento encontrado.<br>Agende sua primeira consulta agora!</p>
        <button class="btn btn-primary" onclick="abrirAgendamento()" style="margin-top:12px;">Agendar consulta</button>
      </div>
    `;
    return;
  }

  container.innerHTML = agendamentos.map(item => {
    const isCancelado = item.status === 'CANCELADO';
    const isConfirmado = item.status === 'CONFIRMADO';
    const pillClass = isCancelado ? 'style="background:#FFF5F5;color:#C44444;"' : '';
    const acoes = isConfirmado ? `
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-light" onclick="abrirAgendamento()">Reagendar</button>
        <button class="btn btn-light" style="color:#C44444;border-color:#FFD5D5;" onclick="cancelarAgendamento('${item.id}')">Cancelar</button>
      </div>
    ` : isCancelado ? `<span style="font-size:13px;color:var(--texto-claro);">Cancelado</span>` : '';

    return `
      <div class="appointment-card" ${isCancelado ? 'style="opacity:0.6;"' : ''}>
        <span class="status-pill" ${pillClass}>${item.status || 'CONFIRMADO'}</span>
        <strong>${item.medico || item.tipoNome || 'Agendamento NeuroLab'}</strong>
        <span>${item.dia || '-'} às ${item.horario || '-'} · ${item.unidade || '-'}</span>
        ${acoes}
      </div>
    `;
  }).join('');
}

