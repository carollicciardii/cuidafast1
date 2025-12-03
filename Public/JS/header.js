document.addEventListener("DOMContentLoaded", () => {
  const dropdown = document.getElementById("userProfileDropdown");
  const profileBtn = document.getElementById("userProfileBtn");
  const dropdownMenu = document.getElementById("profileDropdownMenu");

  /**
   * Atualiza o link da logo baseado no tipo de usuário
   * Cliente -> homeCliente.html
   * Cuidador -> dashboard-cuidador.html
   */
  function updateLogoLink() {
    try {
      const userData = localStorage.getItem('cuidafast_user');
      if (!userData) {
        // Se não estiver logado, manter link padrão ou redirecionar para index
        const logoLink = document.querySelector('.logo-link');
        if (logoLink && !logoLink.href.includes('index.html')) {
          // Se estiver em uma página HTML, pode manter o link atual ou redirecionar para index
          const currentPath = window.location.pathname;
          if (currentPath.includes('HTML')) {
            logoLink.href = '../../index.html';
          }
        }
        return;
      }

      const user = JSON.parse(userData);
      const logoLink = document.querySelector('.logo-link') || document.getElementById('logoLink');
      
      if (!logoLink) return;

      // Determinar o caminho correto baseado na localização atual
      const currentPath = window.location.pathname;
      let pathPrefix = '';
      
      if (currentPath.includes('/HTML/')) {
        pathPrefix = '';
      } else if (currentPath.includes('index.html') || currentPath === '/' || currentPath.endsWith('/')) {
        // estamos na raiz (index em Public) -> páginas HTML ficam em /HTML
        pathPrefix = 'HTML/';
      } else {
        // outras páginas fora de /HTML usam caminho relativo
        pathPrefix = '../HTML/';
      }

      // Atualizar link baseado no tipo de usuário
      // Não redirecionar, apenas atualizar o link da logo
      if (user.tipo === 'cuidador') {
        logoLink.href = pathPrefix + 'dashboard-cuidador.html';
        console.log('[Header] Logo atualizada para dashboard-cuidador.html');
      } else if (user.tipo === 'cliente') {
        logoLink.href = pathPrefix + 'homeCliente.html';
        console.log('[Header] Logo atualizada para homeCliente.html');
      } else {
        // Tipo desconhecido, manter link padrão (não redirecionar)
        console.warn('[Header] Tipo de usuário desconhecido:', user.tipo);
        // Manter o link atual ou usar homeCliente como padrão
        logoLink.href = pathPrefix + 'homeCliente.html';
      }
    } catch (error) {
      console.error('[Header] Erro ao atualizar link da logo:', error);
    }
  }

  // Atualizar link da logo ao carregar
  updateLogoLink();

  // Atualizar informações do usuário no header
  atualizarInformacoesUsuario();

  function closeDropdown() {
    if (!dropdown) return;
    dropdown.classList.remove("open");
    dropdown.classList.remove("active");
    if (profileBtn) profileBtn.setAttribute("aria-expanded", "false");
  }

  function toggleDropdown() {
    if (!dropdown) return;
    const isOpen = dropdown.classList.toggle("open");
    dropdown.classList.toggle("active", isOpen);
    if (profileBtn) profileBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  if (profileBtn && dropdownMenu && dropdown) {
    // Verificar se já existe um handler (evitar duplicação)
    if (!profileBtn.hasAttribute('data-header-handler')) {
      profileBtn.setAttribute('data-header-handler', 'true');
      
      profileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleDropdown();
      });

      // Prevenir fechamento ao clicar dentro do dropdown
      dropdown.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      // Fechar dropdown ao clicar fora
      document.addEventListener("click", (event) => {
        if (!dropdown.contains(event.target)) {
          closeDropdown();
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeDropdown();
      });
    }
  }

  // Configurar navegação - Notificações
  const notificationBtn = document.getElementById("notificationBtn");
  if (notificationBtn) {
    // Sempre controlar via JS para diferenciar cliente x cuidador
    notificationBtn.addEventListener("click", (e) => {
      e.preventDefault();

      let userType = 'cliente';
      try {
        const userData = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');
        if (userData && userData.tipo) {
          userType = userData.tipo;
        }
      } catch (err) {
        console.warn('[Header] Não foi possível ler tipo de usuário para notificações', err);
      }

      const currentPath = window.location.pathname;
      const pathPrefix = currentPath.includes('/HTML/') ? '' : 'HTML/';

      if (userType === 'cuidador') {
        // Cuidador: ir para solicitações de serviços
        window.location.href = pathPrefix + 'solicitacoesServicos.html';
      } else {
        // Cliente (padrão): ir para página de notificações
        window.location.href = pathPrefix + 'notificacao.html';
      }
    });
  }

  // Configurar navegação - Mensagens
  const messageBtn = document.getElementById("messageBtn");
  if (messageBtn) {
    // Se já é um link com href, deixar o comportamento padrão funcionar
    if (messageBtn.tagName === 'A' && messageBtn.href) {
      // Link já configurado, não precisa de event listener
      console.log('[Header] Botão de mensagem é um link:', messageBtn.href);
    } else {
      // Se for um botão, adicionar comportamento de navegação
      messageBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const currentPath = window.location.pathname;
        const pathPrefix = currentPath.includes('/HTML/') ? '' : 'HTML/';
        window.location.href = pathPrefix + 'mensagens.html';
      });
    }
  }

  // Configurar logout padronizado
  configurarLogout();

  // Atualizar badges de notificação e mensagem ao carregar
  atualizarBadgesHeader();
  
  // Atualizar badges periodicamente (a cada 30 segundos)
  setInterval(atualizarBadgesHeader, 30000);
});

/**
 * Configurar logout padronizado em todas as páginas
 * Suporta popup de confirmação e logout direto
 */
function configurarLogout() {
  const logoutBtn = document.getElementById('headerLogoutBtn');
  const confirmLogoutBtn = document.getElementById('confirmLogout');
  const cancelLogoutBtn = document.getElementById('cancelLogout');
  const logoutPopup = document.getElementById('logoutPopup');

  // Se houver popup de confirmação, usar ele
  if (logoutPopup && confirmLogoutBtn && cancelLogoutBtn) {
    // Abrir popup quando clicar no botão de logout
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        logoutPopup.classList.add('active');
      });
    }

    // Confirmar logout
    confirmLogoutBtn.addEventListener('click', function() {
      handleLogout();
    });

    // Cancelar logout
    cancelLogoutBtn.addEventListener('click', function() {
      logoutPopup.classList.remove('active');
    });

    // Fechar popup ao clicar fora
    logoutPopup.addEventListener('click', function(e) {
      if (e.target === logoutPopup) {
        logoutPopup.classList.remove('active');
      }
    });
  } else if (logoutBtn) {
    // Se não houver popup, usar confirmação nativa do navegador
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleLogout();
    });
  }
}

/**
 * Função padronizada de logout
 * Limpa todos os dados do usuário e redireciona para index
 */
function handleLogout() {
  // Confirmar logout
  if (!confirm('Tem certeza que deseja sair?')) {
    return;
  }

  // Limpar todos os dados do usuário
  localStorage.removeItem('cuidafast_user');
  localStorage.removeItem('cuidafast_isLoggedIn');
  localStorage.removeItem('cuidafast_token');
  localStorage.removeItem('userData');
  localStorage.removeItem('userType');
  
  sessionStorage.removeItem('cuidafast_user');
  sessionStorage.removeItem('cuidafast_token');
  sessionStorage.removeItem('userData');
  sessionStorage.removeItem('userType');

  // Fechar popup se existir
  const logoutPopup = document.getElementById('logoutPopup');
  if (logoutPopup) {
    logoutPopup.classList.remove('active');
  }

  // Redirecionar para página inicial
  const currentPath = window.location.pathname;
  let redirectPath = '../../index.html';
  
  if (currentPath.includes('/HTML/')) {
    redirectPath = '../../index.html';
  } else if (currentPath.includes('index.html') || currentPath === '/' || currentPath.endsWith('/')) {
    redirectPath = 'index.html';
  }
  
  window.location.href = redirectPath;
}

/**
 * Atualizar badges de notificação e mensagem no header
 * Só mostra os badges quando realmente houver notificações/mensagens
 */
async function atualizarBadgesHeader() {
  try {
    const userData = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');
    
    // Usar id ou usuario_id dependendo do formato
    const userId = userData.id || userData.usuario_id;
    
    if (!userId) {
      console.log('[Header] Usuário não autenticado, ocultando badges');
      ocultarBadges();
      return;
    }

    // Atualizar badge de notificações
    await atualizarBadgeNotificacoes(userId);
    
    // Atualizar badge de mensagens
    await atualizarBadgeMensagens(userId);
    
  } catch (error) {
    console.error('[Header] Erro ao atualizar badges:', error);
    ocultarBadges();
  }
}

/**
 * Atualizar badge de notificações
 */
async function atualizarBadgeNotificacoes(userId) {
  try {
    let unreadCount = 0;
    
    // Tentar buscar notificações não lidas da API
    try {
      const API_URL = window.API_CONFIG?.NOTIFICACOES || "/api/notificacoes";
      const response = await fetch(`${API_URL}/usuario/${userId}/nao-lidas`);
      
      if (response.ok) {
        const data = await response.json();
        unreadCount = data.count || data.total || 0;
      }
    } catch (apiError) {
      // API não disponível, usar fallback
      console.log('[Header] API de notificações não disponível, usando fallback');
    }
    
    // Fallback: verificar serviços pendentes (específico para dashboard de cuidador)
    if (unreadCount === 0 && typeof ServicosManager !== 'undefined') {
      const userData = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');
      if (userData.email) {
        const stats = ServicosManager.getEstatisticasCuidador(userData.email);
        unreadCount = stats.servicosPendentes || 0;
      }
    }
    
    // Fallback adicional: verificar notificações no DOM (se estiver na página de notificações)
    if (unreadCount === 0) {
      const notificationItems = document.querySelectorAll('.notification-item.unread');
      unreadCount = notificationItems.length;
    }
    
    // Atualizar todos os badges de notificação no header
    const notificationBadges = document.querySelectorAll('.notification-badge');
    notificationBadges.forEach(badge => {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    });
    
    console.log('[Header] Badge de notificações atualizado:', unreadCount);
    
  } catch (error) {
    console.error('[Header] Erro ao atualizar badge de notificações:', error);
    // Em caso de erro, ocultar os badges
    const notificationBadges = document.querySelectorAll('.notification-badge');
    notificationBadges.forEach(badge => {
      badge.style.display = 'none';
    });
  }
}

/**
 * Atualizar badge de mensagens
 */
async function atualizarBadgeMensagens(userId) {
  try {
    let unreadCount = 0;
    
    // Tentar buscar conversas do usuário para contar mensagens não lidas
    try {
      const API_URL = window.API_CONFIG?.MENSAGENS || "/api/mensagens";
      const response = await fetch(`${API_URL}/conversas/${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        const conversas = data.conversas || data || [];
        
        // Somar mensagens não lidas de todas as conversas
        unreadCount = conversas.reduce((total, conversa) => {
          return total + (conversa.mensagens_nao_lidas || conversa.unread_count || 0);
        }, 0);
      }
    } catch (apiError) {
      // API não disponível, usar fallback
      console.log('[Header] API de mensagens não disponível, usando fallback');
    }
    
    // Fallback: verificar se há conversas no localStorage
    if (unreadCount === 0) {
      try {
        const conversas = JSON.parse(localStorage.getItem('cuidafast_conversas') || '[]');
        unreadCount = conversas.reduce((total, conversa) => {
          return total + (conversa.mensagens_nao_lidas || conversa.unread_count || 0);
        }, 0);
      } catch (e) {
        // Não há conversas no localStorage
      }
    }
    
    // Atualizar todos os badges de mensagem no header
    const messageBadges = document.querySelectorAll('.message-badge');
    messageBadges.forEach(badge => {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    });
    
    console.log('[Header] Badge de mensagens atualizado:', unreadCount);
    
  } catch (error) {
    console.error('[Header] Erro ao atualizar badge de mensagens:', error);
    // Em caso de erro, ocultar os badges
    const messageBadges = document.querySelectorAll('.message-badge');
    messageBadges.forEach(badge => {
      badge.style.display = 'none';
    });
  }
}

/**
 * Ocultar todos os badges
 */
function ocultarBadges() {
  const notificationBadges = document.querySelectorAll('.notification-badge');
  const messageBadges = document.querySelectorAll('.message-badge');
  
  notificationBadges.forEach(badge => {
    badge.style.display = 'none';
  });
  
  messageBadges.forEach(badge => {
    badge.style.display = 'none';
  });
}

/**
 * Atualizar informações do usuário no header (nome, avatar, etc)
 */
function atualizarInformacoesUsuario() {
  try {
    const userData = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');
    
    if (!userData || !userData.nome) {
      console.log('[Header] Nenhum usuário logado');
      return;
    }

    // Atualizar nome no header
    const headerUserName = document.getElementById('headerUserName');
    if (headerUserName) {
      const primeiroNome = userData.primeiroNome || userData.nome.split(' ')[0];
      headerUserName.textContent = primeiroNome;
    }

    // Atualizar nome no dropdown
    const dropdownUserName = document.getElementById('dropdownUserName');
    if (dropdownUserName) {
      dropdownUserName.textContent = userData.nome;
    }

    // Atualizar tipo de conta no dropdown
    const dropdownUserType = document.getElementById('dropdownUserType') || document.querySelector('.dropdown-user-info p');
    if (dropdownUserType && userData.tipo) {
      if (userData.tipo === 'cuidador') {
        dropdownUserType.textContent = 'Conta Profissional';
      } else if (userData.tipo === 'cliente') {
        dropdownUserType.textContent = 'Conta Cliente';
      }
    }

    // Atualizar links do dropdown baseado no tipo de usuário
    const userType = userData.tipo || 'cliente';
    const dropdownPerfilLink = document.getElementById('dropdownPerfilLink');
    const dropdownHistoricoLink = document.getElementById('dropdownHistoricoLink');
    const dropdownHistoricoText = document.getElementById('dropdownHistoricoText');
    
    if (userType === 'cuidador') {
      // Configurar para cuidador
      if (dropdownPerfilLink) dropdownPerfilLink.href = 'perfilCuidador.html';
      if (dropdownHistoricoText) dropdownHistoricoText.textContent = 'Histórico';
      if (dropdownHistoricoLink) dropdownHistoricoLink.href = '#';
    } else {
      // Configurar para cliente
      if (dropdownPerfilLink) dropdownPerfilLink.href = 'perfilCliente.html';
      if (dropdownHistoricoText) dropdownHistoricoText.textContent = 'In-time';
      if (dropdownHistoricoLink) dropdownHistoricoLink.href = 'contratarInTime.html';
    }

    // Atualizar foto do perfil
    if (userData.photoURL || userData.foto_perfil) {
      const foto = userData.photoURL || userData.foto_perfil;
      const headerAvatar = document.querySelector('.user-avatar-img') || document.getElementById('headerUserAvatar');
      const dropdownAvatar = document.querySelector('.dropdown-avatar') || document.getElementById('dropdownUserAvatar');
      
      if (headerAvatar) headerAvatar.src = foto;
      if (dropdownAvatar) dropdownAvatar.src = foto;
    }

    console.log('[Header] Informações do usuário atualizadas');
  } catch (error) {
    console.error('[Header] Erro ao atualizar informações do usuário:', error);
  }
}

// Exportar funções para uso global (compatibilidade com dashboard-cuidador.js e outras páginas)
if (typeof window !== 'undefined') {
  window.atualizarBadgesHeader = atualizarBadgesHeader;
  window.atualizarBadgeNotificacoes = atualizarBadgeNotificacoes;
  window.atualizarBadgeMensagens = atualizarBadgeMensagens;
  window.ocultarBadges = ocultarBadges;
  window.atualizarInformacoesUsuario = atualizarInformacoesUsuario;
  window.handleLogout = handleLogout;
  window.configurarLogout = configurarLogout;
}
