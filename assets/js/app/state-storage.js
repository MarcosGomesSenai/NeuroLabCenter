// ============================================================
// NAVEGAÇÃO, MODAIS E FLUXOS DO PACIENTE
// ============================================================
const STORAGE_KEYS = {
  usuarios: 'neurolab_usuarios',
  usuarioAtual: 'neurolab_usuario_atual',
  agendamentos: 'neurolab_agendamentos',
  fila: 'neurolab_fila_espera',
  avaliacoes: 'neurolab_avaliacoes',
  recuperacao: 'neurolab_recuperacao_senha'
};

const PBKDF2_ITER = 210000;

function bufToB64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function b64ToBuf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function criarCredencialSenha(senhaPlain) {
  const enc = new TextEncoder().encode(senhaPlain);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return {
    pwdKdf: {
      algo: 'PBKDF2-SHA256',
      iter: PBKDF2_ITER,
      saltB64: bufToB64(salt),
      hashB64: bufToB64(new Uint8Array(bits))
    }
  };
}

async function senhaCorrespondeCredencial(usuario, senhaPlain) {
  if (usuario.senha && typeof usuario.senha === 'string') {
    return senhaPlain === usuario.senha;
  }
  const kdf = usuario.pwdKdf;
  if (!kdf?.saltB64 || !kdf.hashB64 || !Number(kdf.iter)) return false;
  const enc = new TextEncoder().encode(senhaPlain);
  const salt = b64ToBuf(kdf.saltB64);
  const esperado = b64ToBuf(kdf.hashB64);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: kdf.iter, hash: 'SHA-256' },
    keyMaterial,
    esperado.length * 8
  );
  const obtido = new Uint8Array(bits);
  if (obtido.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < obtido.length; i++) diff |= obtido[i] ^ esperado[i];
  return diff === 0;
}

let cadastroTipoAtual = 'adulto';
let loginEtapa = 'cpf';
let agendamentoPasso = 1;
let agendamentoAtual = {};
let holdInterval = null;
let holdExpiraEm = null;
let avaliacaoAtual = { medico: 0, recepcao: 0, agendamento: 0, nps: null };

function $(id) {
  return document.getElementById(id);
}

function lerJson(chave, fallback) {
  try {
    return JSON.parse(localStorage.getItem(chave)) ?? fallback;
  } catch (erro) {
    return fallback;
  }
}

function salvarJson(chave, valor) {
  localStorage.setItem(chave, JSON.stringify(valor));
}

function somenteDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function paginaAtual() {
  const arquivo = window.location.pathname.split('/').pop() || 'index.html';
  return arquivo.toLowerCase();
}

