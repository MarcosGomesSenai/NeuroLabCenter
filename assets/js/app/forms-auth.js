function mascararCpf(input) {
  let valor = somenteDigitos(input.value).slice(0, 11);
  valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
  valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
  valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  input.value = valor;
}

function mascararTelefone(input) {
  let valor = somenteDigitos(input.value).slice(0, 11);
  if (valor.length > 10) {
    valor = valor.replace(/^(\d{2})(\d{5})(\d{1,4})$/, '($1) $2-$3');
  } else if (valor.length > 6) {
    valor = valor.replace(/^(\d{2})(\d{4})(\d{1,4})$/, '($1) $2-$3');
  } else if (valor.length > 2) {
    valor = valor.replace(/^(\d{2})(\d{1,5})$/, '($1) $2');
  }
  input.value = valor;
}

function cpfValido(cpfEntrada) {
  const cpf = somenteDigitos(cpfEntrada);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  const calcularDigito = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(cpf.slice(0, 9)) === Number(cpf[9]) &&
    calcularDigito(cpf.slice(0, 10)) === Number(cpf[10]);
}

function idadeEmAnos(dataIso) {
  if (!dataIso) return null;
  const nascimento = new Date(`${dataIso}T00:00:00`);
  if (Number.isNaN(nascimento.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade;
}

function senhaValida(senha) {
  return /[A-Za-z]/.test(senha) && /\d/.test(senha) && String(senha).length >= 8;
}

function nomeCompletoValido(nome) {
  return String(nome || '').trim().split(/\s+/).length >= 2;
}

function setHint(id, mensagem, tipo = 'info') {
  const el = $(id);
  if (!el) return;
  el.textContent = mensagem;
  el.className = `field-hint ${tipo}`;
}

function switchCadastro(tipo) {
  cadastroTipoAtual = tipo;
  $('formAdulto')?.style.setProperty('display', tipo === 'adulto' ? 'block' : 'none');
  $('formAdolescente')?.style.setProperty('display', tipo === 'adolescente' ? 'block' : 'none');
  $('tabAdulto')?.classList.toggle('active', tipo === 'adulto');
  $('tabAdolescente')?.classList.toggle('active', tipo === 'adolescente');
  setHint('cadGeralHint', '');
}

async function realizarCadastro() {
  const usuarios = lerJson(STORAGE_KEYS.usuarios, []);
  const termos = $('cadTermos')?.checked;
  const isAdulto = cadastroTipoAtual === 'adulto';
  const dados = isAdulto
    ? {
        cpf: $('cadCpf')?.value,
        nascimento: $('cadNascimento')?.value,
        nome: $('cadNome')?.value,
        celular: $('cadCelular')?.value,
        email: $('cadEmail')?.value,
        senha: $('cadSenha')?.value,
        senhaConfirm: $('cadSenhaConfirm')?.value,
        tipo: 'adulto'
      }
    : {
        cpf: $('cadCpfAdol')?.value,
        nascimento: $('cadNascAdol')?.value,
        nome: $('cadNomeAdol')?.value,
        celular: $('cadCelAdol')?.value,
        cpfResponsavel: $('cadCpfResp')?.value,
        senha: $('cadSenhaAdol')?.value,
        senhaConfirm: $('cadSenhaAdol')?.value,
        tipo: 'adolescente'
      };

  const cpf = somenteDigitos(dados.cpf);
  const idade = idadeEmAnos(dados.nascimento);

  if (!cpfValido(cpf)) return setHint('cadGeralHint', 'CPF inválido. Verifique os números digitados.', 'error');
  if (usuarios.some(usuario => usuario.cpf === cpf)) return setHint('cadGeralHint', 'CPF já utilizado. Faça login.', 'error');
  if (!nomeCompletoValido(dados.nome)) return setHint('cadGeralHint', 'Informe o nome completo com pelo menos duas palavras.', 'error');
  if (idade === null) return setHint('cadGeralHint', 'Informe uma data de nascimento válida.', 'error');
  if (isAdulto && idade < 18) return setHint('cadGeralHint', 'Use a aba Adolescente para pacientes de 16 a 17 anos.', 'error');
  if (!isAdulto && (idade < 16 || idade > 17)) return setHint('cadGeralHint', 'A conta adolescente é permitida apenas para 16 ou 17 anos.', 'error');
  if (!isAdulto && !cpfValido(dados.cpfResponsavel)) return setHint('cadGeralHint', 'Informe um CPF de responsável válido.', 'error');
  if (somenteDigitos(dados.celular).length < 10) return setHint('cadGeralHint', 'Informe um celular válido com DDD.', 'error');
  if (!senhaValida(dados.senha)) return setHint('cadGeralHint', 'A senha precisa ter 8 caracteres, uma letra e um número.', 'error');
  if (dados.senha !== dados.senhaConfirm) return setHint('cadGeralHint', 'As senhas não conferem.', 'error');
  if (!termos) return setHint('cadGeralHint', 'Aceite os Termos de Uso e Política de Privacidade para criar a conta.', 'error');

  let pwdCredencial;
  try {
    pwdCredencial = await criarCredencialSenha(dados.senha);
  } catch (_) {
    return setHint('cadGeralHint', 'Não foi possível criar a credencial. Atualize o navegador e tente de novo.', 'error');
  }

  const usuario = {
    cpf,
    nome: dados.nome.trim(),
    nascimento: dados.nascimento,
    celular: dados.celular,
    email: dados.email || '',
    ...pwdCredencial,
    tipo: dados.tipo,
    cpfResponsavel: somenteDigitos(dados.cpfResponsavel),
    whatsapp: Boolean($('cadWhatsapp')?.checked),
    tentativas: 0,
    bloqueadoAte: 0,
    criadoEm: new Date().toISOString()
  };

  usuarios.push(usuario);
  salvarJson(STORAGE_KEYS.usuarios, usuarios);
  salvarJson(STORAGE_KEYS.usuarioAtual, { cpf, nome: usuario.nome });
  limparRascunhoCadastro();
  setHint('cadGeralHint', 'Conta criada com sucesso. Login automático realizado.', 'success');

  setTimeout(() => {
    fecharModal('modalCadastro');
    navegarPara('area-paciente.html');
  }, 700);
}

async function avancarLogin() {
  const cpf = somenteDigitos($('loginCpf')?.value);
  const usuarios = lerJson(STORAGE_KEYS.usuarios, []);
  const usuario = usuarios.find(item => item.cpf === cpf);

  if (loginEtapa === 'cpf') {
    if (!cpfValido(cpf)) return setHint('loginCpfHint', 'CPF inválido. Verifique os números digitados.', 'error');
    if (!usuario) return setHint('loginCpfHint', 'CPF não encontrado. Verifique o número ou crie uma conta.', 'error');

    $('loginSenhaGroup')?.classList.remove('hidden');
    $('btnLoginProximo').textContent = 'Entrar';
    setHint('loginCpfHint', 'CPF encontrado. Digite sua senha.', 'success');
    loginEtapa = 'senha';
    $('loginSenha')?.focus();
    return;
  }

  if (!usuario) return;
  const agora = Date.now();
  if (usuario.bloqueadoAte && usuario.bloqueadoAte > agora) {
    const minutos = Math.ceil((usuario.bloqueadoAte - agora) / 60000);
    const box = $('loginBloqueio');
    if (box) {
      box.textContent = `Conta bloqueada por segurança. Tente novamente em ${minutos} min.`;
      box.classList.remove('hidden');
    }
    return;
  }

  const senha = $('loginSenha')?.value || '';
  let senhaOk;
  try {
    senhaOk = await senhaCorrespondeCredencial(usuario, senha);
  } catch (_) {
    setHint('loginSenhaHint', 'Ambiente impediu verificação segura da senha. Use HTTPS ou outro navegador.', 'error');
    return;
  }
  if (!senhaOk) {
    usuario.tentativas = (usuario.tentativas || 0) + 1;
    if (usuario.tentativas >= 3) {
      usuario.bloqueadoAte = Date.now() + 15 * 60 * 1000;
      usuario.tentativas = 0;
      setHint('loginSenhaHint', 'Conta bloqueada por 15 minutos após 3 tentativas incorretas.', 'error');
    } else {
      setHint('loginSenhaHint', `Senha incorreta. Tentativas restantes: ${3 - usuario.tentativas}.`, 'error');
    }
    salvarJson(STORAGE_KEYS.usuarios, usuarios);
    return;
  }

  if (usuario.senha) {
    try {
      const cred = await criarCredencialSenha(senha);
      usuario.pwdKdf = cred.pwdKdf;
      delete usuario.senha;
      salvarJson(STORAGE_KEYS.usuarios, usuarios);
    } catch (_) {
      setHint('loginSenhaHint', 'Login ok, mas não foi possível migrar a senha para formato seguro. Tente novamente.', 'error');
      return;
    }
  }

  usuario.tentativas = 0;
  usuario.bloqueadoAte = 0;
  salvarJson(STORAGE_KEYS.usuarios, usuarios);
  salvarJson(STORAGE_KEYS.usuarioAtual, { cpf: usuario.cpf, nome: usuario.nome });
  setHint('loginSenhaHint', 'Login realizado com sucesso.', 'success');

  setTimeout(() => {
    fecharModal('modalLogin');
    navegarPara('area-paciente.html');
  }, 500);
}

function enviarRecuperacao() {
  const cpf = somenteDigitos($('recCpf')?.value);
  const usuarios = lerJson(STORAGE_KEYS.usuarios, []);
  if (!cpfValido(cpf)) return setHint('recHint', 'CPF inválido. Verifique os números digitados.', 'error');
  if (!usuarios.some(usuario => usuario.cpf === cpf)) return setHint('recHint', 'CPF não encontrado. Verifique o número ou crie uma conta.', 'error');

  const agora = Date.now();
  const registros = lerJson(STORAGE_KEYS.recuperacao, {});
  const recentes = (registros[cpf] || []).filter(item => agora - item < 60 * 60 * 1000);
  if (recentes.length >= 3) return setHint('recHint', 'Muitas tentativas. Aguarde 1 hora antes de tentar novamente.', 'error');

  recentes.push(agora);
  registros[cpf] = recentes;
  salvarJson(STORAGE_KEYS.recuperacao, registros);
  setHint('recHint', 'Link de recuperação enviado pelo canal prioritário disponível. Ele expira em 2 horas.', 'success');
}

