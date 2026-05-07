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

