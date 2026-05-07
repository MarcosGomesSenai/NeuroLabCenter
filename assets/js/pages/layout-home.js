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

