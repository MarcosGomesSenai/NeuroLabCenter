// API pública usada: ViaCEP.
// Ela consulta o CEP, pega cidade/UF/bairro e abre o mapa da região com uma busca de hospital.
function mascararCep(input) {
  let valor = input.value.replace(/\D/g, '').slice(0, 8);
  if (valor.length > 5) valor = valor.replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
  input.value = valor;
}

async function pesquisarCepAPI(inputId = 'cepBusca') {
  const input = document.getElementById(inputId) || document.getElementById('cepBusca') || document.getElementById('ruaBusca');
  if (!input) return;
  const resultado = document.getElementById('resultadoCep');
  const mapaBox = document.getElementById('mapaBox');
  const mapaIframe = document.getElementById('mapaIframe');
  const cep = input.value.replace(/\D/g, '');

  if (!resultado || !mapaBox || !mapaIframe) {
    const grid = document.getElementById('unidadesDisponiveis');
    if (grid && cep.length === 8 && typeof NL_UNIDADES !== 'undefined') {
      const unidades = NL_UNIDADES.filter(unidade => unidade.modalidades && !unidade.modalidades.every(m => m === 'TELE'));
      grid.classList.remove('hidden');
      grid.innerHTML = unidades.map((unidade, index) => `
        <div class="unidade-card ${index === 0 ? 'recomendada' : ''}" onclick="selecionarUnidade('${unidade.nome.replace(/'/g, "\\'")}', '${unidade.endereco.replace(/'/g, "\\'")}')">
          <strong>${nlSafeText(unidade.nome)}</strong>
          <small>${nlSafeText(unidade.endereco)}</small>
          <div class="tags" style="margin-top:8px;">${(unidade.coberturas || []).map(c => `<span class="tag">${nlSafeText(c)}</span>`).join('')}</div>
        </div>
      `).join('');
      return;
    }
    return pesquisarPorRua(inputId);
  }

  if (!cep || cep.length !== 8) {
    resultado.classList.remove('loading');
    resultado.innerHTML = 'Digite um CEP válido com 8 números. Ex: 09015-000.';
    mapaBox.classList.add('hidden');
    return;
  }

  resultado.classList.add('loading');
  resultado.innerHTML = 'Consultando CEP na API ViaCEP...';

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const dados = await resposta.json();

    if (dados.erro) {
      resultado.classList.remove('loading');
      resultado.innerHTML = '<strong>CEP não encontrado.</strong><br>Confira os números e tente novamente.';
      mapaBox.classList.add('hidden');
      return;
    }

    const logradouro = dados.logradouro || '';
    const enderecoCompleto = [logradouro, dados.bairro, dados.localidade, dados.uf].filter(Boolean).join(' - ');
    const endereco = `${dados.localidade} ${dados.uf} ${dados.bairro || ''}`.trim();
    const ruaBusca = document.getElementById('ruaBusca');
    if (ruaBusca && dados.logradouro) {
      ruaBusca.value = [dados.logradouro, dados.bairro].filter(Boolean).join(', ');
      ruaBusca.dataset.cep = cep;
    }
    const buscaMapa = encodeURIComponent(`hospital NeuroLab Center próximo de ${endereco}`);
    const linkMapa = `https://www.google.com/maps/search/?api=1&query=${buscaMapa}`;
    const embedMapa = `https://maps.google.com/maps?q=${buscaMapa}&output=embed`;

    resultado.classList.remove('loading');
    resultado.innerHTML = `
      <strong>Região encontrada: ${dados.localidade} - ${dados.uf}</strong><br>
      Bairro: ${dados.bairro || 'não informado'}<br>
      Endereço base: ${enderecoCompleto || 'não informado'}<br><br>
      Unidade sugerida: <strong>Hospital NeuroLab Center da região</strong><br>
      <a class="map-link" href="${linkMapa}" target="_blank">Abrir mapa em tela cheia →</a>
    `;

    mapaIframe.src = embedMapa;
    mapaBox.classList.remove('hidden');
  } catch (erro) {
    resultado.classList.remove('loading');
    resultado.innerHTML = '<strong>Erro ao consultar o CEP.</strong><br>Verifique sua internet ou tente novamente mais tarde.';
    mapaBox.classList.add('hidden');
  }
}

function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function nlEnderecoPartes(valor) {
  const texto = (valor || '').trim().replace(/\s+/g, ' ');
  const digitos = somenteDigitos(texto);
  const temLetra = /[A-Za-zÀ-ÿ]/.test(texto);
  const cep = digitos.length >= 8 && !temLetra ? digitos.slice(0, 8) : '';
  const numeroMatch = !cep ? texto.match(/(?:,\s*|\s+)(\d{1,6}[A-Za-z]?)\s*$/) : null;
  const numero = numeroMatch ? numeroMatch[1] : '';
  const ruaBase = numeroMatch ? texto.slice(0, numeroMatch.index).replace(/[,\s]+$/, '') : texto;

  return {
    texto,
    cep,
    numero,
    ruaBase,
    busca: cep ? texto : (numero ? `${ruaBase} ${numero}` : texto)
  };
}

function nlEnderecoEhCep(valor) {
  return Boolean(nlEnderecoPartes(valor).cep);
}

// Compatibilidade com botões antigos
function pesquisarCidade() {
  pesquisarCepAPI();
}

function pesquisarEnderecoInteligente(inputId = 'ruaBusca') {
  const input = document.getElementById(inputId);
  const valor = (input?.value || '').trim();
  if (!valor) return;
  if (nlEnderecoEhCep(valor)) return pesquisarCepAPI(inputId);
  return pesquisarPorRua(inputId);
}

function pesquisarPorRua(inputId = 'ruaBusca') {
  const input = document.getElementById(inputId) || document.getElementById('ruaBusca');
  const resultado = document.getElementById('resultadoCep');
  const mapaBox = document.getElementById('mapaBox');
  const mapaIframe = document.getElementById('mapaIframe');
  const termo = (input?.value || '').trim();

  if (!termo || termo.length < 3) {
    resultado.innerHTML = 'Digite pelo menos 3 letras do nome da rua, avenida ou bairro.';
    mapaBox.classList.add('hidden');
    return;
  }

  const partesEndereco = nlEnderecoPartes(termo);
  const termoNorm = normalizarTexto(partesEndereco.ruaBase || termo);

  // Tenta encontrar unidade cujo endereço bate com o termo digitado
  const unidadeEncontrada = NL_UNIDADES.find(unidade =>
    normalizarTexto(unidade.endereco).includes(termoNorm) ||
    normalizarTexto(unidade.nome).includes(termoNorm)
  );

  if (unidadeEncontrada) {
    const buscaMapa = encodeURIComponent(unidadeEncontrada.endereco);
    const linkMapa = `https://www.google.com/maps/search/?api=1&query=${buscaMapa}`;
    const embedMapa = unidadeEncontrada.mapa || `https://maps.google.com/maps?q=${buscaMapa}&output=embed`;

    resultado.innerHTML = `
      <strong>Unidade encontrada: ${unidadeEncontrada.nome}</strong><br>
      Endereço: ${unidadeEncontrada.endereco}<br><br>
      <a class="map-link" href="${linkMapa}" target="_blank">Abrir mapa em tela cheia →</a>
    `;

    if (embedMapa) {
      mapaIframe.src = embedMapa;
      mapaBox.classList.remove('hidden');
    } else {
      mapaBox.classList.add('hidden');
    }
  } else {
    // Busca genérica no Google Maps com o termo + NeuroLab
    const buscaMapa = encodeURIComponent(`NeuroLab Center ${partesEndereco.busca} Santo André SP`);
    const linkMapa = `https://www.google.com/maps/search/?api=1&query=${buscaMapa}`;
    const embedMapa = `https://maps.google.com/maps?q=${buscaMapa}&output=embed`;

    resultado.innerHTML = `
      <strong>Buscando por: "${partesEndereco.busca}"</strong><br>
      Nenhuma unidade NeuroLab encontrada nesse endereço. Veja as unidades mais próximas no mapa ou confira nossa lista abaixo.<br><br>
      <a class="map-link" href="${linkMapa}" target="_blank">Ver no Google Maps →</a>
    `;
    mapaIframe.src = embedMapa;
    mapaBox.classList.remove('hidden');
  }
}


