        // Adicionar mensagem na tela imediatamente
        const novaMensagem = `
            <div class="message sent">
                <p>${escapeHtml(conteudo)}</p>
                <span class="message-time">Agora</span>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('beforeend', novaMensagem);
        scrollToBottom();

        // Limpar input
        messageInput.value = '';

        // Recarregar mensagens para garantir sincronização
        setTimeout(() => {
            carregarMensagens(contatoAtual.contato_id);
        }, 500);

    } catch (error) {
        console.error('[Mensagens] Erro ao enviar mensagem:', error);
        alert('Erro ao enviar mensagem. Tente novamente.');
    }
}

/**
 * Buscar conversas
 */
function buscarConversas(termo) {
    const termoLower = termo.toLowerCase();
    const conversasFiltradas = conversas.filter(c => 
        c.contato_nome.toLowerCase().includes(termoLower) ||
        (c.contato_tipo && c.contato_tipo.toLowerCase().includes(termoLower))
    );
    renderizarConversas(conversasFiltradas);
}

/**
 * Iniciar nova conversa
 */
async function iniciarNovaConversa(destinatario_id) {
    try {
        // Buscar dados do destinatário via handler único de perfis
        const response = await fetch(`/api/perfil/cuidadores?action=cuidador&id=${encodeURIComponent(destinatario_id)}`);
        if (!response.ok) throw new Error('Usuário não encontrado');
        
        const destinatario = await response.json();

        contatoAtual = {
            contato_id: destinatario_id,
            contato_nome: destinatario.nome,
            contato_foto: destinatario.foto_perfil,
            contato_tipo: destinatario.tipos_cuidado || 'Cuidador'
        };

        // Adicionar à lista se não existir
        if (!conversas.find(c => c.contato_id === destinatario_id)) {
            conversas.unshift(contatoAtual);
            renderizarConversas(conversas);
        }

        selecionarContato(contatoAtual);

    } catch (error) {
        console.error('[Mensagens] Erro ao iniciar conversa:', error);
        alert('Erro ao iniciar conversa. O cuidador pode não existir.');
    }
}

/**
 * Gerar avatar SVG
 */
function gerarAvatarSVG(iniciais) {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Ccircle cx='25' cy='25' r='25' fill='%23FAD564'/%3E%3Ctext x='25' y='30' text-anchor='middle' font-family='Arial' font-size='18' fill='%231B475D'%3E${iniciais}%3C/text%3E%3C/svg%3E`;
}

/**
 * Formatar data
 */
function formatarData(dataStr) {
    const data = new Date(dataStr);
    const agora = new Date();
    const diff = agora - data;
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return 'Agora';
    if (minutos < 60) return `${minutos}min`;
    if (horas < 24) return `${horas}h`;
    if (dias < 7) return `${dias}d`;
    return data.toLocaleDateString('pt-BR');
}

/**
 * Scroll para o final
 */
function scrollToBottom() {
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;