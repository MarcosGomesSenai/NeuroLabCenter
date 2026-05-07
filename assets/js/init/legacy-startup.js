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

