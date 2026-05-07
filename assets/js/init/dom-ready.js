document.addEventListener('DOMContentLoaded', () => {
  const pg = paginaAtual();
  const precisaLogin = ['agendamento.html', 'area-paciente.html'];
  if (precisaLogin.includes(pg)) {
    const sessao = lerJson(STORAGE_KEYS.usuarioAtual, null);
    if (!sessao?.cpf) {
      window.location.replace('index.html?modal=login');
      return;
    }
  }

  marcarNavAtiva();
  atualizarHeader();
  aplicarModalDaUrl();
  renderDashboardAgendamentos();
  document.querySelectorAll('.estrelas').forEach(criarEstrelas);
  if ($('npsScale')) criarNps($('npsScale'));
  if ($('agStep1')) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('modo') === 'online') {
      selecionarTipo('Teleconsulta', 'TELE');
    } else {
      irParaPasso(1);
    }
  }

  // CPF inline validation bindings
  const cpfFields = [
    { id: 'cadCpf', hint: 'cadCpfHint' },
    { id: 'cadCpfAdol', hint: 'cadCpfHint' },
    { id: 'loginCpf', hint: 'loginCpfHint' },
    { id: 'recCpf', hint: 'recHint' }
  ];
  cpfFields.forEach(({ id, hint }) => {
    const campo = $(id);
    if (campo) {
      campo.addEventListener('input', () => {
        mascararCpf(campo);
        validarCpfInline(campo, hint);
      });
    }
  });
});

