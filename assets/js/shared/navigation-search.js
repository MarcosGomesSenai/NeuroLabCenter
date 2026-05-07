// FAQ Accordion toggle
function toggleFaq(elemento) {
  const item = elemento.closest('.faq-item');
  if (item) item.classList.toggle('aberto');
}

function abrirMenu() {
  document.getElementById('menu').classList.toggle('open');
}

function buscaRapida(texto) {
  document.getElementById('busca').value = texto;
  buscarSite();
}

function buscarSite() {
  const termo = document.getElementById('busca').value.trim().toLowerCase();

  if (!termo) {
    mostrarToast('Digite algo para buscar. Ex: enxaqueca, EEG, unidade ou consultas.', 'aviso');
    return;
  }

  if (termo.includes('online') || termo.includes('chat') || termo.includes('consulta')) {
    location.href = '#consulta-online';
  } else if (termo.includes('eletro') || termo.includes('exame') || termo.includes('polissonografia') || termo.includes('eeg')) {
    location.href = '#exames';
  } else if (termo.includes('unidade') || termo.includes('endereço') || termo.includes('endereco') || termo.includes('cidade')) {
    location.href = '#unidades';
  } else {
    location.href = '#especialidades';
  }
}

function confirmarAgendamento() {
  alert('Aqui abriria a próxima tela: lista de horários disponíveis para consulta.');
}

function abrirCadastro() {
  alert('Aqui abriria a tela de cadastro do paciente.');
}

function abrirLogin() {
  alert('Aqui abriria a tela de login do paciente.');
}

function abrirResultadoExames() {
  alert('Aqui abriria a tela para consultar resultado dos exames.');
}

