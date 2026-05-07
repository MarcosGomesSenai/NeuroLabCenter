/* ==========================================================================
   WAZE-LIKE AUTOCOMPLETE E CÁLCULO DE DISTÂNCIA — v2
   ========================================================================== */

const NL_UNIDADES_GEO = [
  { nome: 'Santo André - Centro', endereco: 'R. Amazonas, 48 - Centro, Santo André - SP', lat: -23.655, lon: -46.528, coberturas: ['Particular', 'Convênio', 'SUS', 'Teleconsulta'] },
  { nome: 'São Bernardo - Jardim do Mar', endereco: 'Av. Kennedy, 303 - Jardim do Mar, SBC - SP', lat: -23.684, lon: -46.556, coberturas: ['Particular', 'Convênio', 'Teleconsulta'] },
  { nome: 'Santo André - Vila Pires', endereco: 'R. Senador Fláquer, 512 - Vila Pires, Santo André - SP', lat: -23.662, lon: -46.524, coberturas: ['Particular', 'Convênio'] }
];

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return (R * c).toFixed(1);
}

/**
 * Formata os dados de endereço do Nominatim em partes legíveis
 */
function formatarEnderecoNominatim(item) {
  const addr = item.address || {};
  const road = addr.road || addr.pedestrian || addr.footway || '';
  const neighbourhood = addr.suburb || addr.neighbourhood || addr.quarter || '';
  const city = addr.city || addr.town || addr.village || addr.municipality || '';
  const state = addr.state || '';
  
  // Nome principal: rua se existir, senão o primeiro segmento do display_name
  const principal = road || item.display_name.split(',')[0];
  
  // Detalhes: bairro, cidade - estado
  const detalhes = [neighbourhood, city, state].filter(Boolean).join(', ');
  
  return { principal, detalhes, road, neighbourhood, city, state };
}

/**
 * Inicializa o autocomplete estilo Waze em um input
 */
function initWazeAutocomplete(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  // Evitar inicialização dupla
  if (input.dataset.wazeInit === 'true') return;
  input.dataset.wazeInit = 'true';

  // Criar wrapper para posicionamento relativo se não tiver
  const wrapper = input.parentNode;
  wrapper.style.position = 'relative';

  // Criar o dropdown
  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown hidden';
  dropdown.id = inputId + '_dropdown';
  wrapper.appendChild(dropdown);

  let timeout;
  let lastQuery = '';

  input.addEventListener('input', () => {
    clearTimeout(timeout);
    // Limpar coordenadas ao editar manualmente (forçar nova busca)
    delete input.dataset.lat;
    delete input.dataset.lon;
    delete input.dataset.cep;
    
    const termo = input.value.trim();
    if (termo.length < 3) {
      dropdown.classList.add('hidden');
      return;
    }

    if (typeof nlEnderecoEhCep === 'function' && nlEnderecoEhCep(termo)) {
      dropdown.classList.add('hidden');
      return;
    }
    
    // Evitar repetir a mesma query
    if (termo === lastQuery) return;

    timeout = setTimeout(() => {
      lastQuery = termo;
      
      // Loading state com animação de pulso
      dropdown.innerHTML = `
        <div class="autocomplete-item ac-loading">
          <span class="waze-icon ac-pulse">🔍</span>
          <div><strong>Buscando endereços...</strong><br><small>Aguarde enquanto localizamos "${termo}"</small></div>
        </div>`;
      dropdown.classList.remove('hidden');
      
      // Buscar com addressdetails=1 para obter rua, bairro, cidade separados
      const partesDigitadas = typeof nlEnderecoPartes === 'function' ? nlEnderecoPartes(termo) : { busca: termo, numero: '' };
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&limit=6&q=${encodeURIComponent(partesDigitadas.busca)}`;
      
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (!data || data.length === 0) {
            dropdown.innerHTML = `
              <div class="autocomplete-item">
                <span class="waze-icon">❌</span>
                <div><strong>Nenhum endereço encontrado</strong><br><small>Tente digitar de outra forma, ex: "Av Paulista, São Paulo"</small></div>
              </div>`;
            return;
          }
          
          dropdown.innerHTML = '';
          
          // Filtrar duplicatas pelo nome principal
          const vistos = new Set();
          data.forEach(item => {
            const info = formatarEnderecoNominatim(item);
            const chave = (info.principal + '|' + info.city).toLowerCase();
            if (vistos.has(chave)) return;
            vistos.add(chave);
            
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.innerHTML = `
              <span class="waze-icon">📍</span>
              <div>
                <strong>${info.principal}</strong>
                <small>${info.detalhes}</small>
              </div>`;
            
            div.addEventListener('click', () => {
              // Setar o valor legível (rua, bairro - cidade)
              const enderecoLegivel = info.road
                ? `${info.road}, ${info.neighbourhood || info.city}`
                : info.principal;
              input.value = partesDigitadas.numero ? `${enderecoLegivel}, ${partesDigitadas.numero}` : enderecoLegivel;
              input.dataset.lat = item.lat;
              input.dataset.lon = item.lon;
              input.dataset.enderecoCompleto = item.display_name;
              input.dataset.rua = info.road || info.principal;
              input.dataset.numero = partesDigitadas.numero || '';
              input.dataset.bairro = info.neighbourhood;
              input.dataset.cidade = info.city;
              dropdown.classList.add('hidden');
              
              // Disparar busca automaticamente
              if (input.id === 'drFiltroCep' && typeof buscarCepAgendamentoSimples === 'function') {
                buscarCepAgendamentoSimples();
              } else if (typeof pesquisarPorRua === 'function') {
                pesquisarPorRua(input.id);
              }
            });
            
            dropdown.appendChild(div);
          });
        })
        .catch(() => {
          dropdown.innerHTML = `
            <div class="autocomplete-item">
              <span class="waze-icon">⚠️</span>
              <div><strong>Erro de conexão</strong><br><small>Verifique sua internet e tente novamente</small></div>
            </div>`;
        });
    }, 450);
  });
  
  // Fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
  
  // Navegar com teclado
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdown.classList.add('hidden');
    }
  });
}

/**
 * Mantido por compatibilidade: o número agora é digitado no mesmo campo da rua.
 */
function mostrarCampoNumero(inputId, ruaNome) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (ruaNome && !input.value.includes(ruaNome)) input.value = ruaNome;
  input.focus();
}

/**
 * Pesquisar por rua — versão melhorada com fallback de API
 */
function pesquisarPorRua(inputId = 'ruaBusca') {
  const input = document.getElementById(inputId);
  if (!input) return;

  const termo = input.value.trim();
  if (termo.length < 3) return;
  const partesEndereco = typeof nlEnderecoPartes === 'function' ? nlEnderecoPartes(termo) : { busca: termo, numero: '', ruaBase: termo };

  let lat = input.dataset.lat;
  let lon = input.dataset.lon;

  if (!lat || !lon) {
    mostrarToast('Buscando localização...', 'info', 1500);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&limit=1&q=${encodeURIComponent(partesEndereco.busca)}`)
      .then(res => res.json())
      .then(data => {
        if (!data || data.length === 0) {
          mostrarToast('Endereço não encontrado. Tente com mais detalhes.', 'aviso');
          return;
        }
        const info = formatarEnderecoNominatim(data[0]);
        input.dataset.lat = data[0].lat;
        input.dataset.lon = data[0].lon;
        input.dataset.rua = info.road || info.principal;
        input.dataset.bairro = info.neighbourhood;
        input.dataset.cidade = info.city;
        const enderecoLegivel = info.road ? `${info.road}, ${info.neighbourhood || info.city}` : info.principal;
        input.value = partesEndereco.numero ? `${enderecoLegivel}, ${partesEndereco.numero}` : enderecoLegivel;
        pesquisarPorRua(inputId);
      }).catch(() => mostrarToast('Erro de conexão.', 'erro'));
    return;
  }

  // Ordenar unidades por distância
  const unidadesOrdenadas = NL_UNIDADES_GEO.map(u => {
    return { ...u, distanciaKm: calcularDistanciaKm(lat, lon, u.lat, u.lon) };
  }).sort((a, b) => parseFloat(a.distanciaKm) - parseFloat(b.distanciaKm));

  const enderecoFinal = input.value.trim() || partesEndereco.busca;

  const grid = document.getElementById('unidadesDisponiveis') || document.getElementById('resultadoCep');
  if (grid) {
    grid.classList.remove('hidden');
    
    let html = '';
    if (grid.id === 'resultadoCep') {
      html = `
        <div class="nl-resultado-endereco">
          <div class="nl-seu-endereco">
            <span>📍</span>
            <div>
              <strong>Seu endereço:</strong>
              <span>${nlSafeText(enderecoFinal)}</span>
            </div>
          </div>
          <div class="nl-unidades-resultado">
            ${unidadesOrdenadas.map((u, i) => `
              <div class="nl-unidade-dist ${i === 0 ? 'recomendada' : ''}">
                <div class="nl-dist-badge">${u.distanciaKm} km</div>
                <div>
                  <strong>${u.nome}</strong>
                  <small>${u.endereco}</small>
                </div>
                ${i === 0 ? '<span class="nl-tag-rec">Mais próxima</span>' : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
      const mapaIframe = document.getElementById('mapaIframe');
      const mapaBox = document.getElementById('mapaBox');
      if (mapaIframe && mapaBox) {
        mapaIframe.src = `https://maps.google.com/maps?q=${unidadesOrdenadas[0].lat},${unidadesOrdenadas[0].lon}&z=15&output=embed`;
        mapaBox.classList.remove('hidden');
      }
    } else {
      html = unidadesOrdenadas.map((u, i) => `
        <div class="unidade-card ${i === 0 ? 'recomendada' : ''}" onclick="selecionarUnidade('${u.nome.replace(/'/g,"\\'")}', '${u.endereco.replace(/'/g,"\\'")}')">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <span class="nl-dist-badge">${u.distanciaKm} km</span>
            <strong>${u.nome}</strong>
            ${i === 0 ? '<span class="nl-tag-rec">Recomendada</span>' : ''}
          </div>
          <small>${u.endereco}</small>
          <div class="tags" style="margin-top:8px;">
            ${u.coberturas.map(c => `<span class="tag">${c}</span>`).join('')}
          </div>
        </div>
      `).join('');
    }
    grid.innerHTML = html;
    grid.style.animation = 'fadeInUp .3s ease';
  }
}

// Inicializar Autocomplete nos campos relevantes assim que carregar
document.addEventListener('DOMContentLoaded', () => {
  initWazeAutocomplete('ruaBusca');
  initWazeAutocomplete('agRua');
});
