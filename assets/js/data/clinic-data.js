const NL_UNIDADES = [
  {
    nome: 'Santo André - Centro',
    endereco: 'R. Amazonas, 48 - Centro, Santo André - SP',
    distancia: '2,1 km',
    coberturas: ['Particular', 'Convênio', 'SUS'],
    modalidades: ['CONS-ADULT', 'CONS-INF', 'EXAM', 'TELE'],
    convenios: ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil', 'Porto Seguro Saúde'],
    mapa: 'https://maps.google.com/maps?q=Rua%20Amazonas%2048%20Santo%20Andre%20SP&output=embed'
  },
  {
    nome: 'São Bernardo - Jardim do Mar',
    endereco: 'Av. Kennedy, 303 - Jardim do Mar, São Bernardo do Campo - SP',
    distancia: '8,4 km',
    coberturas: ['Particular', 'Convênio'],
    modalidades: ['CONS-ADULT', 'CONS-INF', 'TELE'],
    convenios: ['Unimed', 'Amil', 'NotreDame Intermédica', 'Bradesco Saúde'],
    mapa: 'https://maps.google.com/maps?q=Av%20Kennedy%20303%20Sao%20Bernardo%20SP&output=embed'
  },
  {
    nome: 'Santo André - Vila Pires',
    endereco: 'R. Senador Fláquer, 512 - Vila Pires, Santo André - SP',
    distancia: '3,8 km',
    coberturas: ['Particular', 'Convênio'],
    modalidades: ['CONS-ADULT', 'CONS-INF', 'EXAM'],
    convenios: ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil'],
    mapa: 'https://maps.google.com/maps?q=Rua+Senador+Flaquer+512+Santo+Andre+SP&output=embed'
  }
];

const NL_MEDICOS = [
  {
    nome: 'Dra. Ana Beatriz Ferreira',
    crm: 'CRM/SP 84.201',
    especialidade: 'Neurologia Geral e Epilepsia',
    rating: 4.9,
    avaliacoes: 127,
    unidades: ['Santo André - Centro'],
    coberturas: ['Particular', 'Convênio', 'SUS'],
    tipos: ['CONS-ADULT', 'TELE']
  },
  {
    nome: 'Dr. Carlos Eduardo Moura',
    crm: 'CRM/SP 67.453',
    especialidade: 'Sono, cefaleia e teleconsulta',
    rating: 4.7,
    avaliacoes: 89,
    unidades: ['Santo André - Centro', 'São Bernardo - Jardim do Mar'],
    coberturas: ['Particular', 'Convênio'],
    tipos: ['CONS-ADULT', 'TELE', 'EXAM']
  },
  {
    nome: 'Dra. Fernanda Lima Costa',
    crm: 'CRM/SP 91.077',
    especialidade: 'Neuropediatria e desenvolvimento',
    rating: 4.8,
    avaliacoes: 203,
    unidades: ['Santo André - Centro', 'São Bernardo - Jardim do Mar'],
    coberturas: ['Particular', 'Convênio'],
    tipos: ['CONS-INF', 'EXAM']
  },
  {
    nome: 'Dr. Rafael Nogueira',
    crm: 'CRM/SP 76.118',
    especialidade: 'Exames neurofisiológicos',
    rating: 4.8,
    avaliacoes: 74,
    unidades: ['Santo André - Centro'],
    coberturas: ['Particular', 'Convênio', 'SUS'],
    tipos: ['EXAM']
  }
];

const NL_PLANOS = [
  { nome: 'Unimed', unidades: ['Santo André - Centro', 'São Bernardo - Jardim do Mar'], servicos: ['Consulta', 'Exames', 'Teleconsulta'] },
  { nome: 'Bradesco Saúde', unidades: ['Santo André - Centro', 'São Bernardo - Jardim do Mar'], servicos: ['Consulta', 'Teleconsulta'] },
  { nome: 'SulAmérica', unidades: ['Santo André - Centro'], servicos: ['Consulta', 'Exames', 'Teleconsulta'] },
  { nome: 'Amil', unidades: ['Santo André - Centro', 'São Bernardo - Jardim do Mar'], servicos: ['Consulta', 'Teleconsulta'] },
  { nome: 'Porto Seguro Saúde', unidades: ['Santo André - Centro'], servicos: ['Consulta', 'Exames'] },
  { nome: 'NotreDame Intermédica', unidades: ['São Bernardo - Jardim do Mar'], servicos: ['Consulta'] }
];

NL_UNIDADES.push(
  {
    nome: 'Moema - Neurodiagnóstico',
    endereco: 'Av. Ibirapuera, 2120 - Moema, São Paulo - SP',
    distancia: '18,6 km',
    coberturas: ['Particular', 'Convênio'],
    modalidades: ['CONS-ADULT', 'EXAM', 'TELE'],
    convenios: ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil', 'Porto Seguro Saúde', 'Omint'],
    mapa: 'https://maps.google.com/maps?q=Av%20Ibirapuera%202120%20Sao%20Paulo%20SP&output=embed',
    imagem: '../../assets/img/Diagnpsticos-completos.jpg',
    recursos: ['EEG', 'ENMG', 'Polissonografia', 'Sala de preparo', 'Estacionamento conveniado']
  },
  {
    nome: 'Tatuapé - Neuropediatria',
    endereco: 'R. Itapura, 986 - Tatuapé, São Paulo - SP',
    distancia: '21,4 km',
    coberturas: ['Particular', 'Convênio'],
    modalidades: ['CONS-ADULT', 'CONS-INF', 'EXAM'],
    convenios: ['Unimed', 'Amil', 'NotreDame Intermédica', 'Care Plus', 'Alice'],
    mapa: 'https://maps.google.com/maps?q=Rua%20Itapura%20986%20Sao%20Paulo%20SP&output=embed',
    imagem: '../../assets/img/Area-de-espera.jpg',
    recursos: ['Neuropediatria', 'Sala família', 'Exames infantis', 'Acessibilidade']
  },
  {
    nome: 'Paulista - Sono e Cognição',
    endereco: 'Av. Paulista, 171 - Bela Vista, São Paulo - SP',
    distancia: '24,2 km',
    coberturas: ['Particular', 'Convênio'],
    modalidades: ['CONS-ADULT', 'EXAM', 'TELE'],
    convenios: ['SulAmérica', 'Bradesco Saúde', 'Omint', 'Golden Cross', 'Care Plus'],
    mapa: 'https://maps.google.com/maps?q=Av%20Paulista%20171%20Sao%20Paulo%20SP&output=embed',
    imagem: '../../assets/img/central-de-saude.jpg',
    recursos: ['Sono', 'Memória', 'Teleconsulta', 'Laudos digitais']
  }
);

NL_MEDICOS.push(
  {
    nome: 'Dra. Marina Azevedo Prado',
    crm: 'CRM/SP 102.884',
    especialidade: 'Cefaleia, enxaqueca e dor neuropática',
    rating: 4.9,
    avaliacoes: 156,
    unidades: ['Moema - Neurodiagnóstico'],
    coberturas: ['Particular', 'Convênio'],
    tipos: ['CONS-ADULT', 'TELE']
  },
  {
    nome: 'Dr. Henrique Vidal Ramos',
    crm: 'CRM/SP 73.904',
    especialidade: 'Memória, cognição e Alzheimer',
    rating: 4.8,
    avaliacoes: 118,
    unidades: ['Paulista - Sono e Cognição'],
    coberturas: ['Particular', 'Convênio'],
    tipos: ['CONS-ADULT', 'TELE']
  },
  {
    nome: 'Dra. Laura Martins Sato',
    crm: 'CRM/SP 88.612',
    especialidade: 'Neuropediatria e desenvolvimento infantil',
    rating: 4.9,
    avaliacoes: 211,
    unidades: ['Tatuapé - Neuropediatria', 'Santo André - Centro'],
    coberturas: ['Particular', 'Convênio'],
    tipos: ['CONS-INF']
  },
  {
    nome: 'Dr. Bruno Paiva Leal',
    crm: 'CRM/SP 69.450',
    especialidade: 'Distúrbios do movimento e Parkinson',
    rating: 4.7,
    avaliacoes: 97,
    unidades: ['Santo André - Centro', 'Paulista - Sono e Cognição'],
    coberturas: ['Particular', 'Convênio', 'SUS'],
    tipos: ['CONS-ADULT']
  }
);

NL_PLANOS.push(
  { nome: 'Care Plus', unidades: ['Tatuapé - Neuropediatria', 'Paulista - Sono e Cognição'], servicos: ['Consulta', 'Exames', 'Teleconsulta'] },
  { nome: 'Omint', unidades: ['Moema - Neurodiagnóstico', 'Paulista - Sono e Cognição'], servicos: ['Consulta', 'Exames'] },
  { nome: 'Golden Cross', unidades: ['Santo André - Centro', 'Paulista - Sono e Cognição'], servicos: ['Consulta', 'Teleconsulta'] },
  { nome: 'Alice', unidades: ['Tatuapé - Neuropediatria'], servicos: ['Consulta', 'Teleconsulta'] },
  { nome: 'Prevent Senior', unidades: ['Santo André - Centro', 'Paulista - Sono e Cognição'], servicos: ['Consulta', 'Exames'] },
  { nome: 'Sompo Saúde', unidades: ['Moema - Neurodiagnóstico', 'Santo André - Centro'], servicos: ['Consulta', 'Exames'] },
  { nome: 'Mediservice', unidades: ['São Bernardo - Jardim do Mar'], servicos: ['Consulta', 'Teleconsulta'] },
  { nome: 'Cassi', unidades: ['Santo André - Centro', 'Moema - Neurodiagnóstico'], servicos: ['Consulta', 'Exames'] }
);

