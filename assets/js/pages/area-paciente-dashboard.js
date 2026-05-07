// Preencher perfil do dashboard com dados do localStorage
    document.addEventListener('DOMContentLoaded', () => {
      const usuario = JSON.parse(localStorage.getItem('neurolab_usuario_atual') || 'null');
      if (usuario && usuario.nome) {
        const primeiro = usuario.nome.split(' ')[0];
        const preencher = (id, valor) => {
          const elemento = document.getElementById(id);
          if (elemento) elemento.textContent = valor;
        };
        preencher('dashWelcome', `Olá, ${primeiro}! 👋`);
        preencher('dashSubtitle', 'Aqui você gerencia tudo sobre suas consultas.');
        preencher('perfilNome', usuario.nome);
        preencher('perfilCpf', usuario.cpf ? usuario.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4') : '—');
        preencher('perfilNasc', usuario.nascimento || '—');
        preencher('perfilTel', usuario.telefone || usuario.celular || '—');
        preencher('perfilTipo', usuario.tipo || 'Adulto');
      }
    });
