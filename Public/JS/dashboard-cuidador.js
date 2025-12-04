// Dashboard Cuidador JavaScript - Versão Aprimorada

document.addEventListener('DOMContentLoaded', function() {
    // Carregar estatísticas reais do cuidador
    const stats = carregarEstatisticasReais();
    
    // Inicializar funcionalidades do dashboard
    initToggleValor();
    initConsultasChart();
    
    const temServicos = stats && stats.totalServicos > 0;
    
    if (temServicos) {
        // Mostrar gráficos com dados
        initCalendarHeatmap();
        initPerformanceChart();
        initServicosChart();
    } else {
        mostrarEstadoVazio();
    }
    
    // Histórico de pagamentos: aguardar integração real de pagamentos do cliente
    initHistoricoPagamentos();
    initMessageButton();
    
    // Atualizar badges de notificação e mensagem
    atualizarBadgesHeader();
    
    console.log('Dashboard do Cuidador carregado com sucesso!');
});

/**
 * Carregar estatísticas reais do cuidador
 */
function carregarEstatisticasReais() {
    const userData = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');
    
    if (!userData.email || userData.tipo !== 'cuidador') {
        console.warn('[Dashboard] Usuário não é cuidador');
        return null;
    }

    // Verificar se ServicosManager está disponível
    if (typeof ServicosManager === 'undefined') {
        console.error('[Dashboard] ServicosManager não carregado');
        return null;
    }

    // 🌟 Caso de demonstração: garantir que a conta do Cristiano tenha pelo menos 1 serviço concluído
    try {
        if (userData.nome && userData.nome.toLowerCase().includes('cristiano')) {
            seedServicoDemoParaCristiano(userData);
        }
    } catch (e) {
        console.warn('[Dashboard] Erro ao aplicar seed de serviço demo para Cristiano:', e);
    }

    // Obter estatísticas
    const stats = ServicosManager.getEstatisticasCuidador(userData.email);
    
    console.log('[Dashboard] Estatísticas carregadas:', stats);
    
    // Atualizar cards do dashboard
    atualizarCardsDashboard(stats);
    
    return stats;
}

/**
 * Cria um serviço concluído de demonstração para o cuidador "Cristiano",
 * com um pagamento realizado pela cliente "Carol", caso ainda não exista nenhum.
 */
function seedServicoDemoParaCristiano(userData) {
    if (!userData || !userData.email) return;

    const servicosExistentes = ServicosManager.getServicosCuidador(userData.email) || [];
    const jaTemConcluido = servicosExistentes.some(s => s.status === 'concluido');

    if (jaTemConcluido) {
        // Já existe pelo menos um serviço real, não precisamos criar demo
        return;
    }

    const clienteNome = 'Carol';
    const clienteEmail = 'carol@example.com';
    const tipoServico = 'idoso'; // Exemplo de tipo

    const cuidadorBackendId = userData.id || userData.usuario_id || null;
    const clienteId = null; // Desconhecido aqui, usamos apenas para fins visuais

    // Criar serviço pendente
    const servico = ServicosManager.criarServico(
        userData.email,
        clienteEmail,
        clienteNome,
        tipoServico,
        cuidadorBackendId,
        clienteId
    );

    if (!servico || !servico.id) return;

    // Aceitar e concluir o serviço com um valor fictício
    ServicosManager.aceitarServico(servico.id, userData.email);
    ServicosManager.concluirServico(servico.id, userData.email, 150.00);

    console.log('[Dashboard] Serviço de demonstração criado para Cristiano:', servico.id);
}

/**
 * Atualizar cards do dashboard com dados reais
 */
function atualizarCardsDashboard(stats) {
    // Total de serviços realizados
    const totalServicosEl = document.querySelector('.metric-value');
    if (totalServicosEl && totalServicosEl.closest('.dashboard-card')?.querySelector('.metric-label')?.textContent.includes('mês')) {
        totalServicosEl.textContent = stats.servicosConcluidos || 0;
    }

    // Valor arrecadado
    const valorArrecadadoEl = document.getElementById('valorArrecadado')?.querySelector('.real-value');
    if (valorArrecadadoEl) {
        const valorFormatado = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(stats.receitaTotal || 0);
        valorArrecadadoEl.textContent = valorFormatado;
    }

    // Média de avaliações
    const avaliacoesEl = document.querySelector('.metric-value');
    const cards = document.querySelectorAll('.dashboard-card');
    cards.forEach(card => {
        const label = card.querySelector('.metric-label');
        if (label && label.textContent.includes('Avaliação')) {
            const metricValue = card.querySelector('.metric-value');
            if (metricValue) {
                metricValue.textContent = stats.mediaAvaliacoes || '0.0';
            }
        }
    });

    // Atualizar badge de total de avaliações
    const totalAvaliacoesEl = document.querySelector('.metric-badge');
    if (totalAvaliacoesEl) {
        totalAvaliacoesEl.textContent = `${stats.totalAvaliacoes || 0} avaliações`;
    }

    console.log('[Dashboard] Cards atualizados com estatísticas reais');
}

/**
 * Mostrar estado vazio quando não há serviços
 */
function mostrarEstadoVazio() {
    // Ocultar canvas dos gráficos
    const performanceChart = document.getElementById('performanceChart');
    const servicosChart = document.getElementById('servicosChart');
    
    if (performanceChart) {
        performanceChart.classList.add('hidden');
        const emptyState = document.getElementById('performanceEmpty');
        if (emptyState) emptyState.style.display = 'flex';
    }
    
    if (servicosChart) {
        servicosChart.classList.add('hidden');
        const emptyState = document.getElementById('servicosEmpty');
        if (emptyState) emptyState.style.display = 'flex';
    }
    
    // Manter o estado vazio do heatmap (já está no HTML)
    console.log('[Dashboard] Estado vazio exibido - nenhum serviço realizado');
}

// Função para inicializar o botão de mensagens
function initMessageButton() {
    const messageBtn = document.getElementById('messageBtn');
    
    if (messageBtn) {
        messageBtn.addEventListener('click', function() {
            window.location.href = '../HTML/mensagens.html';
        });
    }
}

/**
 * Atualizar badges de notificação e mensagem no header
 * Usa as funções do header.js (carregado antes deste arquivo)
 * Se header.js não estiver disponível, define funções locais como fallback
 */
async function atualizarBadgesHeader() {
    // Se header.js já definiu a função, usar ela
    if (window.atualizarBadgesHeader && window.atualizarBadgesHeader !== atualizarBadgesHeader) {
        return window.atualizarBadgesHeader();
    }
    
    // Fallback local (caso header.js não esteja carregado)
    try {
        const userData = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');
        
        if (!userData.id && !userData.usuario_id) {
            console.warn('[Dashboard] Usuário não autenticado, não é possível atualizar badges');
            if (window.ocultarBadges) {
                window.ocultarBadges();
            }
            return;
        }

        const userId = userData.id || userData.usuario_id;
        
        // Usar funções do header.js se disponíveis
        if (window.atualizarBadgeNotificacoes && window.atualizarBadgeMensagens) {
            await window.atualizarBadgeNotificacoes(userId);
            await window.atualizarBadgeMensagens(userId);
        } else {
            // Fallback local
            await atualizarBadgeNotificacoes(userId);
            await atualizarBadgeMensagens(userId);
        }
        
    } catch (error) {
        console.error('[Dashboard] Erro ao atualizar badges:', error);
        if (window.ocultarBadges) {
            window.ocultarBadges();
        }
    }
}

/**
 * Atualizar badge de notificações (fallback local se header.js não estiver disponível)
 */
async function atualizarBadgeNotificacoes(userId) {
    // Se header.js já definiu a função, usar ela
    if (window.atualizarBadgeNotificacoes && window.atualizarBadgeNotificacoes !== atualizarBadgeNotificacoes) {
        return window.atualizarBadgeNotificacoes(userId);
    }
    
    // Fallback local
    try {
        let unreadCount = 0;
        
        // Tentar buscar notificações não lidas da API
        try {
            const response = await fetch(`/api/notificacoes/usuario/${userId}/nao-lidas`);
            
            if (response.ok) {
                const data = await response.json();
                unreadCount = data.count || data.total || 0;
            }
        } catch (apiError) {
            console.log('[Dashboard] API de notificações não disponível, usando fallback');
        }
        
        // Fallback específico do dashboard: verificar serviços pendentes
        if (unreadCount === 0 && typeof ServicosManager !== 'undefined') {
            const userData = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');
            if (userData.email) {
                const stats = ServicosManager.getEstatisticasCuidador(userData.email);
                unreadCount = stats.servicosPendentes || 0;
            }
        }
        
        // Fallback adicional: verificar notificações no DOM
        if (unreadCount === 0) {
            const notificationItems = document.querySelectorAll('.notification-item.unread');
            unreadCount = notificationItems.length;
        }
        
        // Atualizar todos os badges de notificação
        const notificationBadges = document.querySelectorAll('.notification-badge');
        notificationBadges.forEach(badge => {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        });
        
        console.log('[Dashboard] Badge de notificações atualizado:', unreadCount);
        
    } catch (error) {
        console.error('[Dashboard] Erro ao atualizar badge de notificações:', error);
        const notificationBadges = document.querySelectorAll('.notification-badge');
        notificationBadges.forEach(badge => {
            badge.style.display = 'none';
        });
    }
}

/**
 * Atualizar badge de mensagens (fallback local se header.js não estiver disponível)
 */
async function atualizarBadgeMensagens(userId) {
    // Se header.js já definiu a função, usar ela
    if (window.atualizarBadgeMensagens && window.atualizarBadgeMensagens !== atualizarBadgeMensagens) {
        return window.atualizarBadgeMensagens(userId);
    }
    
    // Fallback local
    try {
        let unreadCount = 0;
        
        // Tentar buscar conversas do usuário
        try {
            const response = await fetch(`/api/mensagens/conversas/${userId}`);
            
            if (response.ok) {
                const data = await response.json();
                const conversas = data.conversas || data || [];
                
                unreadCount = conversas.reduce((total, conversa) => {
                    return total + (conversa.mensagens_nao_lidas || conversa.unread_count || 0);
                }, 0);
            }
        } catch (apiError) {
            console.log('[Dashboard] API de mensagens não disponível, usando fallback');
        }
        
        // Fallback: verificar localStorage
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
        
        // Atualizar todos os badges de mensagem
        const messageBadges = document.querySelectorAll('.message-badge');
        messageBadges.forEach(badge => {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        });
        
        console.log('[Dashboard] Badge de mensagens atualizado:', unreadCount);
        
    } catch (error) {
        console.error('[Dashboard] Erro ao atualizar badge de mensagens:', error);
        const messageBadges = document.querySelectorAll('.message-badge');
        messageBadges.forEach(badge => {
            badge.style.display = 'none';
        });
    }
}

/**
 * Ocultar todos os badges (fallback local se header.js não estiver disponível)
 */
function ocultarBadges() {
    // Se header.js já definiu a função, usar ela
    if (window.ocultarBadges && window.ocultarBadges !== ocultarBadges) {
        return window.ocultarBadges();
    }
    
    // Fallback local
    const notificationBadges = document.querySelectorAll('.notification-badge');
    const messageBadges = document.querySelectorAll('.message-badge');
    
    notificationBadges.forEach(badge => {
        badge.style.display = 'none';
    });
    
    messageBadges.forEach(badge => {
        badge.style.display = 'none';
    });
}

// Função para alternar visualização do valor arrecadado
function initToggleValor() {
    const toggleBtn = document.getElementById('toggleValor');
    const valorContainer = document.getElementById('valorArrecadado');
    const hiddenValue = valorContainer.querySelector('.hidden-value');
    const realValue = valorContainer.querySelector('.real-value');
    let isVisible = false;

    toggleBtn.addEventListener('click', function() {
        if (isVisible) {
            // Ocultar valor
            hiddenValue.classList.remove('d-none');
            realValue.classList.add('d-none');
            toggleBtn.innerHTML = '<i class="ph ph-eye"></i> Visualizar';
            isVisible = false;
        } else {
            // Mostrar valor
            hiddenValue.classList.add('d-none');
            realValue.classList.remove('d-none');
            toggleBtn.innerHTML = '<i class="ph ph-eye-slash"></i> Ocultar';
            isVisible = true;
        }
    });
}


// Função para criar gráfico de consultas
function initConsultasChart() {
    const ctx = document.getElementById('consultasChart');
    if (!ctx) return;

    // Dados simulados das últimas 7 semanas
    const data = {
        labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7'],
        datasets: [{
            label: 'Consultas',
            data: [12, 19, 15, 25, 22, 18, 24],
            borderColor: '#1B475D',
            backgroundColor: 'rgba(27, 71, 93, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
        }]
    };

    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false
                }
            },
            elements: {
                point: {
                    radius: 3,
                    hoverRadius: 5
                }
            }
        }
    };

    new Chart(ctx, config);
}

// Função para criar calendar heatmap horizontal - 150 dias
function initCalendarHeatmap() {
    const container = document.getElementById('calendarHeatmap');
    if (!container) return;

    // Estado do calendar - últimos 150 dias
    let currentDate = new Date();
    let currentPeriodStart = new Date(currentDate.getTime() - (149 * 24 * 60 * 60 * 1000)); // 150 dias atrás
    let currentPeriodEnd = new Date(currentDate);
    let periodOffset = 0; // Para navegação
    
    // Função para renderizar o heatmap
    function renderHeatmap(offset = 0) {
        const endDate = new Date(currentDate.getTime() - (offset * 24 * 60 * 60 * 1000));
        const startDate = new Date(endDate.getTime() - (149 * 24 * 60 * 60 * 1000)); // 150 dias antes
        
        // Atualizar o título do período
        const periodElement = document.getElementById('currentPeriod');
        const startStr = startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const endStr = endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        periodElement.textContent = `${startStr} - ${endStr}`;
        
        // Limpar container
        container.innerHTML = '';
        
        // Criar estrutura do heatmap horizontal
        let heatmapHTML = '<div class="heatmap-days">';
        
        // Gerar 150 dias
        for (let i = 149; i >= 0; i--) {
            const currentDay = new Date(endDate.getTime() - (i * 24 * 60 * 60 * 1000));
            const level = Math.floor(Math.random() * 5); // 0-4 níveis de atividade
            const dateStr = currentDay.toISOString().split('T')[0];
            const consultasCount = level * 2; // Simular número de consultas
            const dayName = currentDay.toLocaleDateString('pt-BR', { weekday: 'short' });
            const dayMonth = currentDay.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            
            heatmapHTML += `<div class="heatmap-day" 
                data-level="${level}" 
                data-date="${dateStr}" 
                data-count="${consultasCount}"
                title="${consultasCount} consultas em ${dayMonth} (${dayName})">
            </div>`;
        }
        
        heatmapHTML += '</div>';
        
        // Adicionar informações do período
        heatmapHTML += `<div class="heatmap-info mt-2">
            <small class="text-muted">
                Mostrando 150 dias de ${startStr} até ${endStr}
            </small>
        </div>`;
        
        container.innerHTML = heatmapHTML;
        
        // Adicionar tooltips
        addHeatmapTooltips();
    }
    
    // Função para navegar para período anterior
    function goToPreviousPeriod() {
        periodOffset += 150; // Voltar 150 dias
        renderHeatmap(periodOffset);
        updateNavigationButtons();
    }
    
    // Função para navegar para próximo período
    function goToNextPeriod() {
        if (periodOffset >= 150) {
            periodOffset -= 150; // Avançar 150 dias
            renderHeatmap(periodOffset);
            updateNavigationButtons();
        }
    }
    
    // Função para atualizar estado dos botões de navegação
    function updateNavigationButtons() {
        const nextBtn = document.getElementById('nextPeriod');
        
        // Desabilitar botão "Próximo" se estiver no período mais recente
        if (periodOffset === 0) {
            nextBtn.disabled = true;
            nextBtn.classList.add('disabled');
        } else {
            nextBtn.disabled = false;
            nextBtn.classList.remove('disabled');
        }
    }
    
    // Event listeners para navegação
    document.getElementById('prevPeriod').addEventListener('click', goToPreviousPeriod);
    document.getElementById('nextPeriod').addEventListener('click', goToNextPeriod);
    
    // Renderizar heatmap inicial
    renderHeatmap(periodOffset);
    updateNavigationButtons();
}

// Função para adicionar tooltips ao heatmap
function addHeatmapTooltips() {
    const days = document.querySelectorAll('.heatmap-day');
    const tooltip = document.createElement('div');
    tooltip.className = 'heatmap-tooltip';
    document.body.appendChild(tooltip);
    
    days.forEach(day => {
        day.addEventListener('mouseenter', function(e) {
            const count = this.dataset.count;
            const date = new Date(this.dataset.date).toLocaleDateString('pt-BR');
            tooltip.innerHTML = `${count} consultas<br>${date}`;
            tooltip.classList.add('show');
        });
        
        day.addEventListener('mousemove', function(e) {
            tooltip.style.left = e.pageX + 10 + 'px';
            tooltip.style.top = e.pageY - 10 + 'px';
        });
        
        day.addEventListener('mouseleave', function() {
            tooltip.classList.remove('show');
        });
    });
}

// Função para criar gráfico de performance
function initPerformanceChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;

    const data = {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        datasets: [
            {
                label: 'Consultas',
                data: [65, 78, 90, 81, 95, 127],
                borderColor: '#1B475D',
                backgroundColor: 'rgba(27, 71, 93, 0.1)',
                yAxisID: 'y'
            },
            {
                label: 'Receita (R$)',
                data: [2800, 3200, 3800, 3400, 4100, 4500],
                borderColor: '#FAD564',
                backgroundColor: 'rgba(250, 213, 100, 0.1)',
                yAxisID: 'y1'
            }
        ]
    };

    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Mês'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Consultas'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Receita (R$)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    };

    new Chart(ctx, config);
}

// Função para criar gráfico de distribuição de serviços
function initServicosChart() {
    const ctx = document.getElementById('servicosChart');
    if (!ctx) return;

    const data = {
        labels: ['Cuidado de Idosos', 'Cuidado Infantil', 'Cuidado de Pets'],
        datasets: [{
            data: [45, 30, 25],
            backgroundColor: [
                'rgba(142, 189, 157, 0.8)',
                'rgba(211, 220, 124, 0.8)',
                'rgba(250, 213, 100, 0.8)'
            ],
            borderColor: [
                'rgba(142, 189, 157, 1)',
                'rgba(211, 220, 124, 1)',
                'rgba(250, 213, 100, 1)'
            ],
            borderWidth: 2
        }]
    };

    const config = {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    };

    new Chart(ctx, config);
}

// Função para inicializar histórico de pagamentos
function initHistoricoPagamentos() {
    const tbody = document.getElementById('pagamentosTableBody');
    const emptyInfo = document.getElementById('pagamentosEmptyState');
    const paginacao = document.getElementById('paginacao');

    if (!tbody) return;

    // Buscar serviços concluídos reais do cuidador para montar histórico de pagamentos
    try {
        const userData = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');

        if (!userData.email || userData.tipo !== 'cuidador' || typeof ServicosManager === 'undefined') {
            // Mantém estado vazio padrão
            tbody.innerHTML = '';
            if (emptyInfo) {
                emptyInfo.textContent = 'Nenhum pagamento registrado ainda. Os pagamentos aparecerão aqui quando forem realizados pelos clientes.';
            }
            if (paginacao) {
                paginacao.classList.add('d-none');
            }
            return;
        }

        const servicos = ServicosManager.getServicosCuidador(userData.email) || [];
        const concluidos = servicos.filter(s => s.status === 'concluido' && s.valorPago && s.valorPago > 0);

        if (concluidos.length === 0) {
            tbody.innerHTML = '';
            if (emptyInfo) {
                emptyInfo.textContent = 'Nenhum pagamento registrado ainda. Os pagamentos aparecerão aqui quando forem realizados pelos clientes.';
            }
            if (paginacao) {
                paginacao.classList.add('d-none');
            }
            return;
        }

        // Mapear serviços concluídos para estrutura de pagamentos
        const pagamentos = concluidos.map((s, index) => ({
            id: index + 1,
            data: s.dataConclusao || s.dataContratacao || new Date().toISOString(),
            cliente: s.clienteNome || 'Cliente',
            servico: ({
                'idoso': 'Cuidado de Idosos',
                'crianca': 'Cuidado Infantil',
                'pet': 'Cuidado de Pets'
            }[s.tipo]) || s.tipo || 'Serviço',
            valor: s.valorPago || 0,
            status: 'pago'
        }));

        // Renderizar tabela e paginação usando as funções auxiliares
        renderPagamentosTable(pagamentos, 1);
        initPaginacao(pagamentos);
        initFiltroMes(pagamentos);

        if (emptyInfo) {
            emptyInfo.style.display = 'none';
        }

    } catch (e) {
        console.error('[Dashboard] Erro ao carregar histórico de pagamentos:', e);
        tbody.innerHTML = '';
        if (emptyInfo) {
            emptyInfo.textContent = 'Erro ao carregar histórico de pagamentos.';
        }
        if (paginacao) {
            paginacao.classList.add('d-none');
        }
    }
}

// Função para renderizar tabela de pagamentos
function renderPagamentosTable(pagamentos, page = 1, itemsPerPage = 10) {
    const tbody = document.getElementById('pagamentosTableBody');
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = pagamentos.slice(startIndex, endIndex);

    tbody.innerHTML = paginatedData.map(pagamento => {
        const statusClass = `status-${pagamento.status}`;
        const statusText = {
            'pago': 'Pago',
            'pendente': 'Pendente',
            'cancelado': 'Cancelado'
        }[pagamento.status];

        return `
            <tr>
                <td>${new Date(pagamento.data).toLocaleDateString('pt-BR')}</td>
                <td>${pagamento.cliente}</td>
                <td>${pagamento.servico}</td>
                <td>R$ ${pagamento.valor.toFixed(2).replace('.', ',')}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="verDetalhes(${pagamento.id})">
                        <i class="ph ph-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Atualizar informações de paginação apenas se houver registros reais
    const paginaAtualEl = document.getElementById('paginaAtual');
    const totalRegistrosEl = document.getElementById('totalRegistros');
    const emptyInfo = document.getElementById('pagamentosEmptyState');
    const paginacao = document.getElementById('paginacao');

    if (pagamentos.length > 0) {
        if (paginaAtualEl) paginaAtualEl.textContent = `${startIndex + 1}-${Math.min(endIndex, pagamentos.length)}`;
        if (totalRegistrosEl) totalRegistrosEl.textContent = pagamentos.length;
        if (emptyInfo) emptyInfo.style.display = 'none';
        if (paginacao) paginacao.classList.remove('d-none');
    } else {
        if (emptyInfo) {
            emptyInfo.style.display = 'block';
        }
        if (paginacao) paginacao.classList.add('d-none');
    }
}

// Função para inicializar filtro por mês
function initFiltroMes(pagamentos) {
    const filtroSelect = document.getElementById('filtroMes');
    
    filtroSelect.addEventListener('change', function() {
        const filtro = this.value;
        let dadosFiltrados = [...pagamentos];
        
        const hoje = new Date();
        
        switch(filtro) {
            case 'atual':
                dadosFiltrados = pagamentos.filter(p => {
                    const dataPagamento = new Date(p.data);
                    return dataPagamento.getMonth() === hoje.getMonth() && 
                           dataPagamento.getFullYear() === hoje.getFullYear();
                });
                break;
            case 'anterior':
                const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1);
                dadosFiltrados = pagamentos.filter(p => {
                    const dataPagamento = new Date(p.data);
                    return dataPagamento.getMonth() === mesAnterior.getMonth() && 
                           dataPagamento.getFullYear() === mesAnterior.getFullYear();
                });
                break;
            case 'trimestre':
                const tresMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 3);
                dadosFiltrados = pagamentos.filter(p => {
                    const dataPagamento = new Date(p.data);
                    return dataPagamento >= tresMesesAtras;
                });
                break;
        }
        
        renderPagamentosTable(dadosFiltrados);
    });
}

// Função para inicializar paginação
function initPaginacao(pagamentos) {
    const itemsPerPage = 10;
    const totalPages = Math.ceil(pagamentos.length / itemsPerPage);
    const paginacao = document.getElementById('paginacao');
    
    let paginationHTML = '';
    
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <li class="page-item ${i === 1 ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }
    
    paginacao.innerHTML = paginationHTML;
}

// Função para mudar página
function changePage(page) {
    // Remover classe active de todos os itens
    document.querySelectorAll('.page-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Adicionar classe active ao item clicado
    event.target.closest('.page-item').classList.add('active');
    
    // Renderizar nova página (aqui você usaria os dados filtrados atuais)
    // Por simplicidade, vamos usar dados simulados
    const pagamentos = []; // Aqui você pegaria os dados atuais
    renderPagamentosTable(pagamentos, page);
}

// Função para ver detalhes do pagamento
function verDetalhes(id) {
    alert(`Ver detalhes do pagamento ID: ${id}`);
    // Aqui você implementaria um modal ou redirecionamento
}

// Função para buscar dados do dashboard via API
async function fetchDashboardData() {
    try {
        const response = await fetch('/api/dashboard/cuidador', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar dados do dashboard');
        }

        const data = await response.json();
        updateDashboardData(data);
    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        // Manter dados simulados em caso de erro
    }
}

// Função para atualizar dados do dashboard
function updateDashboardData(data) {
    // Atualizar total de consultas
    if (data.totalConsultas) {
        document.querySelector('.dashboard-card:nth-child(1) .metric-value').textContent = data.totalConsultas;
    }

    // Atualizar valor arrecadado
    if (data.valorArrecadado) {
        document.querySelector('.real-value').textContent = `R$ ${data.valorArrecadado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }

    // Atualizar usuários atendidos
    if (data.usuariosAtendidos) {
        document.querySelector('.dashboard-card:nth-child(3) .metric-value').textContent = data.usuariosAtendidos;
    }

    // Atualizar avaliação média
    if (data.avaliacaoMedia) {
        document.querySelector('.dashboard-card:nth-child(4) .metric-value').textContent = data.avaliacaoMedia.toFixed(1);
        updateStarRating(data.avaliacaoMedia);
    }
}

// Função para atualizar estrelas da avaliação
function updateStarRating(rating) {
    const starsContainer = document.querySelector('.stars');
    const stars = starsContainer.querySelectorAll('i');
    
    stars.forEach((star, index) => {
        if (index < Math.floor(rating)) {
            star.className = 'ph-fill ph-star';
        } else if (index < rating && rating % 1 !== 0) {
            star.className = 'ph ph-star-half';
        } else {
            star.className = 'ph ph-star';
        }
    });
}

// Função para logout
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
}

// Event listeners para navegação
document.addEventListener('click', function(e) {
    if (e.target.closest('[data-action="logout"]')) {
        e.preventDefault();
        logout();
    }
});

// Carregar dados do dashboard ao inicializar (comentado para usar dados simulados)
// fetchDashboardData();

