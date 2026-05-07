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
    const imagensClinicas = ['../../assets/img/Area-de-espera.jpg', '../../assets/img/central-de-saude.jpg'];
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

