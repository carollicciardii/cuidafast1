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

  function closeDropdown() {
    if (!dropdown) return;
    dropdown.classList.remove("open");
    if (profileBtn) profileBtn.setAttribute("aria-expanded", "false");
  }

  function toggleDropdown() {
    if (!dropdown) return;
    const isOpen = dropdown.classList.toggle("open");
    if (profileBtn) profileBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  if (profileBtn && dropdownMenu && dropdown) {
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    document.addEventListener("click", (event) => {
      if (!dropdown.contains(event.target)) {
        closeDropdown();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDropdown();
    });
  }

  // Configurar navegação - Notificações
  const notificationBtn = document.getElementById("notificationBtn");
  if (notificationBtn) {
    notificationBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = 'solicitacoesServicos.html';
    });
  }

  // Configurar navegação - Mensagens
  const messageBtn = document.getElementById("messageBtn");
  if (messageBtn) {
    messageBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = 'mensagens.html';
    });
  }

  // Atualizar badges de notificação e mensagem ao carregar
  atualizarBadgesHeader();
  
  // Atualizar badges periodicamente (a cada 30 segundos)
  setInterval(atualizarBadgesHeader, 30000);
});

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
    
    // Fallback: verificar notificações no DOM (se estiver na página de notificações)
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

// Exportar funções para uso global (compatibilidade com dashboard-cuidador.js)
if (typeof window !== 'undefined') {
  window.atualizarBadgesHeader = atualizarBadgesHeader;
  window.atualizarBadgeNotificacoes = atualizarBadgeNotificacoes;
  window.atualizarBadgeMensagens = atualizarBadgeMensagens;
  window.ocultarBadges = ocultarBadges;
}
