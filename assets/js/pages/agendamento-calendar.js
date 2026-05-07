// ── Calendário dinâmico adaptativo ──────────────────────────
    const DIAS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    // Slots base: doctor availability varies by weekday
    const SLOTS_MANHA = ['07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30'];
    const SLOTS_TARDE = ['13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];

    // Simulate occupied slots (in real system, fetched from API)
    const OCUPADOS = { 0:['09:00','14:30'], 1:['08:00','13:00'], 2:['10:30','15:00','16:30'], 3:['07:30','09:30','14:00'], 4:['11:00','13:30','17:00'], 5:['08:30','16:00'] };

    function buildCalendar() {
      const grid = document.getElementById('calendarGrid');
      if (!grid) return;
      grid.innerHTML = '';
      const today = new Date();
      let days = 0, added = 0;
      while (added < 10) {
        const d = new Date(today);
        d.setDate(today.getDate() + days + 1);
        days++;
        const dow = d.getDay();
        if (dow === 0 || dow === 6) continue; // skip weekends
        const label = `${DIAS_PT[dow]}, ${d.getDate()} ${MESES_PT[d.getMonth()]}`;
        const short = `${DIAS_PT[dow]} ${d.getDate()}/${MESES_PT[d.getMonth()]}`;
        const occ = OCUPADOS[added % 6] || [];

        // Vary available slots per day to feel adaptive
        const manha = SLOTS_MANHA.filter((_,i) => (added + i) % 4 !== 0);
        const tarde  = SLOTS_TARDE.filter((_,i) => (added + i + 2) % 5 !== 0);

        const col = document.createElement('div');
        col.className = 'cal-day-col';
        col.innerHTML = `
          <div class="cal-day-header">${DIAS_PT[dow]}<small>${d.getDate()} ${MESES_PT[d.getMonth()]}</small></div>
          <div class="cal-slots">
            <div class="cal-period-label">☀️ Manhã</div>
            ${manha.map(h => `<button class="cal-slot${occ.includes(h)?' ocupado':''}" ${occ.includes(h)?'disabled':''} onclick="selecionarHorario('${short}','${h}',this)">${h}</button>`).join('')}
            <div class="cal-period-label">🌤️ Tarde</div>
            ${tarde.map(h => `<button class="cal-slot${occ.includes(h)?' ocupado':''}" ${occ.includes(h)?'disabled':''} onclick="selecionarHorario('${short}','${h}',this)">${h}</button>`).join('')}
          </div>`;
        grid.appendChild(col);
        added++;
      }
    }

    // Override selecionarHorario to highlight cal-slot
    const _origSel = window.selecionarHorario;
    window.selecionarHorario = function(dia, hora, el) {
      document.querySelectorAll('.cal-slot.selecionado').forEach(b => b.classList.remove('selecionado'));
      if (el) el.classList.add('selecionado');
      if (typeof _origSel === 'function') _origSel(dia, hora, el);
    };

    // Build on page load and rebuild each time step 5 appears
    document.addEventListener('DOMContentLoaded', buildCalendar);
    const _origAv = window.avancarPasso;
    window.avancarPasso = function(...args) {
      if (typeof _origAv === 'function') _origAv(...args);
      setTimeout(() => { if (!document.getElementById('agStep5').classList.contains('hidden')) buildCalendar(); }, 50);
    };

    // Busca de unidade por rua/avenida no agendamento
    window.buscarUnidadePorRua = function() {
      const input = document.getElementById('agRua');
      const termo = (input?.value || '').trim();
      const grid = document.getElementById('unidadesDisponiveis');
      if (!termo || termo.length < 3) {
        if (typeof mostrarToast === 'function') mostrarToast('Digite pelo menos 3 letras do endereço.', 'aviso');
        return;
      }
      const termoNorm = (typeof normalizarTexto === 'function') ? normalizarTexto(termo) : termo.toLowerCase();
      const todasUnidades = typeof NL_UNIDADES !== 'undefined' ? NL_UNIDADES : [];
      const encontradas = todasUnidades.filter(u =>
        termoNorm && (
          (typeof normalizarTexto === 'function' ? normalizarTexto(u.endereco) : u.endereco.toLowerCase()).includes(termoNorm) ||
          (typeof normalizarTexto === 'function' ? normalizarTexto(u.nome) : u.nome.toLowerCase()).includes(termoNorm)
        ) && u.modalidades && !u.modalidades.every(m => m === 'TELE')
      );

      if (encontradas.length > 0) {
        grid.classList.remove('hidden');
        grid.innerHTML = encontradas.map(u => `
          <div class="unidade-card" onclick="selecionarUnidade('${u.nome.replace(/'/g,"\\'")}', '${u.endereco.replace(/'/g,"\\'")}')">
            <strong>${u.nome}</strong>
            <small>${u.endereco}</small>
            <div class="tags" style="margin-top:8px;">
              ${u.coberturas.map(c => `<span class="tag">${c}</span>`).join('')}
            </div>
          </div>
        `).join('');
      } else {
        grid.classList.remove('hidden');
        grid.innerHTML = '<div class="safe-note">Nenhuma unidade encontrada para esse endereço. Tente buscar pelo CEP ou consulte nossa lista de unidades.</div>';
      }
    };
