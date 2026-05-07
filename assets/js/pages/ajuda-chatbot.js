// ── NeuroBot — Chatbot com Claude API ──────────────────────
    const SYSTEM_PROMPT = `Você é o NeuroBot, assistente virtual da NeuroLab Center, clínica de neurologia em Santo André - SP.

Você ajuda pacientes com:
- Agendamento de consultas (presencial ou teleconsulta): oriente o paciente a acessar agendamento.html ou teleconsulta.html
- Informações sobre exames (EEG, ENMG, Polissonografia, Doppler, Ressonância, Potencial Evocado)
- Convênios aceitos: Unimed (autorização prévia), Bradesco Saúde (EEG/ENMG/Polisso), SulAmérica (cobertura completa), Amil/Porto Seguro/NotreDame (verificar), Particular (sem autorização), SUS (só presencial)
- Cancelamentos e reagendamentos: 24h antes para consultas, 1h para exames, máx. 2 reagendamentos/mês pela Área do Paciente
- Resultados de exames: disponíveis em até 5 dias na Área do Paciente
- Teleconsulta: apenas Particular e Convênio, precisa câmera + microfone + internet 2Mbps
- Médicos: Dra. Ana Beatriz Ferreira (Neurologia Geral/Epilepsia, CRM 84.201), Dr. Carlos Eduardo Moura (Sono, CRM 67.453), Dra. Fernanda Lima Costa (Neuropediatria, CRM 91.077), Dr. Rafael Mendes (Enxaqueca/Cefaleia)
- Horários: Seg-Sex 7h–19h, Sáb 8h–13h — Tel: (11) 4002-8922

REGRAS IMPORTANTES:
- NUNCA prescreva medicamentos, doses ou dê diagnósticos
- NUNCA substitua consulta médica
- Para emergências, oriente ligar 192 (SAMU) ou 193 (Bombeiros)
- Seja sempre amigável, claro e objetivo em português brasileiro
- Use emojis com moderação para deixar a conversa amigável
- Respostas curtas e diretas — máximo 3 parágrafos
- Se não souber algo específico, oriente contato pelo WhatsApp ou telefone`;

    const conversationHistory = [];

    async function enviarMensagemBot() {
      const input = document.getElementById('botInput');
      const btn = document.getElementById('botSendBtn');
      const msg = input.value.trim();
      if (!msg) return;

      input.value = '';
      btn.disabled = true;
      adicionarMensagem(msg, 'user');
      conversationHistory.push({ role: 'user', content: msg });

      // Typing indicator
      const typingId = 'typing-' + Date.now();
      const typingEl = document.createElement('div');
      typingEl.className = 'chatbot-msg bot loading';
      typingEl.id = typingId;
      typingEl.innerHTML = '<div class="chatbot-typing"><span></span><span></span><span></span></div>';
      document.getElementById('botMessages').appendChild(typingEl);
      scrollBot();

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: SYSTEM_PROMPT,
            messages: conversationHistory
          })
        });

        const data = await response.json();
        const reply = data.content?.find(b => b.type === 'text')?.text || 'Desculpe, não consegui processar sua mensagem. Tente novamente ou ligue (11) 4002-8922.';

        document.getElementById(typingId)?.remove();
        conversationHistory.push({ role: 'assistant', content: reply });
        adicionarMensagem(reply, 'bot');

      } catch (err) {
        document.getElementById(typingId)?.remove();
        adicionarMensagem('Ops, tive um problema de conexão. Tente novamente ou entre em contato pelo WhatsApp: (11) 4002-8922. 😊', 'bot');
      }

      btn.disabled = false;
      input.focus();
    }

    function enviarRapido(texto) {
      document.getElementById('botInput').value = texto;
      enviarMensagemBot();
    }

    function adicionarMensagem(texto, tipo) {
      const div = document.createElement('div');
      div.className = `chatbot-msg ${tipo}`;
      // Basic markdown: **bold**
      div.innerHTML = texto
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      document.getElementById('botMessages').appendChild(div);
      scrollBot();
    }

    function scrollBot() {
      const msgs = document.getElementById('botMessages');
      msgs.scrollTop = msgs.scrollHeight;
    }

    document.getElementById('botInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') enviarMensagemBot();
    });
