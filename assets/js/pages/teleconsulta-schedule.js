// ── Teleconsulta: seleção de médico e horários adaptativos ──
    const TELE_SLOTS = {
      'AB': { 1:['08:00','09:00','10:00','14:00','15:00'], 3:['08:30','09:30','14:30','16:00'], 5:['09:00','10:30','14:00'] },
      'CE': { 2:['08:00','10:00','13:00','15:00','16:30'], 4:['09:00','11:00','14:00','15:30'], 1:['08:30','14:30'] },
      'RM': { 1:['09:00','10:30','14:30'], 2:['08:30','14:00','16:00'], 3:['09:30','11:00','15:00'], 5:['08:00','13:00','14:30'] }
    };

    let teleMedicoSelecionado = null;

    function selecionarTeleMedico(nome, sigla, especialidade, el) {
      document.querySelectorAll('.tele-medico-card').forEach(c => c.classList.remove('selecionado'));
      el.classList.add('selecionado');
      teleMedicoSelecionado = sigla;
      document.getElementById('agendaMedicoNome').value = nome + ' — ' + especialidade;
      document.getElementById('teleStepForm').style.display = 'block';
      document.getElementById('agendaData').value = '';
      document.getElementById('agendaHorario').innerHTML = '<option value="">-- Selecione uma data --</option>';
    }

    document.addEventListener('DOMContentLoaded', () => {
      const dataInput = document.getElementById('agendaData');
      if (dataInput) {
        // Set min date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dataInput.min = tomorrow.toISOString().split('T')[0];

        dataInput.addEventListener('change', function() {
          const d = new Date(this.value + 'T12:00:00');
          const dow = d.getDay(); // 0=Sun, 1=Mon...
          const sigla = teleMedicoSelecionado || 'AB';
          const slots = TELE_SLOTS[sigla]?.[dow] || ['09:00','10:30','14:00','15:30'];
          const sel = document.getElementById('agendaHorario');
          sel.innerHTML = '<option value="">-- Selecione o horário --</option>';
          if (dow === 0 || dow === 6) {
            sel.innerHTML = '<option value="">Médico não atende neste dia</option>';
          } else {
            slots.forEach(h => {
              const opt = document.createElement('option');
              opt.value = h; opt.textContent = h;
              sel.appendChild(opt);
            });
          }
        });
      }
    });
