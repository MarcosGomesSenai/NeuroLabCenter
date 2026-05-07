function abrirMenu() {
  const menu = $('menu');
  if (menu) menu.classList.toggle('open');
}

function navegarPara(arquivo) {
  window.location.href = arquivo;
}

function buscarSite() {
  const input = $('busca');
  const termo = normalizarTexto(input?.value || '');

  if (!termo) {
    mostrarToast('Digite algo para buscar. Ex: enxaqueca, EEG, unidade ou consultas.', 'aviso');
    return;
  }

  if (termo.includes('online') || termo.includes('chat') || termo.includes('teleconsulta')) {
    navegarPara('teleconsulta.html');
  } else if (termo.includes('eletro') || termo.includes('exame') || termo.includes('polissonografia') || termo.includes('eeg')) {
    navegarPara('exames.html');
  } else if (termo.includes('unidade') || termo.includes('endereco') || termo.includes('cidade') || termo.includes('cep')) {
    navegarPara('unidades.html');
  } else {
    navegarPara('especialidades.html');
  }
}

function abrirModal(id) {
  const modal = $(id);
  if (!modal) return false;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  return true;
}

function fecharModal(id) {
  const modal = $(id);
  if (modal) modal.classList.remove('open');
  if (!document.querySelector('.modal-overlay.open')) document.body.style.overflow = '';
  if (id === 'modalAgendamento') liberarHold(false);
}

function abrirModalCadastro() {
  if (abrirModal('modalCadastro')) return;
  navegarPara('index.html?modal=cadastro');
}

function abrirModalLogin() {
  if (abrirModal('modalLogin')) return;
  navegarPara('index.html?modal=login');
}

function abrirRecuperarSenha() {
  fecharModal('modalLogin');
  if (abrirModal('modalRecuperarSenha')) return;
  navegarPara('index.html?modal=recuperar');
}

function abrirModalAvaliacao() {
  if (abrirModal('modalAvaliacao')) return;
  navegarPara('index.html?modal=avaliacao');
}

function abrirAgendamento() {
  if (!verificarAuthParaAgendamento()) return;

  if (paginaAtual() !== 'agendamento.html') {
    navegarPara('agendamento.html');
    return;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

