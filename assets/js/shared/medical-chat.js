// CHAT DE DÚVIDAS COM IA LOCAL
// URL: meta neurolab-chat-api, window.NEUROLAB_CHAT_API, ou mesma origem /api/chat (senão localhost:3001 em dev)
// Regras de segurança: o chat tira dúvidas, mas não prescreve remédio, dose ou diagnóstico.
function abrirTriagemChat() {
  esconderSalaConsulta();
  esconderAgendamentoOnline(false);
  const triagem = document.getElementById('triagemCard');
  const chat = document.getElementById('chatCard');
  triagem.classList.remove('hidden');
  chat.classList.add('hidden');
  triagem.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function selecionarTriagem(texto) {
  const chat = document.getElementById('chatCard');
  chat.classList.remove('hidden');
  adicionarMensagem('user', texto);
  document.getElementById('chatMensagem').focus();
  responderComIA(texto);
}

async function enviarMensagemChat() {
  const input = document.getElementById('chatMensagem');
  const texto = input.value.trim();

  if (!texto) return;

  adicionarMensagem('user', texto);
  input.value = '';
  await responderComIA(texto);
}

function resolverUrlChatApi() {
  if (typeof window.NEUROLAB_CHAT_API === 'string' && window.NEUROLAB_CHAT_API.trim()) {
    const base = window.NEUROLAB_CHAT_API.trim().replace(/\/$/, '');
    return base.endsWith('/api/chat') ? base : `${base}/api/chat`;
  }
  const meta = document.querySelector('meta[name="neurolab-chat-api"]');
  if (meta?.content?.trim()) {
    const base = meta.content.trim().replace(/\/$/, '');
    return base.endsWith('/api/chat') ? base : `${base}/api/chat`;
  }
  const prot = typeof location !== 'undefined' ? location.protocol : '';
  const host = typeof location !== 'undefined' ? location.hostname : '';
  if (prot === 'file:' || host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:3001/api/chat';
  }
  if (prot && prot !== 'file:' && location.origin && location.origin !== 'null') {
    return `${location.origin}/api/chat`;
  }
  return 'http://localhost:3001/api/chat';
}

async function responderComIA(texto) {
  adicionarMensagem('bot', 'Analisando sua dúvida com segurança...');

  try {
    const resposta = await fetch(resolverUrlChatApi(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: texto })
    });

    if (!resposta.ok) throw new Error('API local indisponível');

    const dados = await resposta.json();
    removerUltimaMensagemBotTemporaria();
    adicionarMensagem('bot', dados.answer || respostaBasicaHospital(texto));
  } catch (erro) {
    removerUltimaMensagemBotTemporaria();
    adicionarMensagem('bot', respostaBasicaHospital(texto));
  }
}

function respostaBasicaHospital(texto) {
  const t = normalizarTexto(texto);

  if (t.includes('remedio') || t.includes('medicamento') || t.includes('tomar') || t.includes('dose')) {
    return 'Por segurança, eu não posso indicar remédio, dose ou tratamento específico. Posso explicar cuidados gerais e ajudar você a agendar uma consulta. Se a dor for forte, súbita ou vier com sinais de alerta, procure emergência.';
  }

  if (t.includes('dor de cabeca') || t.includes('enxaqueca')) {
    return 'Dor de cabeça pode ter várias causas. Como orientação geral: descanse em local tranquilo, hidrate-se e observe a evolução. Procure urgência se a dor for súbita e muito forte, vier com febre, desmaio, confusão, fraqueza, alteração na fala, convulsão ou alteração visual. Não indico remédios pelo chat.';
  }

  if (t.includes('tontura')) {
    return 'Para tontura, sente-se ou deite-se para evitar queda e observe se há desmaio, falta de ar, dor no peito, fraqueza ou fala enrolada. Se for intenso, recorrente ou vier com sinais neurológicos, procure atendimento médico.';
  }

  if (t.includes('formigamento') || t.includes('dormencia')) {
    return 'Formigamento pode ter várias causas. Se ocorrer em um lado do corpo, junto com boca torta, fala enrolada, perda de força, confusão ou dor no peito, procure emergência. Se for leve e repetitivo, agende avaliação neurológica.';
  }

  if (t.includes('exame') || t.includes('consulta') || t.includes('agendar')) {
    return 'Posso ajudar com informações de agendamento, consulta presencial, consulta online e exames como EEG, eletroneuromiografia, polissonografia e Doppler. Para confirmar diagnóstico ou tratamento, é necessário atendimento médico.';
  }

  return 'Entendi sua dúvida. Posso orientar de forma geral, mas não faço diagnóstico e não indico remédios. Me diga o sintoma, há quanto tempo começou e se existe algum sinal de alerta como febre alta, desmaio, convulsão, fraqueza, fala alterada ou dor muito forte.';
}

function removerUltimaMensagemBotTemporaria() {
  const chatBody = document.getElementById('chatBody');
  const mensagens = chatBody.querySelectorAll('.msg.bot');
  const ultima = mensagens[mensagens.length - 1];
  if (ultima && ultima.textContent === 'Analisando sua dúvida com segurança...') ultima.remove();
}

function enviarComEnter(event) {
  if (event.key === 'Enter') enviarMensagemChat();
}

function adicionarMensagem(tipo, texto) {
  const chatBody = document.getElementById('chatBody');
  const msg = document.createElement('div');
  msg.className = `msg ${tipo}`;
  msg.textContent = texto;
  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
}

