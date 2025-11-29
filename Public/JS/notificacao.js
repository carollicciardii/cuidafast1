document.addEventListener('DOMContentLoaded', function() {
    initNotifications();
});

function initNotifications() {
    initFilterTabs();
    initNotificationActions();
    initNotificationMenus();
    initNotificationSettings();
    initSearch();
    initLoadMore();
    
    console.log('Notifications - Funcionalidades de notificações inicializadas');
}


function initFilterTabs() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    const notificationItems = document.querySelectorAll('.notification-item');
    const emptyState = document.getElementById('emptyState');
    
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.dataset.filter;
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            filterNotifications(filter, notificationItems, emptyState);
        });
    });
}

function filterNotifications(filter, items, emptyState) {
    let visibleCount = 0;
    
    items.forEach(item => {
        const type = item.dataset.type;
        const isUnread = item.classList.contains('unread');
        let shouldShow = false;
        
        switch (filter) {
            case 'all':
                shouldShow = true;
                break;
            case 'unread':
                shouldShow = isUnread;
                break;
            case 'appointments':
                shouldShow = type === 'appointments';
                break;
            case 'messages':
                shouldShow = type === 'messages';
                break;
            case 'payments':
                shouldShow = type === 'payments';
                break;
            case 'system':
                shouldShow = type === 'system';
                break;
        }
        
        if (shouldShow) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    if (visibleCount === 0) {
        emptyState.style.display = 'flex';
    } else {
        emptyState.style.display = 'none';
    }
    
    updateFilterCounts();
}

function updateFilterCounts() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    const notificationItems = document.querySelectorAll('.notification-item');
    
    const counts = {
        all: notificationItems.length,
        unread: document.querySelectorAll('.notification-item.unread').length,
        appointments: document.querySelectorAll('.notification-item[data-type="appointments"]').length,
        messages: document.querySelectorAll('.notification-item[data-type="messages"]').length,
        payments: document.querySelectorAll('.notification-item[data-type="payments"]').length,
        system: document.querySelectorAll('.notification-item[data-type="system"]').length
    };
    
    filterTabs.forEach(tab => {
        const filter = tab.dataset.filter;
        const countElement = tab.querySelector('.tab-count');
        if (countElement && counts[filter] !== undefined) {
            countElement.textContent = counts[filter];
        }
    });
}


function initNotificationActions() {
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', function() {
            markAllAsRead();
        });
    }

    initIndividualActions();
}

function initIndividualActions() {

    document.querySelectorAll('.notification-actions .btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            handleNotificationAction(this);
        });
    });

    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', function() {
            if (this.classList.contains('unread')) {
                markAsRead(this);
            }
        });
    });
}


function markAllAsRead() {
    const unreadItems = document.querySelectorAll('.notification-item.unread');
    
    if (unreadItems.length === 0) {
        showAlert('Todas as notificações já foram lidas.', 'info');
        return;
    }
    
    if (confirm(`Marcar ${unreadItems.length} notificações como lidas?`)) {
        unreadItems.forEach(item => {
            markAsRead(item, false);
        });
        
        updateFilterCounts();
        updateNotificationBadges();
        showAlert(`${unreadItems.length} notificações marcadas como lidas.`, 'success');
    }
}

function markAsRead(item, showMessage = true) {
    item.classList.remove('unread');
    item.classList.add('read');

    const markReadBtn = item.querySelector('.mark-read');
    const markUnreadBtn = item.querySelector('.mark-unread');
    
    if (markReadBtn) {
        markReadBtn.innerHTML = '<i class="ph ph-circle"></i> Marcar como não lida';
        markReadBtn.classList.remove('mark-read');
        markReadBtn.classList.add('mark-unread');
    }
    
    if (showMessage) {
        showAlert('Notificação marcada como lida.', 'success');
        updateFilterCounts();
        updateNotificationBadges();
    }
}

function markAsUnread(item) {
    item.classList.remove('read');
    item.classList.add('unread');

    const markUnreadBtn = item.querySelector('.mark-unread');
    
    if (markUnreadBtn) {
        markUnreadBtn.innerHTML = '<i class="ph ph-check"></i> Marcar como lida';
        markUnreadBtn.classList.remove('mark-unread');
        markUnreadBtn.classList.add('mark-read');
    }
    
    showAlert('Notificação marcada como não lida.', 'success');
    updateFilterCounts();
    updateNotificationBadges();
}

function deleteNotification(item) {
    const notificationId = item.dataset.id;
    
    if (confirm('Tem certeza que deseja excluir esta notificação?')) {
        item.classList.add('removing');
        
        setTimeout(() => {
            item.remove();
            updateFilterCounts();
            updateNotificationBadges();
            showAlert('Notificação excluída.', 'success');

            const visibleItems = document.querySelectorAll('.notification-item[style*="flex"], .notification-item:not([style])');
            if (visibleItems.length === 0) {
                document.getElementById('emptyState').style.display = 'flex';
            }
        }, 300);
    }
}



function initNotificationMenus() {
    document.querySelectorAll('.notification-menu-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleNotificationMenu(this);
        });
    });

    document.addEventListener('click', function() {
        closeAllNotificationMenus();
    });
 
    initMenuActions();
}

function toggleNotificationMenu(btn) {
    const menu = btn.closest('.notification-menu');
    const isOpen = menu.classList.contains('open');
    

    closeAllNotificationMenus();
  
    if (!isOpen) {
        menu.classList.add('open');
    }
}

function closeAllNotificationMenus() {
    document.querySelectorAll('.notification-menu').forEach(menu => {
        menu.classList.remove('open');
    });
}

function initMenuActions() {

    document.addEventListener('click', function(e) {
        if (e.target.closest('.mark-read')) {
            e.preventDefault();
            const item = e.target.closest('.notification-item');
            markAsRead(item);
            closeAllNotificationMenus();
        }
        
        if (e.target.closest('.mark-unread')) {
            e.preventDefault();
            const item = e.target.closest('.notification-item');
            markAsUnread(item);
            closeAllNotificationMenus();
        }
        
        if (e.target.closest('.delete-notification')) {
            e.preventDefault();
            const item = e.target.closest('.notification-item');
            deleteNotification(item);
            closeAllNotificationMenus();
        }
    });
}


function initNotificationSettings() {
    const settingsBtn = document.getElementById('notificationSettingsBtn');
    const settingsModal = document.getElementById('notificationSettingsModal');
    const closeSettingsModal = document.getElementById('closeNotificationSettingsModal');
    const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    const settingsForm = document.getElementById('notificationSettingsForm');

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', function() {
            openModal(settingsModal);
        });
    }
    

    if (closeSettingsModal && settingsModal) {
        closeSettingsModal.addEventListener('click', function() {
            closeModal(settingsModal);
        });
    }
    
    if (cancelSettingsBtn && settingsModal) {
        cancelSettingsBtn.addEventListener('click', function() {
            closeModal(settingsModal);
        });
    }
    

    if (settingsForm) {
        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveNotificationSettings();
        });
    }
}

function saveNotificationSettings() {
    const formData = new FormData(document.getElementById('notificationSettingsForm'));
    const settings = {};

    document.querySelectorAll('#notificationSettingsForm input[type="checkbox"]').forEach(checkbox => {
        const label = checkbox.closest('.setting-label').textContent.trim();
        settings[label] = checkbox.checked;
    });
    

    showAlert('Salvando configurações...', 'info');
    
    setTimeout(() => {

        console.log('Configurações salvas:', settings);
        
        closeModal(document.getElementById('notificationSettingsModal'));
        showAlert('Configurações salvas com sucesso!', 'success');
    }, 1000);
}


function initSearch() {
    const searchInput = document.getElementById('searchInput');
    
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim().toLowerCase();
            
            searchTimeout = setTimeout(() => {
                searchNotifications(query);
            }, 300);
        });
    }
}

function searchNotifications(query) {
    const notificationItems = document.querySelectorAll('.notification-item');
    const emptyState = document.getElementById('emptyState');
    let visibleCount = 0;
    
    if (query === '') {

        notificationItems.forEach(item => {
            item.style.display = 'flex';
            visibleCount++;
        });
    } else {

        notificationItems.forEach(item => {
            const title = item.querySelector('h3').textContent.toLowerCase();
            const content = item.querySelector('p').textContent.toLowerCase();
            
            if (title.includes(query) || content.includes(query)) {
                item.style.display = 'flex';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });
    }
    

    if (visibleCount === 0 && query !== '') {
        emptyState.style.display = 'flex';
        emptyState.querySelector('h3').textContent = 'Nenhuma notificação encontrada';
        emptyState.querySelector('p').textContent = `Não encontramos notificações para "${query}".`;
    } else if (visibleCount === 0) {
        emptyState.style.display = 'flex';
        emptyState.querySelector('h3').textContent = 'Nenhuma notificação encontrada';
        emptyState.querySelector('p').textContent = 'Você não possui notificações para o filtro selecionado.';
    } else {
        emptyState.style.display = 'none';
    }
}



function initLoadMore() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            loadMoreNotifications();
        });
    }
}

function loadMoreNotifications() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    
    // Simular loading
    loadMoreBtn.innerHTML = '<i class="ph ph-spinner"></i> Carregando...';
    loadMoreBtn.disabled = true;
    
    setTimeout(() => {
        // Simular carregamento de mais notificações
        const newNotifications = generateMockNotifications(3);
        appendNotifications(newNotifications);
        
        // Restaurar botão
        loadMoreBtn.innerHTML = '<i class="ph ph-arrow-down"></i> Carregar mais notificações';
        loadMoreBtn.disabled = false;
        
        showAlert('3 novas notificações carregadas.', 'success');
        updateFilterCounts();
    }, 1500);
}

function generateMockNotifications(count) {
    const types = ['appointments', 'messages', 'payments', 'system'];
    const notifications = [];
    
    for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const isUnread = Math.random() > 0.5;
        
        notifications.push({
            id: Date.now() + i,
            type: type,
            unread: isUnread,
            title: `Notificação ${type} ${i + 1}`,
            content: `Esta é uma notificação de exemplo do tipo ${type}.`,
            time: 'Agora mesmo'
        });
    }
    
    return notifications;
}

function appendNotifications(notifications) {
    const container = document.querySelector('.notifications-container');
    
    notifications.forEach(notification => {
        const notificationElement = createNotificationElement(notification);
        container.appendChild(notificationElement);
    });
    
    // Reinicializar eventos para novos elementos
    initIndividualActions();
    initNotificationMenus();
}

function createNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = `notification-item ${notification.unread ? 'unread' : 'read'}`;
    div.dataset.type = notification.type;
    div.dataset.id = notification.id;
    
    div.innerHTML = `
        <div class="notification-indicator"></div>
        <div class="notification-icon ${notification.type}">
            <i class="ph ph-bell"></i>
        </div>
        <div class="notification-content">
            <div class="notification-header">
                <h3>${notification.title}</h3>
                <span class="notification-time">${notification.time}</span>
            </div>
            <p>${notification.content}</p>
            <div class="notification-actions">
                <button class="btn btn-sm btn-primary">Ver detalhes</button>
            </div>
        </div>
        <div class="notification-menu">
            <button class="notification-menu-btn" aria-label="Opções">
                <i class="ph ph-dots-three-vertical"></i>
            </button>
            <div class="notification-dropdown">
                <button class="dropdown-item ${notification.unread ? 'mark-read' : 'mark-unread'}">
                    <i class="ph ph-${notification.unread ? 'check' : 'circle'}"></i>
                    Marcar como ${notification.unread ? 'lida' : 'não lida'}
                </button>
                <button class="dropdown-item delete-notification">
                    <i class="ph ph-trash"></i>
                    Excluir
                </button>
            </div>
        </div>
    `;
    
    return div;
}

// ===== ATUALIZAR BADGES =====

function updateNotificationBadges() {
    const unreadCount = document.querySelectorAll('.notification-item.unread').length;
    
    // Atualizar badge no header
    const headerBadge = document.querySelector('.notification-badge');
    if (headerBadge) {
        headerBadge.textContent = unreadCount;
        headerBadge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
    
    // Atualizar badge na sidebar
    const sidebarBadge = document.querySelector('.nav-link[href*="notificacao"] .nav-badge');
    if (sidebarBadge) {
        sidebarBadge.textContent = unreadCount;
        sidebarBadge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
}

// ===== UTILITÁRIOS =====

function openModal(modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
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
    console.log(`${type.toUpperCase()}: ${message}`);
}

// ===== INICIALIZAÇÃO =====

// Atualizar contadores na inicialização
document.addEventListener('DOMContentLoaded', function() {
    updateFilterCounts();
    updateNotificationBadges();
});

// ===== EXPORTAR FUNÇÕES =====

window.CuidaFastNotifications = {
    markAsRead: markAsRead,
    markAsUnread: markAsUnread,
    deleteNotification: deleteNotification,
    markAllAsRead: markAllAsRead,
    updateFilterCounts: updateFilterCounts,
    updateNotificationBadges: updateNotificationBadges
};
/* ===== PATCH ÚNICO — Controle de Filtros e Cor Ativa ===== */
document.addEventListener("DOMContentLoaded", () => {
  console.log("[CuidaFast] Sistema de filtros inicializado");

  const filtersContainer = document.querySelector(".notification-filters");
  const notificationList = document.getElementById("notification-list");
  if (!filtersContainer || !notificationList) return;

  // Garante que os botões de filtro funcionem visualmente e logicamente
  filtersContainer.addEventListener("click", (e) => {
    const tag = e.target.closest(".filter-tag");
    if (!tag) return;

    // Remove .active de todos e aplica só no clicado
    filtersContainer.querySelectorAll(".filter-tag").forEach(t => t.classList.remove("active"));
    tag.classList.add("active");

    // Lê o tipo de filtro
    const filter = tag.dataset.filter || "all";

    // Chama o render correspondente
    if (typeof renderNotifications === "function") {
      renderNotifications(filter);
    } else if (typeof filterNotifications === "function") {
      const items = document.querySelectorAll(".notification-card, .notification-item");
      const emptyState = document.querySelector(".no-notifications") || null;
      filterNotifications(filter, items, emptyState);
    } else {
      // Fallback básico (caso nenhuma função esteja disponível)
      document.querySelectorAll(".notification-card, .notification-item").forEach(item => {
        const isUnread = item.classList.contains("unread");
        const subtype = item.dataset.subtype || item.dataset.type || "";
        let show = false;
        switch (filter) {
          case "all": show = true; break;
          case "unread": show = isUnread; break;
          case "important": show = item.classList.contains("important"); break;
          case "system": show = subtype === "system"; break;
          case "messages": show = subtype === "messages"; break;
        }
        item.style.display = show ? "" : "none";
      });

      const hasVisible = Array.from(document.querySelectorAll(".notification-card, .notification-item"))
        .some(i => i.style.display !== "none");
      const placeholder = document.querySelector(".no-notifications");
      if (placeholder) placeholder.style.display = hasVisible ? "none" : "";
    }

    // Debug opcional
    // console.log(`Filtro ativado: ${filter}`);
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const filtersContainer = document.querySelector(".notification-filters");

  if (!filtersContainer) return;

  filtersContainer.addEventListener("click", (e) => {
    const clicked = e.target.closest(".filter-tag");
    if (!clicked) return;

    // remove o active do botão que estava selecionado
    const activeButton = filtersContainer.querySelector(".filter-tag.active");
    if (activeButton) activeButton.classList.remove("active");

    // adiciona active no botão clicado
    clicked.classList.add("active");

    // aplica o filtro correspondente
    const filter = clicked.dataset.filter || "all";
    if (typeof renderNotifications === "function") {
      renderNotifications(filter);
    }
  });
});

/* ===== PATCH ÚNICO — Controle de Filtros e Cor Ativa ===== */
document.addEventListener("DOMContentLoaded", () => {
  console.log("[CuidaFast] Sistema de filtros inicializado");

  const filtersContainer = document.querySelector(".notification-filters");
  const notificationList = document.getElementById("notification-list");
  if (!filtersContainer || !notificationList) return;

  filtersContainer.addEventListener("click", (e) => {
    const tag = e.target.closest(".filter-tag");
    if (!tag) return;

    // ---- 1️⃣ Atualiza visual do botão ativo ----
    const active = filtersContainer.querySelector(".filter-tag.active");
    if (active) active.classList.remove("active");
    tag.classList.add("active");

    // ---- 2️⃣ Aplica o filtro ----
    const filter = tag.dataset.filter || "all";

    if (typeof renderNotifications === "function") {
      renderNotifications(filter);
    } else {
      // fallback simples caso renderNotifications não exista
      document.querySelectorAll(".notification-card, .notification-item").forEach(item => {
        const isUnread = item.classList.contains("unread");
        const subtype = item.dataset.subtype || item.dataset.type || "";
        let show = false;

        switch (filter) {
          case "all": show = true; break;
          case "unread": show = isUnread; break;
          case "important": show = item.classList.contains("important"); break;
          case "system": show = subtype === "system"; break;
          case "messages": show = subtype === "messages"; break;
        }
        item.style.display = show ? "" : "none";
      });

      const anyVisible = Array.from(document.querySelectorAll(".notification-card, .notification-item"))
        .some(i => i.style.display !== "none");
      const placeholder = document.querySelector(".no-notifications");
      if (placeholder) placeholder.style.display = anyVisible ? "none" : "";
    }
  });
});
