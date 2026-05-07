// ============================================================
// TOAST NOTIFICATION SYSTEM (Componente 1)
// Substitui todos os alert() por notificações visuais
// ============================================================
(function criarToastContainer() {
  if (document.querySelector('.toast-container')) return;
  const container = document.createElement('div');
  container.className = 'toast-container';
  container.id = 'toastContainer';
  document.body.appendChild(container);
})();

function mostrarToast(mensagem, tipo = 'info', duracao = 4000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }

  const icones = { sucesso: '✅', erro: '❌', info: 'ℹ️', aviso: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.innerHTML = `
    <span class="toast-icone">${icones[tipo] || 'ℹ️'}</span>
    <span>${mensagem}</span>
    <button class="toast-fechar" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('saindo');
    setTimeout(() => toast.remove(), 300);
  }, duracao);
}

// ============================================================
// CPF INLINE VALIDATION (Componente 3 — RN-02)
// Valida CPF em tempo real enquanto o usuário digita
// ============================================================
function validarCpfInline(input, hintId) {
  const cpf = somenteDigitos(input.value);
  const hint = document.getElementById(hintId);
  
  input.classList.remove('cpf-valido', 'cpf-invalido');
  if (hint) { hint.textContent = ''; hint.className = 'field-hint'; }

  if (cpf.length < 11) return;

  if (!cpfValido(cpf)) {
    input.classList.add('cpf-invalido');
    if (hint) {
      hint.textContent = '❌ CPF inválido. Verifique os dígitos.';
      hint.className = 'field-hint error';
    }
    return false;
  }

  // Verificar duplicidade no cadastro
  const usuarios = lerJson(STORAGE_KEYS.usuarios, []);
  const duplicado = usuarios.some(u => u.cpf === cpf);

  if (duplicado && (hintId === 'cadCpfHint' || hintId === 'cadCpfAdolHint')) {
    input.classList.add('cpf-invalido');
    if (hint) {
      hint.textContent = '⚠️ CPF já utilizado. Faça login.';
      hint.className = 'field-hint error';
    }
    return false;
  }

  input.classList.add('cpf-valido');
  if (hint) {
    hint.textContent = '✅ CPF válido';
    hint.className = 'field-hint success';
  }
  return true;
}

// ============================================================
// HEADER DINÂMICO (Componente 2 — RN-04)
// Atualiza header conforme estado de autenticação
// ============================================================
function atualizarHeader() {
  const usuario = lerJson(STORAGE_KEYS.usuarioAtual, null);
  const authButtons = document.querySelectorAll('.auth-buttons');

  authButtons.forEach(container => {
    if (usuario && usuario.nome) {
      const primeiroNome = usuario.nome.split(' ')[0];
      container.innerHTML = `
        <span style="font-weight:700; color:var(--verde-principal); font-size:14px;">Olá, ${primeiroNome} 👤</span>
        <a class="btn btn-light" href="area-paciente.html">Minha área</a>
        <button class="btn btn-primary" onclick="fazerLogout()">Sair</button>
      `;
    } else {
      const pagina = paginaAtual();
      const cadastroHref = pagina === 'index.html' ? '#' : 'index.html?modal=cadastro';
      const loginHref = pagina === 'index.html' ? '#' : 'index.html?modal=login';
      const cadastroOnclick = pagina === 'index.html' ? 'onclick="abrirModalCadastro(); return false;"' : '';
      const loginOnclick = pagina === 'index.html' ? 'onclick="abrirModalLogin(); return false;"' : '';
      container.innerHTML = `
        <a class="btn btn-light" href="${loginHref}" ${loginOnclick}>Entrar</a>
        <a class="btn btn-primary" href="${cadastroHref}" ${cadastroOnclick}>Cadastrar</a>
      `;
    }
  });
}

function fazerLogout() {
  localStorage.removeItem(STORAGE_KEYS.usuarioAtual);
  mostrarToast('Sessão encerrada com sucesso.', 'sucesso');
  setTimeout(() => { window.location.href = 'index.html'; }, 600);
}

// ============================================================
// GUARD DE AUTENTICAÇÃO (Componente 4 — RN-01)
// Verifica login antes de permitir agendamento
// ============================================================
function verificarAuthParaAgendamento() {
  const usuario = lerJson(STORAGE_KEYS.usuarioAtual, null);
  if (!usuario || !usuario.cpf) {
    mostrarToast('Faça login ou crie uma conta para agendar.', 'aviso');
    setTimeout(() => {
      if (paginaAtual() === 'index.html') {
        abrirModalLogin();
      } else {
        window.location.href = 'index.html?modal=login';
      }
    }, 800);
    return false;
  }
  return true;
}

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

const examesInfo = [
  {
    titulo: 'Eletroencefalograma (EEG)',
    texto: 'Avalia a atividade elétrica cerebral. Auxilia na investigação de crises epilépticas, epilepsia e alterações neurológicas.',
    duracao: '~40 min',
    preparo: ['Não usar gel, spray ou pomada no cabelo', 'Lavar e secar bem o cabelo no dia do exame', 'Evitar cafeína nas 24h anteriores'],
    contraindica: ''
  },
  {
    titulo: 'Eletroneuromiografia (ENMG)',
    texto: 'Avalia nervos e músculos em casos de dor, fraqueza, formigamento e perda de força.',
    duracao: '~60 min',
    preparo: ['Não usar cremes ou óleos na pele', 'Levar exames anteriores, se houver'],
    contraindica: ''
  },
  {
    titulo: 'Polissonografia',
    texto: 'Exame do sono usado para investigar ronco, apneia, insônia, sonolência e sono agitado.',
    duracao: 'Noite inteira',
    preparo: ['Evitar cafeína no dia do exame', 'Levar roupa confortável para dormir'],
    contraindica: ''
  },
  {
    titulo: 'Doppler Transcraniano',
    texto: 'Avalia o fluxo sanguíneo cerebral e pode auxiliar em investigações vasculares neurológicas.',
    duracao: '~30 min',
    preparo: ['Não há preparo obrigatório', 'Chegar com 15 minutos de antecedência'],
    contraindica: ''
  },
  {
    titulo: 'Ressonância Magnética',
    texto: 'Exame de imagem usado para investigar estruturas do cérebro e da coluna com alta precisão.',
    duracao: '~45 min',
    preparo: ['Remover objetos metálicos', 'Informar implantes, marca-passo ou claustrofobia antes do exame'],
    contraindica: 'Portadores de marca-passo ou implantes metálicos devem informar a equipe antes do exame.'
  },
  {
    titulo: 'Potencial Evocado',
    texto: 'Avalia respostas das vias neurais a estímulos visuais, auditivos ou sensitivos.',
    duracao: '~60 min',
    preparo: ['Cabelo limpo e seco', 'Evitar maquiagem ou cremes na região avaliada'],
    contraindica: ''
  }
];

function selecionarExame(index) {
  const titulo = document.getElementById('examInfoTitle');
  const texto = document.getElementById('examInfoText');
  const meta = document.getElementById('examMeta');
  const prep = document.getElementById('examPrep');
  const prepList = document.getElementById('examPrepList');
  const contra = document.getElementById('examContra');
  const contraText = document.getElementById('examContraText');
  const stickers = document.querySelectorAll('.exam-sticker');
  const exame = examesInfo[index];

  if (!titulo || !texto || !exame) return;

  titulo.textContent = exame.titulo;
  texto.textContent = exame.texto;

  if (meta) {
    meta.innerHTML = `<span>⏱ ${exame.duracao}</span><span class="tag">${exame.preparo.length ? 'Preparo necessário' : 'Sem preparo obrigatório'}</span>`;
  }

  if (prep && prepList) {
    prep.classList.toggle('hidden', !exame.preparo.length);
    prepList.innerHTML = exame.preparo.map(item => `<li>${item}</li>`).join('');
  }

  if (contra && contraText) {
    contra.classList.toggle('hidden', !exame.contraindica);
    contraText.textContent = exame.contraindica;
  }

  stickers.forEach((sticker, i) => sticker.classList.toggle('active', i === index));
}

const textosPaciente = {
  cpf: { titulo: 'Cadastro com CPF', texto: 'Informe CPF, nome completo, data de nascimento, telefone e e-mail. Depois aceite os termos de uso para ativar sua central.' },
  dependentes: { titulo: 'Gestão de dependentes', texto: 'Adicione filhos, pais idosos ou responsáveis. Assim você acompanha consultas e exames da família em um só lugar.' },
  anamnese: { titulo: 'Anamnese digital', texto: 'Antes da consulta, responda sintomas, histórico, medicamentos e queixas principais para agilizar o atendimento.' },
  checkin: { titulo: 'Check-in QR Code', texto: 'No dia da consulta, o QR Code do paciente pode ser validado pela recepção para registrar a chegada.' },
  fila: { titulo: 'Fila de espera', texto: 'Se não houver horário disponível, você pode entrar na fila e receber aviso por WhatsApp e SMS quando surgir desistência.' },
  consulta: { titulo: 'Sala virtual para consulta online', texto: 'O sistema testa câmera, microfone e internet antes da consulta. No horário marcado, o paciente entra por um link seguro.' }
};

function abrirModalPaciente(tipo) {
  const modal = document.getElementById('modalPaciente');
  const titulo = document.getElementById('modalTitulo');
  const texto = document.getElementById('modalTexto');
  const conteudo = textosPaciente[tipo];

  if (!modal || !conteudo) return;

  titulo.textContent = conteudo.titulo;
  texto.textContent = conteudo.texto;
  modal.classList.add('open');
}

function fecharModalPaciente() {
  const modal = document.getElementById('modalPaciente');
  if (modal) modal.classList.remove('open');
}


// API pública usada: ViaCEP.
// Ela consulta o CEP, pega cidade/UF/bairro e abre o mapa da região com uma busca de hospital.
function mascararCep(input) {
  let valor = input.value.replace(/\D/g, '').slice(0, 8);
  if (valor.length > 5) valor = valor.replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
  input.value = valor;
}

async function pesquisarCepAPI(inputId = 'cepBusca') {
  const input = document.getElementById(inputId) || document.getElementById('cepBusca') || document.getElementById('ruaBusca');
  if (!input) return;
  const resultado = document.getElementById('resultadoCep');
  const mapaBox = document.getElementById('mapaBox');
  const mapaIframe = document.getElementById('mapaIframe');
  const cep = input.value.replace(/\D/g, '');

  if (!resultado || !mapaBox || !mapaIframe) {
    const grid = document.getElementById('unidadesDisponiveis');
    if (grid && cep.length === 8 && typeof NL_UNIDADES !== 'undefined') {
      const unidades = NL_UNIDADES.filter(unidade => unidade.modalidades && !unidade.modalidades.every(m => m === 'TELE'));
      grid.classList.remove('hidden');
      grid.innerHTML = unidades.map((unidade, index) => `
        <div class="unidade-card ${index === 0 ? 'recomendada' : ''}" onclick="selecionarUnidade('${unidade.nome.replace(/'/g, "\\'")}', '${unidade.endereco.replace(/'/g, "\\'")}')">
          <strong>${nlSafeText(unidade.nome)}</strong>
          <small>${nlSafeText(unidade.endereco)}</small>
          <div class="tags" style="margin-top:8px;">${(unidade.coberturas || []).map(c => `<span class="tag">${nlSafeText(c)}</span>`).join('')}</div>
        </div>
      `).join('');
      return;
    }
    return pesquisarPorRua(inputId);
  }

  if (!cep || cep.length !== 8) {
    resultado.classList.remove('loading');
    resultado.innerHTML = 'Digite um CEP válido com 8 números. Ex: 09015-000.';
    mapaBox.classList.add('hidden');
    return;
  }

  resultado.classList.add('loading');
  resultado.innerHTML = 'Consultando CEP na API ViaCEP...';

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const dados = await resposta.json();

    if (dados.erro) {
      resultado.classList.remove('loading');
      resultado.innerHTML = '<strong>CEP não encontrado.</strong><br>Confira os números e tente novamente.';
      mapaBox.classList.add('hidden');
      return;
    }

    const logradouro = dados.logradouro || '';
    const enderecoCompleto = [logradouro, dados.bairro, dados.localidade, dados.uf].filter(Boolean).join(' - ');
    const endereco = `${dados.localidade} ${dados.uf} ${dados.bairro || ''}`.trim();
    const ruaBusca = document.getElementById('ruaBusca');
    if (ruaBusca && dados.logradouro) {
      ruaBusca.value = [dados.logradouro, dados.bairro].filter(Boolean).join(', ');
      ruaBusca.dataset.cep = cep;
    }
    const buscaMapa = encodeURIComponent(`hospital NeuroLab Center próximo de ${endereco}`);
    const linkMapa = `https://www.google.com/maps/search/?api=1&query=${buscaMapa}`;
    const embedMapa = `https://maps.google.com/maps?q=${buscaMapa}&output=embed`;

    resultado.classList.remove('loading');
    resultado.innerHTML = `
      <strong>Região encontrada: ${dados.localidade} - ${dados.uf}</strong><br>
      Bairro: ${dados.bairro || 'não informado'}<br>
      Endereço base: ${enderecoCompleto || 'não informado'}<br><br>
      Unidade sugerida: <strong>Hospital NeuroLab Center da região</strong><br>
      <a class="map-link" href="${linkMapa}" target="_blank">Abrir mapa em tela cheia →</a>
    `;

    mapaIframe.src = embedMapa;
    mapaBox.classList.remove('hidden');
  } catch (erro) {
    resultado.classList.remove('loading');
    resultado.innerHTML = '<strong>Erro ao consultar o CEP.</strong><br>Verifique sua internet ou tente novamente mais tarde.';
    mapaBox.classList.add('hidden');
  }
}

function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function nlEnderecoPartes(valor) {
  const texto = (valor || '').trim().replace(/\s+/g, ' ');
  const digitos = somenteDigitos(texto);
  const temLetra = /[A-Za-zÀ-ÿ]/.test(texto);
  const cep = digitos.length >= 8 && !temLetra ? digitos.slice(0, 8) : '';
  const numeroMatch = !cep ? texto.match(/(?:,\s*|\s+)(\d{1,6}[A-Za-z]?)\s*$/) : null;
  const numero = numeroMatch ? numeroMatch[1] : '';
  const ruaBase = numeroMatch ? texto.slice(0, numeroMatch.index).replace(/[,\s]+$/, '') : texto;

  return {
    texto,
    cep,
    numero,
    ruaBase,
    busca: cep ? texto : (numero ? `${ruaBase} ${numero}` : texto)
  };
}

function nlEnderecoEhCep(valor) {
  return Boolean(nlEnderecoPartes(valor).cep);
}

// Compatibilidade com botões antigos
function pesquisarCidade() {
  pesquisarCepAPI();
}

function pesquisarEnderecoInteligente(inputId = 'ruaBusca') {
  const input = document.getElementById(inputId);
  const valor = (input?.value || '').trim();
  if (!valor) return;
  if (nlEnderecoEhCep(valor)) return pesquisarCepAPI(inputId);
  return pesquisarPorRua(inputId);
}

function pesquisarPorRua(inputId = 'ruaBusca') {
  const input = document.getElementById(inputId) || document.getElementById('ruaBusca');
  const resultado = document.getElementById('resultadoCep');
  const mapaBox = document.getElementById('mapaBox');
  const mapaIframe = document.getElementById('mapaIframe');
  const termo = (input?.value || '').trim();

  if (!termo || termo.length < 3) {
    resultado.innerHTML = 'Digite pelo menos 3 letras do nome da rua, avenida ou bairro.';
    mapaBox.classList.add('hidden');
    return;
  }

  const partesEndereco = nlEnderecoPartes(termo);
  const termoNorm = normalizarTexto(partesEndereco.ruaBase || termo);

  // Tenta encontrar unidade cujo endereço bate com o termo digitado
  const unidadeEncontrada = NL_UNIDADES.find(unidade =>
    normalizarTexto(unidade.endereco).includes(termoNorm) ||
    normalizarTexto(unidade.nome).includes(termoNorm)
  );

  if (unidadeEncontrada) {
    const buscaMapa = encodeURIComponent(unidadeEncontrada.endereco);
    const linkMapa = `https://www.google.com/maps/search/?api=1&query=${buscaMapa}`;
    const embedMapa = unidadeEncontrada.mapa || `https://maps.google.com/maps?q=${buscaMapa}&output=embed`;

    resultado.innerHTML = `
      <strong>Unidade encontrada: ${unidadeEncontrada.nome}</strong><br>
      Endereço: ${unidadeEncontrada.endereco}<br><br>
      <a class="map-link" href="${linkMapa}" target="_blank">Abrir mapa em tela cheia →</a>
    `;

    if (embedMapa) {
      mapaIframe.src = embedMapa;
      mapaBox.classList.remove('hidden');
    } else {
      mapaBox.classList.add('hidden');
    }
  } else {
    // Busca genérica no Google Maps com o termo + NeuroLab
    const buscaMapa = encodeURIComponent(`NeuroLab Center ${partesEndereco.busca} Santo André SP`);
    const linkMapa = `https://www.google.com/maps/search/?api=1&query=${buscaMapa}`;
    const embedMapa = `https://maps.google.com/maps?q=${buscaMapa}&output=embed`;

    resultado.innerHTML = `
      <strong>Buscando por: "${partesEndereco.busca}"</strong><br>
      Nenhuma unidade NeuroLab encontrada nesse endereço. Veja as unidades mais próximas no mapa ou confira nossa lista abaixo.<br><br>
      <a class="map-link" href="${linkMapa}" target="_blank">Ver no Google Maps →</a>
    `;
    mapaIframe.src = embedMapa;
    mapaBox.classList.remove('hidden');
  }
}


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

// ============================================================
// NAVEGAÇÃO, MODAIS E FLUXOS DO PACIENTE
// ============================================================
const STORAGE_KEYS = {
  usuarios: 'neurolab_usuarios',
  usuarioAtual: 'neurolab_usuario_atual',
  agendamentos: 'neurolab_agendamentos',
  fila: 'neurolab_fila_espera',
  avaliacoes: 'neurolab_avaliacoes',
  recuperacao: 'neurolab_recuperacao_senha'
};

const PBKDF2_ITER = 210000;

function bufToB64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function b64ToBuf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function criarCredencialSenha(senhaPlain) {
  const enc = new TextEncoder().encode(senhaPlain);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return {
    pwdKdf: {
      algo: 'PBKDF2-SHA256',
      iter: PBKDF2_ITER,
      saltB64: bufToB64(salt),
      hashB64: bufToB64(new Uint8Array(bits))
    }
  };
}

async function senhaCorrespondeCredencial(usuario, senhaPlain) {
  if (usuario.senha && typeof usuario.senha === 'string') {
    return senhaPlain === usuario.senha;
  }
  const kdf = usuario.pwdKdf;
  if (!kdf?.saltB64 || !kdf.hashB64 || !Number(kdf.iter)) return false;
  const enc = new TextEncoder().encode(senhaPlain);
  const salt = b64ToBuf(kdf.saltB64);
  const esperado = b64ToBuf(kdf.hashB64);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: kdf.iter, hash: 'SHA-256' },
    keyMaterial,
    esperado.length * 8
  );
  const obtido = new Uint8Array(bits);
  if (obtido.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < obtido.length; i++) diff |= obtido[i] ^ esperado[i];
  return diff === 0;
}

let cadastroTipoAtual = 'adulto';
let loginEtapa = 'cpf';
let agendamentoPasso = 1;
let agendamentoAtual = {};
let holdInterval = null;
let holdExpiraEm = null;
let avaliacaoAtual = { medico: 0, recepcao: 0, agendamento: 0, nps: null };

function $(id) {
  return document.getElementById(id);
}

function lerJson(chave, fallback) {
  try {
    return JSON.parse(localStorage.getItem(chave)) ?? fallback;
  } catch (erro) {
    return fallback;
  }
}

function salvarJson(chave, valor) {
  localStorage.setItem(chave, JSON.stringify(valor));
}

function somenteDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function paginaAtual() {
  const arquivo = window.location.pathname.split('/').pop() || 'index.html';
  return arquivo.toLowerCase();
}

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

function mascararCpf(input) {
  let valor = somenteDigitos(input.value).slice(0, 11);
  valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
  valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
  valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  input.value = valor;
}

function mascararTelefone(input) {
  let valor = somenteDigitos(input.value).slice(0, 11);
  if (valor.length > 10) {
    valor = valor.replace(/^(\d{2})(\d{5})(\d{1,4})$/, '($1) $2-$3');
  } else if (valor.length > 6) {
    valor = valor.replace(/^(\d{2})(\d{4})(\d{1,4})$/, '($1) $2-$3');
  } else if (valor.length > 2) {
    valor = valor.replace(/^(\d{2})(\d{1,5})$/, '($1) $2');
  }
  input.value = valor;
}

function cpfValido(cpfEntrada) {
  const cpf = somenteDigitos(cpfEntrada);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  const calcularDigito = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(cpf.slice(0, 9)) === Number(cpf[9]) &&
    calcularDigito(cpf.slice(0, 10)) === Number(cpf[10]);
}

function idadeEmAnos(dataIso) {
  if (!dataIso) return null;
  const nascimento = new Date(`${dataIso}T00:00:00`);
  if (Number.isNaN(nascimento.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade;
}

function senhaValida(senha) {
  return /[A-Za-z]/.test(senha) && /\d/.test(senha) && String(senha).length >= 8;
}

function nomeCompletoValido(nome) {
  return String(nome || '').trim().split(/\s+/).length >= 2;
}

function setHint(id, mensagem, tipo = 'info') {
  const el = $(id);
  if (!el) return;
  el.textContent = mensagem;
  el.className = `field-hint ${tipo}`;
}

function switchCadastro(tipo) {
  cadastroTipoAtual = tipo;
  $('formAdulto')?.style.setProperty('display', tipo === 'adulto' ? 'block' : 'none');
  $('formAdolescente')?.style.setProperty('display', tipo === 'adolescente' ? 'block' : 'none');
  $('tabAdulto')?.classList.toggle('active', tipo === 'adulto');
  $('tabAdolescente')?.classList.toggle('active', tipo === 'adolescente');
  setHint('cadGeralHint', '');
}

async function realizarCadastro() {
  const usuarios = lerJson(STORAGE_KEYS.usuarios, []);
  const termos = $('cadTermos')?.checked;
  const isAdulto = cadastroTipoAtual === 'adulto';
  const dados = isAdulto
    ? {
        cpf: $('cadCpf')?.value,
        nascimento: $('cadNascimento')?.value,
        nome: $('cadNome')?.value,
        celular: $('cadCelular')?.value,
        email: $('cadEmail')?.value,
        senha: $('cadSenha')?.value,
        senhaConfirm: $('cadSenhaConfirm')?.value,
        tipo: 'adulto'
      }
    : {
        cpf: $('cadCpfAdol')?.value,
        nascimento: $('cadNascAdol')?.value,
        nome: $('cadNomeAdol')?.value,
        celular: $('cadCelAdol')?.value,
        cpfResponsavel: $('cadCpfResp')?.value,
        senha: $('cadSenhaAdol')?.value,
        senhaConfirm: $('cadSenhaAdol')?.value,
        tipo: 'adolescente'
      };

  const cpf = somenteDigitos(dados.cpf);
  const idade = idadeEmAnos(dados.nascimento);

  if (!cpfValido(cpf)) return setHint('cadGeralHint', 'CPF inválido. Verifique os números digitados.', 'error');
  if (usuarios.some(usuario => usuario.cpf === cpf)) return setHint('cadGeralHint', 'CPF já utilizado. Faça login.', 'error');
  if (!nomeCompletoValido(dados.nome)) return setHint('cadGeralHint', 'Informe o nome completo com pelo menos duas palavras.', 'error');
  if (idade === null) return setHint('cadGeralHint', 'Informe uma data de nascimento válida.', 'error');
  if (isAdulto && idade < 18) return setHint('cadGeralHint', 'Use a aba Adolescente para pacientes de 16 a 17 anos.', 'error');
  if (!isAdulto && (idade < 16 || idade > 17)) return setHint('cadGeralHint', 'A conta adolescente é permitida apenas para 16 ou 17 anos.', 'error');
  if (!isAdulto && !cpfValido(dados.cpfResponsavel)) return setHint('cadGeralHint', 'Informe um CPF de responsável válido.', 'error');
  if (somenteDigitos(dados.celular).length < 10) return setHint('cadGeralHint', 'Informe um celular válido com DDD.', 'error');
  if (!senhaValida(dados.senha)) return setHint('cadGeralHint', 'A senha precisa ter 8 caracteres, uma letra e um número.', 'error');
  if (dados.senha !== dados.senhaConfirm) return setHint('cadGeralHint', 'As senhas não conferem.', 'error');
  if (!termos) return setHint('cadGeralHint', 'Aceite os Termos de Uso e Política de Privacidade para criar a conta.', 'error');

  let pwdCredencial;
  try {
    pwdCredencial = await criarCredencialSenha(dados.senha);
  } catch (_) {
    return setHint('cadGeralHint', 'Não foi possível criar a credencial. Atualize o navegador e tente de novo.', 'error');
  }

  const usuario = {
    cpf,
    nome: dados.nome.trim(),
    nascimento: dados.nascimento,
    celular: dados.celular,
    email: dados.email || '',
    ...pwdCredencial,
    tipo: dados.tipo,
    cpfResponsavel: somenteDigitos(dados.cpfResponsavel),
    whatsapp: Boolean($('cadWhatsapp')?.checked),
    tentativas: 0,
    bloqueadoAte: 0,
    criadoEm: new Date().toISOString()
  };

  usuarios.push(usuario);
  salvarJson(STORAGE_KEYS.usuarios, usuarios);
  salvarJson(STORAGE_KEYS.usuarioAtual, { cpf, nome: usuario.nome });
  limparRascunhoCadastro();
  setHint('cadGeralHint', 'Conta criada com sucesso. Login automático realizado.', 'success');

  setTimeout(() => {
    fecharModal('modalCadastro');
    navegarPara('area-paciente.html');
  }, 700);
}

async function avancarLogin() {
  const cpf = somenteDigitos($('loginCpf')?.value);
  const usuarios = lerJson(STORAGE_KEYS.usuarios, []);
  const usuario = usuarios.find(item => item.cpf === cpf);

  if (loginEtapa === 'cpf') {
    if (!cpfValido(cpf)) return setHint('loginCpfHint', 'CPF inválido. Verifique os números digitados.', 'error');
    if (!usuario) return setHint('loginCpfHint', 'CPF não encontrado. Verifique o número ou crie uma conta.', 'error');

    $('loginSenhaGroup')?.classList.remove('hidden');
    $('btnLoginProximo').textContent = 'Entrar';
    setHint('loginCpfHint', 'CPF encontrado. Digite sua senha.', 'success');
    loginEtapa = 'senha';
    $('loginSenha')?.focus();
    return;
  }

  if (!usuario) return;
  const agora = Date.now();
  if (usuario.bloqueadoAte && usuario.bloqueadoAte > agora) {
    const minutos = Math.ceil((usuario.bloqueadoAte - agora) / 60000);
    const box = $('loginBloqueio');
    if (box) {
      box.textContent = `Conta bloqueada por segurança. Tente novamente em ${minutos} min.`;
      box.classList.remove('hidden');
    }
    return;
  }

  const senha = $('loginSenha')?.value || '';
  let senhaOk;
  try {
    senhaOk = await senhaCorrespondeCredencial(usuario, senha);
  } catch (_) {
    setHint('loginSenhaHint', 'Ambiente impediu verificação segura da senha. Use HTTPS ou outro navegador.', 'error');
    return;
  }
  if (!senhaOk) {
    usuario.tentativas = (usuario.tentativas || 0) + 1;
    if (usuario.tentativas >= 3) {
      usuario.bloqueadoAte = Date.now() + 15 * 60 * 1000;
      usuario.tentativas = 0;
      setHint('loginSenhaHint', 'Conta bloqueada por 15 minutos após 3 tentativas incorretas.', 'error');
    } else {
      setHint('loginSenhaHint', `Senha incorreta. Tentativas restantes: ${3 - usuario.tentativas}.`, 'error');
    }
    salvarJson(STORAGE_KEYS.usuarios, usuarios);
    return;
  }

  if (usuario.senha) {
    try {
      const cred = await criarCredencialSenha(senha);
      usuario.pwdKdf = cred.pwdKdf;
      delete usuario.senha;
      salvarJson(STORAGE_KEYS.usuarios, usuarios);
    } catch (_) {
      setHint('loginSenhaHint', 'Login ok, mas não foi possível migrar a senha para formato seguro. Tente novamente.', 'error');
      return;
    }
  }

  usuario.tentativas = 0;
  usuario.bloqueadoAte = 0;
  salvarJson(STORAGE_KEYS.usuarios, usuarios);
  salvarJson(STORAGE_KEYS.usuarioAtual, { cpf: usuario.cpf, nome: usuario.nome });
  setHint('loginSenhaHint', 'Login realizado com sucesso.', 'success');

  setTimeout(() => {
    fecharModal('modalLogin');
    navegarPara('area-paciente.html');
  }, 500);
}

function enviarRecuperacao() {
  const cpf = somenteDigitos($('recCpf')?.value);
  const usuarios = lerJson(STORAGE_KEYS.usuarios, []);
  if (!cpfValido(cpf)) return setHint('recHint', 'CPF inválido. Verifique os números digitados.', 'error');
  if (!usuarios.some(usuario => usuario.cpf === cpf)) return setHint('recHint', 'CPF não encontrado. Verifique o número ou crie uma conta.', 'error');

  const agora = Date.now();
  const registros = lerJson(STORAGE_KEYS.recuperacao, {});
  const recentes = (registros[cpf] || []).filter(item => agora - item < 60 * 60 * 1000);
  if (recentes.length >= 3) return setHint('recHint', 'Muitas tentativas. Aguarde 1 hora antes de tentar novamente.', 'error');

  recentes.push(agora);
  registros[cpf] = recentes;
  salvarJson(STORAGE_KEYS.recuperacao, registros);
  setHint('recHint', 'Link de recuperação enviado pelo canal prioritário disponível. Ele expira em 2 horas.', 'success');
}

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

// CARROSSEL DA ÁREA PRINCIPAL
let slideAtual = 0;
const totalSlides = 3;

function atualizarCarrossel() {
  const track = document.getElementById('carouselTrack');
  const dots = document.querySelectorAll('.dot');

  if (!track) return;

  track.style.transform = `translateX(-${slideAtual * 100}%)`;
  dots.forEach((dot, index) => dot.classList.toggle('active', index === slideAtual));
}

function mudarSlide(direcao) {
  slideAtual += direcao;
  if (slideAtual < 0) slideAtual = totalSlides - 1;
  if (slideAtual >= totalSlides) slideAtual = 0;
  atualizarCarrossel();
}

function irParaSlide(numero) {
  slideAtual = numero;
  atualizarCarrossel();
}

setInterval(() => mudarSlide(1), 4500);

// FUNDO ANIMADO COM MOUSE
const canvas = document.getElementById('bgCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];
let mouse = { x: null, y: null };

function resizeCanvas() {
  if (!canvas) return;
  const hero = document.querySelector('.hero');
  canvas.width = window.innerWidth;
  canvas.height = hero ? hero.offsetHeight : 600;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

window.addEventListener('mousemove', function(e) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 3 + 1;
    this.speedX = Math.random() * 1 - 0.5;
    this.speedY = Math.random() * 1 - 0.5;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
    if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;

    if (mouse.x !== null && mouse.y !== null) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 130) {
        this.x -= dx * 0.012;
        this.y -= dy * 0.012;
      }
    }
  }

  draw() {
    ctx.fillStyle = 'rgba(0,116,118,0.42)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initParticles() {
  if (!canvas) return;
  particles = [];
  for (let i = 0; i < 120; i++) particles.push(new Particle());
}

function ligarPontos() {
  for (let a = 0; a < particles.length; a++) {
    for (let b = a; b < particles.length; b++) {
      const dx = particles[a].x - particles[b].x;
      const dy = particles[a].y - particles[b].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 95) {
        ctx.strokeStyle = `rgba(72,163,167,${1 - dist / 95})`;
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(particles[a].x, particles[a].y);
        ctx.lineTo(particles[b].x, particles[b].y);
        ctx.stroke();
      }
    }
  }
}

function animateParticles() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  ligarPontos();
  requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

/* ============================================================
   NEUROLAB UX REFRESH - navegacao, calendario e modulos
   ============================================================ */
window.NLUX = {
  calendarOffset: 0,
  selectedDateISO: '',
  selectedSlot: '',
  portalTab: 'historico'
};

const NL_UNIDADES = [
  {
    nome: 'Santo André - Centro',
    endereco: 'R. Amazonas, 48 - Centro, Santo André - SP',
    distancia: '2,1 km',
    coberturas: ['Particular', 'Convênio', 'SUS'],
    modalidades: ['CONS-ADULT', 'CONS-INF', 'EXAM', 'TELE'],
    convenios: ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil', 'Porto Seguro Saúde'],
    mapa: 'https://maps.google.com/maps?q=Rua%20Amazonas%2048%20Santo%20Andre%20SP&output=embed'
  },
  {
    nome: 'São Bernardo - Jardim do Mar',
    endereco: 'Av. Kennedy, 303 - Jardim do Mar, São Bernardo do Campo - SP',
    distancia: '8,4 km',
    coberturas: ['Particular', 'Convênio'],
    modalidades: ['CONS-ADULT', 'CONS-INF', 'TELE'],
    convenios: ['Unimed', 'Amil', 'NotreDame Intermédica', 'Bradesco Saúde'],
    mapa: 'https://maps.google.com/maps?q=Av%20Kennedy%20303%20Sao%20Bernardo%20SP&output=embed'
  },
  {
    nome: 'Santo André - Vila Pires',
    endereco: 'R. Senador Fláquer, 512 - Vila Pires, Santo André - SP',
    distancia: '3,8 km',
    coberturas: ['Particular', 'Convênio'],
    modalidades: ['CONS-ADULT', 'CONS-INF', 'EXAM'],
    convenios: ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil'],
    mapa: 'https://maps.google.com/maps?q=Rua+Senador+Flaquer+512+Santo+Andre+SP&output=embed'
  }
];

const NL_MEDICOS = [
  {
    nome: 'Dra. Ana Beatriz Ferreira',
    crm: 'CRM/SP 84.201',
    especialidade: 'Neurologia Geral e Epilepsia',
    rating: 4.9,
    avaliacoes: 127,
    unidades: ['Santo André - Centro'],
    coberturas: ['Particular', 'Convênio', 'SUS'],
    tipos: ['CONS-ADULT', 'TELE']
  },
  {
    nome: 'Dr. Carlos Eduardo Moura',
    crm: 'CRM/SP 67.453',
    especialidade: 'Sono, cefaleia e teleconsulta',
    rating: 4.7,
    avaliacoes: 89,
    unidades: ['Santo André - Centro', 'São Bernardo - Jardim do Mar'],
    coberturas: ['Particular', 'Convênio'],
    tipos: ['CONS-ADULT', 'TELE', 'EXAM']
  },
  {
    nome: 'Dra. Fernanda Lima Costa',
    crm: 'CRM/SP 91.077',
    especialidade: 'Neuropediatria e desenvolvimento',
    rating: 4.8,
    avaliacoes: 203,
    unidades: ['Santo André - Centro', 'São Bernardo - Jardim do Mar'],
    coberturas: ['Particular', 'Convênio'],
    tipos: ['CONS-INF', 'EXAM']
  },
  {
    nome: 'Dr. Rafael Nogueira',
    crm: 'CRM/SP 76.118',
    especialidade: 'Exames neurofisiológicos',
    rating: 4.8,
    avaliacoes: 74,
    unidades: ['Santo André - Centro'],
    coberturas: ['Particular', 'Convênio', 'SUS'],
    tipos: ['EXAM']
  }
];

const NL_PLANOS = [
  { nome: 'Unimed', unidades: ['Santo André - Centro', 'São Bernardo - Jardim do Mar'], servicos: ['Consulta', 'Exames', 'Teleconsulta'] },
  { nome: 'Bradesco Saúde', unidades: ['Santo André - Centro', 'São Bernardo - Jardim do Mar'], servicos: ['Consulta', 'Teleconsulta'] },
  { nome: 'SulAmérica', unidades: ['Santo André - Centro'], servicos: ['Consulta', 'Exames', 'Teleconsulta'] },
  { nome: 'Amil', unidades: ['Santo André - Centro', 'São Bernardo - Jardim do Mar'], servicos: ['Consulta', 'Teleconsulta'] },
  { nome: 'Porto Seguro Saúde', unidades: ['Santo André - Centro'], servicos: ['Consulta', 'Exames'] },
  { nome: 'NotreDame Intermédica', unidades: ['São Bernardo - Jardim do Mar'], servicos: ['Consulta'] }
];

NL_UNIDADES.push(
  {
    nome: 'Moema - Neurodiagnóstico',
    endereco: 'Av. Ibirapuera, 2120 - Moema, São Paulo - SP',
    distancia: '18,6 km',
    coberturas: ['Particular', 'Convênio'],
    modalidades: ['CONS-ADULT', 'EXAM', 'TELE'],
    convenios: ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil', 'Porto Seguro Saúde', 'Omint'],
    mapa: 'https://maps.google.com/maps?q=Av%20Ibirapuera%202120%20Sao%20Paulo%20SP&output=embed',
    imagem: 'img/Diagnpsticos-completos.jpg',
    recursos: ['EEG', 'ENMG', 'Polissonografia', 'Sala de preparo', 'Estacionamento conveniado']
  },
  {
    nome: 'Tatuapé - Neuropediatria',
    endereco: 'R. Itapura, 986 - Tatuapé, São Paulo - SP',
    distancia: '21,4 km',
    coberturas: ['Particular', 'Convênio'],
    modalidades: ['CONS-ADULT', 'CONS-INF', 'EXAM'],
    convenios: ['Unimed', 'Amil', 'NotreDame Intermédica', 'Care Plus', 'Alice'],
    mapa: 'https://maps.google.com/maps?q=Rua%20Itapura%20986%20Sao%20Paulo%20SP&output=embed',
    imagem: 'img/Area-de-espera.jpg',
    recursos: ['Neuropediatria', 'Sala família', 'Exames infantis', 'Acessibilidade']
  },
  {
    nome: 'Paulista - Sono e Cognição',
    endereco: 'Av. Paulista, 171 - Bela Vista, São Paulo - SP',
    distancia: '24,2 km',
    coberturas: ['Particular', 'Convênio'],
    modalidades: ['CONS-ADULT', 'EXAM', 'TELE'],
    convenios: ['SulAmérica', 'Bradesco Saúde', 'Omint', 'Golden Cross', 'Care Plus'],
    mapa: 'https://maps.google.com/maps?q=Av%20Paulista%20171%20Sao%20Paulo%20SP&output=embed',
    imagem: 'img/central-de-saude.jpg',
    recursos: ['Sono', 'Memória', 'Teleconsulta', 'Laudos digitais']
  }
);

NL_MEDICOS.push(
  {
    nome: 'Dra. Marina Azevedo Prado',
    crm: 'CRM/SP 102.884',
    especialidade: 'Cefaleia, enxaqueca e dor neuropática',
    rating: 4.9,
    avaliacoes: 156,
    unidades: ['Moema - Neurodiagnóstico'],
    coberturas: ['Particular', 'Convênio'],
    tipos: ['CONS-ADULT', 'TELE']
  },
  {
    nome: 'Dr. Henrique Vidal Ramos',
    crm: 'CRM/SP 73.904',
    especialidade: 'Memória, cognição e Alzheimer',
    rating: 4.8,
    avaliacoes: 118,
    unidades: ['Paulista - Sono e Cognição'],
    coberturas: ['Particular', 'Convênio'],
    tipos: ['CONS-ADULT', 'TELE']
  },
  {
    nome: 'Dra. Laura Martins Sato',
    crm: 'CRM/SP 88.612',
    especialidade: 'Neuropediatria e desenvolvimento infantil',
    rating: 4.9,
    avaliacoes: 211,
    unidades: ['Tatuapé - Neuropediatria', 'Santo André - Centro'],
    coberturas: ['Particular', 'Convênio'],
    tipos: ['CONS-INF']
  },
  {
    nome: 'Dr. Bruno Paiva Leal',
    crm: 'CRM/SP 69.450',
    especialidade: 'Distúrbios do movimento e Parkinson',
    rating: 4.7,
    avaliacoes: 97,
    unidades: ['Santo André - Centro', 'Paulista - Sono e Cognição'],
    coberturas: ['Particular', 'Convênio', 'SUS'],
    tipos: ['CONS-ADULT']
  }
);

NL_PLANOS.push(
  { nome: 'Care Plus', unidades: ['Tatuapé - Neuropediatria', 'Paulista - Sono e Cognição'], servicos: ['Consulta', 'Exames', 'Teleconsulta'] },
  { nome: 'Omint', unidades: ['Moema - Neurodiagnóstico', 'Paulista - Sono e Cognição'], servicos: ['Consulta', 'Exames'] },
  { nome: 'Golden Cross', unidades: ['Santo André - Centro', 'Paulista - Sono e Cognição'], servicos: ['Consulta', 'Teleconsulta'] },
  { nome: 'Alice', unidades: ['Tatuapé - Neuropediatria'], servicos: ['Consulta', 'Teleconsulta'] },
  { nome: 'Prevent Senior', unidades: ['Santo André - Centro', 'Paulista - Sono e Cognição'], servicos: ['Consulta', 'Exames'] },
  { nome: 'Sompo Saúde', unidades: ['Moema - Neurodiagnóstico', 'Santo André - Centro'], servicos: ['Consulta', 'Exames'] },
  { nome: 'Mediservice', unidades: ['São Bernardo - Jardim do Mar'], servicos: ['Consulta', 'Teleconsulta'] },
  { nome: 'Cassi', unidades: ['Santo André - Centro', 'Moema - Neurodiagnóstico'], servicos: ['Consulta', 'Exames'] }
);

function paginaArquivo() {
  return (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
}

function montarNavbarComum() {
  const menu = document.getElementById('menu');
  if (!menu) return;

  const itens = [
    ['index.html', 'Home'],
    ['sobre.html', 'Sobre'],
    ['especialidades.html', 'Especialidades'],
    ['medicos.html', 'Médicos'],
    ['exames.html', 'Exames'],
    ['unidades.html', 'Unidades'],
    ['convenios.html', 'Convênios'],
    ['teleconsulta.html', 'Teleconsulta']
  ];
  const atual = paginaArquivo();
  menu.innerHTML = `
    ${itens.map(([href, label]) => `<li><a href="${href}" class="${href === atual ? 'active' : ''}">${label}</a></li>`).join('')}
  `;
}

function prepararHomeEnxuta() {
  if (paginaArquivo() !== 'index.html') return;
  document.body.classList.add('home-lite');
  const quick = document.querySelector('.quick-access-section');
  if (!quick || document.querySelector('.home-proof-grid')) return;

  quick.insertAdjacentHTML('afterend', `
    <section class="content-band">
      <div class="container home-proof-grid">
        <div class="proof-panel">
          <span class="quick-access-label">Jornada do paciente</span>
          <h2>Do sintoma ao acompanhamento, sem perder contexto.</h2>
          <p>A NeuroLab reúne consulta presencial, teleconsulta, exames, conta família, notificações e área do paciente em um fluxo único. A página inicial agora apresenta o produto; os detalhes ficam nas páginas internas.</p>
          <ul class="proof-list">
            <li>Agendamento guiado em 6 passos com cobertura, unidade, médico e horário.</li>
            <li>Conta família para responsáveis por menores e dependentes idosos.</li>
            <li>Teleconsulta com sala virtual, teste de câmera e acesso no horário correto.</li>
            <li>Busca por unidade e convênio antes da confirmação final.</li>
          </ul>
        </div>
        <div class="trust-panel">
          <h3>Por que confiar</h3>
          <p>O desenho segue regras de negócio claras: CPF único, LGPD, status de agendamento, hold de horário, limites por CPF, cancelamento e no-show.</p>
          <div class="metric-strip">
            <div><strong>6</strong><span>passos</span></div>
            <div><strong>10</strong><span>minutos de hold</span></div>
            <div><strong>3</strong><span>canais de aviso</span></div>
            <div><strong>LGPD</strong><span>por padrão</span></div>
          </div>
        </div>
      </div>
    </section>
  `);
}

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

function renderConvenios(lista = NL_PLANOS) {
  const grid = document.getElementById('planGrid');
  if (!grid) return;
  grid.innerHTML = lista.map(plano => `
    <div class="plan-card">
      <strong>${plano.nome}</strong>
      <span>${plano.servicos.join(' · ')}</span>
      <div class="tags" style="margin-top:12px;">${plano.unidades.map(unidade => `<span class="tag">${unidade}</span>`).join('')}</div>
    </div>
  `).join('') || '<div class="safe-note">Nenhum convênio encontrado para o filtro informado.</div>';
}

function filtrarConvenios() {
  const termo = normalizarTexto(document.getElementById('planSearch')?.value || '');
  const unidade = document.getElementById('planUnit')?.value || '';
  const filtrados = NL_PLANOS.filter(plano =>
    (!termo || normalizarTexto(plano.nome).includes(termo)) &&
    (!unidade || plano.unidades.some(u => normalizarTexto(u) === normalizarTexto(unidade)))
  );
  renderConveniosMelhorados(filtrados);
}

function aprimorarUnidadesMapas() {
  if (paginaArquivo() !== 'unidades.html') return;
  document.querySelectorAll('.unidade-rica').forEach(card => {
    if (card.querySelector('.map-card')) return;
    const titulo = card.querySelector('h3')?.textContent || '';
    const unidade = NL_UNIDADES.find(item => titulo.includes(item.nome.split(' - ')[0]) || titulo.includes('Teleconsulta'));
    if (!unidade?.mapa) return;
    card.insertAdjacentHTML('beforeend', `<div class="map-card" style="margin-top:16px;"><iframe title="Mapa ${unidade.nome}" loading="lazy" src="${unidade.mapa}"></iframe></div>`);
  });
}

function renderPortalPaciente() {
  if (paginaArquivo() !== 'area-paciente.html') return;
  const section = document.querySelector('.dashboard-grid')?.closest('.container');
  if (!section || document.getElementById('portalUpgrade')) return;
  section.insertAdjacentHTML('beforeend', `
    <div class="portal-panel" id="portalUpgrade" style="margin-top:24px;">
      <h3>Área logada</h3>
      <p>Organização dos dados que o paciente espera encontrar depois do login: histórico, exames, documentos e dependentes.</p>
      <div class="portal-tabs">
        <button class="portal-tab active" onclick="alternarPortalTab('historico', this)">Histórico</button>
        <button class="portal-tab" onclick="alternarPortalTab('exames', this)">Exames</button>
        <button class="portal-tab" onclick="alternarPortalTab('documentos', this)">Documentos</button>
        <button class="portal-tab" onclick="alternarPortalTab('dependentes', this)">Dependentes</button>
      </div>
      <div id="portalContent"></div>
    </div>
  `);
  alternarPortalTab('historico');
}

function alternarPortalTab(tab, botao) {
  window.NLUX.portalTab = tab;
  document.querySelectorAll('.portal-tab').forEach(item => item.classList.remove('active'));
  botao?.classList.add('active');
  const content = document.getElementById('portalContent');
  if (!content) return;

  if (tab === 'historico') {
    content.innerHTML = `
      <div class="portal-grid">
        <div class="portal-card"><strong>Consulta confirmada</strong><span>Dra. Ana Beatriz · 05/Mai · Santo André</span></div>
        <div class="portal-card"><strong>Teleconsulta realizada</strong><span>Dr. Carlos Eduardo · resumo disponível</span></div>
        <div class="portal-card"><strong>Cancelamento</strong><span>Sem penalidade, feito dentro do prazo.</span></div>
      </div>`;
  }
  if (tab === 'exames') {
    content.innerHTML = `
      <div class="portal-grid">
        <div class="portal-card"><strong>EEG solicitado</strong><span>Preparo: cabelo limpo e seco.</span></div>
        <div class="portal-card"><strong>Polissonografia</strong><span>Resultado em análise pela equipe.</span></div>
        <div class="portal-card"><strong>Laudos</strong><span>Arquivos ficam disponíveis por atendimento.</span></div>
      </div>`;
  }
  if (tab === 'documentos') {
    content.innerHTML = `
      <div class="portal-grid">
        <div class="portal-card"><strong>RG ou CNH</strong><span>Upload opcional para agilizar recepção.</span></div>
        <div class="portal-card"><strong>Carteirinha</strong><span>Convênio validado por unidade e médico.</span></div>
        <div class="portal-card"><strong>Laudos anteriores</strong><span>Dados sensíveis, acesso restrito.</span></div>
      </div>`;
  }
  if (tab === 'dependentes') {
    renderDependentes(content);
  }
}

function renderDependentes(content = document.getElementById('portalContent')) {
  const dependentes = lerJson('neurolab_dependentes', [
    { nome: 'Lucas Ferreira', parentesco: 'Filho', idade: '12 anos' },
    { nome: 'Maria Helena', parentesco: 'Mãe', idade: '72 anos' }
  ]);
  content.innerHTML = `
    <div class="portal-grid">
      ${dependentes.map(dep => `<div class="dependent-card"><strong>${dep.nome}</strong><span>${dep.parentesco} · ${dep.idade}</span><button class="btn btn-light" style="margin-top:12px;" onclick="abrirAgendamento()">Agendar para dependente</button></div>`).join('')}
    </div>
    <div class="dependent-form">
      <input id="depNome" placeholder="Nome do dependente" />
      <input id="depInfo" placeholder="Parentesco e idade" />
      <button class="btn btn-primary" onclick="adicionarDependente()">Adicionar</button>
    </div>
  `;
}

function adicionarDependente() {
  const nome = document.getElementById('depNome')?.value.trim();
  const info = document.getElementById('depInfo')?.value.trim();
  if (!nome || !info) {
    alert('Informe nome, parentesco e idade do dependente.');
    return;
  }
  const [parentesco = 'Dependente', idade = ''] = info.split(',').map(item => item.trim());
  const dependentes = lerJson('neurolab_dependentes', []);
  dependentes.push({ nome, parentesco, idade });
  salvarJson('neurolab_dependentes', dependentes);
  renderDependentes();
}

function nlSafeText(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function nlModalidadeLabel(codigo) {
  return {
    'CONS-ADULT': 'Consulta adulto',
    'CONS-INF': 'Neuropediatria',
    'EXAM': 'Exames',
    'TELE': 'Online'
  }[codigo] || codigo;
}

function nlDoctorInitials(nome) {
  return String(nome || '')
    .replace(/^Dr(a)?\.\s*/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map(parte => parte[0])
    .join('')
    .toUpperCase();
}

function nlClassificarEspecialidade(medico) {
  const texto = normalizarTexto(`${medico.especialidade} ${medico.tipos.join(' ')}`);
  if (texto.includes('pediatria') || medico.tipos.includes('CONS-INF')) return 'Neuropediatria';
  if (texto.includes('sono')) return 'Sono e cognição';
  if (texto.includes('exame') || texto.includes('neurofisiologico') || medico.tipos.includes('EXAM')) return 'Exames neurofisiológicos';
  if (texto.includes('cefaleia') || texto.includes('enxaqueca')) return 'Cefaleia e dor';
  if (texto.includes('memoria') || texto.includes('alzheimer') || texto.includes('cognicao')) return 'Memória e cognição';
  if (texto.includes('movimento') || texto.includes('parkinson')) return 'Distúrbios do movimento';
  return 'Neurologia geral';
}

function nlMedicoCard(medico) {
  const unidadePrincipal = medico.unidades[0] || 'Unidade a confirmar';
  return `
    <article class="doctor-profile-card">
      <div class="doctor-profile-top">
        <div class="doctor-photo">${nlDoctorInitials(medico.nome)}</div>
        <div>
          <strong>${nlSafeText(medico.nome)}</strong>
          <span>${nlSafeText(medico.crm)} · ${nlSafeText(medico.especialidade)}</span>
        </div>
      </div>
      <div class="doctor-profile-meta">
        <span>${medico.rating.toFixed(1)} avaliação</span>
        <span>${medico.avaliacoes} opiniões</span>
        <span>${nlSafeText(unidadePrincipal)}</span>
      </div>
      <div class="tags">${medico.coberturas.map(item => `<span class="tag">${nlSafeText(item)}</span>`).join('')}</div>
      <button class="btn btn-primary" onclick="abrirAgendamento()">Agendar com este médico</button>
    </article>
  `;
}

function renderMedicosPage() {
  const pageRoot = document.getElementById('medicosPageRoot');
  const root = pageRoot;
  if (!pageRoot || pageRoot.dataset.medicosEnhanced === 'true') return;
  pageRoot.dataset.medicosEnhanced = 'true';

  const grupos = [...new Set(NL_MEDICOS.map(nlClassificarEspecialidade))];
  const content = `
    <div class="doctor-filter-panel">
      <button class="doctor-filter-chip active" onclick="filtrarMedicosEspecialidade('Todos', this)">Todos</button>
      ${grupos.map(grupo => `<button class="doctor-filter-chip" onclick="filtrarMedicosEspecialidade('${grupo.replace(/'/g, "\\'")}', this)">${grupo}</button>`).join('')}
    </div>
    <div class="doctor-specialty-grid" id="doctorSpecialtyGrid">
      ${NL_MEDICOS.map(medico => `<div data-specialty="${nlClassificarEspecialidade(medico)}">${nlMedicoCard(medico)}</div>`).join('')}
    </div>
  `;

  pageRoot.innerHTML = content;
  return;

  root.innerHTML = `
    <div class="container">
      <div class="section-title">
        <h2>Médicos por especialidade</h2>
        <p>Uma visão clara de quem atende cada linha de cuidado, unidade e modalidade.</p>
      </div>
      ${content}
      <div class="text-center mt-4"><a class="btn btn-light" href="medicos.html">Abrir página completa de médicos</a></div>
    </div>
  `;
}

function filtrarMedicosEspecialidade(especialidade, botao) {
  document.querySelectorAll('.doctor-filter-chip').forEach(chip => chip.classList.remove('active'));
  botao?.classList.add('active');
  document.querySelectorAll('#doctorSpecialtyGrid > div').forEach(card => {
    card.classList.toggle('hidden', especialidade !== 'Todos' && card.dataset.specialty !== especialidade);
  });
}

function renderUnidadesCompleta() {
  if (paginaArquivo() !== 'unidades.html') return;
  const grid = document.querySelector('.unidade-rica')?.parentElement;
  if (!grid || grid.dataset.unitEnhanced === 'true') return;
  grid.dataset.unitEnhanced = 'true';

  grid.className = 'unit-showcase-grid';
  grid.innerHTML = NL_UNIDADES.map((unidade, index) => {
    const imagensClinicas = ['img/Area-de-espera.jpg', 'img/central-de-saude.jpg'];
    const imagem = unidade.imagem && !unidade.imagem.includes('Diagnpsticos')
        ? unidade.imagem
        : imagensClinicas[index % imagensClinicas.length];
    const recursos = unidade.recursos || [
      unidade.modalidades.includes('EXAM') ? 'Exames neurológicos' : 'Consultas presenciais',
      unidade.modalidades.includes('TELE') ? 'Teleconsulta vinculada' : 'Recepção presencial',
      unidade.coberturas.includes('SUS') ? 'Cotas SUS' : 'Convênios privados'
    ];
    return `
      <article class="unit-showcase-card">
        <img src="${imagem}" alt="${nlSafeText(unidade.nome)}" loading="lazy">
        <div class="unit-showcase-body">
          <div class="unit-heading">
            <h3>${nlSafeText(unidade.nome)}</h3>
            <span>${nlSafeText(unidade.distancia)}</span>
          </div>
          <p>${nlSafeText(unidade.endereco)}</p>
          <div class="unit-resource-grid">
            ${recursos.map(recurso => `<span>${nlSafeText(recurso)}</span>`).join('')}
          </div>
          <div class="tags">${unidade.coberturas.map(item => `<span class="tag">${nlSafeText(item)}</span>`).join('')}</div>
          ${unidade.mapa ? `<div class="map-card"><iframe title="Mapa ${nlSafeText(unidade.nome)}" loading="lazy" src="${unidade.mapa}"></iframe></div>` : '<div class="virtual-unit-note">Atendimento online com acesso pela Área do Paciente 15 minutos antes.</div>'}
          <button class="btn btn-primary" onclick="abrirAgendamento()">Agendar nesta unidade</button>
        </div>
      </article>
    `;
  }).join('');
}

function renderPortalPacienteNovo() {
  if (paginaArquivo() !== 'area-paciente.html') return;
  const grid = document.querySelector('.dashboard-grid, .patient-app-shell');
  if (!grid || grid.dataset.patientEnhanced === 'true') return;
  grid.dataset.patientEnhanced = 'true';

  const usuario = lerJson(STORAGE_KEYS.usuarioAtual, null);
  const nome = usuario?.nome?.split(' ')[0] || 'Paciente';
  const agendamentos = lerJson(STORAGE_KEYS.agendamentos, []);
  const proximo = agendamentos[agendamentos.length - 1];
  const fotoPerfil = localStorage.getItem('neurolab_foto_perfil') || '';
  const progresso = calcularCompletudePerfil();
  const docsPaciente = lerJson('neurolab_documentos_paciente', [
    { nome: 'Receita digital', status: 'Disponível', data: 'Após consulta' },
    { nome: 'Laudos de exames', status: 'Pendente', data: 'Até 48h úteis' },
    { nome: 'Atestado médico', status: 'Quando aplicável', data: 'No mesmo dia' }
  ]);
  const preferencias = lerJson('neurolab_paciente_preferencias', {
    whatsapp: true,
    email: true,
    sms: false
  });
  const perfisFamilia = lerJson('neurolab_perfis_familia', [
    { id: 'eu', nome, papel: 'Eu' },
    { id: 'mae', nome: 'Mariana', papel: 'M\u00e3e' },
    { id: 'pai', nome: 'Roberto', papel: 'Pai' },
    { id: 'filho', nome: 'Lucas', papel: 'Filho' },
    { id: 'filha', nome: 'Sofia', papel: 'Filha' }
  ]);
  const perfilAtivo = localStorage.getItem('neurolab_perfil_familiar') || 'eu';
  const perfilDetalhe = perfisFamilia.find(perfil => perfil.id === perfilAtivo) || perfisFamilia[0];
  const perfilNome = perfilDetalhe?.id === 'eu' ? nome : perfilDetalhe?.nome || nome;
  const perfilContexto = `${perfilDetalhe?.papel || 'Eu'} em atendimento`;

  grid.className = 'patient-app-shell';
  grid.innerHTML = `
    <aside class="patient-sidebar">
      <div class="patient-profile-card text-center">
        <div class="patient-avatar patient-avatar-photo mx-auto" style="${fotoPerfil ? `background-image:url('${fotoPerfil}')` : ''}">${fotoPerfil ? '' : nlDoctorInitials(perfilNome)}</div>
        <label class="btn btn-outline-secondary btn-sm mt-2 patient-photo-button">
          Trocar foto
          <input type="file" accept="image/*" class="d-none" onchange="salvarFotoPerfilPaciente(this)">
        </label>
        <strong class="d-block mt-2">${nlSafeText(perfilNome)}</strong>
        <span class="patient-context-label">${nlSafeText(perfilContexto)}</span>
        <small>${usuario?.cpf ? `CPF ${String(usuario.cpf).slice(0, 3)}.***.***-${String(usuario.cpf).slice(-2)}` : 'Entre para ver seus dados'}</small>
        <div class="patient-profile-progress">
          <span>Perfil ${progresso}% completo</span>
          <div><i style="width:${progresso}%"></i></div>
        </div>
      </div>
      <div class="patient-family-switch">
        <label for="familiaPerfilSelect" class="form-label">Conta fam\u00edlia</label>
        <select id="familiaPerfilSelect" class="form-select" onchange="trocarPerfilFamilia(this.value)">
          ${perfisFamilia.map(perfil => `<option value="${nlSafeText(perfil.id)}" ${perfil.id === perfilAtivo ? 'selected' : ''}>${nlSafeText(perfil.papel)} - ${nlSafeText(perfil.nome)}</option>`).join('')}
        </select>
        <small>Troque rapidamente entre m\u00e3e, pai, filho ou filha antes de agendar.</small>
      </div>
      <div class="patient-sidebar-actions">
        <button class="btn btn-primary" onclick="abrirAgendamento()">Novo agendamento</button>
        <button class="btn btn-light" onclick="abrirModalPaciente('dependentes')">Gerenciar família</button>
      </div>
    </aside>
    <section class="patient-main-panel">
      <div class="patient-welcome-card">
        <div>
          <span class="quick-access-label">Painel do paciente</span>
          <h2>Olá, ${nlSafeText(perfilNome)}.</h2>
          <p>Veja consultas, documentos, lembretes e ações importantes em um só lugar.</p>
        </div>
        <div class="patient-status-stack">
          <span>Conta protegida por LGPD</span>
          <strong>${proximo ? 'Atendimento em andamento' : 'Pronto para agendar'}</strong>
        </div>
      </div>
      <div class="patient-kpis">
        <div><strong>${agendamentos.length || 0}</strong><span>agendamentos</span></div>
        <div><strong>${docsPaciente.length}</strong><span>documentos</span></div>
        <div><strong>${perfisFamilia.length}</strong><span>perfis família</span></div>
        <div><strong>${progresso}%</strong><span>perfil completo</span></div>
      </div>
      <div class="patient-card-lg">
        <div>
          <span class="quick-access-label">Próxima etapa</span>
          <h3>${proximo?.medico || 'Nenhum agendamento ativo'}</h3>
          <p>${proximo ? `${proximo.tipoNome || 'Consulta'} · ${proximo.dia || ''} às ${proximo.horario || ''}` : 'Digite a especialidade no agendamento para encontrar horários disponíveis.'}</p>
        </div>
        <div class="patient-action-row">
          <button class="btn btn-light" onclick="abrirAgendamento()">${proximo ? 'Reagendar' : 'Agendar'}</button>
          <button class="btn btn-primary" onclick="registrarCheckinPaciente()">Check-in</button>
        </div>
      </div>
      <div class="patient-tabs" role="tablist" aria-label="Área do Paciente">
        <button class="active" type="button" onclick="alternarPacienteSecao('resumo', this)">Resumo</button>
        <button type="button" onclick="alternarPacienteSecao('documentos', this)">Documentos</button>
        <button type="button" onclick="alternarPacienteSecao('preferencias', this)">Preferências</button>
      </div>
      <div id="patientDynamicPanel" class="patient-dynamic-panel"></div>
      <div class="patient-module-grid">
        <article><strong>Pré-consulta</strong><span>Atualize sintomas, medicamentos e observações antes do atendimento.</span><button class="btn btn-light" onclick="abrirModalPaciente('anamnese')">Preencher</button></article>
        <article><strong>Exames e laudos</strong><span>Acompanhe preparo, status de laudo e documentos digitais.</span><button class="btn btn-light" onclick="alternarPacienteSecao('documentos')">Ver documentos</button></article>
        <article><strong>Conta família</strong><span>Cadastre dependentes e agende para outro perfil.</span><button class="btn btn-light" onclick="abrirModalPaciente('dependentes')">Configurar</button></article>
        <article><strong>Lembretes</strong><span>Controle canais de aviso sem perder alertas críticos.</span><button class="btn btn-light" onclick="alternarPacienteSecao('preferencias')">Preferências</button></article>
      </div>
    </section>
  `;
  alternarPacienteSecao('resumo');
}

function salvarFotoPerfilPaciente(input) {
  const arquivo = input?.files?.[0];
  if (!arquivo) return;
  if (!arquivo.type.startsWith('image/')) {
    mostrarToast('Selecione uma imagem para a foto do perfil.', 'aviso');
    input.value = '';
    return;
  }

  const leitor = new FileReader();
  leitor.onload = () => {
    const foto = String(leitor.result || '');
    localStorage.setItem('neurolab_foto_perfil', foto);
    document.querySelectorAll('.patient-avatar-photo').forEach(avatar => {
      avatar.style.backgroundImage = `url('${foto}')`;
      avatar.textContent = '';
    });
    mostrarToast('Foto do perfil atualizada.', 'sucesso');
  };
  leitor.readAsDataURL(arquivo);
}

function trocarPerfilFamilia(perfilId) {
  localStorage.setItem('neurolab_perfil_familiar', perfilId || 'eu');
  const grid = document.querySelector('.patient-app-shell');
  if (grid) delete grid.dataset.patientEnhanced;
  renderPortalPacienteNovo();
  mostrarToast('Perfil familiar alterado para este atendimento.', 'info');
}

function alternarPacienteSecao(secao = 'resumo', botao) {
  if (paginaArquivo() !== 'area-paciente.html') return;
  const painel = document.getElementById('patientDynamicPanel');
  if (!painel) return;

  document.querySelectorAll('.patient-tabs button').forEach(item => item.classList.remove('active'));
  const ativo = botao || [...document.querySelectorAll('.patient-tabs button')].find(item => item.getAttribute('onclick')?.includes(`'${secao}'`));
  ativo?.classList.add('active');

  const agendamentos = lerJson(STORAGE_KEYS.agendamentos, []);
  const docs = lerJson('neurolab_documentos_paciente', [
    { nome: 'Receita digital', status: 'Disponível', data: 'Após consulta' },
    { nome: 'Laudos de exames', status: 'Pendente', data: 'Até 48h úteis' },
    { nome: 'Atestado médico', status: 'Quando aplicável', data: 'No mesmo dia' }
  ]);
  const prefs = lerJson('neurolab_paciente_preferencias', { whatsapp: true, email: true, sms: false });

  if (secao === 'documentos') {
    painel.innerHTML = `
      <div class="patient-doc-list">
        ${docs.map(doc => `
          <article>
            <div>
              <strong>${nlSafeText(doc.nome)}</strong>
              <span>${nlSafeText(doc.data)} · ${nlSafeText(doc.status)}</span>
            </div>
            <button class="btn btn-light" onclick="gerarDocumentoPaciente('${doc.nome.replace(/'/g, "\\'")}')">Abrir</button>
          </article>
        `).join('')}
      </div>
    `;
    return;
  }

  if (secao === 'preferencias') {
    painel.innerHTML = `
      <div class="patient-preference-grid">
        ${[
          ['whatsapp', 'WhatsApp', 'Confirmações e lembretes rápidos.'],
          ['email', 'E-mail', 'Documentos, recibos e orientações.'],
          ['sms', 'SMS', 'Alertas curtos quando necessário.']
        ].map(([chave, titulo, texto]) => `
          <label>
            <span><strong>${titulo}</strong><small>${texto}</small></span>
            <input type="checkbox" ${prefs[chave] ? 'checked' : ''} onchange="atualizarPreferenciaPaciente('${chave}', this.checked)">
          </label>
        `).join('')}
      </div>
    `;
    return;
  }

  painel.innerHTML = `
    <div class="patient-summary-grid">
      <article>
        <span>Histórico</span>
        <strong>${agendamentos.length ? `${agendamentos.length} registro(s)` : 'Sem registros ainda'}</strong>
        <small>${agendamentos.length ? 'Último atendimento salvo no painel.' : 'Seu histórico aparecerá após o primeiro agendamento.'}</small>
      </article>
      <article>
        <span>Checklist</span>
        <strong>Dados essenciais</strong>
        <small>Foto, CPF, dependentes e agendamentos aumentam a completude do perfil.</small>
      </article>
      <article>
        <span>Suporte</span>
        <strong>Central ativa</strong>
        <small>Use a ajuda para preparo de exames, teleconsulta e alterações.</small>
      </article>
    </div>
  `;
}

function atualizarPreferenciaPaciente(chave, valor) {
  const prefs = lerJson('neurolab_paciente_preferencias', { whatsapp: true, email: true, sms: false });
  prefs[chave] = Boolean(valor);
  salvarJson('neurolab_paciente_preferencias', prefs);
  mostrarToast('Preferência atualizada.', 'sucesso');
}

function registrarCheckinPaciente() {
  salvarJson('neurolab_checkin_atual', { feitoEm: new Date().toISOString(), status: 'QR Code liberado' });
  abrirModalPaciente('checkin');
  mostrarToast('Check-in preparado. QR Code disponível na recepção.', 'sucesso');
}

function gerarDocumentoPaciente(nome) {
  mostrarToast(`${nome} aberto na Área do Paciente.`, 'info');
}

function renderTeleconsultaProfissional() {
  if (paginaArquivo() !== 'teleconsulta.html') return;
  const root = document.querySelector('.consulta-grid-full');
  if (!root || root.dataset.teleEnhanced === 'true') return;
  root.dataset.teleEnhanced = 'true';

  root.innerHTML = `
    <div class="telemedicine-layout">
      <div class="telemedicine-copy">
        <span class="quick-access-label">Teleconsulta NeuroLab</span>
        <h1>Consulta neurológica online com acesso simples e seguro.</h1>
        <p>Agende, receba o link automaticamente e entre pela Área do Paciente. O botão da sala libera 15 minutos antes do horário, com teste de câmera e microfone.</p>
        <div class="tele-alert">Teleconsulta disponível apenas nas modalidades <strong>Particular</strong> e <strong>Convênio</strong>. Não disponível pelo SUS.</div>
        <div class="page-actions">
          <button class="btn btn-primary btn-big" onclick="abrirAgendamentoOnline()">Agendar teleconsulta</button>
          <button class="btn btn-light btn-big" onclick="abrirTriagemChat()">Tirar dúvida</button>
        </div>
      </div>
      <div class="telemedicine-card">
        <strong>Fluxo da consulta</strong>
        <ol>
          <li>Escolha especialidade, médico e horário.</li>
          <li>Confirme a cobertura Particular ou Convênio.</li>
          <li>Receba o link e teste câmera/microfone.</li>
          <li>Entre na sala virtual 15 minutos antes.</li>
        </ol>
      </div>
    </div>
    <div class="telemedicine-grid">
      <article><strong>Receita digital.</strong><span>Quando aplicável, a prescrição ou o atestado é enviado ao paciente após a consulta.</span></article>
      <article><strong>Ideal para retorno.</strong><span>Acompanhe tratamentos, revise exames e receba orientação clínica sem deslocamento.</span></article>
      <article><strong>Área do Paciente.</strong><span>Acesse histórico, link da sala, documentos e notificações em um só lugar.</span></article>
    </div>
    <div class="triagem-card hidden" id="triagemCard">
      <h3>Antes de abrir o chat, escolha uma opção:</h3>
      <p class="safe-note">O chat é apenas para dúvidas e orientação inicial. Não indica remédios, doses ou diagnóstico.</p>
      <div class="triagem-options">
        <button onclick="selecionarTriagem('Estou com dor de cabeça')">Dor de cabeça</button>
        <button onclick="selecionarTriagem('Estou com tontura')">Tontura</button>
        <button onclick="selecionarTriagem('Estou com formigamento')">Formigamento</button>
        <button onclick="selecionarTriagem('Tenho uma dúvida sobre consulta ou exame')">Dúvida</button>
      </div>
    </div>
    <div class="chat-card hidden" id="chatCard">
      <div class="chat-header"><strong>NeuroLab Dúvidas</strong><span>Seguro · Sem prescrição</span></div>
      <div class="chat-body" id="chatBody"><div class="msg bot">Olá! Posso responder dúvidas gerais sobre sintomas, exames e agendamento. Em emergências, procure atendimento imediatamente.</div></div>
      <div class="chat-input"><input id="chatMensagem" placeholder="Digite sua dúvida..." onkeydown="enviarComEnter(event)" aria-label="Mensagem do chat" /><button onclick="enviarMensagemChat()">Enviar</button></div>
    </div>
    <div class="agendamento-online-card hidden" id="agendamentoOnlineCard">
      <h3>Agendar teleconsulta</h3>
      <p class="safe-note">Somente Particular e Convênio.</p>
      <div class="agenda-form">
        <div class="field"><label>Nome do paciente</label><input id="agendaNome" placeholder="Seu nome completo" /></div>
        <div class="field"><label>Cobertura</label><select id="agendaCobertura"><option>Particular</option><option>Convênio</option></select></div>
        <div class="field"><label>Especialidade</label><select id="agendaEspecialidade"><option value="">Escolha a especialidade</option><option>Neurologia geral</option><option>Enxaqueca e cefaleia</option><option>Memória e cognição</option><option>Distúrbios do sono</option></select></div>
        <div class="field"><label>Data</label><input id="agendaData" type="date" /></div>
        <div class="field"><label>Horário</label><select id="agendaHorario"><option>09:00</option><option>10:30</option><option>14:00</option><option>15:30</option><option>17:00</option></select></div>
        <button class="btn btn-primary" onclick="confirmarConsultaOnline()">Confirmar</button>
      </div>
      <div class="agenda-confirmacao hidden" id="agendaConfirmacao"><strong>Teleconsulta confirmada</strong><p id="agendaResumo"></p><button class="btn btn-light" onclick="entrarLigacaoMedico()">Entrar na sala virtual</button></div>
    </div>
    <div class="video-consulta hidden" id="salaConsulta">
      <div class="video-topbar"><strong>Sala virtual NeuroLab</strong><span>Médico ainda não entrou</span></div>
      <div class="video-grid">
        <div class="video-box medico"><span>MD</span><h3>Médico</h3><p>Aguardando o médico entrar na chamada</p></div>
        <div class="video-box paciente" id="pacienteVideoBox"><video id="videoPaciente" autoplay muted playsinline></video><div class="camera-placeholder" id="cameraPlaceholder"><span>Paciente</span><h3>Câmera</h3><p>Clique em Permitir para liberar sua câmera</p></div></div>
      </div>
      <div class="chat-card mini-chat"><div class="chat-header"><strong>Chat da consulta</strong><span>Texto com o médico</span></div><div class="chat-body" id="salaChatBody"><div class="msg bot">Você entrou na sala. Aguarde o médico iniciar o atendimento.</div></div><div class="chat-input"><input id="salaMensagem" placeholder="Mensagem para o médico..." onkeydown="enviarSalaComEnter(event)" aria-label="Mensagem da sala" /><button onclick="enviarMensagemSala()">Enviar</button></div></div>
    </div>
  `;
}

function renderAgendamentoDrConsulta() {
  if (paginaArquivo() !== 'agendamento.html') return;
  const card = document.querySelector('.modal-agendamento-card');
  if (!card || card.dataset.drEnhanced === 'true') return;
  card.dataset.drEnhanced = 'true';
  card.classList.add('dr-booking-card');
  window.NLUX.drMode = window.NLUX.drMode || 'presencial';
  window.NLUX.drSearched = false;
  card.innerHTML = '';
  desenharBuscaDrConsulta();
}

function desenharBuscaDrConsulta() {
  const card = document.querySelector('.dr-booking-card');
  if (!card) return;
  const modo = window.NLUX.drMode || 'presencial';
  card.innerHTML = `
    <div class="dr-booking-title">Agende sua consulta</div>
    <div class="dr-search-card">
      <div class="dr-tabs">
        <button class="${modo === 'presencial' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('presencial')">Presencial</button>
        <button class="${modo === 'online' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('online')">Online</button>
      </div>
      <div class="dr-search-body">
        <label>Especialidade</label>
        <div class="dr-input-wrap">
          <span>⌕</span>
          <input id="drEspecialidadeBusca" value="" placeholder="Digite especialidade, exame ou médico..." />
        </div>
        <label>Plano ou cobertura</label>
        <select id="drPlanoBusca" class="dr-plan-select">${nlPlanoOptionsAgendamento(modo)}</select>
        <button class="dr-search-button" onclick="buscarAgendamentoNovo()">Buscar</button>
      </div>
    </div>
  `;
}

function selecionarModoAgendamentoNovo(modo) {
  window.NLUX.drMode = modo;
  if (window.NLUX.drSearched) {
    buscarAgendamentoNovo();
  } else {
    desenharBuscaDrConsulta();
  }
}

function nlPlanoOptionsAgendamento(modo, selecionado = 'Particular') {
  const planos = modo === 'online'
    ? ['Particular', ...NL_PLANOS.filter(plano => plano.servicos.includes('Teleconsulta')).map(plano => plano.nome)]
    : ['Particular', 'SUS', ...NL_PLANOS.map(plano => plano.nome)];
  return [...new Set(planos)].map(plano => `<option value="${nlSafeText(plano)}" ${plano === selecionado ? 'selected' : ''}>${nlSafeText(plano)}</option>`).join('');
}

function nlCoberturaFromPlano(plano) {
  if (plano === 'Particular' || plano === 'SUS') return plano;
  return NL_MEDICOS.flatMap(medico => medico.coberturas).find(cobertura => normalizarTexto(cobertura) === 'convenio') || 'Convênio';
}

function sincronizarFiltrosAgendamentoNovo() {
  const plano = document.getElementById('drFiltroPlano')?.value || document.getElementById('drPlanoBusca')?.value || agendamentoAtual.convenio || agendamentoAtual.cobertura || 'Particular';
  const unidade = NL_UNIDADES.find(item => item.nome === document.getElementById('drFiltroUnidade')?.value);
  const medico = NL_MEDICOS.find(item => item.nome === document.getElementById('drFiltroMedico')?.value);
  agendamentoAtual.cobertura = nlCoberturaFromPlano(plano);
  agendamentoAtual.convenio = normalizarTexto(agendamentoAtual.cobertura) === 'convenio' ? plano : '';
  if (unidade) {
    agendamentoAtual.unidade = unidade.nome;
    agendamentoAtual.endereco = unidade.endereco;
  }
  if (medico) {
    agendamentoAtual.medico = medico.nome;
    agendamentoAtual.crm = medico.crm;
    agendamentoAtual.especialidade = medico.especialidade;
  }
}

function buscarAgendamentoNovo() {
  const termo = normalizarTexto(document.getElementById('drEspecialidadeBusca')?.value || document.getElementById('drFiltroEspecialidade')?.value || '');
  const modo = window.NLUX.drMode || 'presencial';
  window.NLUX.drSearched = true;
  const tipo = modo === 'online' ? 'TELE' : 'CONS-ADULT';
  const planoSelecionado = document.getElementById('drPlanoBusca')?.value || document.getElementById('drFiltroPlano')?.value || 'Particular';
  const cobertura = nlCoberturaFromPlano(planoSelecionado);
  if (modo === 'online' && cobertura === 'SUS') {
    mostrarToast('Teleconsulta está disponível apenas para Particular e Convênio.', 'aviso');
    return;
  }
  const medicos = NL_MEDICOS.filter(medico => medico.tipos.includes(tipo) && medico.coberturas.includes(cobertura)).filter(medico => {
    const base = normalizarTexto(`${medico.especialidade} ${medico.nome}`);
    return !termo || base.includes(termo) || termo.includes('neuro') || termo.includes('consulta');
  });
  const medico = medicos[0] || NL_MEDICOS.find(item => item.tipos.includes(tipo) && item.coberturas.includes(cobertura)) || NL_MEDICOS[0];
  const unidades = NL_UNIDADES.filter(unidade =>
    unidade.modalidades.includes(tipo) &&
    unidade.coberturas.includes(cobertura) &&
    (normalizarTexto(cobertura) !== 'convenio' || unidade.convenios.includes(planoSelecionado))
  );
  const unidade = modo === 'online' ? (NL_UNIDADES.find(item => item.modalidades.includes('TELE')) || unidades[0]) : unidades[0];

  agendamentoAtual = {
    tipoNome: modo === 'online' ? 'Teleconsulta' : 'Consulta Neurológica',
    tipoCodigo: tipo,
    cobertura,
    convenio: normalizarTexto(cobertura) === 'convenio' ? planoSelecionado : '',
    unidade: unidade?.nome || '',
    endereco: unidade?.endereco || '',
    medico: medico.nome,
    crm: medico.crm,
    especialidade: medico.especialidade
  };

  desenharResultadoDrConsulta(medicos, unidades);
}

function desenharResultadoDrConsulta(medicos, unidades) {
  const card = document.querySelector('.dr-booking-card');
  if (!card) return;
  const modo = window.NLUX.drMode || 'presencial';
  const planoAtual = agendamentoAtual.convenio || agendamentoAtual.cobertura || 'Particular';
  const datas = gerarDatasAgendamentoNovo();
  card.innerHTML = `
    <div class="dr-results-layout">
      <aside class="dr-filter-card">
        <div class="dr-tabs compact">
          <button class="${modo === 'presencial' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('presencial')">Presencial</button>
          <button class="${modo === 'online' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('online')">Online</button>
        </div>
        <label>Especialidade</label>
        <select id="drFiltroEspecialidade" onchange="buscarAgendamentoNovo()"><option value="">Escolha a especialidade</option><option>Neurologia</option><option>Cefaleia e dor</option><option>Sono e cognição</option><option>Neuropediatria</option></select>
        <label>Plano ou cobertura</label>
        <select id="drFiltroPlano" onchange="buscarAgendamentoNovo()">${nlPlanoOptionsAgendamento(modo, planoAtual)}</select>
        <label>Onde voce quer ser atendido?</label>
        <select id="drFiltroUnidade" onchange="sincronizarFiltrosAgendamentoNovo()">${unidades.map(unidade => `<option ${unidade.nome === agendamentoAtual.unidade ? 'selected' : ''}>${nlSafeText(unidade.nome)}</option>`).join('')}</select>
        <button class="dr-location-button" type="button">Usar minha localização</button>
        <label>Profissional</label>
        <select id="drFiltroMedico" onchange="sincronizarFiltrosAgendamentoNovo()">${medicos.map(medico => `<option ${medico.nome === agendamentoAtual.medico ? 'selected' : ''}>${nlSafeText(medico.nome)}</option>`).join('')}</select>
        <button class="dr-search-button" onclick="buscarAgendamentoNovo()">Nova busca</button>
      </aside>
      <section class="dr-slots-card">
        <div class="dr-date-row">
          <button class="dr-arrow" type="button">‹</button>
          ${datas.map((data, index) => `<button class="dr-date ${index === 0 ? 'active' : ''}" onclick="selecionarDataAgendamentoNovo('${data.iso}', this)"><strong>${data.dia}</strong><span>${data.semana}</span></button>`).join('')}
          <button class="dr-arrow" type="button">›</button>
          <button class="dr-calendar-button" type="button">Ver calendário</button>
        </div>
        <div class="dr-doctor-line">
          <div class="doctor-photo small">${nlDoctorInitials(agendamentoAtual.medico)}</div>
          <div><strong>${nlSafeText(agendamentoAtual.medico)}</strong><span>${nlSafeText(agendamentoAtual.crm)} ? ${normalizarTexto(agendamentoAtual.cobertura) === 'convenio' ? nlSafeText(agendamentoAtual.convenio) : nlSafeText(agendamentoAtual.cobertura)}</span></div>
        </div>
        <div class="dr-unit-panel">
          <h3>${nlSafeText(agendamentoAtual.unidade)}</h3>
          <p>${nlSafeText(agendamentoAtual.endereco)}</p>
          <div class="dr-periods">
            <button onclick="selecionarSlotAgendamentoNovo('09/05', '08:30', this)">Manhã · 08:30</button>
            <button onclick="selecionarSlotAgendamentoNovo('09/05', '10:00', this)">Manhã · 10:00</button>
            <button onclick="selecionarSlotAgendamentoNovo('09/05', '14:30', this)">Tarde · 14:30</button>
            <button onclick="selecionarSlotAgendamentoNovo('09/05', '16:00', this)">Tarde · 16:00</button>
          </div>
        </div>
        <div class="dr-confirm-panel hidden" id="drConfirmPanel">
          <span id="drConfirmText"></span>
          <button class="btn btn-primary" onclick="confirmarAgendamentoNovo()">Confirmar horário</button>
        </div>
      </section>
    </div>
  `;
}

function gerarDatasAgendamentoNovo() {
  const semanas = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  return [7, 14, 28].map(offset => {
    const data = new Date();
    data.setDate(data.getDate() + offset);
    return {
      iso: data.toISOString().slice(0, 10),
      dia: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      semana: semanas[data.getDay()]
    };
  });
}

function selecionarDataAgendamentoNovo(iso, botao) {
  window.NLUX.selectedDateISO = iso;
  document.querySelectorAll('.dr-date').forEach(item => item.classList.remove('active'));
  botao?.classList.add('active');
}

function selecionarSlotAgendamentoNovo(dia, horario, botao) {
  document.querySelectorAll('.dr-periods button').forEach(item => item.classList.remove('active'));
  botao?.classList.add('active');
  agendamentoAtual.dia = dia;
  agendamentoAtual.horario = horario;
  iniciarHold(10 * 60);
  const panel = document.getElementById('drConfirmPanel');
  const text = document.getElementById('drConfirmText');
  if (text) text.textContent = `${agendamentoAtual.medico} · ${agendamentoAtual.unidade} · ${dia} às ${horario}`;
  panel?.classList.remove('hidden');
}

function confirmarAgendamentoNovo() {
  if (!agendamentoAtual.horario) {
    mostrarToast('Escolha um horário para confirmar.', 'aviso');
    return;
  }
  const usuario = lerJson(STORAGE_KEYS.usuarioAtual, null);
  const agendamentos = lerJson(STORAGE_KEYS.agendamentos, []);
  agendamentos.push({
    id: `AG-${Date.now()}`,
    status: 'CONFIRMADO',
    pacienteCpf: usuario?.cpf || 'visitante',
    pacienteNome: usuario?.nome || 'Paciente visitante',
    criadoEm: new Date().toISOString(),
    ...agendamentoAtual
  });
  salvarJson(STORAGE_KEYS.agendamentos, agendamentos);
  liberarHold(false);
  document.querySelector('.dr-slots-card')?.insertAdjacentHTML('beforeend', '<div class="dr-success">Agendamento confirmado. Você também pode acompanhar pela Área do Paciente.</div>');
  mostrarToast('Agendamento confirmado com sucesso.', 'sucesso');
}

/* ============================================================
   AGENDAMENTO V2 - busca real, calendario e layout responsivo
   ============================================================ */
function nlBookingEspecialidades() {
  return [
    { label: 'Neurologia', termo: 'neurologia consulta neuro' },
    { label: 'Cefaleia e enxaqueca', termo: 'cefaleia enxaqueca dor cabeca' },
    { label: 'Sono e cognição', termo: 'sono cognicao memoria insonia' },
    { label: 'Neuropediatria', termo: 'neuropediatria infantil crianca' },
    { label: 'Exames neurológicos', termo: 'exame eeg enmg polissonografia diagnostico' }
  ];
}

function nlBookingTipoPorTermo(termo, modo) {
  const texto = normalizarTexto(termo);
  if (modo === 'online') return 'TELE';
  if (texto.includes('exame') || texto.includes('eeg') || texto.includes('enmg') || texto.includes('polissonografia')) return 'EXAM';
  if (texto.includes('infantil') || texto.includes('pediatria') || texto.includes('crianca')) return 'CONS-INF';
  return 'CONS-ADULT';
}

function nlBookingLabelTipo(tipo) {
  const mapa = {
    TELE: 'Teleconsulta',
    EXAM: 'Exame Diagnóstico',
    'CONS-INF': 'Consulta Neurológica Infantil',
    'CONS-ADULT': 'Consulta Neurológica'
  };
  return mapa[tipo] || 'Consulta Neurológica';
}

function nlBookingState() {
  if (!window.NLUX.booking) {
    const _urlParams = new URLSearchParams(window.location.search);
    const _modoURL = _urlParams.get('modo') === 'online' ? 'online' : 'presencial';
    window.NLUX.booking = {
      modo: _modoURL,
      termo: '',
      plano: 'Particular',
      unidade: _modoURL === 'online' ? 'Santo André - Centro' : '',
      medico: '',
      dataISO: ''
    };
  }
  return window.NLUX.booking;
}

function nlBookingMinDate() {
  const data = new Date();
  data.setDate(data.getDate() + 1);
  return data.toISOString().slice(0, 10);
}

function nlBookingMaxDate() {
  const data = new Date();
  data.setDate(data.getDate() + 90);
  return data.toISOString().slice(0, 10);
}

function nlBookingFormatarData(iso, options = { weekday: 'short', day: '2-digit', month: 'short' }) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', options);
}

function nlBookingBusca(estado = nlBookingState()) {
  const termo = normalizarTexto(estado.termo || '');
  const tipo = nlBookingTipoPorTermo(estado.termo, estado.modo);
  const cobertura = nlCoberturaFromPlano(estado.plano || 'Particular');
  const termoGenerico = !termo || termo.includes('neuro') || termo.includes('consulta');

  const unidades = NL_UNIDADES.filter(unidade => {
    const atendeTipo = unidade.modalidades.includes(tipo);
    const atendeCobertura = unidade.coberturas.includes(cobertura);
    const atendeConvenio = normalizarTexto(cobertura) !== 'convenio' || unidade.convenios.includes(estado.plano);
    const atendeModo = estado.modo !== 'online' || unidade.modalidades.includes('TELE');
    const busca = normalizarTexto(`${unidade.nome} ${unidade.endereco} ${unidade.recursos?.join(' ') || ''}`);
    return atendeTipo && atendeCobertura && atendeConvenio && atendeModo && (!estado.unidade || unidade.nome === estado.unidade || busca.includes(termo) || termoGenerico || tipo === 'TELE');
  });

  const unidadeNomes = new Set(unidades.map(unidade => unidade.nome));
  const medicos = NL_MEDICOS.filter(medico => {
    const atendeTipo = medico.tipos.includes(tipo);
    const atendeCobertura = medico.coberturas.includes(cobertura);
    const atendeUnidade = !unidadeNomes.size || medico.unidades.some(unidade => unidadeNomes.has(unidade)) || tipo === 'TELE';
    const busca = normalizarTexto(`${medico.nome} ${medico.especialidade} ${medico.crm}`);
    const atendeTermo = termoGenerico || busca.includes(termo) || (tipo === 'EXAM' && medico.tipos.includes('EXAM'));
    return atendeTipo && atendeCobertura && atendeUnidade && atendeTermo;
  });

  return { tipo, cobertura, unidades, medicos };
}

function renderAgendamentoDrConsulta() {
  if (paginaArquivo() !== 'agendamento.html') return;
  const card = document.querySelector('.modal-agendamento-card');
  if (!card || card.dataset.bookingV2 === 'true') return;
  card.dataset.bookingV2 = 'true';
  card.className = 'modal-card modal-agendamento-card dr-booking-card nl-booking-v2';
  const estado = nlBookingState();
  estado.dataISO = estado.dataISO || nlBookingMinDate();
  desenharBuscaDrConsulta();
}

function desenharBuscaDrConsulta() {
  const card = document.querySelector('.nl-booking-v2');
  if (!card) return;
  const estado = nlBookingState();
  card.innerHTML = `
    <section class="booking-hero-panel">
      <div>
        <span class="badge text-bg-info">Agendamento NeuroLab</span>
        <h1>Encontre consulta, exame ou teleconsulta em poucos cliques.</h1>
        <p>Pesquise por especialidade, médico, exame, unidade ou plano. Depois escolha a data diretamente no calendário.</p>
      </div>
      <div class="booking-trust">
        <strong>Hold de 10 min</strong>
        <span>O horário fica reservado enquanto você confirma.</span>
      </div>
    </section>
    <section class="booking-search-panel">
      <div class="booking-mode" role="tablist" aria-label="Modalidade">
        <button class="${estado.modo === 'presencial' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('presencial')">Presencial</button>
        <button class="${estado.modo === 'online' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('online')">Online</button>
      </div>
      <div class="booking-search-grid">
        <div class="field-main">
          <label for="drEspecialidadeBusca">O que você precisa?</label>
          <div class="booking-input-icon">
            <span>⌕</span>
            <input id="drEspecialidadeBusca" class="form-control" value="${nlSafeText(estado.termo)}" placeholder="Digite especialidade, exame ou médico..." onkeydown="if(event.key==='Enter') buscarAgendamentoNovo()">
          </div>
        </div>
        <div>
          <label for="drPlanoBusca">Plano ou cobertura</label>
          <select id="drPlanoBusca" class="form-select">${nlPlanoOptionsAgendamento(estado.modo, estado.plano)}</select>
        </div>
        <button class="btn btn-primary booking-search-btn" onclick="buscarAgendamentoNovo()">Buscar horários</button>
      </div>
      <div class="booking-quick-chips">
        ${nlBookingEspecialidades().map(item => `<button onclick="document.getElementById('drEspecialidadeBusca').value='${item.label}'; buscarAgendamentoNovo()">${item.label}</button>`).join('')}
      </div>
    </section>
  `;
}

function selecionarModoAgendamentoNovo(modo) {
  const estado = nlBookingState();
  estado.modo = modo;
  if (modo === 'online' && estado.plano === 'SUS') estado.plano = 'Particular';
  estado.dataISO = estado.dataISO || nlBookingMinDate();
  if (window.NLUX.drSearched) buscarAgendamentoNovo();
  else desenharBuscaDrConsulta();
}

function buscarAgendamentoNovo() {
  const estado = nlBookingState();
  estado.termo = (document.getElementById('drEspecialidadeBusca')?.value ?? document.getElementById('drFiltroEspecialidade')?.value ?? estado.termo ?? '').trim();
  estado.plano = document.getElementById('drPlanoBusca')?.value || document.getElementById('drFiltroPlano')?.value || estado.plano || 'Particular';
  estado.unidade = document.getElementById('drFiltroUnidade')?.value || document.querySelector('.booking-unit-card.active')?.dataset.unit || estado.unidade || '';
  estado.medico = document.getElementById('drFiltroMedico')?.value || document.querySelector('.booking-doctor-card.active')?.dataset.doctor || estado.medico || '';
  estado.dataISO = document.getElementById('bookingCalendarDate')?.value || estado.dataISO || nlBookingMinDate();
  window.NLUX.drSearched = true;
  registrarBuscaRecente(estado.termo);

  if (estado.modo === 'online' && nlCoberturaFromPlano(estado.plano) === 'SUS') {
    mostrarToast('Teleconsulta disponível apenas para Particular e Convênio.', 'aviso');
    estado.plano = 'Particular';
  }

  const busca = nlBookingBusca(estado);
  const unidade = busca.unidades.find(item => item.nome === estado.unidade) || busca.unidades[0];
  const medico = busca.medicos.find(item => item.nome === estado.medico) || busca.medicos[0];

  agendamentoAtual = {
    tipoNome: nlBookingLabelTipo(busca.tipo),
    tipoCodigo: busca.tipo,
    cobertura: busca.cobertura,
    convenio: normalizarTexto(busca.cobertura) === 'convenio' ? estado.plano : '',
    unidade: unidade?.nome || '',
    endereco: unidade?.endereco || '',
    medico: medico?.nome || '',
    crm: medico?.crm || '',
    especialidade: medico?.especialidade || '',
    dataISO: estado.dataISO,
    dia: nlBookingFormatarData(estado.dataISO)
  };

  desenharResultadoDrConsulta(busca.medicos, busca.unidades, busca.tipo);
}

function desenharResultadoDrConsulta(medicos, unidades, tipoAtual = nlBookingTipoPorTermo(nlBookingState().termo, nlBookingState().modo)) {
  const card = document.querySelector('.nl-booking-v2');
  if (!card) return;
  const estado = nlBookingState();
  const planoAtual = estado.plano || 'Particular';
  const datas = gerarDatasAgendamentoNovo(estado.dataISO);
  const semResultado = !medicos.length || !unidades.length;

  card.innerHTML = `
    <div class="booking-shell">
      <aside class="booking-filter-panel">
        <div class="booking-mode compact" role="tablist" aria-label="Modalidade">
          <button class="${estado.modo === 'presencial' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('presencial')">Presencial</button>
          <button class="${estado.modo === 'online' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('online')">Online</button>
        </div>
        <label>Busca</label>
        <input id="drFiltroEspecialidade" class="form-control" value="${nlSafeText(estado.termo)}" onkeydown="if(event.key==='Enter') buscarAgendamentoNovo()">
        <label>Plano ou cobertura</label>
        <select id="drFiltroPlano" class="form-select" onchange="buscarAgendamentoNovo()">${nlPlanoOptionsAgendamento(estado.modo, planoAtual)}</select>
        <label>Unidade</label>
        <select id="drFiltroUnidade" class="form-select" onchange="selecionarUnidadeAgendamentoV2(this.value)">
          ${unidades.map(unidade => `<option value="${nlSafeText(unidade.nome)}" ${unidade.nome === agendamentoAtual.unidade ? 'selected' : ''}>${nlSafeText(unidade.nome)}</option>`).join('')}
        </select>
        <label>Médico</label>
        <select id="drFiltroMedico" class="form-select" onchange="selecionarMedicoAgendamentoV2(this.value)">
          ${medicos.map(medico => `<option value="${nlSafeText(medico.nome)}" ${medico.nome === agendamentoAtual.medico ? 'selected' : ''}>${nlSafeText(medico.nome)}</option>`).join('')}
        </select>
        <button class="btn btn-primary w-100 mt-3" onclick="buscarAgendamentoNovo()">Atualizar busca</button>
        <button class="btn btn-light w-100 mt-2" onclick="window.NLUX.drSearched=false; desenharBuscaDrConsulta()">Nova pesquisa</button>
      </aside>
      <main class="booking-results-panel">
        ${semResultado ? nlBookingEmptyState() : `
          <section class="booking-result-summary">
            <div>
              <span class="badge text-bg-info">${nlSafeText(nlBookingLabelTipo(tipoAtual))}</span>
              <h2>${nlSafeText(agendamentoAtual.medico || 'Escolha um profissional')}</h2>
              <p>${nlSafeText(agendamentoAtual.unidade || 'Selecione uma unidade')} · ${nlSafeText(planoAtual)}</p>
            </div>
            <div class="booking-summary-kpi"><strong>${medicos.length}</strong><span>profissionais</span></div>
            <div class="booking-summary-kpi"><strong>${unidades.length}</strong><span>unidades</span></div>
          </section>
          <section class="booking-picker-grid">
            <div>
              <div class="booking-section-title">Unidades disponíveis</div>
              <div class="booking-unit-list">
                ${unidades.map(unidade => `
                  <button class="booking-unit-card ${unidade.nome === agendamentoAtual.unidade ? 'active' : ''}" data-unit="${nlSafeText(unidade.nome)}" onclick="selecionarUnidadeAgendamentoV2('${unidade.nome.replace(/'/g, "\\'")}')">
                    <strong>${nlSafeText(unidade.nome)}</strong>
                    <span>${nlSafeText(unidade.endereco)}</span>
                    <small>${nlSafeText(unidade.distancia)} · ${unidade.coberturas.join(', ')}</small>
                  </button>
                `).join('')}
              </div>
            </div>
            <div>
              <div class="booking-section-title">Profissionais</div>
              <div class="booking-doctor-list">
                ${medicos.map(medico => `
                  <button class="booking-doctor-card ${medico.nome === agendamentoAtual.medico ? 'active' : ''}" data-doctor="${nlSafeText(medico.nome)}" onclick="selecionarMedicoAgendamentoV2('${medico.nome.replace(/'/g, "\\'")}')">
                    <span class="doctor-photo small">${nlDoctorInitials(medico.nome)}</span>
                    <span><strong>${nlSafeText(medico.nome)}</strong><small>${nlSafeText(medico.crm)} · ${nlSafeText(medico.especialidade)}</small></span>
                    <em>${medico.rating.toFixed(1)}</em>
                  </button>
                `).join('')}
              </div>
            </div>
          </section>
          <section class="booking-calendar-panel">
            <div class="booking-calendar-head">
              <div>
                <div class="booking-section-title">Calendário e horários</div>
                <p>Escolha uma data nos próximos 90 dias. Domingos ficam bloqueados.</p>
              </div>
              <input id="bookingCalendarDate" class="form-control" type="date" min="${nlBookingMinDate()}" max="${nlBookingMaxDate()}" value="${estado.dataISO}" onchange="selecionarDataAgendamentoNovo(this.value)">
            </div>
            <div class="booking-date-strip">
              ${datas.map(data => `
                <button class="booking-date-card ${data.iso === estado.dataISO ? 'active' : ''} ${data.disabled ? 'disabled' : ''}" ${data.disabled ? 'disabled' : ''} onclick="selecionarDataAgendamentoNovo('${data.iso}')">
                  <span>${data.semana}</span>
                  <strong>${data.dia}</strong>
                </button>
              `).join('')}
            </div>
            <div class="booking-slot-area" id="bookingSlotArea">${renderSlotsAgendamentoV2()}</div>
          </section>
          <section class="booking-confirm-box hidden" id="drConfirmPanel">
            <div>
              <strong>Horário selecionado</strong>
              <span id="drConfirmText"></span>
            </div>
            <button class="btn btn-primary" onclick="confirmarAgendamentoNovo()">Confirmar agendamento</button>
          </section>
        `}
      </main>
    </div>
  `;
}

function nlBookingEmptyState() {
  return `
    <section class="booking-empty-state">
      <h2>Nenhum horário encontrado com esses filtros.</h2>
      <p>Digite uma especialidade, exame, médico ou altere a modalidade para Online.</p>
      <div class="booking-quick-chips justify-content-center">
        ${nlBookingEspecialidades().map(item => `<button onclick="document.getElementById('drFiltroEspecialidade').value='${item.label}'; buscarAgendamentoNovo()">${item.label}</button>`).join('')}
      </div>
      <button class="btn btn-primary mt-3" onclick="window.NLUX.drSearched=false; desenharBuscaDrConsulta()">Voltar para busca inicial</button>
    </section>
  `;
}

function gerarDatasAgendamentoNovo(baseIso = nlBookingState().dataISO || nlBookingMinDate()) {
  const base = new Date(`${baseIso}T00:00:00`);
  const inicio = Number.isNaN(base.getTime()) ? new Date(`${nlBookingMinDate()}T00:00:00`) : base;
  return Array.from({ length: 10 }, (_, index) => {
    const data = new Date(inicio);
    data.setDate(inicio.getDate() + index);
    const iso = data.toISOString().slice(0, 10);
    return {
      iso,
      disabled: data.getDay() === 0,
      dia: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      semana: data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
    };
  });
}

function selecionarUnidadeAgendamentoV2(nome) {
  const estado = nlBookingState();
  estado.unidade = nome;
  document.querySelectorAll('.booking-unit-card').forEach(card => card.classList.toggle('active', card.dataset.unit === nome));
  const select = document.getElementById('drFiltroUnidade');
  if (select) select.value = nome;
  const unidade = NL_UNIDADES.find(item => item.nome === nome);
  if (unidade) {
    agendamentoAtual.unidade = unidade.nome;
    agendamentoAtual.endereco = unidade.endereco;
  }
  buscarAgendamentoNovo();
}

function selecionarMedicoAgendamentoV2(nome) {
  const estado = nlBookingState();
  estado.medico = nome;
  document.querySelectorAll('.booking-doctor-card').forEach(card => card.classList.toggle('active', card.dataset.doctor === nome));
  const select = document.getElementById('drFiltroMedico');
  if (select) select.value = nome;
  const medico = NL_MEDICOS.find(item => item.nome === nome);
  if (medico) {
    agendamentoAtual.medico = medico.nome;
    agendamentoAtual.crm = medico.crm;
    agendamentoAtual.especialidade = medico.especialidade;
  }
  buscarAgendamentoNovo();
}

function selecionarDataAgendamentoNovo(iso) {
  const estado = nlBookingState();
  const data = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(data.getTime()) || data.getDay() === 0) {
    mostrarToast('Escolha uma data válida de segunda a sábado.', 'aviso');
    return;
  }
  estado.dataISO = iso;
  agendamentoAtual.dataISO = iso;
  agendamentoAtual.dia = nlBookingFormatarData(iso);
  agendamentoAtual.horario = '';
  window.NLUX.selectedSlot = '';
  buscarAgendamentoNovo();
}

function renderSlotsAgendamentoV2() {
  const estado = nlBookingState();
  const tipo = agendamentoAtual.tipoCodigo || nlBookingTipoPorTermo(estado.termo, estado.modo);
  const cobertura = agendamentoAtual.cobertura || nlCoberturaFromPlano(estado.plano);
  const turnoManha = tipo === 'EXAM' ? ['07:30', '08:20', '09:10', '10:40'] : ['08:00', '09:00', '10:30', '11:30'];
  const turnoTarde = tipo === 'TELE' ? ['14:00', '15:00', '16:30', '17:30'] : ['13:30', '14:30', '15:40', '16:50'];
  const turnoSus = ['07:00', '08:00', '09:00', '10:00'];
  const grupos = cobertura === 'SUS'
    ? [{ label: 'Turno SUS', slots: turnoSus }]
    : [{ label: 'Manhã', slots: turnoManha }, { label: 'Tarde', slots: turnoTarde }];

  return grupos.map(grupo => `
    <div class="booking-slot-group">
      <strong>${grupo.label}</strong>
      <div>
        ${grupo.slots.map((slot, index) => {
          const ocupado = index === 2 && cobertura === 'SUS';
          return `<button class="booking-slot ${window.NLUX.selectedSlot === slot ? 'active' : ''}" ${ocupado ? 'disabled' : ''} onclick="selecionarSlotAgendamentoNovo('${agendamentoAtual.dia}', '${slot}', this)">${slot}${ocupado ? '<small>ocupado</small>' : ''}</button>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function selecionarSlotAgendamentoNovo(dia, horario, botao) {
  document.querySelectorAll('.booking-slot').forEach(item => item.classList.remove('active'));
  botao?.classList.add('active');
  agendamentoAtual.dia = dia || nlBookingFormatarData(nlBookingState().dataISO);
  agendamentoAtual.horario = horario;
  window.NLUX.selectedSlot = horario;
  iniciarHold(10 * 60);
  const panel = document.getElementById('drConfirmPanel');
  const text = document.getElementById('drConfirmText');
  if (text) text.textContent = `${agendamentoAtual.medico} · ${agendamentoAtual.unidade} · ${agendamentoAtual.dia} às ${horario}`;
  panel?.classList.remove('hidden');
  panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function confirmarAgendamentoNovo() {
  if (!agendamentoAtual.medico || !agendamentoAtual.unidade || !agendamentoAtual.horario) {
    mostrarToast('Escolha unidade, médico, data e horário para confirmar.', 'aviso');
    return;
  }
  const usuario = lerJson(STORAGE_KEYS.usuarioAtual, null);
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
  liberarHold(false);
  const card = document.querySelector('.nl-booking-v2');
  if (card) {
    card.innerHTML = `
      <section class="booking-success-panel">
        <div class="sucesso-icon">✓</div>
        <h2>Agendamento confirmado</h2>
        <p>Você receberá a confirmação pelos canais cadastrados. O atendimento também aparecerá na Área do Paciente.</p>
        <div class="resumo-agendamento">${nlResumoBookingHtml(registro)}</div>
        <div class="booking-success-actions">
          <a class="btn btn-primary" href="area-paciente.html">Abrir Área do Paciente</a>
          <button class="btn btn-light" onclick="window.NLUX.drSearched=false; agendamentoAtual={}; desenharBuscaDrConsulta()">Novo agendamento</button>
        </div>
      </section>
    `;
  }
  mostrarToast('Agendamento confirmado com sucesso.', 'sucesso');
}

function nlResumoBookingHtml(dados) {
  return `
    <div class="resumo-row"><span class="resumo-label">Atendimento</span><span class="resumo-val">${nlSafeText(dados.tipoNome)}</span></div>
    <div class="resumo-row"><span class="resumo-label">Médico</span><span class="resumo-val">${nlSafeText(dados.medico)} · ${nlSafeText(dados.crm)}</span></div>
    <div class="resumo-row"><span class="resumo-label">Unidade</span><span class="resumo-val">${nlSafeText(dados.unidade)}</span></div>
    <div class="resumo-row"><span class="resumo-label">Data</span><span class="resumo-val">${nlSafeText(dados.dia)} às ${nlSafeText(dados.horario)}</span></div>
    <div class="resumo-row"><span class="resumo-label">Cobertura</span><span class="resumo-val">${nlSafeText(dados.convenio || dados.cobertura)}</span></div>
  `;
}

function renderConveniosMelhorados(lista = NL_PLANOS) {
  const grid = document.getElementById('planGrid');
  if (!grid) return;
  const unidadeSelect = document.getElementById('planUnit');
  if (unidadeSelect && unidadeSelect.dataset.ready !== 'true') {
    unidadeSelect.dataset.ready = 'true';
    unidadeSelect.innerHTML = '<option value="">Todas as unidades</option>' + NL_UNIDADES.map(unidade => `<option>${nlSafeText(unidade.nome)}</option>`).join('');
  }
  grid.innerHTML = lista.map(plano => `
    <article class="plan-card plan-card-rich">
      <div><strong>${nlSafeText(plano.nome)}</strong><span>${plano.servicos.join(' · ')}</span></div>
      <div class="plan-badges">${plano.servicos.map(servico => `<small>${nlSafeText(servico)}</small>`).join('')}</div>
      <div class="tags">${plano.unidades.map(unidade => `<span class="tag">${nlSafeText(unidade)}</span>`).join('')}</div>
      <div class="plan-card-actions">
        <button class="btn btn-light" onclick="abrirAgendamento()">Agendar com plano</button>
        <button class="btn btn-outline-secondary" onclick="alternarComparacaoPlano('${plano.nome.replace(/'/g, "\\'")}', this)">Comparar</button>
      </div>
    </article>
  `).join('') || '<div class="safe-note">Nenhum convênio encontrado para o filtro informado.</div>';
  renderComparadorPlanos();
}

function aplicarIdentidadeVisualLegada() {
  const pagina = paginaArquivo();
  const classesPorPagina = {
    'index.html': 'page-home',
    'sobre.html': 'page-sobre',
    'especialidades.html': 'page-especialidades',
    'medicos.html': 'page-medicos',
    'exames.html': 'page-exames',
    'unidades.html': 'page-unidades',
    'convenios.html': 'page-convenios',
    'teleconsulta.html': 'page-teleconsulta',
    'area-paciente.html': 'page-paciente',
    'agendamento.html': 'page-agendamento',
    'termos-de-uso.html': 'page-legal',
    'politica-privacidade.html': 'page-legal'
  };

  document.body.classList.remove('nl-redesign');
  document.body.classList.add('nl-legacy', classesPorPagina[pagina] || 'page-interna');
  document.body.dataset.page = pagina.replace('.html', '') || 'home';
}

function prepararMenuResponsivo() {
  const menu = document.getElementById('menu');
  const botao = document.querySelector('.menu-btn');
  if (!menu || !botao || menu.dataset.enhanced === 'true') return;

  menu.dataset.enhanced = 'true';
  menu.id = menu.id || 'menu';
  botao.setAttribute('aria-controls', menu.id);
  botao.setAttribute('aria-expanded', String(menu.classList.contains('open')));

  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      menu.classList.remove('open');
      botao.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    menu.classList.remove('open');
    botao.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('click', (event) => {
    if (!menu.classList.contains('open')) return;
    if (event.target.closest('nav')) return;
    menu.classList.remove('open');
    botao.setAttribute('aria-expanded', 'false');
  });
}

function prepararNavbarFixa() {
  const topbar = document.querySelector('.topbar');
  const header = document.querySelector('header');
  const navbar = document.querySelector('.navbar');
  if (!header || header.dataset.fixedReady === 'true') return;
  header.dataset.fixedReady = 'true';

  const calcularAlturas = () => {
    const topbarVisivel = topbar && getComputedStyle(topbar).display !== 'none';
    const topbarAltura = topbarVisivel ? Math.ceil(topbar.getBoundingClientRect().height || 36) : 0;
    const headerAltura = Math.ceil((navbar || header).getBoundingClientRect().height || 78);
    const offset = topbarAltura + headerAltura;

    document.documentElement.style.setProperty('--nl-topbar-height', `${topbarAltura}px`);
    document.documentElement.style.setProperty('--nl-header-height', `${headerAltura}px`);
    document.documentElement.style.setProperty('--nl-fixed-offset', `${offset}px`);
    document.body.style.paddingTop = `${offset}px`;
    document.body.classList.add('nl-navbar-fixed-ready');
  };

  const atualizarSombra = () => {
    header.classList.toggle('navbar-scrolled', window.scrollY > 8);
  };

  calcularAlturas();
  atualizarSombra();
  setTimeout(calcularAlturas, 80);
  window.addEventListener('resize', calcularAlturas, { passive: true });
  window.addEventListener('scroll', atualizarSombra, { passive: true });
}

function aplicarAjustesBootstrapLegado() {
  document.querySelectorAll('.modal-card, .card, .quick-btn, .unidade-rica, .dashboard-section, .consulta-option-card, .exam-info-panel').forEach((elemento) => {
    elemento.classList.add('shadow-sm');
  });

  document.querySelectorAll('input, select, textarea').forEach((campo) => {
    const tipo = String(campo.getAttribute('type') || '').toLowerCase();
    if (['checkbox', 'radio', 'hidden', 'file', 'button', 'submit'].includes(tipo)) return;
    if (!campo.classList.contains('form-control') && !campo.classList.contains('form-select')) {
      campo.classList.add(campo.tagName === 'SELECT' ? 'form-select' : 'form-control');
    }
  });

  document.querySelectorAll('.page-hero, .hero').forEach((hero) => {
    if (!hero.dataset.enhanced) {
      hero.dataset.enhanced = 'true';
      hero.insertAdjacentHTML('beforeend', '<div class="page-ambient-line" aria-hidden="true"></div>');
    }
  });
}

const NL_ACOES_RAPIDAS = [
  { titulo: 'Agendar consulta', detalhe: 'Abrir fluxo de agendamento em 6 passos', href: 'agendamento.html', termos: 'agendar consulta horario medico unidade' },
  { titulo: 'Teleconsulta', detalhe: 'Consulta online particular ou convenio', href: 'teleconsulta.html', termos: 'online teleconsulta video' },
  { titulo: 'Area do Paciente', detalhe: 'Historico, exames, documentos e familia', href: 'area-paciente.html', termos: 'paciente historico exames documentos familia' },
  { titulo: 'Medicos', detalhe: 'Ver profissionais por especialidade', href: 'medicos.html', termos: 'medicos especialistas neurologia' },
  { titulo: 'Exames', detalhe: 'EEG, ENMG, polissonografia e preparo', href: 'exames.html', termos: 'exames eeg enmg polissonografia preparo' },
  { titulo: 'Unidades', detalhe: 'Enderecos, mapas e estrutura', href: 'unidades.html', termos: 'unidades mapa endereco unidade' },
  { titulo: 'Convenios', detalhe: 'Planos aceitos e cobertura', href: 'convenios.html', termos: 'convenios planos cobertura' },
  { titulo: 'Termos e privacidade', detalhe: 'LGPD, termos de uso e politica de privacidade', href: 'politica-privacidade.html', termos: 'termos privacidade lgpd dados' }
];

function prepararSugestoesBusca() {
  if (document.getElementById('nlBuscaSugestoes')) return;
  const datalist = document.createElement('datalist');
  datalist.id = 'nlBuscaSugestoes';
  datalist.innerHTML = [
    'Agendar consulta',
    'Teleconsulta',
    'EEG',
    'Eletroneuromiografia',
    'Polissonografia',
    'Enxaqueca',
    'Memoria',
    'Unimed',
    'Bradesco Saude',
    'Area do Paciente'
  ].map(item => `<option value="${item}"></option>`).join('');
  document.body.appendChild(datalist);
  document.querySelectorAll('#busca, #drEspecialidadeBusca, input[type="search"]').forEach(input => {
    input.setAttribute('list', 'nlBuscaSugestoes');
    input.setAttribute('autocomplete', 'off');
  });
}

function registrarBuscaRecente(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return;
  const recentes = lerJson('neurolab_buscas_recentes', []);
  const atualizados = [texto, ...recentes.filter(item => normalizarTexto(item) !== normalizarTexto(texto))].slice(0, 6);
  salvarJson('neurolab_buscas_recentes', atualizados);
}

function abrirComandoRapido() {
  let palette = document.getElementById('nlCommandPalette');
  if (!palette) {
    palette = document.createElement('div');
    palette.id = 'nlCommandPalette';
    palette.className = 'nl-command-palette';
    palette.innerHTML = `
      <div class="nl-command-card">
        <button class="nl-command-close" onclick="fecharComandoRapido()" aria-label="Fechar">x</button>
        <label for="nlCommandInput">Busca rapida</label>
        <input id="nlCommandInput" class="form-control" placeholder="Digite: agendar, exame, unidade, convenio..." oninput="filtrarComandoRapido(this.value)" onkeydown="executarComandoRapido(event)">
        <div class="nl-command-list" id="nlCommandList"></div>
      </div>
    `;
    document.body.appendChild(palette);
  }
  palette.classList.add('open');
  document.body.style.overflow = 'hidden';
  filtrarComandoRapido('');
  setTimeout(() => document.getElementById('nlCommandInput')?.focus(), 40);
}

function fecharComandoRapido() {
  document.getElementById('nlCommandPalette')?.classList.remove('open');
  if (!document.querySelector('.modal-overlay.open')) document.body.style.overflow = '';
}

function filtrarComandoRapido(valor = '') {
  const termo = normalizarTexto(valor);
  const lista = document.getElementById('nlCommandList');
  if (!lista) return;
  const recentes = lerJson('neurolab_buscas_recentes', []);
  const itens = NL_ACOES_RAPIDAS.filter(item => {
    const base = normalizarTexto(`${item.titulo} ${item.detalhe} ${item.termos}`);
    return !termo || base.includes(termo);
  });
  const htmlRecentes = !termo && recentes.length
    ? `<div class="nl-command-section">Recentes</div>${recentes.map(item => `<button class="nl-command-item compact" onclick="rebuscarComandoRapido('${encodeURIComponent(item)}')"><strong>${nlSafeText(item)}</strong><span>Buscar novamente</span></button>`).join('')}`
    : '';
  const htmlAcoes = itens.map((item, index) => `
    <button class="nl-command-item ${index === 0 ? 'active' : ''}" onclick="navegarPara('${item.href}')">
      <strong>${nlSafeText(item.titulo)}</strong>
      <span>${nlSafeText(item.detalhe)}</span>
    </button>
  `).join('');
  lista.innerHTML = `${htmlRecentes}${htmlAcoes}` || '<div class="safe-note">Nada encontrado. Tente buscar por consulta, exame, unidade ou convenio.</div>';
}

function rebuscarComandoRapido(valorCodificado) {
  const valor = decodeURIComponent(valorCodificado || '');
  const input = document.getElementById('nlCommandInput');
  if (input) {
    input.value = valor;
    filtrarComandoRapido(valor);
    input.focus();
    return;
  }
  registrarBuscaRecente(valor);
  const busca = document.getElementById('busca');
  if (busca) {
    busca.value = valor;
    buscarSite();
  }
}

function executarComandoRapido(event) {
  if (event.key === 'Escape') {
    fecharComandoRapido();
    return;
  }
  if (event.key !== 'Enter') return;
  registrarBuscaRecente(document.getElementById('nlCommandInput')?.value || '');
  const ativo = document.querySelector('#nlCommandList .nl-command-item.active') || document.querySelector('#nlCommandList .nl-command-item');
  ativo?.click();
}

function prepararAtalhosGlobais() {
  if (document.body.dataset.shortcutsReady === 'true') return;
  document.body.dataset.shortcutsReady = 'true';

  document.addEventListener('keydown', (event) => {
    const alvo = event.target;
    const digitando = alvo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      abrirComandoRapido();
      return;
    }
    if (event.key === '/' && !digitando && !document.querySelector('.modal-overlay.open')) {
      event.preventDefault();
      abrirComandoRapido();
      return;
    }
    if (event.key === 'Escape') fecharComandoRapido();
  });
}

function prepararBotaoVoltarTopo() {
  if (document.getElementById('nlBackTop')) return;
  const botao = document.createElement('button');
  botao.id = 'nlBackTop';
  botao.className = 'nl-back-top';
  botao.type = 'button';
  botao.setAttribute('aria-label', 'Voltar ao topo');
  botao.setAttribute('data-bs-toggle', 'tooltip');
  botao.setAttribute('data-bs-title', 'Voltar ao topo');
  botao.textContent = '↑';
  botao.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.body.appendChild(botao);

  const alternar = () => botao.classList.toggle('show', window.scrollY > 520);
  alternar();
  window.addEventListener('scroll', alternar, { passive: true });
}

function prepararValidacaoBootstrap() {
  const grupos = document.querySelectorAll('.form-group');
  grupos.forEach((grupo) => {
    const label = grupo.querySelector('label');
    const campo = grupo.querySelector('input, select, textarea');
    if (!campo || campo.type === 'checkbox' || campo.type === 'file') return;
    if (label?.textContent.includes('*')) campo.required = true;
    campo.classList.add(campo.tagName === 'SELECT' ? 'form-select' : 'form-control');
    if (!grupo.querySelector('.invalid-feedback')) {
      campo.insertAdjacentHTML('afterend', '<div class="invalid-feedback">Confira este campo antes de continuar.</div>');
    }
    const validar = () => validarCampoBootstrap(campo);
    campo.addEventListener('blur', () => {
      campo.dataset.touched = 'true';
      validar();
    });
    campo.addEventListener('input', () => {
      if (campo.dataset.touched === 'true' || campo.value.length > 2) validar();
      atualizarBotaoCadastro();
    });
  });

  document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach((checkbox) => {
    checkbox.classList.add('form-check-input');
    checkbox.addEventListener('change', atualizarBotaoCadastro);
  });
  atualizarBotaoCadastro();
}

function validarCampoBootstrap(campo) {
  const valor = String(campo.value || '').trim();
  let valido = true;
  let mensagem = 'Confira este campo antes de continuar.';

  if (campo.required && !valor) {
    valido = false;
    mensagem = 'Campo obrigat\u00f3rio.';
  } else if (campo.type === 'email' && valor && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
    valido = false;
    mensagem = 'Informe um e-mail v\u00e1lido.';
  } else if (/cpf/i.test(campo.id) && valor && !cpfValido(valor)) {
    valido = false;
    mensagem = 'CPF inv\u00e1lido.';
  } else if (/senha/i.test(campo.id) && !/confirm/i.test(campo.id) && valor && !senhaValida(valor)) {
    valido = false;
    mensagem = 'Use ao menos 8 caracteres, uma letra e um n\u00famero.';
  } else if (campo.id === 'cadSenhaConfirm') {
    const senha = document.getElementById('cadSenha')?.value || '';
    valido = valor === senha;
    mensagem = 'As senhas precisam ser iguais.';
  }

  campo.classList.toggle('is-invalid', !valido);
  campo.classList.toggle('is-valid', valido && Boolean(valor));
  const feedback = campo.parentElement?.querySelector('.invalid-feedback');
  if (feedback) feedback.textContent = mensagem;
  return valido;
}

function atualizarBotaoCadastro() {
  const modal = document.getElementById('modalCadastro');
  const botao = modal?.querySelector('button.btn-primary.btn-full');
  const termos = document.getElementById('cadTermos');
  if (!botao || !termos) return;
  botao.disabled = !termos.checked;
  botao.classList.toggle('disabled', !termos.checked);
  botao.title = termos.checked ? '' : 'Aceite os Termos de Uso e a Pol\u00edtica de Privacidade.';
}

function prepararForcaSenha() {
  document.querySelectorAll('#cadSenha, #cadSenhaAdol, #loginSenha').forEach((campo) => {
    if (campo.dataset.strengthReady === 'true') return;
    campo.dataset.strengthReady = 'true';
    campo.insertAdjacentHTML('afterend', '<div class="nl-password-strength"><span></span><small>For\u00e7a da senha</small></div>');
    campo.addEventListener('input', () => atualizarForcaSenha(campo));
    atualizarForcaSenha(campo);
  });
}

function atualizarForcaSenha(campo) {
  const box = campo.parentElement?.querySelector('.nl-password-strength');
  if (!box) return;
  const senha = campo.value || '';
  let score = 0;
  if (senha.length >= 8) score += 1;
  if (/[A-Z]/.test(senha)) score += 1;
  if (/\d/.test(senha)) score += 1;
  if (/[^A-Za-z0-9]/.test(senha)) score += 1;
  const niveis = [
    { label: 'Muito fraca', cls: 'weak', width: '18%' },
    { label: 'Fraca', cls: 'weak', width: '35%' },
    { label: 'Boa', cls: 'medium', width: '62%' },
    { label: 'Forte', cls: 'strong', width: '82%' },
    { label: 'Muito forte', cls: 'strong', width: '100%' }
  ];
  const nivel = niveis[Math.min(score, 4)];
  box.className = `nl-password-strength ${nivel.cls}`;
  box.style.setProperty('--strength-width', senha ? nivel.width : '0%');
  box.querySelector('small').textContent = senha ? nivel.label : 'For\u00e7a da senha';
}

function prepararFavoritosMedicos() {
  const cards = document.querySelectorAll('.doctor-profile-card');
  if (!cards.length) return;
  const favoritos = lerJson('neurolab_medicos_favoritos', []);
  cards.forEach((card) => {
    if (card.dataset.favoriteReady === 'true') return;
    card.dataset.favoriteReady = 'true';
    const nome = card.querySelector('.doctor-profile-top strong')?.textContent?.trim();
    if (!nome) return;
    const ativo = favoritos.includes(nome);
    card.insertAdjacentHTML('afterbegin', `
      <button class="doctor-fav-btn ${ativo ? 'active' : ''}" type="button" onclick="alternarFavoritoMedico('${nome.replace(/'/g, "\\'")}', this)" aria-label="Favoritar m\u00e9dico" data-bs-toggle="tooltip" data-bs-title="Salvar m\u00e9dico favorito">
        ${ativo ? '\u2665' : '\u2661'}
      </button>
    `);
  });
}

function alternarFavoritoMedico(nome, botao) {
  const favoritos = lerJson('neurolab_medicos_favoritos', []);
  const existe = favoritos.includes(nome);
  const novos = existe ? favoritos.filter(item => item !== nome) : [...favoritos, nome];
  salvarJson('neurolab_medicos_favoritos', novos);
  botao.classList.toggle('active', !existe);
  botao.textContent = existe ? '\u2661' : '\u2665';
  mostrarToast(existe ? 'M\u00e9dico removido dos favoritos.' : 'M\u00e9dico salvo nos favoritos.', 'sucesso');
}

function prepararAcoesUnidades() {
  document.querySelectorAll('.unit-showcase-card').forEach((card) => {
    if (card.dataset.unitActionsReady === 'true') return;
    const endereco = card.querySelector('.unit-showcase-body > p')?.textContent?.trim();
    const body = card.querySelector('.unit-showcase-body');
    if (!endereco || !body) return;
    card.dataset.unitActionsReady = 'true';
    body.insertAdjacentHTML('beforeend', `
      <button class="btn btn-light btn-sm unit-copy-btn" type="button" onclick="copiarTextoNeuroLab('${endereco.replace(/'/g, "\\'")}', 'Endere\u00e7o copiado.')">Copiar endere\u00e7o</button>
    `);
  });
}

async function copiarTextoNeuroLab(texto, mensagem = 'Copiado.') {
  try {
    await navigator.clipboard.writeText(texto);
    mostrarToast(mensagem, 'sucesso');
  } catch (_) {
    mostrarToast(texto, 'info', 7000);
  }
}

function alternarComparacaoPlano(nome, botao) {
  const selecionados = lerJson('neurolab_planos_comparar', []);
  const existe = selecionados.includes(nome);
  const proximos = existe ? selecionados.filter(item => item !== nome) : [...selecionados, nome].slice(-3);
  salvarJson('neurolab_planos_comparar', proximos);
  botao?.closest('.plan-card-rich')?.classList.toggle('compare-selected', !existe);
  renderComparadorPlanos();
  mostrarToast(existe ? 'Plano removido da comparacao.' : 'Plano adicionado para comparar.', 'info');
}

function renderComparadorPlanos() {
  const grid = document.getElementById('planGrid');
  if (!grid) return;
  let painel = document.getElementById('nlPlanComparePanel');
  if (!painel) {
    grid.insertAdjacentHTML('beforebegin', '<div class="nl-plan-compare-panel hidden" id="nlPlanComparePanel"></div>');
    painel = document.getElementById('nlPlanComparePanel');
  }

  const selecionados = lerJson('neurolab_planos_comparar', []);
  document.querySelectorAll('.plan-card-rich').forEach(card => {
    const nome = card.querySelector('strong')?.textContent?.trim();
    const selecionado = selecionados.includes(nome);
    card.classList.toggle('compare-selected', selecionado);
    const botao = card.querySelector('.plan-card-actions button:last-child');
    if (botao) {
      botao.classList.toggle('btn-primary', selecionado);
      botao.classList.toggle('btn-outline-secondary', !selecionado);
      botao.textContent = selecionado ? 'Selecionado' : 'Comparar';
    }
  });

  if (!selecionados.length) {
    painel.classList.add('hidden');
    painel.innerHTML = '';
    return;
  }

  const planos = selecionados
    .map(nome => NL_PLANOS.find(plano => plano.nome === nome))
    .filter(Boolean);

  painel.classList.remove('hidden');
  painel.innerHTML = `
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <div>
        <span class="badge text-bg-info">Comparador</span>
        <h3>Planos selecionados</h3>
      </div>
      <button class="btn btn-sm btn-outline-secondary" onclick="salvarJson('neurolab_planos_comparar', []); renderComparadorPlanos()">Limpar</button>
    </div>
    <div class="table-responsive">
      <table class="table table-sm align-middle mb-0">
        <thead><tr><th>Plano</th><th>Servicos</th><th>Unidades</th></tr></thead>
        <tbody>
          ${planos.map(plano => `
            <tr>
              <td><strong>${nlSafeText(plano.nome)}</strong></td>
              <td>${plano.servicos.map(servico => `<span class="badge rounded-pill text-bg-light">${nlSafeText(servico)}</span>`).join(' ')}</td>
              <td>${plano.unidades.map(unidade => `<small class="d-inline-block me-2">${nlSafeText(unidade)}</small>`).join('')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function prepararRascunhoCadastro() {
  if (document.body.dataset.cadastroDraftReady === 'true') return;
  document.body.dataset.cadastroDraftReady = 'true';
  const ids = ['cadCpf', 'cadNascimento', 'cadNome', 'cadCelular', 'cadEmail', 'cadCpfAdol', 'cadNascAdol', 'cadNomeAdol', 'cadCelAdol', 'cadCpfResp'];
  const rascunho = lerJson('neurolab_cadastro_rascunho', {});
  ids.forEach(id => {
    const campo = document.getElementById(id);
    if (!campo) return;
    if (rascunho[id] && !campo.value) campo.value = rascunho[id];
    campo.addEventListener('input', salvarRascunhoCadastro);
  });
}

function salvarRascunhoCadastro() {
  const ids = ['cadCpf', 'cadNascimento', 'cadNome', 'cadCelular', 'cadEmail', 'cadCpfAdol', 'cadNascAdol', 'cadNomeAdol', 'cadCelAdol', 'cadCpfResp'];
  const dados = {};
  ids.forEach(id => {
    const campo = document.getElementById(id);
    if (campo?.value) dados[id] = campo.value;
  });
  salvarJson('neurolab_cadastro_rascunho', dados);
}

function limparRascunhoCadastro() {
  localStorage.removeItem('neurolab_cadastro_rascunho');
}

function aplicarPreferenciasInterface() {
  const prefs = lerJson('neurolab_ui_prefs', { contraste: false, fonteGrande: false });
  document.body.classList.toggle('nl-high-contrast', Boolean(prefs.contraste));
  document.body.classList.toggle('nl-font-large', Boolean(prefs.fonteGrande));
}

function atualizarPreferenciaInterface(chave, valor) {
  const prefs = lerJson('neurolab_ui_prefs', { contraste: false, fonteGrande: false });
  prefs[chave] = Boolean(valor);
  salvarJson('neurolab_ui_prefs', prefs);
  aplicarPreferenciasInterface();
  renderPainelAcoesBootstrap();
}

function calcularCompletudePerfil() {
  const usuario = lerJson(STORAGE_KEYS.usuarioAtual, null);
  let pontos = 0;
  if (usuario?.cpf) pontos += 25;
  if (usuario?.nome) pontos += 20;
  if (localStorage.getItem('neurolab_foto_perfil')) pontos += 20;
  if (lerJson('neurolab_dependentes', []).length) pontos += 20;
  if (lerJson(STORAGE_KEYS.agendamentos, []).length) pontos += 15;
  return Math.min(100, pontos);
}

function prepararPainelAcoesBootstrap() {
  if (document.getElementById('nlActionPanel')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <button class="nl-action-fab btn btn-light" type="button" onclick="abrirPainelAcoesBootstrap()" data-bs-toggle="tooltip" data-bs-title="Abrir painel de acoes">Acoes</button>
    <div class="offcanvas offcanvas-end nl-action-offcanvas" tabindex="-1" id="nlActionPanel" aria-labelledby="nlActionPanelTitle">
      <div class="offcanvas-header">
        <div>
          <span class="badge text-bg-info">NeuroLab</span>
          <h5 class="offcanvas-title" id="nlActionPanelTitle">Painel rapido</h5>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Fechar"></button>
      </div>
      <div class="offcanvas-body" id="nlActionPanelBody"></div>
    </div>
  `);
  renderPainelAcoesBootstrap();
}

function abrirPainelAcoesBootstrap() {
  renderPainelAcoesBootstrap();
  const painel = document.getElementById('nlActionPanel');
  if (window.bootstrap?.Offcanvas && painel) {
    window.bootstrap.Offcanvas.getOrCreateInstance(painel).show();
  }
}

function renderPainelAcoesBootstrap() {
  const body = document.getElementById('nlActionPanelBody');
  if (!body) return;
  const usuario = lerJson(STORAGE_KEYS.usuarioAtual, null);
  const agendamentos = lerJson(STORAGE_KEYS.agendamentos, []);
  const favoritos = lerJson('neurolab_medicos_favoritos', []);
  const buscas = lerJson('neurolab_buscas_recentes', []);
  const prefs = lerJson('neurolab_ui_prefs', { contraste: false, fonteGrande: false });
  const progresso = calcularCompletudePerfil();

  body.innerHTML = `
    <div class="nl-action-user">
      <strong>${nlSafeText(usuario?.nome || 'Visitante')}</strong>
      <span>${usuario?.cpf ? 'Conta ativa' : 'Entre para salvar agendamentos e preferencias'}</span>
      <div class="progress mt-2" role="progressbar" aria-label="Perfil completo" aria-valuenow="${progresso}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar" style="width:${progresso}%">${progresso}%</div>
      </div>
    </div>
    <div class="list-group nl-action-list">
      <button class="list-group-item list-group-item-action" onclick="abrirAgendamento()">Agendar consulta <span>Fluxo completo</span></button>
      <a class="list-group-item list-group-item-action" href="area-paciente.html">Minha area <span>${agendamentos.length} agendamento(s)</span></a>
      <a class="list-group-item list-group-item-action" href="medicos.html">Medicos favoritos <span>${favoritos.length} salvo(s)</span></a>
      <a class="list-group-item list-group-item-action" href="convenios.html">Comparar convenios <span>${lerJson('neurolab_planos_comparar', []).length}/3</span></a>
    </div>
    <div class="nl-ui-card">
      <strong>Preferencias</strong>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" role="switch" id="prefContraste" ${prefs.contraste ? 'checked' : ''} onchange="atualizarPreferenciaInterface('contraste', this.checked)">
        <label class="form-check-label" for="prefContraste">Alto contraste</label>
      </div>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" role="switch" id="prefFonte" ${prefs.fonteGrande ? 'checked' : ''} onchange="atualizarPreferenciaInterface('fonteGrande', this.checked)">
        <label class="form-check-label" for="prefFonte">Fonte maior</label>
      </div>
    </div>
    <div class="nl-ui-card">
      <strong>Buscas recentes</strong>
      <div class="nl-recent-searches">
        ${buscas.length ? buscas.map(item => `<button class="nl-recent-chip" onclick="rebuscarComandoRapido('${encodeURIComponent(item)}')">${nlSafeText(item)}</button>`).join('') : '<span class="text-muted small">Nenhuma busca recente.</span>'}
      </div>
    </div>
  `;
}

function prepararBotaoAgendamentoContextual() {
  if (document.getElementById('nlQuickSchedule')) return;
  if (paginaArquivo() === 'agendamento.html') return;
  const botao = document.createElement('button');
  botao.id = 'nlQuickSchedule';
  botao.className = 'nl-quick-schedule btn btn-primary';
  botao.type = 'button';
  botao.setAttribute('data-bs-toggle', 'tooltip');
  botao.setAttribute('data-bs-title', 'Abrir agendamento');
  botao.textContent = 'Agendar';
  botao.addEventListener('click', abrirAgendamento);
  document.body.appendChild(botao);
}

function prepararComponentesBootstrap() {
  if (!window.bootstrap?.Tooltip) return;
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((elemento) => {
    if (!window.bootstrap.Tooltip.getInstance(elemento)) {
      new window.bootstrap.Tooltip(elemento);
    }
  });
}

function aplicarUxRefresh() {
  aplicarIdentidadeVisualLegada();
  aplicarPreferenciasInterface();
  montarNavbarComum();
  atualizarHeader();
  prepararMenuResponsivo();
  prepararNavbarFixa();
  aplicarAjustesBootstrapLegado();
  prepararValidacaoBootstrap();
  prepararForcaSenha();
  prepararRascunhoCadastro();
  prepararSugestoesBusca();
  prepararAtalhosGlobais();
  prepararBotaoVoltarTopo();
  prepararBotaoAgendamentoContextual();
  prepararPainelAcoesBootstrap();
  prepararHomeEnxuta();
  renderConveniosMelhorados();
  renderComparadorPlanos();
  renderUnidadesCompleta();
  renderTeleconsultaProfissional();
  renderPortalPacienteNovo();
  renderMedicosPage();
  prepararFavoritosMedicos();
  prepararAcoesUnidades();
  renderAgendamentoDrConsulta();
  prepararComponentesBootstrap();
  if (document.querySelector('#agStep5 .calendario-grid')) renderCalendarioAgendamento();
}

document.addEventListener('DOMContentLoaded', aplicarUxRefresh);

/* ============================================================
   NEUROLAB LEGACY JS POLISH - estado, menu e agendamento
   ============================================================ */
(function aprimorarProjetoLegado() {
  const DRAFT_KEY = 'neurolab_agendamento_rascunho';
  const DRAFT_TTL = 30 * 60 * 1000;

  function paginaEhAgendamento() {
    return typeof paginaArquivo === 'function' && paginaArquivo() === 'agendamento.html';
  }

  function lerRascunho() {
    const rascunho = lerJson(DRAFT_KEY, null);
    if (!rascunho || Date.now() - rascunho.salvoEm > DRAFT_TTL) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return rascunho;
  }

  function salvarRascunhoAgendamento() {
    if (!paginaEhAgendamento()) return;
    if (!agendamentoAtual || !Object.keys(agendamentoAtual).length) return;
    salvarJson(DRAFT_KEY, {
      salvoEm: Date.now(),
      passo: agendamentoPasso,
      dados: agendamentoAtual,
      ux: {
        calendarOffset: window.NLUX?.calendarOffset || 0,
        selectedDateISO: window.NLUX?.selectedDateISO || '',
        selectedSlot: window.NLUX?.selectedSlot || ''
      }
    });
  }

  function marcarEscolhasRestauradas() {
    const textoTipo = agendamentoAtual.tipoNome || '';
    const cobertura = agendamentoAtual.cobertura || '';
    document.querySelectorAll('#agStep1 .tipo-btn').forEach((botao) => {
      botao.classList.toggle('selected', textoTipo && botao.textContent.includes(textoTipo.split(' ')[0]));
    });
    document.querySelectorAll('#agStep2 .tipo-btn').forEach((botao) => {
      botao.classList.toggle('selected', cobertura && botao.textContent.includes(cobertura));
    });
    document.getElementById('convenioSelect')?.classList.toggle('hidden', cobertura !== 'Convênio');
  }

  function restaurarRascunhoAgendamento() {
    if (!paginaEhAgendamento()) return;
    const rascunho = lerRascunho();
    if (!rascunho?.dados) return;

    agendamentoAtual = { ...rascunho.dados };
    window.NLUX = {
      ...window.NLUX,
      ...(rascunho.ux || {}),
      selectedSlot: ''
    };

    marcarEscolhasRestauradas();
    if (agendamentoAtual.tipoCodigo && agendamentoAtual.cobertura) renderUnidadesAgendamento();
    if (agendamentoAtual.unidade) renderMedicosAgendamento();
    if (agendamentoAtual.medico) renderCalendarioAgendamento();

    const passoSeguro = Math.min(Number(rascunho.passo) || 1, 5);
    irParaPasso(passoSeguro);
    mostrarToast('Retomamos seu agendamento de onde você parou.', 'info', 3500);
  }

  function limparRascunhoAgendamento() {
    localStorage.removeItem(DRAFT_KEY);
  }

  function envolverFuncao(nome, depois) {
    const original = window[nome];
    if (typeof original !== 'function' || original.__nlEnhanced) return;

    const aprimorada = function (...args) {
      const retorno = original.apply(this, args);
      depois?.(retorno, args);
      return retorno;
    };
    aprimorada.__nlEnhanced = true;
    window[nome] = aprimorada;
  }

  const nomesQueSalvamRascunho = [
    'selecionarTipo',
    'selecionarCobertura',
    'confirmarConvenio',
    'selecionarUnidade',
    'selecionarMedico',
    'selecionarDataCalendario',
    'selecionarHorario',
    'irParaPasso'
  ];

  nomesQueSalvamRascunho.forEach((nome) => envolverFuncao(nome, salvarRascunhoAgendamento));

  envolverFuncao('novoAgendamento', limparRascunhoAgendamento);
  envolverFuncao('confirmarAgendamentoFinal', () => {
    if (!document.getElementById('agStepSucesso')?.classList.contains('hidden')) limparRascunhoAgendamento();
  });

  const abrirMenuOriginal = window.abrirMenu;
  window.abrirMenu = function abrirMenuAcessivel() {
    abrirMenuOriginal?.();
    const menu = document.getElementById('menu');
    const botao = document.querySelector('.menu-btn');
    botao?.setAttribute('aria-expanded', String(Boolean(menu?.classList.contains('open'))));
  };

  window.addEventListener('beforeunload', () => {
    if (paginaEhAgendamento()) salvarRascunhoAgendamento();
    if (typeof liberarHold === 'function') liberarHold(false);
  });

document.addEventListener('DOMContentLoaded', restaurarRascunhoAgendamento);
})();

/* ============================================================
   NEUROLAB BOOKING FINAL PASS - agendamento sem menu lateral
   ============================================================ */
function prepararPainelAcoesBootstrap() {
  if (document.getElementById('nlActionPanel')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <button class="nl-action-fab btn btn-light" type="button" onclick="abrirPainelAcoesBootstrap()" data-bs-toggle="tooltip" data-bs-title="Abrir atalhos">
      <span class="nl-action-fab-icon">+</span>
      <span>Atalhos</span>
    </button>
    <div class="offcanvas offcanvas-end nl-action-offcanvas" tabindex="-1" id="nlActionPanel" aria-labelledby="nlActionPanelTitle">
      <div class="offcanvas-header">
        <div>
          <span class="badge text-bg-info">NeuroLab</span>
          <h5 class="offcanvas-title" id="nlActionPanelTitle">Atalhos rapidos</h5>
          <small>Acesso rapido aos fluxos principais.</small>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Fechar"></button>
      </div>
      <div class="offcanvas-body" id="nlActionPanelBody"></div>
    </div>
  `);
  renderPainelAcoesBootstrap();
}

function renderPainelAcoesBootstrap() {
  const body = document.getElementById('nlActionPanelBody');
  if (!body) return;
  const usuario = lerJson(STORAGE_KEYS.usuarioAtual, null);
  const agendamentos = lerJson(STORAGE_KEYS.agendamentos, []);
  const favoritos = lerJson('neurolab_medicos_favoritos', []);
  const buscas = lerJson('neurolab_buscas_recentes', []);
  const prefs = lerJson('neurolab_ui_prefs', { contraste: false, fonteGrande: false });
  const progresso = calcularCompletudePerfil();

  body.innerHTML = `
    <section class="nl-action-profile">
      <div>
        <strong>${nlSafeText(usuario?.nome || 'Visitante')}</strong>
        <span>${usuario?.cpf ? 'Conta conectada' : 'Entre para salvar agendamentos e preferencias.'}</span>
      </div>
      <div class="progress" role="progressbar" aria-label="Perfil completo" aria-valuenow="${progresso}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar" style="width:${progresso}%">${progresso}%</div>
      </div>
    </section>

    <section class="nl-action-primary">
      <button class="btn btn-primary" onclick="abrirAgendamento()">Agendar consulta</button>
      <a class="btn btn-light" href="area-paciente.html">Minha area</a>
    </section>

    <section class="nl-action-grid">
      <a href="medicos.html">
        <strong>Medicos</strong>
        <span>${favoritos.length} favorito(s)</span>
      </a>
      <a href="unidades.html">
        <strong>Unidades</strong>
        <span>Mapas e estrutura</span>
      </a>
      <a href="convenios.html">
        <strong>Convenios</strong>
        <span>${lerJson('neurolab_planos_comparar', []).length}/3 comparados</span>
      </a>
      <a href="teleconsulta.html">
        <strong>Teleconsulta</strong>
        <span>Particular e convenio</span>
      </a>
    </section>

    <section class="nl-ui-card nl-action-preferences">
      <strong>Preferencias de leitura</strong>
      <label class="form-check form-switch">
        <input class="form-check-input" type="checkbox" role="switch" id="prefContraste" ${prefs.contraste ? 'checked' : ''} onchange="atualizarPreferenciaInterface('contraste', this.checked)">
        <span class="form-check-label">Alto contraste</span>
      </label>
      <label class="form-check form-switch">
        <input class="form-check-input" type="checkbox" role="switch" id="prefFonte" ${prefs.fonteGrande ? 'checked' : ''} onchange="atualizarPreferenciaInterface('fonteGrande', this.checked)">
        <span class="form-check-label">Fonte maior</span>
      </label>
    </section>

    <section class="nl-ui-card">
      <strong>Buscas recentes</strong>
      <div class="nl-recent-searches">
        ${buscas.length ? buscas.slice(0, 6).map(item => `<button class="nl-recent-chip" onclick="rebuscarComandoRapido('${encodeURIComponent(item)}')">${nlSafeText(item)}</button>`).join('') : '<span class="text-muted small">Nenhuma busca recente ainda.</span>'}
      </div>
    </section>
  `;
}

function prepararBotaoAgendamentoContextual() {
  if (document.getElementById('nlQuickSchedule')) return;
  if (paginaArquivo() === 'agendamento.html') return;
  const botao = document.createElement('button');
  botao.id = 'nlQuickSchedule';
  botao.className = 'nl-quick-schedule btn btn-primary';
  botao.type = 'button';
  botao.setAttribute('data-bs-toggle', 'tooltip');
  botao.setAttribute('data-bs-title', 'Abrir agendamento');
  botao.innerHTML = '<span>Agendar</span>';
  botao.addEventListener('click', abrirAgendamento);
  document.body.appendChild(botao);
}

function desenharResultadoDrConsulta(medicos, unidades, tipoAtual = nlBookingTipoPorTermo(nlBookingState().termo, nlBookingState().modo)) {
  const card = document.querySelector('.nl-booking-v2');
  if (!card) return;
  const estado = nlBookingState();
  const planoAtual = estado.plano || 'Particular';
  const datas = gerarDatasAgendamentoNovo(estado.dataISO);
  const semResultado = !medicos.length || !unidades.length;

  card.innerHTML = `
    <div class="booking-shell booking-shell-final">
      <aside class="booking-filter-panel booking-filter-panel-final">
        <div class="booking-mode compact" role="tablist" aria-label="Modalidade">
          <button class="${estado.modo === 'presencial' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('presencial')">Presencial</button>
          <button class="${estado.modo === 'online' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('online')">Online</button>
        </div>
        <div class="booking-filter-field booking-filter-field-wide">
          <label for="drFiltroEspecialidade">Busca</label>
          <input id="drFiltroEspecialidade" class="form-control" value="${nlSafeText(estado.termo)}" placeholder="Digite especialidade, exame ou médico..." onkeydown="if(event.key==='Enter') buscarAgendamentoNovo()">
        </div>
        <div class="booking-filter-field">
          <label for="drFiltroPlano">Plano</label>
          <select id="drFiltroPlano" class="form-select" onchange="buscarAgendamentoNovo()">${nlPlanoOptionsAgendamento(estado.modo, planoAtual)}</select>
        </div>
        <div class="booking-filter-field">
          <label for="drFiltroUnidade">Unidade</label>
          <select id="drFiltroUnidade" class="form-select" onchange="selecionarUnidadeAgendamentoV2(this.value)">
            ${unidades.map(unidade => `<option value="${nlSafeText(unidade.nome)}" ${unidade.nome === agendamentoAtual.unidade ? 'selected' : ''}>${nlSafeText(unidade.nome)}</option>`).join('')}
          </select>
        </div>
        <div class="booking-filter-field">
          <label for="drFiltroMedico">Medico</label>
          <select id="drFiltroMedico" class="form-select" onchange="selecionarMedicoAgendamentoV2(this.value)">
            ${medicos.map(medico => `<option value="${nlSafeText(medico.nome)}" ${medico.nome === agendamentoAtual.medico ? 'selected' : ''}>${nlSafeText(medico.nome)}</option>`).join('')}
          </select>
        </div>
        <div class="booking-filter-actions">
          <button class="btn btn-primary" onclick="buscarAgendamentoNovo()">Atualizar</button>
          <button class="btn btn-light" onclick="window.NLUX.drSearched=false; desenharBuscaDrConsulta()">Nova busca</button>
        </div>
      </aside>

      <main class="booking-results-panel booking-results-panel-final">
        ${semResultado ? nlBookingEmptyState() : `
          <section class="booking-result-summary booking-result-summary-final">
            <div>
              <span class="badge text-bg-info">${nlSafeText(nlBookingLabelTipo(tipoAtual))}</span>
              <h2 id="bookingSummaryTitle">${nlSafeText(agendamentoAtual.medico || 'Escolha um profissional')}</h2>
              <p id="bookingSummaryMeta">${nlSafeText(agendamentoAtual.unidade || 'Selecione uma unidade')} &middot; ${nlSafeText(planoAtual)}</p>
            </div>
            <div class="booking-summary-tags">
              <span>${medicos.length} profissionais</span>
              <span>${unidades.length} unidades</span>
              <span>Hold 10 min</span>
            </div>
          </section>

          <section class="booking-picker-grid booking-picker-grid-final">
            <div>
              <div class="booking-section-title">Unidades disponiveis</div>
              <div class="booking-unit-list">
                ${unidades.map(unidade => `
                  <button class="booking-unit-card ${unidade.nome === agendamentoAtual.unidade ? 'active' : ''}" data-unit="${nlSafeText(unidade.nome)}" onclick="selecionarUnidadeAgendamentoV2('${unidade.nome.replace(/'/g, "\\'")}')">
                    <strong>${nlSafeText(unidade.nome)}</strong>
                    <span>${nlSafeText(unidade.endereco)}</span>
                    <small>${nlSafeText(unidade.distancia)} &middot; ${unidade.coberturas.join(', ')}</small>
                  </button>
                `).join('')}
              </div>
            </div>
            <div>
              <div class="booking-section-title">Profissionais</div>
              <div class="booking-doctor-list">
                ${medicos.map(medico => `
                  <button class="booking-doctor-card ${medico.nome === agendamentoAtual.medico ? 'active' : ''}" data-doctor="${nlSafeText(medico.nome)}" onclick="selecionarMedicoAgendamentoV2('${medico.nome.replace(/'/g, "\\'")}')">
                    <span class="doctor-photo small">${nlDoctorInitials(medico.nome)}</span>
                    <span><strong>${nlSafeText(medico.nome)}</strong><small>${nlSafeText(medico.crm)} &middot; ${nlSafeText(medico.especialidade)}</small></span>
                    <em>${medico.rating.toFixed(1)}</em>
                  </button>
                `).join('')}
              </div>
            </div>
          </section>

          <section class="booking-calendar-panel booking-calendar-panel-final">
            <div class="booking-calendar-head">
              <div>
                <div class="booking-section-title">Calendario e horarios</div>
                <p>Escolha uma data nos proximos 90 dias. Domingos ficam bloqueados automaticamente.</p>
              </div>
              <input id="bookingCalendarDate" class="form-control" type="date" min="${nlBookingMinDate()}" max="${nlBookingMaxDate()}" value="${estado.dataISO}" onchange="selecionarDataAgendamentoNovo(this.value)">
            </div>
            <div class="booking-date-strip" id="bookingDateStrip">
              ${datas.map(data => `
                <button class="booking-date-card ${data.iso === estado.dataISO ? 'active' : ''} ${data.disabled ? 'disabled' : ''}" ${data.disabled ? 'disabled' : ''} onclick="selecionarDataAgendamentoNovo('${data.iso}')">
                  <span>${data.semana}</span>
                  <strong>${data.dia}</strong>
                </button>
              `).join('')}
            </div>
            <div class="booking-slot-area" id="bookingSlotArea">${renderSlotsAgendamentoV2()}</div>
          </section>

          <section class="booking-confirm-box hidden" id="drConfirmPanel">
            <div>
              <strong>Horario selecionado</strong>
              <span id="drConfirmText"></span>
            </div>
            <button class="btn btn-primary" onclick="confirmarAgendamentoNovo()">Confirmar agendamento</button>
          </section>
        `}
      </main>
    </div>
  `;
}

function atualizarResumoBookingV3() {
  const titulo = document.getElementById('bookingSummaryTitle');
  const meta = document.getElementById('bookingSummaryMeta');
  const estado = nlBookingState();
  if (titulo) titulo.textContent = agendamentoAtual.medico || 'Escolha um profissional';
  if (meta) meta.textContent = `${agendamentoAtual.unidade || 'Selecione uma unidade'} · ${estado.plano || agendamentoAtual.cobertura || 'Particular'}`;
  const confirmText = document.getElementById('drConfirmText');
  if (confirmText && agendamentoAtual.horario) {
    confirmText.textContent = `${agendamentoAtual.medico} · ${agendamentoAtual.unidade} · ${agendamentoAtual.dia} às ${agendamentoAtual.horario}`;
  }
}

function selecionarUnidadeAgendamentoV2(nome) {
  const estado = nlBookingState();
  estado.unidade = nome;
  const unidade = NL_UNIDADES.find(item => item.nome === nome);
  if (unidade) {
    agendamentoAtual.unidade = unidade.nome;
    agendamentoAtual.endereco = unidade.endereco;
  }

  const tipo = agendamentoAtual.tipoCodigo || nlBookingTipoPorTermo(estado.termo, estado.modo);
  const medicoAtual = NL_MEDICOS.find(item => item.nome === agendamentoAtual.medico);
  if (medicoAtual && tipo !== 'TELE' && !medicoAtual.unidades.includes(nome)) {
    const proximoMedico = NL_MEDICOS.find(item => item.tipos.includes(tipo) && item.unidades.includes(nome) && item.coberturas.includes(agendamentoAtual.cobertura || nlCoberturaFromPlano(estado.plano)));
    if (proximoMedico) {
      agendamentoAtual.medico = proximoMedico.nome;
      agendamentoAtual.crm = proximoMedico.crm;
      agendamentoAtual.especialidade = proximoMedico.especialidade;
      estado.medico = proximoMedico.nome;
      const medicoSelect = document.getElementById('drFiltroMedico');
      if (medicoSelect) medicoSelect.value = proximoMedico.nome;
    }
  }

  document.querySelectorAll('.booking-unit-card').forEach(card => card.classList.toggle('active', card.dataset.unit === nome));
  document.querySelectorAll('.booking-doctor-card').forEach(card => card.classList.toggle('active', card.dataset.doctor === agendamentoAtual.medico));
  const select = document.getElementById('drFiltroUnidade');
  if (select) select.value = nome;
  agendamentoAtual.horario = '';
  window.NLUX.selectedSlot = '';
  document.getElementById('drConfirmPanel')?.classList.add('hidden');
  atualizarResumoBookingV3();
  const slotArea = document.getElementById('bookingSlotArea');
  if (slotArea) slotArea.innerHTML = renderSlotsAgendamentoV2();
}

function selecionarMedicoAgendamentoV2(nome) {
  const estado = nlBookingState();
  estado.medico = nome;
  const medico = NL_MEDICOS.find(item => item.nome === nome);
  if (medico) {
    agendamentoAtual.medico = medico.nome;
    agendamentoAtual.crm = medico.crm;
    agendamentoAtual.especialidade = medico.especialidade;
    if (agendamentoAtual.tipoCodigo !== 'TELE' && agendamentoAtual.unidade && !medico.unidades.includes(agendamentoAtual.unidade)) {
      const proximaUnidade = NL_UNIDADES.find(unidade => medico.unidades.includes(unidade.nome));
      if (proximaUnidade) {
        agendamentoAtual.unidade = proximaUnidade.nome;
        agendamentoAtual.endereco = proximaUnidade.endereco;
        estado.unidade = proximaUnidade.nome;
        const unidadeSelect = document.getElementById('drFiltroUnidade');
        if (unidadeSelect) unidadeSelect.value = proximaUnidade.nome;
      }
    }
  }

  document.querySelectorAll('.booking-doctor-card').forEach(card => card.classList.toggle('active', card.dataset.doctor === nome));
  document.querySelectorAll('.booking-unit-card').forEach(card => card.classList.toggle('active', card.dataset.unit === agendamentoAtual.unidade));
  const select = document.getElementById('drFiltroMedico');
  if (select) select.value = nome;
  agendamentoAtual.horario = '';
  window.NLUX.selectedSlot = '';
  document.getElementById('drConfirmPanel')?.classList.add('hidden');
  atualizarResumoBookingV3();
  const slotArea = document.getElementById('bookingSlotArea');
  if (slotArea) slotArea.innerHTML = renderSlotsAgendamentoV2();
}

function selecionarDataAgendamentoNovo(iso) {
  const estado = nlBookingState();
  const data = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(data.getTime()) || data.getDay() === 0) {
    mostrarToast('Escolha uma data valida de segunda a sabado.', 'aviso');
    return;
  }
  estado.dataISO = iso;
  agendamentoAtual.dataISO = iso;
  agendamentoAtual.dia = nlBookingFormatarData(iso);
  agendamentoAtual.horario = '';
  window.NLUX.selectedSlot = '';
  liberarHold(false);

  const input = document.getElementById('bookingCalendarDate');
  if (input) input.value = iso;
  const datas = gerarDatasAgendamentoNovo(iso);
  const strip = document.getElementById('bookingDateStrip') || document.querySelector('.booking-date-strip');
  if (strip) {
    strip.innerHTML = datas.map(item => `
      <button class="booking-date-card ${item.iso === estado.dataISO ? 'active' : ''} ${item.disabled ? 'disabled' : ''}" ${item.disabled ? 'disabled' : ''} onclick="selecionarDataAgendamentoNovo('${item.iso}')">
        <span>${item.semana}</span>
        <strong>${item.dia}</strong>
      </button>
    `).join('');
  }
  const slotArea = document.getElementById('bookingSlotArea');
  if (slotArea) slotArea.innerHTML = renderSlotsAgendamentoV2();
  document.getElementById('drConfirmPanel')?.classList.add('hidden');
}

function selecionarSlotAgendamentoNovo(dia, horario, botao) {
  document.querySelectorAll('.booking-slot').forEach(item => item.classList.remove('active'));
  botao?.classList.add('active');
  agendamentoAtual.dia = dia || nlBookingFormatarData(nlBookingState().dataISO);
  agendamentoAtual.horario = horario;
  window.NLUX.selectedSlot = horario;
  iniciarHold(10 * 60);
  const panel = document.getElementById('drConfirmPanel');
  const text = document.getElementById('drConfirmText');
  if (text) text.textContent = `${agendamentoAtual.medico} · ${agendamentoAtual.unidade} · ${agendamentoAtual.dia} às ${horario}`;
  panel?.classList.remove('hidden');
}

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

/* ============================================================
   NEUROLAB BOOKING SIMPLE - modelo compacto estilo consulta
   ============================================================ */
function prepararPainelAcoesBootstrap() {
  document.getElementById('nlActionPanel')?.remove();
  document.querySelector('.nl-action-fab')?.remove();
}

function abrirPainelAcoesBootstrap() {}

function renderPainelAcoesBootstrap() {}

function nlBookingBuscaSimples(estado = nlBookingState()) {
  const termo = normalizarTexto(estado.termo || '');
  const tipo = nlBookingTipoPorTermo(estado.termo, estado.modo);
  const cobertura = nlCoberturaFromPlano(estado.plano || 'Particular');
  const termoGenerico = !termo || termo.includes('neuro') || termo.includes('consulta');

  let unidades = NL_UNIDADES.filter((unidade) => {
    const atendeTipo = unidade.modalidades.includes(tipo);
    const atendeCobertura = unidade.coberturas.includes(cobertura);
    const atendeConvenio = cobertura !== 'Convênio' || unidade.convenios.includes(estado.plano);
    const atendeModo = estado.modo !== 'online' || unidade.modalidades.includes('TELE');
    const texto = normalizarTexto(`${unidade.nome} ${unidade.endereco} ${(unidade.recursos || []).join(' ')}`);
    return atendeTipo && atendeCobertura && atendeConvenio && atendeModo && (termoGenerico || texto.includes(termo) || tipo === 'TELE');
  });

  let medicos = NL_MEDICOS.filter((medico) => {
    const atendeTipo = medico.tipos.includes(tipo);
    const atendeCobertura = medico.coberturas.includes(cobertura);
    const atendeModo = estado.modo !== 'online' || medico.tipos.includes('TELE');
    const texto = normalizarTexto(`${medico.nome} ${medico.especialidade} ${medico.crm}`);
    const atendeTermo = termoGenerico || texto.includes(termo) || (tipo === 'EXAM' && medico.tipos.includes('EXAM'));
    return atendeTipo && atendeCobertura && atendeModo && atendeTermo;
  });

  if (estado.unidade) {
    medicos = medicos.filter((medico) => tipo === 'TELE' || medico.unidades.includes(estado.unidade));
  }

  if (!unidades.length) {
    unidades = NL_UNIDADES.filter((unidade) => unidade.modalidades.includes(tipo) && unidade.coberturas.includes(cobertura));
  }

  if (!medicos.length) {
    medicos = NL_MEDICOS.filter((medico) => medico.tipos.includes(tipo) && medico.coberturas.includes(cobertura));
  }

  return { tipo, cobertura, unidades, medicos };
}

function nlBookingDatasCurtas(baseIso = nlBookingState().dataISO || nlBookingMinDate()) {
  const base = new Date(`${baseIso}T00:00:00`);
  const inicio = Number.isNaN(base.getTime()) ? new Date(`${nlBookingMinDate()}T00:00:00`) : base;
  const datas = [];
  let offset = 0;

  while (datas.length < 5 && offset < 21) {
    const data = new Date(inicio);
    data.setDate(inicio.getDate() + offset);
    offset += 1;
    if (data.getDay() === 0) continue;
    datas.push({
      iso: data.toISOString().slice(0, 10),
      dia: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      semana: data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
    });
  }

  return datas;
}

function nlBookingSugestoesOptions() {
  const base = [
    ...nlBookingEspecialidades().map(item => item.label),
    ...NL_MEDICOS.map(item => item.nome),
    ...NL_UNIDADES.map(item => item.nome),
    'EEG',
    'Eletroneuromiografia',
    'Polissonografia',
    'Enxaqueca',
    'Sono'
  ];
  return [...new Set(base)].map(item => `<option value="${nlSafeText(item)}"></option>`).join('');
}

function renderAgendamentoDrConsulta() {
  if (paginaArquivo() !== 'agendamento.html') return;
  const card = document.querySelector('.modal-agendamento-card');
  if (!card) return;

  card.dataset.bookingV2 = 'true';
  card.className = 'modal-card modal-agendamento-card dr-booking-card nl-booking-v2 nl-booking-simple';

  const titulo = document.querySelector('body.page-agendamento .section-title h2');
  const subtitulo = document.querySelector('body.page-agendamento .section-title p');
  if (titulo) titulo.textContent = 'Agende sua consulta';
  if (subtitulo) subtitulo.textContent = 'Escolha a modalidade, filtre por plano, unidade ou profissional e selecione um horário disponível.';

  const estado = nlBookingState();
  estado.modo = estado.modo || 'presencial';
  estado.termo = estado.termo === 'Neurologia' ? '' : (estado.termo || '');
  estado.plano = estado.plano || 'Particular';
  estado.dataISO = estado.dataISO || nlBookingMinDate();
  window.NLUX.drSearched = true;
  buscarAgendamentoNovo();
}

function desenharBuscaDrConsulta() {
  buscarAgendamentoNovo();
}

function selecionarModoAgendamentoNovo(modo) {
  const estado = nlBookingState();
  estado.modo = modo;
  if (modo === 'online' && nlCoberturaFromPlano(estado.plano) === 'SUS') {
    estado.plano = 'Particular';
    mostrarToast('Teleconsulta disponível apenas nas modalidades Particular e Convênio.', 'aviso');
  }
  estado.unidade = modo === 'online' ? 'Santo André - Centro' : '';
  estado.medico = '';
  buscarAgendamentoNovo();
}

function buscarAgendamentoNovo() {
  const estado = nlBookingState();
  estado.termo = (document.getElementById('drFiltroEspecialidade')?.value ?? document.getElementById('drEspecialidadeBusca')?.value ?? estado.termo ?? '').trim();
  estado.plano = document.getElementById('drFiltroPlano')?.value || document.getElementById('drPlanoBusca')?.value || estado.plano || 'Particular';
  estado.unidade = document.getElementById('drFiltroUnidade')?.value || estado.unidade || '';
  estado.medico = document.getElementById('drFiltroMedico')?.value || estado.medico || '';
  estado.dataISO = document.getElementById('bookingCalendarDate')?.value || estado.dataISO || nlBookingMinDate();

  if (estado.modo === 'online' && nlCoberturaFromPlano(estado.plano) === 'SUS') {
    estado.plano = 'Particular';
    mostrarToast('Teleconsulta disponível apenas nas modalidades Particular e Convênio.', 'aviso');
  }

  registrarBuscaRecente(estado.termo);
  const busca = nlBookingBuscaSimples(estado);
  const unidade = busca.unidades.find(item => item.nome === estado.unidade) || busca.unidades[0];
  const medico = busca.medicos.find(item => item.nome === estado.medico) || busca.medicos[0];

  estado.unidade = unidade?.nome || '';
  estado.medico = medico?.nome || '';

  agendamentoAtual = {
    tipoNome: nlBookingLabelTipo(busca.tipo),
    tipoCodigo: busca.tipo,
    cobertura: busca.cobertura,
    convenio: busca.cobertura === 'Convênio' ? estado.plano : '',
    unidade: unidade?.nome || '',
    endereco: unidade?.endereco || '',
    medico: medico?.nome || '',
    crm: medico?.crm || '',
    especialidade: medico?.especialidade || '',
    dataISO: estado.dataISO,
    dia: nlBookingFormatarData(estado.dataISO),
    horario: ''
  };

  desenharResultadoDrConsulta(busca.medicos, busca.unidades, busca.tipo);
}

function desenharResultadoDrConsulta(medicos, unidades, tipoAtual = nlBookingTipoPorTermo(nlBookingState().termo, nlBookingState().modo)) {
  const card = document.querySelector('.nl-booking-v2');
  if (!card) return;

  const estado = nlBookingState();
  const datas = nlBookingDatasCurtas(estado.dataISO);
  const semResultado = !medicos.length || !unidades.length;

  card.innerHTML = `
    <div class="nl-dr-booking">
      <aside class="nl-dr-sidebar">
        <div class="nl-dr-tabs" role="tablist" aria-label="Modalidade">
          <button class="${estado.modo === 'presencial' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('presencial')">⌂ Presencial</button>
          <button class="${estado.modo === 'online' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('online')">▣ Online</button>
        </div>

        <div class="nl-dr-fields">
          <label for="drFiltroEspecialidade">Especialidade</label>
          <input id="drFiltroEspecialidade" class="form-control" list="bookingSugestoes" value="${nlSafeText(estado.termo)}" placeholder="Digite especialidade, exame ou médico" onkeydown="if(event.key==='Enter') buscarAgendamentoNovo()">
          <datalist id="bookingSugestoes">${nlBookingSugestoesOptions()}</datalist>

          <label for="drFiltroPlano">Plano ou cobertura</label>
          <select id="drFiltroPlano" class="form-select" onchange="buscarAgendamentoNovo()">${nlPlanoOptionsAgendamento(estado.modo, estado.plano)}</select>

          <label for="drFiltroUnidade">Onde você quer ser atendido?</label>
          <select id="drFiltroUnidade" class="form-select" onchange="selecionarUnidadeAgendamentoV2(this.value)">
            ${unidades.map(unidade => `<option value="${nlSafeText(unidade.nome)}" ${unidade.nome === agendamentoAtual.unidade ? 'selected' : ''}>${nlSafeText(unidade.nome)}</option>`).join('')}
          </select>

          <button type="button" class="nl-dr-location" onclick="mostrarToast('Usamos sua localização para priorizar as unidades mais próximas.', 'info')">● Usar minha localização</button>

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
            <label class="nl-dr-calendar">
              <span>▦ ver calendário</span>
              <input id="bookingCalendarDate" type="date" min="${nlBookingMinDate()}" max="${nlBookingMaxDate()}" value="${estado.dataISO}" onchange="selecionarDataAgendamentoNovo(this.value)">
            </label>
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
}

function renderSlotsAgendamentoV2() {
  const estado = nlBookingState();
  const tipo = agendamentoAtual.tipoCodigo || nlBookingTipoPorTermo(estado.termo, estado.modo);
  const cobertura = agendamentoAtual.cobertura || nlCoberturaFromPlano(estado.plano);
  const manha = tipo === 'EXAM' ? ['07:30', '08:20', '09:10', '10:40'] : ['08:00', '09:00', '10:30', '11:30'];
  const tarde = tipo === 'TELE' ? ['14:00', '15:00', '16:30', '17:30'] : ['13:30', '14:30', '15:40', '16:50'];
  const sus = ['07:00', '08:00', '09:00', '10:00'];
  const grupos = cobertura === 'SUS'
    ? [{ label: 'Manhã', slots: sus }]
    : [{ label: 'Manhã', slots: manha }, { label: 'Tarde', slots: tarde }];

  return grupos.map(grupo => `
    <div class="booking-slot-group">
      <strong>${grupo.label}</strong>
      <div>
        ${grupo.slots.map((slot, index) => {
          const ocupado = cobertura === 'SUS' && index === 2;
          return `<button class="booking-slot ${window.NLUX.selectedSlot === slot ? 'active' : ''}" ${ocupado ? 'disabled' : ''} onclick="selecionarSlotAgendamentoNovo('${agendamentoAtual.dia}', '${slot}', this)">${slot}${ocupado ? '<small>ocupado</small>' : ''}</button>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function mudarDatasAgendamentoSimples(delta) {
  const estado = nlBookingState();
  const data = new Date(`${estado.dataISO || nlBookingMinDate()}T00:00:00`);
  data.setDate(data.getDate() + delta);
  const min = new Date(`${nlBookingMinDate()}T00:00:00`);
  if (data < min) data.setTime(min.getTime());
  selecionarDataAgendamentoNovo(data.toISOString().slice(0, 10));
}

function selecionarUnidadeAgendamentoV2(nome) {
  const estado = nlBookingState();
  estado.unidade = nome;
  estado.medico = '';
  buscarAgendamentoNovo();
}

function selecionarMedicoAgendamentoV2(nome) {
  const estado = nlBookingState();
  estado.medico = nome;
  buscarAgendamentoNovo();
}

function selecionarDataAgendamentoNovo(iso) {
  const estado = nlBookingState();
  const data = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(data.getTime()) || data.getDay() === 0) {
    mostrarToast('Escolha uma data de segunda a sábado.', 'aviso');
    return;
  }
  estado.dataISO = iso;
  agendamentoAtual.dataISO = iso;
  agendamentoAtual.dia = nlBookingFormatarData(iso);
  agendamentoAtual.horario = '';
  window.NLUX.selectedSlot = '';
  liberarHold(false);

  const input = document.getElementById('bookingCalendarDate');
  if (input) input.value = iso;

  const strip = document.getElementById('bookingDateStrip');
  if (strip) {
    strip.innerHTML = nlBookingDatasCurtas(iso).map(dataItem => `
      <button class="nl-dr-date ${dataItem.iso === estado.dataISO ? 'active' : ''}" onclick="selecionarDataAgendamentoNovo('${dataItem.iso}')">
        <strong>${dataItem.dia}</strong>
        <span>${dataItem.semana}</span>
      </button>
    `).join('');
  }

  const slotArea = document.getElementById('bookingSlotArea');
  if (slotArea) slotArea.innerHTML = renderSlotsAgendamentoV2();
  document.getElementById('drConfirmPanel')?.classList.add('hidden');
}

function selecionarSlotAgendamentoNovo(dia, horario, botao) {
  document.querySelectorAll('.booking-slot').forEach(item => item.classList.remove('active'));
  botao?.classList.add('active');
  agendamentoAtual.dia = dia || nlBookingFormatarData(nlBookingState().dataISO);
  agendamentoAtual.horario = horario;
  window.NLUX.selectedSlot = horario;
  iniciarHold(10 * 60);

  const panel = document.getElementById('drConfirmPanel');
  const text = document.getElementById('drConfirmText');
  if (text) text.textContent = `${agendamentoAtual.medico} · ${agendamentoAtual.unidade} · ${agendamentoAtual.dia} às ${horario}`;
  panel?.classList.remove('hidden');
}

/* ==========================================================================
   WAZE-LIKE AUTOCOMPLETE E CÁLCULO DE DISTÂNCIA — v2
   ========================================================================== */

const NL_UNIDADES_GEO = [
  { nome: 'Santo André - Centro', endereco: 'R. Amazonas, 48 - Centro, Santo André - SP', lat: -23.655, lon: -46.528, coberturas: ['Particular', 'Convênio', 'SUS', 'Teleconsulta'] },
  { nome: 'São Bernardo - Jardim do Mar', endereco: 'Av. Kennedy, 303 - Jardim do Mar, SBC - SP', lat: -23.684, lon: -46.556, coberturas: ['Particular', 'Convênio', 'Teleconsulta'] },
  { nome: 'Santo André - Vila Pires', endereco: 'R. Senador Fláquer, 512 - Vila Pires, Santo André - SP', lat: -23.662, lon: -46.524, coberturas: ['Particular', 'Convênio'] }
];

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return (R * c).toFixed(1);
}

/**
 * Formata os dados de endereço do Nominatim em partes legíveis
 */
function formatarEnderecoNominatim(item) {
  const addr = item.address || {};
  const road = addr.road || addr.pedestrian || addr.footway || '';
  const neighbourhood = addr.suburb || addr.neighbourhood || addr.quarter || '';
  const city = addr.city || addr.town || addr.village || addr.municipality || '';
  const state = addr.state || '';
  
  // Nome principal: rua se existir, senão o primeiro segmento do display_name
  const principal = road || item.display_name.split(',')[0];
  
  // Detalhes: bairro, cidade - estado
  const detalhes = [neighbourhood, city, state].filter(Boolean).join(', ');
  
  return { principal, detalhes, road, neighbourhood, city, state };
}

/**
 * Inicializa o autocomplete estilo Waze em um input
 */
function initWazeAutocomplete(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  // Evitar inicialização dupla
  if (input.dataset.wazeInit === 'true') return;
  input.dataset.wazeInit = 'true';

  // Criar wrapper para posicionamento relativo se não tiver
  const wrapper = input.parentNode;
  wrapper.style.position = 'relative';

  // Criar o dropdown
  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown hidden';
  dropdown.id = inputId + '_dropdown';
  wrapper.appendChild(dropdown);

  let timeout;
  let lastQuery = '';

  input.addEventListener('input', () => {
    clearTimeout(timeout);
    // Limpar coordenadas ao editar manualmente (forçar nova busca)
    delete input.dataset.lat;
    delete input.dataset.lon;
    delete input.dataset.cep;
    
    const termo = input.value.trim();
    if (termo.length < 3) {
      dropdown.classList.add('hidden');
      return;
    }

    if (typeof nlEnderecoEhCep === 'function' && nlEnderecoEhCep(termo)) {
      dropdown.classList.add('hidden');
      return;
    }
    
    // Evitar repetir a mesma query
    if (termo === lastQuery) return;

    timeout = setTimeout(() => {
      lastQuery = termo;
      
      // Loading state com animação de pulso
      dropdown.innerHTML = `
        <div class="autocomplete-item ac-loading">
          <span class="waze-icon ac-pulse">🔍</span>
          <div><strong>Buscando endereços...</strong><br><small>Aguarde enquanto localizamos "${termo}"</small></div>
        </div>`;
      dropdown.classList.remove('hidden');
      
      // Buscar com addressdetails=1 para obter rua, bairro, cidade separados
      const partesDigitadas = typeof nlEnderecoPartes === 'function' ? nlEnderecoPartes(termo) : { busca: termo, numero: '' };
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&limit=6&q=${encodeURIComponent(partesDigitadas.busca)}`;
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (!data || data.length === 0) {
            dropdown.innerHTML = `
              <div class="autocomplete-item">
                <span class="waze-icon">❌</span>
                <div><strong>Nenhum endereço encontrado</strong><br><small>Tente digitar de outra forma, ex: "Av Paulista, São Paulo"</small></div>
              </div>`;
            return;
          }
          
          dropdown.innerHTML = '';
          
          // Filtrar duplicatas pelo nome principal
          const vistos = new Set();
          data.forEach(item => {
            const info = formatarEnderecoNominatim(item);
            const chave = (info.principal + '|' + info.city).toLowerCase();
            if (vistos.has(chave)) return;
            vistos.add(chave);
            
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.innerHTML = `
              <span class="waze-icon">📍</span>
              <div>
                <strong>${info.principal}</strong>
                <small>${info.detalhes}</small>
              </div>`;
            
            div.addEventListener('click', () => {
              // Setar o valor legível (rua, bairro - cidade)
              const enderecoLegivel = info.road
                ? `${info.road}, ${info.neighbourhood || info.city}`
                : info.principal;
              input.value = partesDigitadas.numero ? `${enderecoLegivel}, ${partesDigitadas.numero}` : enderecoLegivel;
              input.dataset.lat = item.lat;
              input.dataset.lon = item.lon;
              input.dataset.enderecoCompleto = item.display_name;
              input.dataset.rua = info.road || info.principal;
              input.dataset.numero = partesDigitadas.numero || '';
              input.dataset.bairro = info.neighbourhood;
              input.dataset.cidade = info.city;
              dropdown.classList.add('hidden');
              
              // Disparar busca automaticamente
              if (input.id === 'drFiltroCep' && typeof buscarCepAgendamentoSimples === 'function') {
                buscarCepAgendamentoSimples();
              } else if (typeof pesquisarPorRua === 'function') {
                pesquisarPorRua(input.id);
              }
            });
            
            dropdown.appendChild(div);
          });
        })
        .catch(() => {
          dropdown.innerHTML = `
            <div class="autocomplete-item">
              <span class="waze-icon">⚠️</span>
              <div><strong>Erro de conexão</strong><br><small>Verifique sua internet e tente novamente</small></div>
            </div>`;
        });
    }, 450);
  });
  
  // Fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
  
  // Navegar com teclado
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdown.classList.add('hidden');
    }
  });
}

/**
 * Mantido por compatibilidade: o número agora é digitado no mesmo campo da rua.
 */
function mostrarCampoNumero(inputId, ruaNome) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (ruaNome && !input.value.includes(ruaNome)) input.value = ruaNome;
  input.focus();
}

/**
 * Pesquisar por rua — versão melhorada com fallback de API
 */
function pesquisarPorRua(inputId = 'ruaBusca') {
  const input = document.getElementById(inputId);
  if (!input) return;

  const termo = input.value.trim();
  if (termo.length < 3) return;
  const partesEndereco = typeof nlEnderecoPartes === 'function' ? nlEnderecoPartes(termo) : { busca: termo, numero: '', ruaBase: termo };

  let lat = input.dataset.lat;
  let lon = input.dataset.lon;

  if (!lat || !lon) {
    mostrarToast('Buscando localização...', 'info', 1500);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&limit=1&q=${encodeURIComponent(partesEndereco.busca)}`)
      .then(res => res.json())
      .then(data => {
        if (!data || data.length === 0) {
          mostrarToast('Endereço não encontrado. Tente com mais detalhes.', 'aviso');
          return;
        }
        const info = formatarEnderecoNominatim(data[0]);
        input.dataset.lat = data[0].lat;
        input.dataset.lon = data[0].lon;
        input.dataset.rua = info.road || info.principal;
        input.dataset.bairro = info.neighbourhood;
        input.dataset.cidade = info.city;
        const enderecoLegivel = info.road ? `${info.road}, ${info.neighbourhood || info.city}` : info.principal;
        input.value = partesEndereco.numero ? `${enderecoLegivel}, ${partesEndereco.numero}` : enderecoLegivel;
        pesquisarPorRua(inputId);
      }).catch(() => mostrarToast('Erro de conexão.', 'erro'));
    return;
  }

  // Ordenar unidades por distância
  const unidadesOrdenadas = NL_UNIDADES_GEO.map(u => {
    return { ...u, distanciaKm: calcularDistanciaKm(lat, lon, u.lat, u.lon) };
  }).sort((a, b) => parseFloat(a.distanciaKm) - parseFloat(b.distanciaKm));

  const enderecoFinal = input.value.trim() || partesEndereco.busca;

  const grid = document.getElementById('unidadesDisponiveis') || document.getElementById('resultadoCep');
  if (grid) {
    grid.classList.remove('hidden');
    
    let html = '';
    if (grid.id === 'resultadoCep') {
      html = `
        <div class="nl-resultado-endereco">
          <div class="nl-seu-endereco">
            <span>📍</span>
            <div>
              <strong>Seu endereço:</strong>
              <span>${nlSafeText(enderecoFinal)}</span>
            </div>
          </div>
          <div class="nl-unidades-resultado">
            ${unidadesOrdenadas.map((u, i) => `
              <div class="nl-unidade-dist ${i === 0 ? 'recomendada' : ''}">
                <div class="nl-dist-badge">${u.distanciaKm} km</div>
                <div>
                  <strong>${u.nome}</strong>
                  <small>${u.endereco}</small>
                </div>
                ${i === 0 ? '<span class="nl-tag-rec">Mais próxima</span>' : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
      const mapaIframe = document.getElementById('mapaIframe');
      const mapaBox = document.getElementById('mapaBox');
      if (mapaIframe && mapaBox) {
        mapaIframe.src = `https://maps.google.com/maps?q=${unidadesOrdenadas[0].lat},${unidadesOrdenadas[0].lon}&z=15&output=embed`;
        mapaBox.classList.remove('hidden');
      }
    } else {
      html = unidadesOrdenadas.map((u, i) => `
        <div class="unidade-card ${i === 0 ? 'recomendada' : ''}" onclick="selecionarUnidade('${u.nome.replace(/'/g,"\\'")}', '${u.endereco.replace(/'/g,"\\'")}')">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <span class="nl-dist-badge">${u.distanciaKm} km</span>
            <strong>${u.nome}</strong>
            ${i === 0 ? '<span class="nl-tag-rec">Recomendada</span>' : ''}
          </div>
          <small>${u.endereco}</small>
          <div class="tags" style="margin-top:8px;">
            ${u.coberturas.map(c => `<span class="tag">${c}</span>`).join('')}
          </div>
        </div>
      `).join('');
    }
    grid.innerHTML = html;
    grid.style.animation = 'fadeInUp .3s ease';
  }
}

// Inicializar Autocomplete nos campos relevantes assim que carregar
document.addEventListener('DOMContentLoaded', () => {
  initWazeAutocomplete('ruaBusca');
  initWazeAutocomplete('agRua');
});
