/* NeuroLab agendamento guiado - carregado depois do arquivo principal. */
(function () {
  window.NL_BOOKING_GUIDE_ACTIVE = '2026-05-03-v2';

  function estadoBooking() {
    return nlBookingState();
  }

  function coberturaAtual() {
    const plano = estadoBooking().plano || 'Particular';
    if (plano === 'Particular' || plano === 'SUS') return plano;
    return 'Convenio';
  }

  function isConvenio(plano) {
    const texto = normalizarTexto(plano || '');
    return texto && texto !== 'particular' && texto !== 'sus';
  }

  function separarEnderecoDigitado(valor) {
    const texto = (valor || '').trim().replace(/\s+/g, ' ');
    const digitos = somenteDigitos(texto);
    const temLetra = /[A-Za-zÀ-ÿ]/.test(texto);
    const cep = digitos.length >= 8 && !temLetra ? digitos.slice(0, 8) : '';
    const numeroMatch = !cep ? texto.match(/(?:,\s*|\s+)(\d{1,6}[A-Za-z]?)\s*$/) : null;
    const numero = numeroMatch ? numeroMatch[1] : '';
    const ruaBase = numeroMatch ? texto.slice(0, numeroMatch.index).replace(/[,\s]+$/, '') : texto;

    return {
      cep,
      numero,
      ruaBase,
      texto,
      endereco: cep ? '' : texto,
      busca: cep ? texto : (numero ? `${ruaBase} ${numero}` : texto)
    };
  }

  function sincronizarEnderecoAgendamento() {
    const estado = estadoBooking();
    const input = document.getElementById('drFiltroCep');
    if (!input) return estado;

    const partes = separarEnderecoDigitado(input.value);
    const mudouEndereco = partes.endereco && partes.endereco !== estado.streetInfo;
    estado.cep = mudouEndereco ? '' : (partes.cep || input.dataset.cep || estado.cep || '');
    estado.streetInfo = partes.endereco || estado.streetInfo || '';
    estado.numeroEndereco = '';
    estado.complementoEndereco = '';

    if (input.dataset.lat && input.dataset.lon) {
      estado.lat = input.dataset.lat;
      estado.lon = input.dataset.lon;
    }

    return estado;
  }

  function enderecoInformado(estado) {
    return Boolean(
      somenteDigitos(estado.cep || '').length >= 8 ||
      (estado.streetInfo || '').trim().length >= 3 ||
      (estado.lat && estado.lon)
    );
  }

  function resumoEndereco(estado) {
    const rua = (estado.streetInfo || '').trim();
    const cep = (estado.cep || '').trim();

    return [rua, cep ? `CEP ${cep}` : ''].filter(Boolean).join(' · ');
  }

  function aplicarEnderecoLocalizado(input, info, lat, lon) {
    const estado = estadoBooking();
    const digitado = separarEnderecoDigitado(input.value);
    const ruaBase = info?.road
      ? `${info.road}${info.neighbourhood || info.city ? ', ' + (info.neighbourhood || info.city) : ''}`
      : (info?.principal || input.value.trim());
    const rua = digitado.numero ? `${ruaBase}, ${digitado.numero}` : ruaBase;

    estado.streetInfo = rua;
    estado.lat = lat || input.dataset.lat || '';
    estado.lon = lon || input.dataset.lon || '';
    estado.numeroEndereco = '';
    estado.complementoEndereco = '';

    input.value = rua;
    if (lat) input.dataset.lat = lat;
    if (lon) input.dataset.lon = lon;
  }

  function planosConvenioOptions(selecionado) {
    const planos = NL_PLANOS
      .filter((plano) => estadoBooking().modo !== 'online' || plano.servicos.includes('Teleconsulta'))
      .map((plano) => plano.nome);
    return [...new Set(planos)]
      .map((plano) => `<option value="${nlSafeText(plano)}" ${plano === selecionado ? 'selected' : ''}>${nlSafeText(plano)}</option>`)
      .join('');
  }

  function sugestoesLista() {
    return [
      { label: 'Neurologia', detalhe: 'Consulta neurológica adulto' },
      { label: 'Cefaleia e enxaqueca', detalhe: 'Dor de cabeça, migrânea e dor neuropática' },
      { label: 'Sono e cognição', detalhe: 'Insônia, memória e Alzheimer' },
      { label: 'Neuropediatria', detalhe: 'Atendimento infantil e desenvolvimento' },
      { label: 'EEG', detalhe: 'Eletroencefalograma' },
      { label: 'Eletroneuromiografia', detalhe: 'ENMG e avaliação neurofisiológica' },
      { label: 'Polissonografia', detalhe: 'Exame do sono' },
      ...NL_MEDICOS.map((medico) => ({ label: medico.nome, detalhe: medico.especialidade }))
    ];
  }

  function renderSugestoes(termo = '') {
    const alvo = document.getElementById('bookingSpecialtySuggestions');
    if (!alvo) return;
    const texto = normalizarTexto(termo);
    const itens = sugestoesLista()
      .filter((item) => !texto || normalizarTexto(`${item.label} ${item.detalhe}`).includes(texto))
      .slice(0, 7);

    alvo.innerHTML = itens.map((item) => `
      <button type="button" onmousedown="event.preventDefault(); selecionarSugestaoAgendamento('${item.label.replace(/'/g, "\\'")}')">
        <strong>${nlSafeText(item.label)}</strong>
        <span>${nlSafeText(item.detalhe)}</span>
      </button>
    `).join('') || '<small>Nenhuma opção encontrada.</small>';
  }

  function renderPromptEspecialidade() {
    const sugestoes = sugestoesLista().slice(0, 6);
    return `
      <section class="nl-specialty-empty">
        <span class="nl-specialty-empty-icon">⌕</span>
        <h2>Digite a especialidade, exame ou médico que você procura.</h2>
        <p>O agendamento começa pela busca. Você pode escrever algo como cefaleia, sono, EEG, neuropediatria ou o nome de um profissional.</p>
        <div class="nl-specialty-chip-grid">
          ${sugestoes.map((item) => `
            <button type="button" onclick="selecionarSugestaoAgendamento('${item.label.replace(/'/g, "\\'")}')">
              <strong>${nlSafeText(item.label)}</strong>
              <span>${nlSafeText(item.detalhe)}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function cepPerfil(cep) {
    const digitos = somenteDigitos(cep);
    if (!digitos) return { label: 'Informe seu CEP para ordenar por proximidade.', preferencia: [] };
    if (digitos.startsWith('09')) return { label: 'Recomendadas para ABC Paulista', preferencia: ['Santo André', 'São Bernardo'] };
    if (digitos.startsWith('04')) return { label: 'Recomendadas para zona sul de São Paulo', preferencia: ['Moema', 'Paulista'] };
    if (digitos.startsWith('03')) return { label: 'Recomendadas para zona leste de São Paulo', preferencia: ['Tatuapé'] };
    if (digitos.startsWith('01')) return { label: 'Recomendadas para região central', preferencia: ['Paulista', 'Moema'] };
    return { label: 'Recomendadas por disponibilidade e distância cadastrada.', preferencia: [] };
  }

  function distanciaNumero(unidade) {
    const numero = parseFloat(String(unidade.distancia || '99').replace(',', '.'));
    return Number.isFinite(numero) ? numero : 99;
  }

  function ordenarUnidades(unidades, estado, tipo) {
    const cepInfo = cepPerfil(estado.cep || '');
    const termo = normalizarTexto(estado.termo || '');
    return [...unidades].sort((a, b) => {
      const score = (unidade) => {
        let dist = distanciaNumero(unidade);
        if (estado.lat && estado.lon && typeof calcularDistanciaKm === 'function' && typeof NL_UNIDADES_GEO !== 'undefined') {
          const geo = NL_UNIDADES_GEO.find(g => g.nome === unidade.nome);
          if (geo) dist = parseFloat(calcularDistanciaKm(estado.lat, estado.lon, geo.lat, geo.lon));
          // Atualiza o texto de distância da unidade para exibir
          unidade.distancia = dist + ' km';
        }

        const texto = normalizarTexto(`${unidade.nome} ${(unidade.recursos || []).join(' ')}`);
        const boostCep = cepInfo.preferencia.some((item) => normalizarTexto(unidade.nome).includes(normalizarTexto(item))) ? -18 : 0;
        const boostEspecialidade = texto.includes(termo) || (tipo === 'EXAM' && unidade.modalidades.includes('EXAM')) ? -8 : 0;
        const boostTele = tipo === 'TELE' && unidade.nome === 'Teleconsulta Central' ? -30 : 0;
        return dist + boostCep + boostEspecialidade + boostTele;
      };
      return score(a) - score(b);
    });
  }

  window.mostrarSugestoesAgendamento = function mostrarSugestoesAgendamento() {
    const input = document.getElementById('drFiltroEspecialidade');
    const alvo = document.getElementById('bookingSpecialtySuggestions');
    if (!input || !alvo) return;
    renderSugestoes(input.value);
    alvo.classList.remove('hidden');
  };

  window.filtrarSugestoesAgendamento = function filtrarSugestoesAgendamento(valor) {
    renderSugestoes(valor);
    document.getElementById('bookingSpecialtySuggestions')?.classList.remove('hidden');
  };

  window.esconderSugestoesAgendamento = function esconderSugestoesAgendamento() {
    setTimeout(() => document.getElementById('bookingSpecialtySuggestions')?.classList.add('hidden'), 120);
  };

  window.selecionarSugestaoAgendamento = function selecionarSugestaoAgendamento(valor) {
    const estado = estadoBooking();
    estado.termo = valor;
    estado.unidade = '';
    estado.medico = '';
    const input = document.getElementById('drFiltroEspecialidade');
    if (input) input.value = valor;
    document.getElementById('bookingSpecialtySuggestions')?.classList.add('hidden');
    window.buscarAgendamentoNovo();
  };

  window.selecionarCoberturaAgendamentoSimples = function selecionarCoberturaAgendamentoSimples(cobertura) {
    const estado = estadoBooking();
    if (estado.modo === 'online' && cobertura === 'SUS') {
      mostrarToast('Teleconsulta disponível apenas nas modalidades Particular e Convênio.', 'aviso');
      return;
    }
    // Set plano - for Convênio keep existing plan or default to Unimed
    estado.plano = cobertura === 'Convenio' ? (isConvenio(estado.plano) ? estado.plano : 'Unimed') : cobertura;
    estado.unidade = estado.modo === 'online' ? 'Teleconsulta Central' : '';
    estado.medico = '';
    window.buscarAgendamentoNovo();
  };

  window.buscarCepAgendamentoSimples = function buscarCepAgendamentoSimples() {
    const estado = sincronizarEnderecoAgendamento();
    const input = document.getElementById('drFiltroCep');
    const valor = (input?.value || '').trim();
    const partesEndereco = separarEnderecoDigitado(valor);
    const cep = partesEndereco.cep;

    if (cep.length >= 8) {
      const hintEl = document.querySelector('.nl-cep-hint');
      if (hintEl) hintEl.textContent = 'Buscando CEP...';

      fetch('https://viacep.com.br/ws/' + cep.slice(0, 8) + '/json/')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.erro) {
            if (hintEl) hintEl.textContent = 'CEP não encontrado. Verifique e tente novamente.';
            mostrarToast('CEP não encontrado. Verifique o número.', 'aviso');
            return;
          }

          const partes = [data.logradouro, data.bairro, data.localidade + (data.uf ? ' - ' + data.uf : '')].filter(Boolean);
          const rua = partes.join(', ');
          estado.cep = cep;
          estado.streetInfo = rua || estado.streetInfo || '';
          estado.numeroEndereco = '';
          estado.complementoEndereco = '';
          if (input) {
            input.value = rua || valor;
            input.dataset.cep = cep;
          }
          estado.unidade = '';
          estado.medico = '';

          mostrarToast('CEP encontrado! Unidades próximas exibidas.', 'sucesso', 2800);
          window.buscarAgendamentoNovo();
        })
        .catch(function() {
          estado.cep = cep;
          estado.streetInfo = estado.streetInfo || '';
          estado.unidade = '';
          estado.medico = '';
          mostrarToast('Unidades reorganizadas por proximidade.', 'sucesso', 2600);
          window.buscarAgendamentoNovo();
        });
      return;
    }

    if (valor.length >= 3) {
      const lat = input.dataset.lat;
      const lon = input.dataset.lon;

      if (lat && lon) {
        aplicarEnderecoLocalizado(input, { principal: valor }, lat, lon);
        estado.unidade = '';
        estado.medico = '';
        mostrarToast('Endereço localizado! Unidades reorganizadas por distância.', 'sucesso', 2800);
        window.buscarAgendamentoNovo();
        return;
      }

      const hintEl = document.querySelector('.nl-cep-hint');
      if (hintEl) hintEl.textContent = 'Buscando endereço no mapa...';

      fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&limit=1&q=${encodeURIComponent(partesEndereco.busca)}`)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data || data.length === 0) {
            mostrarToast('Endereço não encontrado. Verifique a digitação.', 'aviso');
            if (hintEl) hintEl.textContent = 'Nenhum endereço encontrado.';
            return;
          }

          const result = data[0];
          const info = typeof formatarEnderecoNominatim === 'function'
            ? formatarEnderecoNominatim(result)
            : { principal: result.display_name.split(',')[0], road: '' };

          aplicarEnderecoLocalizado(input, info, result.lat, result.lon);
          estado.unidade = '';
          estado.medico = '';

          mostrarToast('Endereço localizado! Unidades reorganizadas por distância.', 'sucesso', 2800);
          window.buscarAgendamentoNovo();
        })
        .catch(function() {
          estado.streetInfo = valor;
          estado.unidade = '';
          estado.medico = '';
          mostrarToast('Não foi possível consultar o mapa, mas exibimos as unidades disponíveis.', 'aviso');
          window.buscarAgendamentoNovo();
        });
      return;
    }

    mostrarToast('Informe um CEP com 8 dígitos ou uma rua/bairro.', 'aviso');
    input?.focus();
  };

  // Helper: mask CEP if digits only, else allow free text (for rua)
  window.mascararCepOuEndereco = function mascararCepOuEndereco(input) {
    const val = input.value.replace(/\D/g, '');
    // If user typed only digits (looks like CEP), apply mask
    if (/^\d+$/.test(input.value.replace('-', ''))) {
      input.maxLength = 9;
      if (val.length > 5) {
        input.value = val.slice(0, 5) + '-' + val.slice(5, 8);
      } else {
        input.value = val;
      }
    } else {
      // Free text - remove CEP mask and allow longer input
      input.maxLength = 110;
    }
  };

  window.abrirCalendarioAgendamento = function abrirCalendarioAgendamento() {
    const input = document.getElementById('bookingCalendarDate');
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === 'function') input.showPicker();
    else input.click();
  };

  window.renderAgendamentoDrConsulta = function renderAgendamentoDrConsulta() {
    if (paginaArquivo() !== 'agendamento.html') return;
    const card = document.querySelector('.modal-agendamento-card');
    if (!card) return;

    card.dataset.bookingV2 = 'true';
    card.dataset.bookingGuide = 'active';
    card.className = 'modal-card modal-agendamento-card dr-booking-card nl-booking-v2 nl-booking-simple';

    const titulo = document.querySelector('body.page-agendamento .section-title h2');
    const subtitulo = document.querySelector('body.page-agendamento .section-title p');
    if (titulo) titulo.textContent = 'Agende sua consulta';
    if (subtitulo) subtitulo.textContent = 'Escolha especialidade, cobertura, endereço, profissional e horário em poucos passos.';

    const estado = estadoBooking();
    // Detecta parâmetro URL ?modo=online vindo da página de teleconsulta
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('modo') === 'online') {
      estado.modo = 'online';
      estado.unidade = 'Teleconsulta Central';
    }
    estado.modo = estado.modo || 'presencial';
    estado.termo = estado.termo === 'Neurologia' ? '' : (estado.termo || '');
    estado.plano = estado.plano || 'Particular';
    estado.dataISO = estado.dataISO || nlBookingMinDate();
    window.NLUX.drSearched = true;
    window.buscarAgendamentoNovo();
  };

  window.buscarAgendamentoNovo = function buscarAgendamentoNovo() {
    const estado = sincronizarEnderecoAgendamento();
    const termoInput = document.getElementById('drFiltroEspecialidade');
    estado.termo = termoInput ? termoInput.value.trim() : (estado.termo || '');
    // Only read drFiltroPlano select when we're actually in Convênio mode (prevents bug where
    // clicking Particular/SUS after Convênio got overridden by the old select still in DOM)
    const drPlanoEl = document.getElementById('drFiltroPlano');
    if (drPlanoEl && isConvenio(estado.plano)) {
      estado.plano = drPlanoEl.value || estado.plano;
    } else if (!drPlanoEl) {
      estado.plano = estado.plano || 'Particular';
    }
    estado.medico = document.getElementById('drFiltroMedico')?.value || estado.medico || '';
    estado.dataISO = document.getElementById('bookingCalendarDate')?.value || estado.dataISO || nlBookingMinDate();

    if (estado.modo === 'online' && nlCoberturaFromPlano(estado.plano) === 'SUS') {
      estado.plano = 'Particular';
      mostrarToast('Teleconsulta disponível apenas nas modalidades Particular e Convênio.', 'aviso');
    }

    if (!estado.termo.trim()) {
      estado.unidade = estado.modo === 'online' ? 'Teleconsulta Central' : '';
      estado.medico = '';
      agendamentoAtual = {
        tipoNome: '',
        tipoCodigo: '',
        cobertura: nlCoberturaFromPlano(estado.plano),
        convenio: isConvenio(estado.plano) ? estado.plano : '',
        unidade: '',
        endereco: '',
        medico: '',
        crm: '',
        especialidade: '',
        dataISO: estado.dataISO,
        dia: nlBookingFormatarData(estado.dataISO),
        horario: ''
      };
      window.desenharResultadoDrConsulta([], [], '');
      return;
    }

    registrarBuscaRecente(estado.termo);
    const busca = nlBookingBuscaSimples(estado);
    busca.unidades = ordenarUnidades(busca.unidades, estado, busca.tipo);

    const unidade = busca.unidades.find((item) => item.nome === estado.unidade) || busca.unidades[0];
    let medicos = busca.medicos;
    if (unidade && busca.tipo !== 'TELE') {
      medicos = medicos.filter((medico) => medico.unidades.includes(unidade.nome));
      if (!medicos.length) medicos = busca.medicos;
    }
    const medico = medicos.find((item) => item.nome === estado.medico) || medicos[0] || busca.medicos[0];

    estado.unidade = unidade?.nome || '';
    estado.medico = medico?.nome || '';

    agendamentoAtual = {
      tipoNome: nlBookingLabelTipo(busca.tipo),
      tipoCodigo: busca.tipo,
      cobertura: nlCoberturaFromPlano(estado.plano),
      convenio: isConvenio(estado.plano) ? estado.plano : '',
      unidade: unidade?.nome || '',
      endereco: unidade?.endereco || '',
      medico: medico?.nome || '',
      crm: medico?.crm || '',
      especialidade: medico?.especialidade || '',
      dataISO: estado.dataISO,
      dia: nlBookingFormatarData(estado.dataISO),
      horario: ''
    };

    window.desenharResultadoDrConsulta(medicos, busca.unidades, busca.tipo);
  };

  window.desenharResultadoDrConsulta = function desenharResultadoDrConsulta(medicos, unidades, tipoAtual) {
    if (tipoAtual === undefined) tipoAtual = nlBookingTipoPorTermo(estadoBooking().termo, estadoBooking().modo);
    const card = document.querySelector('.nl-booking-v2');
    if (!card) return;

    const estado = estadoBooking();
    const datas = nlBookingDatasCurtas(estado.dataISO);
    const semResultado = !medicos.length || !unidades.length;
    const atual = coberturaAtual();
    const cepInfo = cepPerfil(estado.cep);
    const temEndereco = enderecoInformado(estado);
    const streetInfo = estado.streetInfo || '';
    const enderecoValor = streetInfo || estado.cep || '';
    const enderecoResumo = resumoEndereco(estado);
    const precisaEspecialidade = !estado.termo.trim();

    card.innerHTML = `
      <div class="nl-dr-booking" data-guide-version="2026-05-03-v2">
        <aside class="nl-dr-sidebar" data-modo="${estado.modo}">
          <div class="nl-dr-tabs" role="tablist" aria-label="Modalidade">
            <button class="${estado.modo === 'presencial' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('presencial')">Presencial</button>
            <button class="${estado.modo === 'online' ? 'active' : ''}" onclick="selecionarModoAgendamentoNovo('online')">Online</button>
          </div>

          <div class="nl-dr-fields">
            <label for="drFiltroEspecialidade">Especialidade</label>
            <div class="nl-specialty-combo">
              <input id="drFiltroEspecialidade" class="form-control" value="${nlSafeText(estado.termo)}" placeholder="Digite especialidade, exame ou médico" autocomplete="off" onfocus="mostrarSugestoesAgendamento()" oninput="filtrarSugestoesAgendamento(this.value)" onblur="esconderSugestoesAgendamento()" onkeydown="if(event.key==='Enter') buscarAgendamentoNovo()">
              <div id="bookingSpecialtySuggestions" class="nl-dr-suggestions hidden"></div>
            </div>

            <label>Plano ou cobertura</label>
            <div class="nl-coverage-options">
              <button type="button" class="${atual === 'Particular' ? 'active' : ''}" onclick="selecionarCoberturaAgendamentoSimples('Particular')">Particular</button>
              <button type="button" class="${atual === 'Convenio' ? 'active' : ''}" onclick="selecionarCoberturaAgendamentoSimples('Convenio')">Convênio</button>
              <button type="button" class="${atual === 'SUS' ? 'active' : ''}" ${estado.modo === 'online' ? 'disabled' : ''} onclick="selecionarCoberturaAgendamentoSimples('SUS')">SUS</button>
            </div>
            ${atual === 'Convenio' ? `<select id="drFiltroPlano" class="form-select nl-plan-select" onchange="buscarAgendamentoNovo()">${planosConvenioOptions(estado.plano)}</select>` : ''}

            ${estado.modo === 'online' ? `
              <div class="nl-online-notice">
                <span class="notice-icon">💻</span>
                <div>Consulta <strong>100% online</strong> por vídeo. Não é necessário ir a uma unidade física.</div>
              </div>
            ` : `
              <label for="drFiltroCep" class="nl-cep-section">Endereço do paciente</label>
              <div class="nl-address-stack nl-cep-section">
                <div class="nl-cep-row nl-cep-row-smart">
                  <input id="drFiltroCep" class="form-control" value="${nlSafeText(enderecoValor)}" placeholder="CEP, rua ou rua + número" maxlength="110" autocomplete="street-address" oninput="mascararCepOuEndereco(this)" onkeydown="if(event.key==='Enter') buscarCepAgendamentoSimples()">
                  <button type="button" class="btn btn-light" onclick="buscarCepAgendamentoSimples()">Buscar</button>
                </div>
              </div>
              ${enderecoResumo ? `<div class="nl-cep-street nl-cep-section"><span class="nl-cep-street-icon">📍</span><span>${nlSafeText(enderecoResumo)}</span></div>` : `<small class="nl-cep-hint nl-cep-section">${nlSafeText(cepInfo.label)}</small>`}
            `}

            <label for="drFiltroMedico">Profissional</label>
            <select id="drFiltroMedico" class="form-select" onchange="selecionarMedicoAgendamentoV2(this.value)">
              ${medicos.map((medico) => `<option value="${nlSafeText(medico.nome)}" ${medico.nome === agendamentoAtual.medico ? 'selected' : ''}>${nlSafeText(medico.nome)}</option>`).join('')}
            </select>

            <button class="btn btn-primary nl-dr-search" onclick="buscarAgendamentoNovo()">Nova busca</button>
          </div>
        </aside>

        <main class="nl-dr-result">
          ${precisaEspecialidade ? renderPromptEspecialidade() : (semResultado ? nlBookingEmptyState() : `
            ${estado.modo === 'online' ? `
              <div class="nl-online-notice" style="margin-bottom:18px;">
                <span class="notice-icon">📹</span>
                <div>Sua teleconsulta será realizada por <strong>vídeo chamada</strong>. Um link seguro será enviado ao seu e-mail e aparecerá na sua Área do Paciente.</div>
              </div>
            ` : (temEndereco ? `
            <div class="nl-unit-panel">
              <p class="nl-unit-panel-label">Unidades disponíveis próximas ao endereço informado</p>
              <div class="nl-unit-grid">
                ${unidades.slice(0, 4).map((unidade, index) => `
                  <button type="button" class="nl-unit-btn ${unidade.nome === agendamentoAtual.unidade ? 'active' : ''}" onclick="selecionarUnidadeAgendamentoV2('${unidade.nome.replace(/'/g, "\\'")}')">
                    <strong>${nlSafeText(unidade.nome)}</strong>
                    <span>${index === 0 ? 'Recomendada · ' : ''}${nlSafeText(unidade.distancia)} · ${nlSafeText((unidade.recursos || ['Agenda disponível']).slice(0, 2).join(', '))}</span>
                  </button>
                `).join('')}
              </div>
            </div>
            ` : `
            <div class="nl-unit-cep-prompt">
              <span>📍</span>
              <p>Digite seu <strong>CEP</strong> ou endereço no painel ao lado para ver as unidades disponíveis próximas a você.</p>
            </div>
            `)}

            <div class="nl-dr-datebar">
              <button type="button" class="nl-dr-arrow" onclick="mudarDatasAgendamentoSimples(-3)" aria-label="Datas anteriores">‹</button>
              <div class="nl-dr-date-list" id="bookingDateStrip">
                ${datas.map((data) => `
                  <button class="nl-dr-date ${data.iso === estado.dataISO ? 'active' : ''}" onclick="selecionarDataAgendamentoNovo('${data.iso}')">
                    <strong>${data.dia}</strong>
                    <span>${data.semana}</span>
                  </button>
                `).join('')}
              </div>
              <button type="button" class="nl-dr-arrow" onclick="mudarDatasAgendamentoSimples(3)" aria-label="Próximas datas">›</button>
              <div class="nl-dr-calendar-wrap">
                <button type="button" class="nl-dr-calendar" onclick="abrirCalendarioAgendamento()">📅 calendário</button>
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
                <h3 id="bookingSummaryMeta">${estado.modo === 'online' ? 'Teleconsulta NeuroLab' : nlSafeText(agendamentoAtual.unidade)}</h3>
                <p>${estado.modo === 'online' ? 'Atendimento por vídeo chamada segura' : nlSafeText(agendamentoAtual.endereco)}</p>
                <span>${nlSafeText(agendamentoAtual.convenio || agendamentoAtual.cobertura)} · ${estado.modo === 'online' ? 'Teleconsulta Online' : nlSafeText(nlBookingLabelTipo(tipoAtual))}</span>
              </div>
              <div class="nl-dr-slots" id="bookingSlotArea">${renderSlotsAgendamentoV2()}</div>
            </section>

            <section class="nl-dr-confirm hidden" id="drConfirmPanel">
              <span id="drConfirmText"></span>
              <button class="btn btn-primary" onclick="confirmarAgendamentoNovo()">Confirmar</button>
            </section>
          `)}
        </main>
      </div>
    `;
    renderSugestoes(estado.termo);
    
    // Iniciar o autocomplete estilo Waze no campo de rua/endereço do V2
    if (typeof initWazeAutocomplete === 'function') {
      // Pequeno timeout para garantir que o DOM renderizou
      setTimeout(() => initWazeAutocomplete('drFiltroCep'), 50);
    }
  };

  window.selecionarUnidadeAgendamentoV2 = function selecionarUnidadeAgendamentoV2(nome) {
    const estado = estadoBooking();
    estado.unidade = nome;
    estado.medico = '';
    window.buscarAgendamentoNovo();
  };

  window.selecionarDataAgendamentoNovo = function selecionarDataAgendamentoNovo(iso) {
    const estado = estadoBooking();
    const data = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(data.getTime()) || data.getDay() === 0) {
      mostrarToast('Escolha uma data de segunda a sabado.', 'aviso');
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
      strip.innerHTML = nlBookingDatasCurtas(iso).map((dataItem) => `
        <button class="nl-dr-date ${dataItem.iso === estado.dataISO ? 'active' : ''}" onclick="selecionarDataAgendamentoNovo('${dataItem.iso}')">
          <strong>${dataItem.dia}</strong>
          <span>${dataItem.semana}</span>
        </button>
      `).join('');
    }

    const slotArea = document.getElementById('bookingSlotArea');
    if (slotArea) slotArea.innerHTML = renderSlotsAgendamentoV2();
    document.getElementById('drConfirmPanel')?.classList.add('hidden');
  };
})();
