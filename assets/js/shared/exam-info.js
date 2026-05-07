const examesInfo = [
  {
    titulo: 'Eletroencefalograma (EEG)',
    texto: 'Avalia a atividade elétrica cerebral. Auxilia na investigação de crises epilépticas, epilepsia e alterações neurológicas.',
    duracao: '~40 min',
    preparo: ['Não usar gel, spray ou pomada no cabelo', 'Lavar e secar bem o cabelo no dia do exame', 'Evitar cafeína nas 24h anteriores'],
    contraindica: ''
  },
  {
    titulo: 'Eletroneuromiografia (ENMG)',
    texto: 'Avalia nervos e músculos em casos de dor, fraqueza, formigamento e perda de força.',
    duracao: '~60 min',
    preparo: ['Não usar cremes ou óleos na pele', 'Levar exames anteriores, se houver'],
    contraindica: ''
  },
  {
    titulo: 'Polissonografia',
    texto: 'Exame do sono usado para investigar ronco, apneia, insônia, sonolência e sono agitado.',
    duracao: 'Noite inteira',
    preparo: ['Evitar cafeína no dia do exame', 'Levar roupa confortável para dormir'],
    contraindica: ''
  },
  {
    titulo: 'Doppler Transcraniano',
    texto: 'Avalia o fluxo sanguíneo cerebral e pode auxiliar em investigações vasculares neurológicas.',
    duracao: '~30 min',
    preparo: ['Não há preparo obrigatório', 'Chegar com 15 minutos de antecedência'],
    contraindica: ''
  },
  {
    titulo: 'Ressonância Magnética',
    texto: 'Exame de imagem usado para investigar estruturas do cérebro e da coluna com alta precisão.',
    duracao: '~45 min',
    preparo: ['Remover objetos metálicos', 'Informar implantes, marca-passo ou claustrofobia antes do exame'],
    contraindica: 'Portadores de marca-passo ou implantes metálicos devem informar a equipe antes do exame.'
  },
  {
    titulo: 'Potencial Evocado',
    texto: 'Avalia respostas das vias neurais a estímulos visuais, auditivos ou sensitivos.',
    duracao: '~60 min',
    preparo: ['Cabelo limpo e seco', 'Evitar maquiagem ou cremes na região avaliada'],
    contraindica: ''
  }
];

function selecionarExame(index) {
  const titulo = document.getElementById('examInfoTitle');
  const texto = document.getElementById('examInfoText');
  const meta = document.getElementById('examMeta');
  const prep = document.getElementById('examPrep');
  const prepList = document.getElementById('examPrepList');
  const contra = document.getElementById('examContra');
  const contraText = document.getElementById('examContraText');
  const stickers = document.querySelectorAll('.exam-sticker');
  const exame = examesInfo[index];

  if (!titulo || !texto || !exame) return;

  titulo.textContent = exame.titulo;
  texto.textContent = exame.texto;

  if (meta) {
    meta.innerHTML = `<span>⏱ ${exame.duracao}</span><span class="tag">${exame.preparo.length ? 'Preparo necessário' : 'Sem preparo obrigatório'}</span>`;
  }

  if (prep && prepList) {
    prep.classList.toggle('hidden', !exame.preparo.length);
    prepList.innerHTML = exame.preparo.map(item => `<li>${item}</li>`).join('');
  }

  if (contra && contraText) {
    contra.classList.toggle('hidden', !exame.contraindica);
    contraText.textContent = exame.contraindica;
  }

  stickers.forEach((sticker, i) => sticker.classList.toggle('active', i === index));
}

const textosPaciente = {
  cpf: { titulo: 'Cadastro com CPF', texto: 'Informe CPF, nome completo, data de nascimento, telefone e e-mail. Depois aceite os termos de uso para ativar sua central.' },
  dependentes: { titulo: 'Gestão de dependentes', texto: 'Adicione filhos, pais idosos ou responsáveis. Assim você acompanha consultas e exames da família em um só lugar.' },
  anamnese: { titulo: 'Anamnese digital', texto: 'Antes da consulta, responda sintomas, histórico, medicamentos e queixas principais para agilizar o atendimento.' },
  checkin: { titulo: 'Check-in QR Code', texto: 'No dia da consulta, o QR Code do paciente pode ser validado pela recepção para registrar a chegada.' },
  fila: { titulo: 'Fila de espera', texto: 'Se não houver horário disponível, você pode entrar na fila e receber aviso por WhatsApp e SMS quando surgir desistência.' },
  consulta: { titulo: 'Sala virtual para consulta online', texto: 'O sistema testa câmera, microfone e internet antes da consulta. No horário marcado, o paciente entra por um link seguro.' }
};

function abrirModalPaciente(tipo) {
  const modal = document.getElementById('modalPaciente');
  const titulo = document.getElementById('modalTitulo');
  const texto = document.getElementById('modalTexto');
  const conteudo = textosPaciente[tipo];

  if (!modal || !conteudo) return;

  titulo.textContent = conteudo.titulo;
  texto.textContent = conteudo.texto;
  modal.classList.add('open');
}

function fecharModalPaciente() {
  const modal = document.getElementById('modalPaciente');
  if (modal) modal.classList.remove('open');
}


