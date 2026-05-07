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

