// ===== CUIDA FAST - FUNCIONALIDADES DO CLIENTE =====

// Aguardar carregamento do DOM
document.addEventListener('DOMContentLoaded', function() {
    initClientDashboard();
});

// Inicializar dashboard do cliente
function initClientDashboard() {
    initSidebar();
    initUserMenu();
    initNotifications();
    initModals();
    initSearch();
    initQuickActions();
    
    console.log('Client - Dashboard do cliente inicializado');
}

// ===== SIDEBAR =====
function initSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const userAvatar = document.getElementById('user-avatar'); // <-- peguei o bonequinho aqui
    
    if (sidebarToggle && sidebar && mainContent && userAvatar) {
        // Toggle sidebar
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
            mainContent.classList.toggle('sidebar-open');

            if (sidebar.classList.contains('open')) {
                userAvatar.style.display = "none";   // esconde quando abre
            } else {
                userAvatar.style.display = "block";  // mostra quando fecha
            }
        });
        
        // Fechar sidebar ao clicar fora (mobile)
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 992) {
                if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                    mainContent.classList.remove('sidebar-open');
                    userAvatar.style.display = "block"; // mostra de volta
                }
            }
        });
        
        // Auto-abrir sidebar em desktop
        function handleResize() {
            if (window.innerWidth > 992) {
                sidebar.classList.add('open');
                mainContent.classList.add('sidebar-open');
                userAvatar.style.display = "none"; // já esconde no desktop
            } else {
                sidebar.classList.remove('open');
                mainContent.classList.remove('sidebar-open');
                userAvatar.style.display = "block"; // mostra no mobile
            }
        }
        
        window.addEventListener('resize', handleResize);
        handleResize(); // Executar na inicialização
    }
}

// ===== FILTRAGEM DE CARDS VIA HEADER SEARCH =====
(function(){
  // Funções auxiliares
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  }

  function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let starsHTML = '';
    
    for (let i = 0; i < fullStars; i++) {
      starsHTML += '<i class="ph-fill ph-star"></i>';
    }
    if (hasHalfStar) {
      starsHTML += '<i class="ph ph-star-half"></i>';
    }
    for (let i = Math.ceil(rating); i < 5; i++) {
      starsHTML += '<i class="ph ph-star"></i>';
    }
    return starsHTML;
  }

  function normalize(text){
    return (text||'').toString().toLowerCase().trim();
  }

  const headerSearch = document.getElementById('headerSearch');
  const searchBtn = document.querySelector('.search-btn');
  const mobileSearch = document.querySelector('.mobile-search-input');
  const container = document.querySelector('.containerzin') || document.getElementById('main-content') || document.body;

  // Carregar cuidadores cadastrados do localStorage (fallback)
  function loadRegisteredCaregiversFromLocalStorage() {
    const usuarios = localStorage.getItem('cuidafast_usuarios');
    let cuidadores = [];
    
    if (usuarios) {
      try {
        const listaUsuarios = JSON.parse(usuarios);
        // Filtrar apenas usuários do tipo 'cuidador'
        cuidadores = listaUsuarios
          .filter(u => u.tipo === 'cuidador')
          .map(c => ({
            name: c.nome || 'Cuidador',
            specialty: c.especialidade || c.tipoCuidador || 'Cuidador Geral',
            bio: c.bio || c.descricao || `Cuidador profissional com experiência em ${c.especialidade || 'cuidados gerais'}.`,
            rating: c.rating || (4.5 + Math.random() * 0.5), // Rating entre 4.5 e 5.0
            reviews: c.reviews || Math.floor(Math.random() * 100) + 50,
            email: c.email,
            telefone: c.telefone,
            endereco: c.endereco,
            photoURL: c.photoURL || null
          }));
        
        console.log(`[HomeCliente] ${cuidadores.length} cuidadores cadastrados carregados do localStorage`);
      } catch (error) {
        console.error('[HomeCliente] Erro ao carregar cuidadores do localStorage:', error);
      }
    }
    
    return cuidadores;
  }

  // Dataset inicial (pode ser sobrescrito depois pela API de perfis)
  const REGISTERED_CAREGIVERS = loadRegisteredCaregiversFromLocalStorage();

  // Estado de paginação e filtro
  let caregiversState = {
    items: REGISTERED_CAREGIVERS.slice(), // cópia inicial
    page: 0,
    perPage: 4,
    filtered: null
  };

  window.allCaregivers = caregiversState.items.slice();

  /**
   * Renderiza o próximo "lote" de cuidadores no container principal.
   * Se reset === true, começa da página 0 e limpa o container.
   */
  function renderNextPage(reset = false) {
    const containerEl = document.getElementById('caregiversContainer');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const caregiversHeader = document.getElementById('caregiversHeader');

    if (!containerEl) {
      console.warn('[HomeCliente] Container de cuidadores (#caregiversContainer) não encontrado');
      return;
    }

    const list = caregiversState.filtered || caregiversState.items || [];

    if (reset) {
      caregiversState.page = 0;
      containerEl.innerHTML = '';
    }

    const start = caregiversState.page * caregiversState.perPage;
    const end = start + caregiversState.perPage;
    const slice = list.slice(start, end);

    // Nada para renderizar
    if (slice.length === 0 && !reset) {
      if (loadMoreBtn) {
        loadMoreBtn.style.display = 'none';
      }
      return;
    }

    slice.forEach(c => {
      const card = renderCard(c);
      containerEl.appendChild(card);
    });

    caregiversState.page += 1;

    // Atualizar header de cuidadores
    if (caregiversHeader) {
      caregiversHeader.style.display = list.length > 0 ? '' : 'none';
    }

    // Controlar botão de "Carregar mais"
    if (loadMoreBtn) {
      if (end >= list.length) {
        loadMoreBtn.style.display = 'none';
      } else {
        loadMoreBtn.style.display = '';
      }
    }
  }

  function renderCard(c) {
    const div = document.createElement('div');
    div.className = 'card';
    const hasPhoto = Boolean(c.photoURL);
    const priceTag = c.valorHora ? `<span class="price-badge"><i class="ph ph-currency-circle-dollar" aria-hidden="true"></i> ${formatCurrency(c.valorHora)}/h</span>` : '';
    const specialtyTag = c.specialty ? `<span class="specialty-badge"><i class="ph ph-heartbeat" aria-hidden="true"></i> ${escapeHtml(c.specialty)}</span>` : '';
    const locationTag = c.location ? `<div class="caregiver-location"><i class="ph ph-map-pin" aria-hidden="true"></i> ${escapeHtml(c.location)}</div>` : '';
    div.innerHTML = `
      <div class="icon">
        ${hasPhoto 
          ? `<img src="${escapeHtml(c.photoURL)}" alt="${escapeHtml(c.name)}" class="caregiver-photo" style="width:64px;height:64px;border-radius:12px;object-fit:cover;border:2px solid #E5EFF4;" />`
          : `<i class="ph ph-user" style="font-size:40px;color:#1B475D"></i>`}
      </div>
      <h3>${escapeHtml(c.name)}</h3>
      <div class="caregiver-meta">
        ${specialtyTag}
        ${priceTag}
      </div>
      <p>${escapeHtml(c.bio)}</p>
      ${locationTag}
      <div style="display:flex;align-items:center;gap:8px;margin:12px 0;">
        <div style="display:flex;color:#FAD564">
          ${renderStars(c.rating)}
        </div>
        <span style="font-size:14px;color:#666;">${c.rating} (${c.reviews} avaliações)</span>
      </div>
      <a href="#" class="btn primary view-profile-btn" data-caregiver="${escapeHtml(c.name)}" style="margin-top:16px;">Ver Perfil</a>
    `;
    
    // Adicionar event listener ao botão Ver Perfil
    const profileBtn = div.querySelector('.view-profile-btn');
    profileBtn.addEventListener('click', function(e) {
      e.preventDefault();
      viewCaregiverProfile(c);
    });
    
    return div;
  }

  // Função para abrir perfil público do cuidador
  function viewCaregiverProfile(caregiver) {
    console.log('[HomeCliente] Abrindo perfil do cuidador:', caregiver);
    
    // Obter ID do cuidador (pode estar em diferentes campos)
    let cuidadorId = caregiver.usuario_id || caregiver.id || caregiver.userId;
    
    console.log('[HomeCliente] ID encontrado:', cuidadorId);
    
    // Se não tiver ID, tentar buscar pelo email
    if (!cuidadorId && caregiver.email) {
      console.warn('[HomeCliente] ID não encontrado, usando email como fallback:', caregiver.email);
      // Usar email como fallback temporário
      cuidadorId = caregiver.email;
    }
    
    if (!cuidadorId) {
      console.error('[HomeCliente] ID do cuidador não encontrado. Dados completos:', caregiver);
      alert('Erro: Não foi possível identificar o cuidador. Por favor, tente novamente.');
      return;
    }

    console.log('[HomeCliente] Redirecionando para perfil com ID:', cuidadorId);
    // Redirecionar para página de perfil público com o ID
    window.location.href = `perfilCuidadorPublico.html?id=${encodeURIComponent(cuidadorId)}`;
  }
  
  // Buscar cuidadores reais da API (/api/perfil/cuidadores)
  async function fetchCaregiversFromAPI() {
  try {
    // Garante apontar diretamente para o handler api/perfil/cuidadores.js
    const url =
      (window.API_CONFIG && window.API_CONFIG.CUIDADORES_URL) ||
      '/api/perfil/cuidadores';
    console.log('[HomeCliente] Buscando cuidadores reais em', url);

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    // ler body como texto para debug se não for JSON válido
    const text = await resp.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (err) {
      console.warn('[HomeCliente] Resposta não é JSON:', text);
      data = null;
    }

    if (!resp.ok) {
      console.warn('[HomeCliente] Falha ao buscar cuidadores da API:', resp.status, resp.statusText, data || text);
      // mostrar mensagem de erro no container (opcional)
      const containerEl = document.getElementById('caregiversContainer');
      if (containerEl && resp.status === 401) {
        containerEl.innerHTML = `<div class="no-results-box"><h3>Não autorizado</h3><p>Faça login novamente.</p></div>`;
      }
      return;
    }

    // Normalizar várias formas de resposta que a API pode devolver
    let apiCuidadores = [];
    if (Array.isArray(data)) {
      apiCuidadores = data;
    } else if (data && Array.isArray(data.cuidadores)) {
      apiCuidadores = data.cuidadores;
    } else if (data && Array.isArray(data.data)) {
      apiCuidadores = data.data;
    } else if (data && Array.isArray(data.rows)) {
      apiCuidadores = data.rows;
    } else if (data && typeof data === 'object' && Object.keys(data).length === 0) {
      apiCuidadores = [];
    } else {
      // fallback: tentar extrair qualquer array encontrado em valores
      const firstArray = data && Object.values(data).find(v => Array.isArray(v));
      if (firstArray) apiCuidadores = firstArray;
    }

    if (!apiCuidadores || apiCuidadores.length === 0) {
      console.warn('[HomeCliente] Nenhum cuidador retornado pela API (array vazio)');
      // caso queira, pode limpar o container e voltar a usar dados do localStorage
      // renderNextPage(true); // já é chamado abaixo se atualizar caregiversState
      return;
    }

    // Mapear campos do backend para o formato consumido pelo front
    const mapped = apiCuidadores.map(c => {
      // Mapear tipo de cuidador corretamente
      let specialty = 'Cuidador Geral';
      if (c.tipos_cuidado) {
        const tipos = Array.isArray(c.tipos_cuidado) ? c.tipos_cuidado : [c.tipos_cuidado];
        const tiposMap = {
          'idoso': 'Cuidador de Idosos',
          'pet': 'Cuidador de Pet',
          'crianca': 'Cuidador Infantil',
          'infantil': 'Cuidador Infantil'
        };
        specialty = tipos.map(t => tiposMap[t] || t).join(', ');
      } else if (c.especialidades && Array.isArray(c.especialidades)) {
        specialty = c.especialidades.join(', ');
      } else if (c.especialidade) {
        specialty = c.especialidade;
      }

      // Usar avaliação real ou 0 se não houver
      const rating = c.avaliacao || c.rating || 0;
      const reviews = c.num_avaliacoes || c.numAvaliacoes || c.totalAvaliacoes || c.reviews || 0;

      // Garantir que temos um ID válido
      const cuidId = c.id || c.usuario_id || c.userId;
      
      if (!cuidId) {
        console.warn('[HomeCliente] Cuidador sem ID:', c);
      }
      
      // Garantir que temos um nome válido (não "Usuário")
      let nomeCuidador = c.nome || c.name;
      if (!nomeCuidador || nomeCuidador === 'Usuário' || nomeCuidador.trim() === '') {
        nomeCuidador = c.primeiroNome || 'Cuidador';
      }
      
      return {
        name: nomeCuidador,
        specialty: specialty,
        bio: c.descricao || c.bio || 'Cuidador profissional disponível na sua região.',
        rating: rating,
        reviews: reviews,
        email: c.email,
        telefone: c.telefone || c.celular,
        endereco: c.local_trabalho || c.endereco || c.localidade,
        location: c.localidade || c.cidade || c.cep,
        valorHora: c.valor_hora || c.valorHora || c.preco,
        photoURL: c.foto_perfil || c.photoURL || c.foto || null,
        usuario_id: cuidId,
        id: cuidId
      };
    });

    caregiversState.items = mapped;
    caregiversState.filtered = null;
    caregiversState.page = 0;

    // salvar fallback no localStorage (mantendo compatibilidade)
    try {
      const usuariosLocal = mapped.map(c => ({
        nome: c.name,
        tipo: 'cuidador',
        especialidade: c.specialty,
        bio: c.bio,
        email: c.email,
        telefone: c.telefone,
        endereco: c.endereco,
        photoURL: c.photoURL
      }));
      localStorage.setItem('cuidafast_usuarios', JSON.stringify(usuariosLocal));
    } catch (e) {
      console.warn('[HomeCliente] Não foi possível salvar cuidadores no localStorage:', e);
    }

    renderNextPage(true);
    console.log(`[HomeCliente] ${mapped.length} cuidadores reais carregados da API`);
  } catch (error) {
    console.error('[HomeCliente] Erro ao buscar cuidadores da API:', error);
  }
}

  function filterCards(query){
    const q = normalize(query);
    // filtrar no dataset de cuidadores registrados
    const list = REGISTERED_CAREGIVERS.slice();
    const filtered = list.filter(c => ((c.name + ' ' + c.bio + ' ' + c.specialty).toLowerCase().indexOf(q) !== -1));
    caregiversState.filtered = q === '' ? null : filtered;
    // re-render a partir da página 0
    renderNextPage(true);
    const sections = Array.from(document.querySelectorAll('.servicos'));
    let anyVisible = false;

    // Hide the welcome and top service categories while searching
    const welcomeSection = document.querySelector('.welcome-section');
    const topServices = document.getElementById('serviceCategories');
    if(q !== ''){
      if(welcomeSection) welcomeSection.style.display = 'none';
      if(topServices) topServices.style.display = 'none';
      // ocultar botão carregar mais durante busca
      const loadBtnDuringSearch = document.getElementById('loadMoreBtn');
      if (loadBtnDuringSearch) {
        loadBtnDuringSearch.style.display = 'none';
      }
    } else {
      if(welcomeSection) welcomeSection.style.display = '';
      if(topServices) topServices.style.display = '';
      // restaurar botão carregar mais ao limpar busca (o renderNextPage cuidará do estado)
      const loadBtnAfterSearch = document.getElementById('loadMoreBtn');
      if (loadBtnAfterSearch) {
        loadBtnAfterSearch.style.display = '';
      }
    }

    // compute anyVisible based on rendered cards
    const rendered = Array.from(document.querySelectorAll('#caregiversContainer .card'));
    anyVisible = rendered.length > 0;
    // hide the static service sections when searching
    

    const noId = 'homeSearchNoResults';
    let no = document.getElementById(noId);

    // Mostrar/ocultar header de cuidadores
    const caregiversHeader = document.getElementById('caregiversHeader');
    if(caregiversHeader){
      caregiversHeader.style.display = anyVisible ? '' : 'none';
    }

    if(!anyVisible && q !== ''){
      if(!no){
        no = document.createElement('div');
        no.id = noId;
        no.className = 'no-results-box';
        no.innerHTML = `
          <div class="no-results-icon">
            <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
          </div>
          <div class="no-results-text">
            <h3>Nenhum cuidador encontrado</h3>
            <p>Tente outra palavra-chave ou remova filtros para ver mais resultados.</p>
          </div>
        `;
        container.prepend(no);
      }
      // adicionar classe para encurtar a página e mostrar o rodapé
      document.body.classList.add('short-page');
      // Forçar inline styles caso exista regra conflitante de min-height
      try {
        document.body.style.minHeight = 'auto';
        const mainEl = document.getElementById('main-content') || document.querySelector('main');
        if (mainEl) mainEl.style.minHeight = '60vh';
        if (container) container.style.minHeight = '60vh';
      } catch (e) {
        // ignore
      }
    } else if(no){
      no.remove();
      // remover a classe quando houver resultados
      document.body.classList.remove('short-page');
      // limpar estilos inline aplicados anteriormente
      try {
        document.body.style.minHeight = '';
        const mainEl = document.getElementById('main-content') || document.querySelector('main');
        if (mainEl) mainEl.style.minHeight = '';
        if (container) container.style.minHeight = '';
      } catch (e) {}
    }
  }

  function debounce(fn,delay){let t;return function(...a){clearTimeout(t);t=setTimeout(()=>fn.apply(this,a),delay);};}

  const deb = debounce(function(){
    const v = (headerSearch && headerSearch.value) || (mobileSearch && mobileSearch.value) || '';
    filterCards(v);
  },200);

  if(headerSearch){ headerSearch.addEventListener('input', deb); headerSearch.addEventListener('keypress', function(e){ if(e.key==='Enter'){ e.preventDefault(); filterCards(headerSearch.value); } }); }
  if(mobileSearch){ mobileSearch.addEventListener('input', deb); mobileSearch.addEventListener('keypress', function(e){ if(e.key==='Enter'){ e.preventDefault(); filterCards(mobileSearch.value); } }); }
  if(searchBtn){ searchBtn.addEventListener('click', function(){ const v = (headerSearch && headerSearch.value) || (mobileSearch && mobileSearch.value) || ''; filterCards(v); }); }

  // Função para aplicar filtros avançados
  function applyAdvancedFilters(filters) {
    console.log('[CuidaFast] Aplicando filtros avançados:', filters);
    
    const list = REGISTERED_CAREGIVERS.slice();
    let filtered = list;
    
    // Filtrar por avaliação mínima
    if (filters.rating > 0) {
      filtered = filtered.filter(c => c.rating >= filters.rating);
    }
    
    // Filtrar por especialidade (se alguma foi selecionada)
    if (filters.specialties && filters.specialties.length > 0) {
      filtered = filtered.filter(c => {
        const specialty = c.specialty.toLowerCase();
        return filters.specialties.some(s => {
          if (s === 'elderly') return specialty.includes('idoso');
          if (s === 'childcare') return specialty.includes('infantil') || specialty.includes('criança');
          if (s === 'petcare') return specialty.includes('pet');
          return false;
        });
      });
    }
    
    // Atualizar estado com filtros aplicados
    caregiversState.filtered = filtered;
    caregiversState.page = 0;
    
    // Re-renderizar
    renderNextPage(true);
    
    console.log(`[CuidaFast] ${filtered.length} cuidadores após filtros`);
  }

  // Event listener para botão "Carregar mais"
  document.addEventListener('DOMContentLoaded', function() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', function() {
        console.log('[HomeCliente] Botão "Carregar mais" clicado');
        renderNextPage(false); // false = não resetar, apenas adicionar mais
      });
    }
  });

  // Expor para console (opcional)
  window.CuidaFast = window.CuidaFast || {};
  window.CuidaFast.filterCards = filterCards;
  window.CuidaFast.applyAdvancedFilters = applyAdvancedFilters;
  window.CuidaFast.fetchCaregiversFromAPI = fetchCaregiversFromAPI;
  window.CuidaFast.renderNextPage = renderNextPage;

  // Renderizar primeira página (fallback localStorage) e depois sobrescrever com API
  renderNextPage(true);
  fetchCaregiversFromAPI();
})();

// ===== MODAL DE FILTROS (fora do IIFE para ser acessível) =====
function initFilterModal() {
  console.log('Inicializando modal de filtros...');
  
  const filterModalEl = document.getElementById('filterModal');
  const openFilterBtn = document.getElementById('openFilterBtn');
  const applyFiltersBtn = document.getElementById('applyFilters');
  const clearFiltersBtn = document.getElementById('clearFilters');
  const ratingRange = document.getElementById('ratingRange');
  const ratingValue = document.getElementById('ratingValue');
  const distanceRange = document.getElementById('distanceRange');
  const distanceValue = document.getElementById('distanceValue');
  const minPrice = document.getElementById('minPrice');
  const maxPrice = document.getElementById('maxPrice');
  
  console.log('Elementos encontrados:', {
    filterModalEl: !!filterModalEl,
    openFilterBtn: !!openFilterBtn,
    bootstrap: typeof bootstrap !== 'undefined'
  });
  
  if (!filterModalEl) {
    console.error('Modal de filtro não encontrado no DOM');
    return;
  }
  
  if (typeof bootstrap === 'undefined') {
    console.error('Bootstrap não está carregado');
    return;
  }
  
  let filterModal;
  try {
    filterModal = new bootstrap.Modal(filterModalEl);
    console.log('Modal Bootstrap criado com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar modal Bootstrap:', error);
    return;
  }
  
  // Abrir modal de filtro
  if (openFilterBtn) {
    openFilterBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Clique no botão de filtros detectado');
      try {
        filterModal.show();
        console.log('Modal.show() chamado');
      } catch (error) {
        console.error('Erro ao abrir modal:', error);
      }
    });
    console.log('Event listener adicionado ao botão de filtros');
  } else {
    console.error('Botão de filtro (#openFilterBtn) não encontrado no DOM');
  }
  
  // Atualizar valor da avaliação quando o range for alterado
  if (ratingRange && ratingValue) {
    ratingRange.addEventListener('input', function() {
      ratingValue.textContent = this.value;
      updateStars(this.value);
    });
  }
  
  // Atualizar valor da distância quando o range for alterado
  if (distanceRange && distanceValue) {
    distanceRange.addEventListener('input', function() {
      distanceValue.textContent = this.value;
    });
  }
  
  // Aplicar filtros
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', function() {
      // Coletar valores dos filtros
      const filters = {
        rating: ratingRange ? parseFloat(ratingRange.value) : 0,
        distance: distanceRange ? parseInt(distanceRange.value) : 50,
        minPrice: minPrice ? parseFloat(minPrice.value) : 0,
        maxPrice: maxPrice ? parseFloat(maxPrice.value) : 999,
        specialties: []
      };
      
      // Coletar especialidades selecionadas
      const specialtyCheckboxes = document.querySelectorAll('#filterModal input[type="checkbox"]:checked');
      specialtyCheckboxes.forEach(cb => {
        filters.specialties.push(cb.value);
      });
      
      console.log('Filtros aplicados:', filters);
      
      // Aplicar filtros aos cuidadores
      if (window.CuidaFast && typeof window.CuidaFast.applyAdvancedFilters === 'function') {
        window.CuidaFast.applyAdvancedFilters(filters);
      }
      
      // Fechar o modal
      filterModal.hide();
      
      // Mostrar notificação
      showNotification('Filtros aplicados com sucesso!');
    });
  }
  
  // Limpar filtros
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', function() {
      // Resetar todos os filtros
      if (ratingRange) ratingRange.value = 4;
      if (ratingValue) ratingValue.textContent = '4.0';
      if (distanceRange) distanceRange.value = 15;
      if (distanceValue) distanceValue.textContent = '15';
      if (minPrice) minPrice.value = '20';
      if (maxPrice) maxPrice.value = '80';
      
      // Atualizar estrelas
      updateStars(4);
      
      console.log('Filtros limpos');
    });
  }
  
  // Função para atualizar as estrelas de avaliação
  function updateStars(rating) {
    const stars = document.querySelectorAll('#filterModal .stars i');
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    stars.forEach((star, index) => {
      if (index < fullStars) {
        star.className = 'ph-fill ph-star';
      } else if (index === fullStars && hasHalfStar) {
        star.className = 'ph ph-star-half';
      } else {
        star.className = 'ph ph-star';
      }
    });
  }
  
  // Inicializar estrelas
  updateStars(ratingRange ? ratingRange.value : 4);
}


// ===== USER MENU =====

function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const userAvatarBtn = document.getElementById('userAvatarBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (userMenu && userAvatarBtn) {
        // Toggle dropdown
        userAvatarBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userMenu.classList.toggle('open');
        });
        
        // Fechar dropdown ao clicar fora
        document.addEventListener('click', function() {
            userMenu.classList.remove('open');
        });
        
        // Prevenir fechamento ao clicar dentro do dropdown
        userMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    }
}

function handleLogout() {
    if (confirm('Tem certeza que deseja sair?')) {
        // Limpar dados do usuário
        localStorage.removeItem('cuidafast_user');
        localStorage.removeItem('cuidafast_token');
        sessionStorage.removeItem('cuidafast_user');
        sessionStorage.removeItem('cuidafast_token');
        
        // Redirecionar para login
        window.location.href = '../login.html';
    }
}

// ===== NOTIFICAÇÕES =====

function initNotifications() {
    const notificationBtn = document.getElementById('notificationBtn');
    
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            window.location.href = 'notificacao.html';
        });
    }
    
    // As notificações são atualizadas automaticamente pelo header.js
    // Não precisa simular - o header.js busca notificações reais da API
}

// ===== MODAIS =====

function initModals() {
    initFindCuidadorModal();
    initFilterModal();
}

function initFindCuidadorModal() {
    const findCuidadorBtn = document.getElementById('findCuidadorBtn');
    const findCuidadorModal = document.getElementById('findCuidadorModal');
    const closeFindCuidadorModal = document.getElementById('closeFindCuidadorModal');
    const findCuidadorForm = document.getElementById('findCuidadorForm');
    
    // Abrir modal
    if (findCuidadorBtn && findCuidadorModal) {
        findCuidadorBtn.addEventListener('click', function() {
            openModal(findCuidadorModal);
            
            // Definir data mínima como hoje
            const dateInput = document.getElementById('serviceDate');
            if (dateInput) {
                const today = new Date().toISOString().split('T')[0];
                dateInput.min = today;
                dateInput.value = today;
            }
        });
    }
    
    // Fechar modal
    if (closeFindCuidadorModal && findCuidadorModal) {
        closeFindCuidadorModal.addEventListener('click', function() {
            closeModal(findCuidadorModal);
        });
    }
    
    // Processar formulário
    if (findCuidadorForm) {
        findCuidadorForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleFindCuidador();
        });
    }
}

async function handleFindCuidador() {
    const serviceType = document.getElementById('serviceType').value;
    const serviceDate = document.getElementById('serviceDate').value;
    const serviceTime = document.getElementById('serviceTime').value;
    const serviceDuration = document.getElementById('serviceDuration').value;
    
    if (!serviceType || !serviceDate || !serviceTime || !serviceDuration) {
        showAlert('Por favor, preencha todos os campos.', 'error');
        return;
    }
    
    try {
        // Simular busca de cuidadores
        showAlert('Buscando cuidadores disponíveis...', 'info');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fechar modal
        closeModal(document.getElementById('findCuidadorModal'));
        
        // Simular redirecionamento para página de resultados
        showAlert('Encontramos 12 cuidadores disponíveis! Redirecionando...', 'success');
        
        setTimeout(() => {
            // Em produção, redirecionar para página de resultados
            console.log('Redirecionando para resultados da busca...');
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao buscar cuidadores:', error);
        showAlert('Erro ao buscar cuidadores. Tente novamente.', 'error');
    }
}

// ===== BUSCA =====

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length >= 3) {
                searchTimeout = setTimeout(() => {
                    performSearch(query);
                }, 500);
            }
        });
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = this.value.trim();
                if (query.length >= 3) {
                    performSearch(query);
                }
            }
        });
    }
}

function performSearch(query) {
    console.log('Buscando por:', query);
    
    // Simular busca
    showAlert(`Buscando por "${query}"...`, 'info');
    
    // Em produção, fazer chamada à API e mostrar resultados
    setTimeout(() => {
        showAlert(`Encontrados resultados para "${query}"`, 'success');
    }, 1000);
}

// ===== AÇÕES RÁPIDAS =====

function initQuickActions() {
    const inTimeBtn = document.getElementById('inTimeBtn');
    
    if (inTimeBtn) {
        inTimeBtn.addEventListener('click', function() {
            window.location.href = 'in-time.html';
        });
    }
    
    // Inicializar outros botões de ação rápida
    initAppointmentActions();
    initCaregiverActions();
}

function initAppointmentActions() {
    // Botões de reagendar
    document.querySelectorAll('.appointment-actions .btn-outline').forEach(btn => {
        btn.addEventListener('click', function() {
            const appointmentItem = this.closest('.appointment-item');
            const caregiverName = appointmentItem.querySelector('h4').textContent;
            
            if (confirm(`Reagendar compromisso com ${caregiverName}?`)) {
                showAlert('Redirecionando para reagendamento...', 'info');
                // Em produção, redirecionar para página de reagendamento
            }
        });
    });
    
    // Botões de mensagem
    document.querySelectorAll('.appointment-actions .btn-primary').forEach(btn => {
        btn.addEventListener('click', function() {
            const appointmentItem = this.closest('.appointment-item');
            const caregiverName = appointmentItem.querySelector('h4').textContent;
            
            showAlert(`Abrindo conversa com ${caregiverName}...`, 'info');
            setTimeout(() => {
                window.location.href = 'mensagens.html';
            }, 1000);
        });
    });
}

function initCaregiverActions() {
    // Botões de contratar cuidador
    document.querySelectorAll('.caregiver-card .btn-primary').forEach(btn => {
        btn.addEventListener('click', function() {
            const caregiverCard = this.closest('.caregiver-card');
            const caregiverName = caregiverCard.querySelector('h4').textContent;
            
            showAlert(`Iniciando contratação de ${caregiverName}...`, 'info');
            
            // Simular processo de contratação
            setTimeout(() => {
                if (confirm(`Contratar ${caregiverName}?`)) {
                    showAlert('Redirecionando para contratação...', 'success');
                    // Em produção, redirecionar para página de contratação
                }
            }, 1000);
        });
    });
}

// ===== UTILITÁRIOS =====

function openModal(modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Focar no primeiro input
    const firstInput = modal.querySelector('input, select, textarea');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

function closeModal(modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

function showAlert(message, type = 'info') {
    // Usar a função global do main.js se disponível
    if (window.CuidaFast && window.CuidaFast.showAlert) {
        window.CuidaFast.showAlert(message, type);
        return;
    }
    
    // Fallback simples
    alert(message);
}

// ===== DADOS SIMULADOS =====

// Simular carregamento de dados do usuário
function loadUserData() {
    // Em produção, carregar dados reais da API
    const storedUser = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');
    const userData = {
        name: storedUser.nome || storedUser.name || 'Cliente',
        avatar: storedUser.photoURL || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
        stats: {
            appointments: 12,
            favorites: 5,
            rating: 4.8,
            spent: 1240
        }
    };
    
    return userData;
}

// Simular carregamento de atividades recentes
function loadRecentActivities() {
    return [
        {
            type: 'completed',
            title: 'Serviço concluído',
            description: 'Maria Santos cuidou da sua mãe por 4 horas',
            time: 'Há 2 horas',
            icon: 'check-circle'
        },
        {
            type: 'scheduled',
            title: 'Novo agendamento',
            description: 'Agendamento com Ana Costa para amanhã às 14h',
            time: 'Há 5 horas',
            icon: 'calendar-plus'
        },
        {
            type: 'review',
            title: 'Avaliação enviada',
            description: 'Você avaliou Carlos Oliveira com 5 estrelas',
            time: 'Ontem',
            icon: 'star'
        }
    ];
}


// ===== EXPORTAR FUNÇÕES =====

window.CuidaFastClient = {
    openModal: openModal,
    closeModal: closeModal,
    showAlert: showAlert,
    loadUserData: loadUserData,
    loadRecentActivities: loadRecentActivities,
    handleLogout: handleLogout
};

// ===== HOME CLIENTE (página específica) =====
// Código migrado do inline script de ront-end/HTML/homeCliente.html
// Mantido em namespace para evitar colisões com funções globais existentes aqui.

(function() {
  const HomeCliente = {
    async init() {
      this.initModernHeader();
      this.initSidebar();
      await this.loadUserData();
      this.initLoadMore();
      console.log('HomeCliente inicializada');
    },

    // Inicializar funcionalidades do header moderno
    initModernHeader() {
      this.initProfileDropdown();
      this.initHeaderSearch();
      this.initMobileMenu();
      this.initHeaderActions();
    },

    // Dropdown do perfil do usuário
    initProfileDropdown() {
      const profileBtn = document.getElementById('userProfileBtn');
      const profileDropdown = document.getElementById('userProfileDropdown');
      const dropdownMenu = document.getElementById('profileDropdownMenu');
      
      if (!profileBtn || !profileDropdown) return;

      // Verificar se header.js já configurou (evitar duplicação)
      if (profileBtn.hasAttribute('data-header-handler')) {
        console.log('[HomeCliente] Dropdown já configurado pelo header.js');
        return;
      }

      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('open');
        profileDropdown.classList.toggle('active');
        if (dropdownMenu) {
          dropdownMenu.classList.toggle('show');
        }
      });

      // Prevenir fechamento ao clicar dentro do dropdown
      if (profileDropdown) {
        profileDropdown.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }

      // Fechar dropdown ao clicar fora
      document.addEventListener('click', (e) => {
        if (!profileDropdown.contains(e.target)) {
          profileDropdown.classList.remove('open');
          profileDropdown.classList.remove('active');
          if (dropdownMenu) {
            dropdownMenu.classList.remove('show');
          }
        }
      });

      // Logout do header - usar função do header.js se disponível
      const headerLogoutBtn = document.getElementById('headerLogoutBtn');
      if (headerLogoutBtn && !headerLogoutBtn.hasAttribute('data-logout-handler')) {
        headerLogoutBtn.setAttribute('data-logout-handler', 'true');
        headerLogoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          // Usar handleLogout do header.js se disponível, senão usar local
          if (window.handleLogout) {
            window.handleLogout();
          } else {
            this.handleLogout();
          }
        });
      }
    },

    // Busca no header
    initHeaderSearch() {
      const headerSearch = document.getElementById('headerSearch');
      const searchBtn = document.querySelector('.search-btn');
      const mobileSearchInput = document.querySelector('.mobile-search-input');
      const mobileSearchBtn = document.querySelector('.mobile-search-btn');

      if (headerSearch) {
        headerSearch.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.performHeaderSearch(headerSearch.value);
          }
        });
      }

      if (searchBtn) {
        searchBtn.addEventListener('click', () => {
          this.performHeaderSearch(headerSearch.value);
        });
      }

      if (mobileSearchInput) {
        mobileSearchInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.performHeaderSearch(mobileSearchInput.value);
          }
        });
      }

      if (mobileSearchBtn) {
        mobileSearchBtn.addEventListener('click', () => {
          this.performHeaderSearch(mobileSearchInput.value);
        });
      }
    },

    // Menu mobile
    initMobileMenu() {
      const mobileMenuToggle = document.getElementById('mobileMenuToggle');
      const sidebar = document.getElementById('clientSidebar');
      const overlay = document.getElementById('sidebarOverlay');

      if (mobileMenuToggle && sidebar && overlay) {
        mobileMenuToggle.addEventListener('click', () => {
          sidebar.classList.add('open');
          overlay.classList.add('active');
        });
      }
    },

    // Ações do header (notificações, mensagens)
    initHeaderActions() {
      const notificationBtn = document.getElementById('notificationBtn');
      const messageBtn = document.getElementById('messageBtn');

      if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
          window.location.href = '../HTML/notificacao.html';
        });
      }

      if (messageBtn) {
        messageBtn.addEventListener('click', () => {
          window.location.href = '../HTML/mensagens.html';
        });
      }
    },

    // Busca do header
    performHeaderSearch(query) {
      if (!query || !query.trim()) {
        // resetizar filtros visuais quando a query estiver vazia
        if (window.CuidaFast && typeof window.CuidaFast.filterCards === 'function') {
          window.CuidaFast.filterCards('');
        }
        return;
      }

      console.log('Buscando por:', query);

      // Filtrar os cards já visíveis através da função comum
      if (window.CuidaFast && typeof window.CuidaFast.filterCards === 'function') {
        window.CuidaFast.filterCards(query);
      }

      // Implementar busca real aqui (opcional)
      if (window.allCaregivers) {
        const filtered = window.allCaregivers.filter(caregiver => 
          caregiver.name.toLowerCase().includes(query.toLowerCase()) ||
          caregiver.specialty.toLowerCase().includes(query.toLowerCase())
        );
        this.displayCaregivers(filtered);
      }
      
      // Feedback visual
      const searchContainer = document.querySelector('.search-container');
      if (searchContainer) {
        searchContainer.style.borderColor = 'var(--verde-escuro)';
        setTimeout(() => {
          searchContainer.style.borderColor = 'transparent';
        }, 2000);
      }
    },



    // Sidebar desta página (usa ids: menuToggle, clientSidebar, sidebarOverlay)
    initSidebar() {
      const menuToggle = document.getElementById('menuToggle');
      const sidebar = document.getElementById('clientSidebar');
      const overlay = document.getElementById('sidebarOverlay');
      if (!menuToggle || !sidebar || !overlay) return;

      menuToggle.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.add('active');
      });

      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });

      const navLinks = sidebar.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
          }
        });
      });
    },

    async loadUserData() {
      // Tenta buscar dados atualizados do banco primeiro
      let userData = null;
      if (typeof window.CuidaFastAuth !== 'undefined' && window.CuidaFastAuth.fetchUserDataFromDB) {
        userData = await window.CuidaFastAuth.fetchUserDataFromDB();
      }
      
      // Se não conseguiu buscar do banco, usa localStorage
      if (!userData) {
        try {
          userData = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');
        } catch (e) {
          userData = {};
        }
      }
      
      // Se não houver dados, redirecionar para login
      if (!userData || !userData.nome) {
        console.warn('[HomeCliente] Usuário não autenticado');
        window.location.href = '../../index.html';
        return;
      }

      const userNameEl = document.getElementById('userName');
      const welcomeNameEl = document.getElementById('welcomeName');
      const headerUserName = document.getElementById('headerUserName');
      const dropdownUserName = document.getElementById('dropdownUserName');
      
      const primeiroNome = userData.primeiroNome || userData.nome.split(' ')[0];
      
      if (userNameEl) userNameEl.textContent = userData.nome;
      if (welcomeNameEl) welcomeNameEl.textContent = primeiroNome;
      if (headerUserName) headerUserName.textContent = primeiroNome;
      if (dropdownUserName) dropdownUserName.textContent = userData.nome;
      
      // Atualizar foto do perfil (header e dropdown)
      const photoURL = userData.photoURL || userData.photo_url || userData.foto_perfil;
      if (photoURL) {
        const headerAvatar = document.querySelector('.user-avatar-img');
        const dropdownAvatar = document.querySelector('.dropdown-avatar');
        
        if (headerAvatar) headerAvatar.src = photoURL;
        if (dropdownAvatar) dropdownAvatar.src = photoURL;
        
        console.log('[HomeCliente] Foto do perfil atualizada');
      }
      
      console.log('[HomeCliente] Usuário carregado:', userData.nome);
    },

    // Função para carregar mais cuidadores
    initLoadMore() {
      const btn = document.getElementById('loadMoreBtn');
      if (!btn) return;
      
      let currentLoad = 0;
      
      btn.addEventListener('click', () => {
        console.log('Carregando mais cuidadores...');
        
        if (currentLoad === 0) {
          // Mostrar segunda seção de cuidadores
          const moreCaregivers = document.getElementById('moreCaregivers');
          if (moreCaregivers) {
            moreCaregivers.style.display = 'grid';
            moreCaregivers.classList.add('show');
          }
          currentLoad = 1;
          btn.innerHTML = 'Carregar mais cuidadores <i class="ph ph-arrow-down" aria-hidden="true"></i>';
        } else if (currentLoad === 1) {
          // Mostrar terceira seção de cuidadores
          const evenMoreCaregivers = document.getElementById('evenMoreCaregivers');
          if (evenMoreCaregivers) {
            evenMoreCaregivers.style.display = 'grid';
            evenMoreCaregivers.classList.add('show');
          }
          btn.innerHTML = 'Todos os cuidadores carregados <i class="ph ph-check" aria-hidden="true"></i>';
          btn.disabled = true;
          btn.style.opacity = '0.6';
          btn.style.cursor = 'not-allowed';
          currentLoad = 2;
        }
      });
    },


  };


  // Expor no escopo global para o onclick do botão
  window.HomeCliente = HomeCliente;

  // Inicializar ao carregar DOM, somente nesta página
  document.addEventListener('DOMContentLoaded', function() {
    // Executar somente se existir um marcador desta página
    if (document.body && document.body.classList.contains('client-home')) {
      HomeCliente.init();
      initFilterModal();
    }
  });
})();

// Função auxiliar para mostrar notificações
function showNotification(message) {
  // Criar elemento de notificação
  const notification = document.createElement('div');
  notification.className = 'custom-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: var(--azul-escuro);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    animation: slideIn 0.3s ease;
    font-family: 'Inter', sans-serif;
  `;
  
  document.body.appendChild(notification);
  
  // Remover após 3 segundos
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Adicionar animações CSS para notificações
if (!document.getElementById('notification-styles')) {
  const style = document.createElement('style');
  style.id = 'notification-styles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// ===== BOOTSTRAP TOOLTIPS E POPOVERS =====
document.addEventListener('DOMContentLoaded', function() {
  // Inicializar tooltips do Bootstrap
  if (typeof bootstrap !== 'undefined') {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
      return new bootstrap.Popover(popoverTriggerEl);
    });
  }
});

// ===== SISTEMA DE LOGOUT =====
document.addEventListener('DOMContentLoaded', function() {
  const logoutPopup = document.getElementById("logoutPopup");
  const confirmLogoutBtn = document.getElementById("confirmLogout");
  const cancelLogoutBtn = document.getElementById("cancelLogout");
  const logoutBtn = document.getElementById("headerLogoutBtn") || document.getElementById("logoutBtn");

  // Função que executa o logout real
  function handleLogout() {
    localStorage.removeItem("userData");
    localStorage.removeItem("userType");
    localStorage.removeItem("cuidafast_user");
    localStorage.removeItem("cuidafast_isLoggedIn");
    window.location.href = "../../index.html";
  }

  // Função que inicializa o botão e o pop-up
  function initLogout() {
    if (!logoutBtn || !logoutPopup) return;

    // Abre o pop-up ao clicar em "Sair"
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logoutPopup.classList.add("active");
    });

    // Confirma o logout
    if (confirmLogoutBtn) {
      confirmLogoutBtn.addEventListener("click", () => {
        handleLogout();
      });
    }

    // Cancela o logout
    if (cancelLogoutBtn) {
      cancelLogoutBtn.addEventListener("click", () => {
        logoutPopup.classList.remove("active");
      });
    }

    // Fecha o pop-up se clicar fora dele
    logoutPopup.addEventListener("click", (e) => {
      if (e.target === logoutPopup) {
        logoutPopup.classList.remove("active");
      }
    });
  }

  initLogout();
});
