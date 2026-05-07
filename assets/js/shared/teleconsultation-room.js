function abrirAgendamentoOnline() {
  window.location.href = 'agendamento.html?modo=online';
}

function esconderAgendamentoOnline(esconderTudo = true) {
  const agenda = document.getElementById('agendamentoOnlineCard');
  if (agenda && esconderTudo) agenda.classList.add('hidden');
}

function confirmarConsultaOnline() {
  const nome = document.getElementById('agendaNome').value.trim();
  const especialidade = document.getElementById('agendaEspecialidade').value;
  const data = document.getElementById('agendaData').value;
  const horario = document.getElementById('agendaHorario').value;
  const confirmacao = document.getElementById('agendaConfirmacao');
  const resumo = document.getElementById('agendaResumo');

  if (!especialidade) {
    mostrarToast('Escolha a especialidade para agendar.', 'aviso');
    return;
  }

  if (!nome || !data || !horario) {
    mostrarToast('Preencha nome, data e horário para agendar.', 'aviso');
    return;
  }

  const dataFormatada = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
  resumo.textContent = `${nome}, sua consulta de ${especialidade} ficou marcada para ${dataFormatada} às ${horario}. No horário marcado, clique em “Ir em ligação com médico”.`;
  confirmacao.classList.remove('hidden');
  confirmacao.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function entrarLigacaoMedico() {
  const sala = document.getElementById('salaConsulta');
  sala.classList.remove('hidden');
  sala.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await liberarCameraPaciente();
}

async function liberarCameraPaciente() {
  const video = document.getElementById('videoPaciente');
  const placeholder = document.getElementById('cameraPlaceholder');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    placeholder.innerHTML = '<span>⚠️</span><h3>Câmera indisponível</h3><p>Seu navegador não liberou acesso à câmera.</p>';
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
    video.style.display = 'block';
    placeholder.style.display = 'none';
  } catch (erro) {
    placeholder.innerHTML = '<span>🚫</span><h3>Câmera bloqueada</h3><p>Permita o acesso à câmera no navegador para aparecer na ligação.</p>';
  }
}

function abrirSalaConsulta() {
  abrirAgendamentoOnline();
}

function esconderSalaConsulta() {
  const sala = document.getElementById('salaConsulta');
  if (sala) sala.classList.add('hidden');
}

function enviarMensagemSala() {
  const input = document.getElementById('salaMensagem');
  const texto = input.value.trim();
  if (!texto) return;

  const body = document.getElementById('salaChatBody');
  const msg = document.createElement('div');
  msg.className = 'msg user';
  msg.textContent = texto;
  body.appendChild(msg);
  input.value = '';

  setTimeout(() => {
    const bot = document.createElement('div');
    bot.className = 'msg bot';
    bot.textContent = 'Mensagem enviada. O médico responderá aqui durante a consulta online.';
    body.appendChild(bot);
    body.scrollTop = body.scrollHeight;
  }, 500);

  body.scrollTop = body.scrollHeight;
}

function enviarSalaComEnter(event) {
  if (event.key === 'Enter') enviarMensagemSala();
}

