// ============================================================
// CPF INLINE VALIDATION (Componente 3 — RN-02)
// Valida CPF em tempo real enquanto o usuário digita
// ============================================================
function validarCpfInline(input, hintId) {
  const cpf = somenteDigitos(input.value);
  const hint = document.getElementById(hintId);
  
  input.classList.remove('cpf-valido', 'cpf-invalido');
  if (hint) { hint.textContent = ''; hint.className = 'field-hint'; }

  if (cpf.length < 11) return;

  if (!cpfValido(cpf)) {
    input.classList.add('cpf-invalido');
    if (hint) {
      hint.textContent = '❌ CPF inválido. Verifique os dígitos.';
      hint.className = 'field-hint error';
    }
    return false;
  }

  // Verificar duplicidade no cadastro
  const usuarios = lerJson(STORAGE_KEYS.usuarios, []);
  const duplicado = usuarios.some(u => u.cpf === cpf);

  if (duplicado && (hintId === 'cadCpfHint' || hintId === 'cadCpfAdolHint')) {
    input.classList.add('cpf-invalido');
    if (hint) {
      hint.textContent = '⚠️ CPF já utilizado. Faça login.';
      hint.className = 'field-hint error';
    }
    return false;
  }

  input.classList.add('cpf-valido');
  if (hint) {
    hint.textContent = '✅ CPF válido';
    hint.className = 'field-hint success';
  }
  return true;
}

// ============================================================
// HEADER DINÂMICO (Componente 2 — RN-04)
// Atualiza header conforme estado de autenticação
// ============================================================
function atualizarHeader() {
  const usuario = lerJson(STORAGE_KEYS.usuarioAtual, null);
  const authButtons = document.querySelectorAll('.auth-buttons');

  authButtons.forEach(container => {
    if (usuario && usuario.nome) {
      const primeiroNome = usuario.nome.split(' ')[0];
      container.innerHTML = `
        <span style="font-weight:700; color:var(--verde-principal); font-size:14px;">Olá, ${primeiroNome} 👤</span>
        <a class="btn btn-light" href="area-paciente.html">Minha área</a>
        <button class="btn btn-primary" onclick="fazerLogout()">Sair</button>
      `;
    } else {
      const pagina = paginaAtual();
      const cadastroHref = pagina === 'index.html' ? '#' : 'index.html?modal=cadastro';
      const loginHref = pagina === 'index.html' ? '#' : 'index.html?modal=login';
      const cadastroOnclick = pagina === 'index.html' ? 'onclick="abrirModalCadastro(); return false;"' : '';
      const loginOnclick = pagina === 'index.html' ? 'onclick="abrirModalLogin(); return false;"' : '';
      container.innerHTML = `
        <a class="btn btn-light" href="${loginHref}" ${loginOnclick}>Entrar</a>
        <a class="btn btn-primary" href="${cadastroHref}" ${cadastroOnclick}>Cadastrar</a>
      `;
    }
  });
}

function fazerLogout() {
  localStorage.removeItem(STORAGE_KEYS.usuarioAtual);
  mostrarToast('Sessão encerrada com sucesso.', 'sucesso');
  setTimeout(() => { window.location.href = 'index.html'; }, 600);
}

// ============================================================
// GUARD DE AUTENTICAÇÃO (Componente 4 — RN-01)
// Verifica login antes de permitir agendamento
// ============================================================
function verificarAuthParaAgendamento() {
  const usuario = lerJson(STORAGE_KEYS.usuarioAtual, null);
  if (!usuario || !usuario.cpf) {
    mostrarToast('Faça login ou crie uma conta para agendar.', 'aviso');
    setTimeout(() => {
      if (paginaAtual() === 'index.html') {
        abrirModalLogin();
      } else {
        window.location.href = 'index.html?modal=login';
      }
    }, 800);
    return false;
  }
  return true;
}

