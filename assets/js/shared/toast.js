// ============================================================
// TOAST NOTIFICATION SYSTEM (Componente 1)
// Substitui todos os alert() por notificações visuais
// ============================================================
(function criarToastContainer() {
  if (document.querySelector('.toast-container')) return;
  const container = document.createElement('div');
  container.className = 'toast-container';
  container.id = 'toastContainer';
  document.body.appendChild(container);
})();

function mostrarToast(mensagem, tipo = 'info', duracao = 4000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }

  const icones = { sucesso: '✅', erro: '❌', info: 'ℹ️', aviso: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.innerHTML = `
    <span class="toast-icone">${icones[tipo] || 'ℹ️'}</span>
    <span>${mensagem}</span>
    <button class="toast-fechar" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('saindo');
    setTimeout(() => toast.remove(), 300);
  }, duracao);
}

