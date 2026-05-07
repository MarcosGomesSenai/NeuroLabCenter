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

