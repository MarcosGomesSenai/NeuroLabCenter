// ============================================================
// REGRAS DE NEGÓCIO AVANÇADAS (Componente 5)
// ============================================================

// RB-012: Max 3 consultas por CPF em 30 dias
function verificarLimiteConsultas(cpf) {
  const agendamentos = lerJson(STORAGE_KEYS.agendamentos, []);
  const agora = Date.now();
  const trintaDias = 30 * 24 * 60 * 60 * 1000;
  const recentes = agendamentos.filter(ag =>
    ag.pacienteCpf === cpf &&
    ag.status === 'CONFIRMADO' &&
    (agora - new Date(ag.criadoEm).getTime()) < trintaDias
  );
  return recentes.length < 3;
}

// RB-032: Max 2 reagendamentos por CPF em 30 dias
function verificarLimiteReagendamentos(cpf) {
  const agendamentos = lerJson(STORAGE_KEYS.agendamentos, []);
  const agora = Date.now();
  const trintaDias = 30 * 24 * 60 * 60 * 1000;
  const reagendamentos = agendamentos.filter(ag =>
    ag.pacienteCpf === cpf &&
    ag.reagendado === true &&
    (agora - new Date(ag.criadoEm).getTime()) < trintaDias
  );
  return reagendamentos.length < 2;
}

// RB-031: Cancelamento com prazo (24h consulta, 1h exame)
function podeCancelar(agendamento) {
  if (!agendamento || !agendamento.criadoEm) return false;
  const agora = Date.now();
  const isExame = agendamento.tipoCodigo === 'EXAM';
  const prazoMs = isExame ? 1 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  // Simulação: usar data de criação + 7 dias como data da consulta
  const dataConsulta = new Date(agendamento.criadoEm).getTime() + 7 * 24 * 60 * 60 * 1000;
  return (dataConsulta - agora) > prazoMs;
}

// RB-031b: Contagem de NO-SHOWs (3x em 90 dias)
function verificarNoShows(cpf) {
  const agendamentos = lerJson(STORAGE_KEYS.agendamentos, []);
  const agora = Date.now();
  const noventaDias = 90 * 24 * 60 * 60 * 1000;
  const noShows = agendamentos.filter(ag =>
    ag.pacienteCpf === cpf &&
    ag.status === 'NO-SHOW' &&
    (agora - new Date(ag.criadoEm).getTime()) < noventaDias
  );
  return noShows.length >= 3;
}

// Cancelar agendamento com modal de confirmação
function cancelarAgendamento(agendamentoId) {
  const agendamentos = lerJson(STORAGE_KEYS.agendamentos, []);
  const ag = agendamentos.find(a => a.id === agendamentoId);

  if (!ag) { mostrarToast('Agendamento não encontrado.', 'erro'); return; }

  if (!podeCancelar(ag)) {
    mostrarToast('Prazo de cancelamento encerrado. Em caso de dúvidas, ligue para a clínica.', 'aviso', 5000);
    return;
  }

  abrirModalCancelamento(ag);
}

function abrirModalCancelamento(agendamento) {
  let modal = document.getElementById('modalCancelar');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal-overlay modal-cancel-overlay';
    modal.id = 'modalCancelar';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-card modal-form-card">
      <button class="modal-close" onclick="fecharModal('modalCancelar')">×</button>
      <div class="modal-header-icon">⚠️</div>
      <h3>Cancelar agendamento</h3>
      <p>Tem certeza que deseja cancelar este agendamento? O horário será liberado para outros pacientes.</p>
      <div class="resumo-agendamento" style="margin:16px 0;">
        <div class="resumo-row"><span class="resumo-label">Médico</span><span class="resumo-val">${agendamento.medico || '-'}</span></div>
        <div class="resumo-row"><span class="resumo-label">Data</span><span class="resumo-val">${agendamento.dia || '-'} às ${agendamento.horario || '-'}</span></div>
        <div class="resumo-row"><span class="resumo-label">Unidade</span><span class="resumo-val">${agendamento.unidade || '-'}</span></div>
      </div>
      <div class="cancel-actions">
        <button class="btn-cancel-voltar" onclick="fecharModal('modalCancelar')">← Voltar, manter agendamento</button>
        <button class="btn-cancel-confirmar" onclick="confirmarCancelamento('${agendamento.id}')">Confirmar cancelamento</button>
      </div>
    </div>
  `;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function confirmarCancelamento(agendamentoId) {
  const agendamentos = lerJson(STORAGE_KEYS.agendamentos, []);
  const idx = agendamentos.findIndex(a => a.id === agendamentoId);
  if (idx !== -1) {
    agendamentos[idx].status = 'CANCELADO';
    agendamentos[idx].canceladoEm = new Date().toISOString();
    salvarJson(STORAGE_KEYS.agendamentos, agendamentos);
  }
  fecharModal('modalCancelar');
  mostrarToast('Agendamento cancelado. Horário liberado com sucesso.', 'sucesso');
  renderDashboardAgendamentos();
}

