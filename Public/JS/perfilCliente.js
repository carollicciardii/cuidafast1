// perfilCliente.js - Gerenciamento do perfil do cliente

document.addEventListener('DOMContentLoaded', function() {
    initProfile();
});

async function initProfile() {
    await loadUserProfile();
    initEditButtons();
    console.log('Perfil do cliente inicializado');
}

/**
 * Carrega os dados do usuário no perfil
 */
async function loadUserProfile() {
    // Primeiro pega do localStorage como base
    let userData = getUserDataFromStorage();
    
    // Tenta buscar dados atualizados do banco e mescla com os dados do localStorage
    if (typeof window.CuidaFastAuth !== 'undefined' && window.CuidaFastAuth.fetchUserDataFromDB) {
        try {
            const dbData = await window.CuidaFastAuth.fetchUserDataFromDB();
            if (dbData) {
                // Mescla dados do banco com os do localStorage (dados do banco têm prioridade)
                userData = { ...userData, ...dbData };
            }
        } catch (error) {
            console.warn('[PerfilCliente] Erro ao buscar dados do banco, usando localStorage:', error);
        }
    }
    
    if (!userData) {
        console.warn('Nenhum dado de usuário encontrado');
        return;
    }

    // Atualizar nome principal - sempre exibe o nome se existir
    const profileName = document.getElementById('profileUserName') || document.querySelector('.profile-info h1');
    if (profileName) {
        if (userData.nome) {
            profileName.textContent = userData.nome;
        } else {
            console.warn('[PerfilCliente] Nome do usuário não encontrado nos dados');
        }
    }

    // Atualizar data de cadastro - busca do banco de dados
    const memberSince = document.querySelector('.member-since');
    if (memberSince) {
        // Tenta buscar a data de cadastro de diferentes fontes possíveis (prioriza data_cadastro do banco)
        const dataCadastro = userData.data_cadastro || userData.dataCadastro || userData.created_at;
        
        console.log('[PerfilCliente] Dados do usuário:', { 
            nome: userData.nome, 
            data_cadastro: userData.data_cadastro, 
            dataCadastro: userData.dataCadastro,
            tipo: userData.tipo 
        });
        
        if (dataCadastro) {
            const date = new Date(dataCadastro);
            // Verifica se a data é válida
            if (!isNaN(date.getTime())) {
                const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                const monthName = monthNames[date.getMonth()];
                const year = date.getFullYear();
                
                if (userData.tipo === 'cuidador') {
                    memberSince.textContent = `Cuidador desde ${monthName} de ${year}`;
                } else {
                    memberSince.textContent = `Membro desde ${monthName} de ${year}`;
                }
                console.log('[PerfilCliente] Data de cadastro exibida:', memberSince.textContent);
            } else {
                console.warn('[PerfilCliente] Data de cadastro inválida:', dataCadastro);
                memberSince.textContent = userData.tipo === 'cuidador' ? 'Cuidador' : 'Membro';
            }
        } else {
            console.warn('[PerfilCliente] Data de cadastro não encontrada. Dados disponíveis:', Object.keys(userData));
            memberSince.textContent = userData.tipo === 'cuidador' ? 'Cuidador' : 'Membro';
        }
    }
    
    // Atualizar avaliações e estrelas
    updateRatings(userData);

    // Atualizar informações pessoais
    updateInfoField('Nome Completo', userData.nome);
    updateInfoField('E-mail', userData.email);
    
    if (userData.telefone) {
        updateInfoField('Telefone', formatPhone(userData.telefone));
    }

    // Atualizar CPF se existir
    const cpfElement = document.getElementById('clienteCPF');
    if (cpfElement) {
        const cpf = userData.cpf || userData.cpf_numero || userData.documento;
        if (cpf) {
            cpfElement.textContent = cpf;
        } else {
            cpfElement.textContent = '-';
        }
    } else {
        // Fallback para o método antigo
        if (userData.cpf || userData.cpf_numero || userData.documento) {
            updateInfoField('CPF', userData.cpf || userData.cpf_numero || userData.documento);
        }
    }

    // Atualizar data de nascimento se existir
    const dataNascElement = document.getElementById('clienteDataNascimento');
    if (dataNascElement) {
        const dataNasc = userData.data_nascimento || userData.dataNascimento || userData.data_nasc || userData.birthDate;
        if (dataNasc) {
            let date;
            // Se já está no formato YYYY-MM-DD
            if (typeof dataNasc === 'string' && dataNasc.match(/^\d{4}-\d{2}-\d{2}$/)) {
                date = new Date(dataNasc + 'T00:00:00');
            } else {
                // Tentar parsear como data
                date = new Date(dataNasc);
            }
            if (!isNaN(date.getTime())) {
                dataNascElement.textContent = date.toLocaleDateString('pt-BR');
            } else {
                dataNascElement.textContent = '-';
            }
        } else {
            dataNascElement.textContent = '-';
        }
    } else {
        // Fallback para o método antigo
        if (userData.dataNascimento || userData.data_nascimento) {
            const dataNasc = new Date((userData.dataNascimento || userData.data_nascimento) + 'T00:00:00');
            const dataFormatada = dataNasc.toLocaleDateString('pt-BR');
            updateInfoField('Data de Nascimento', dataFormatada);
        }
    }

    // Atualizar endereço se existir - preenche campos individuais
    // Prioriza campos diretos do banco, depois objeto endereco (tratando string/JSON com segurança)
    let enderecoObj = null;
    if (userData.endereco) {
        try {
            enderecoObj = typeof userData.endereco === 'string'
                ? JSON.parse(userData.endereco)
                : userData.endereco;
        } catch (e) {
            console.warn('[PerfilCliente] Não foi possível parsear userData.endereco:', e, userData.endereco);
            enderecoObj = null;
        }
    }

    const cep = userData.cep || (enderecoObj && enderecoObj.cep);
    const rua = userData.rua || (enderecoObj && enderecoObj.rua);
    const numero = userData.numero || (enderecoObj && enderecoObj.numero);
    const complemento = userData.complemento || (enderecoObj && enderecoObj.complemento);
    const bairro = userData.bairro || (enderecoObj && enderecoObj.bairro);
    const cidade = userData.cidade || (enderecoObj && enderecoObj.cidade);
    const estado = userData.estado || (enderecoObj && enderecoObj.estado);
    
    // Preencher campos individuais do endereço
    // CEP
    if (cep) {
        updateInfoField('CEP', cep);
    } else {
        updateInfoField('CEP', '-');
    }
    
    // Endereço (rua + número)
    if (rua) {
        let enderecoTexto = rua;
        if (numero) {
            enderecoTexto += `, ${numero}`;
        }
        updateInfoField('Endereço', enderecoTexto);
    } else {
        updateInfoField('Endereço', '-');
    }
    
    // Complemento
    if (complemento) {
        updateInfoField('Complemento', complemento);
    } else {
        updateInfoField('Complemento', '-');
    }
    
    // Cidade/Estado
    if (cidade && estado) {
        updateInfoField('Cidade/Estado', `${cidade}/${estado}`);
    } else if (cidade) {
        updateInfoField('Cidade/Estado', cidade);
    } else if (estado) {
        updateInfoField('Cidade/Estado', estado);
    } else {
        updateInfoField('Cidade/Estado', '-');
    }

    // Atualizar descrição se for cuidador
    if (userData.tipo === 'cuidador') {
        if (userData.descricao) {
            updateInfoField('Descrição', userData.descricao);
        } else {
            updateInfoField('Descrição', '-');
        }
    }

    // Atualizar foto do perfil APENAS se tiver photoURL (Google ou upload)
    const photoURL = userData.photoURL || userData.photo_url || userData.foto_perfil;
    if (photoURL) {
        const avatarImages = document.querySelectorAll('.avatar-img, .user-avatar-img, .dropdown-avatar');
        avatarImages.forEach(img => {
            img.src = photoURL;
            img.alt = `Foto de ${userData.nome}`;
        });
    } else {
        // Remover foto padrão - mostrar apenas ícone ou iniciais
        const avatarImages = document.querySelectorAll('.avatar-img, .user-avatar-img, .dropdown-avatar');
        avatarImages.forEach(img => {
            img.style.display = 'none'; // Esconde a imagem
        });
        
        // Mostrar iniciais no lugar
        const avatarContainers = document.querySelectorAll('.avatar, .user-avatar, .dropdown-user');
        avatarContainers.forEach(container => {
            const iniciais = userData.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const iniciaisDiv = container.querySelector('.avatar-iniciais') || document.createElement('div');
            iniciaisDiv.className = 'avatar-iniciais';
            iniciaisDiv.textContent = iniciais;
            iniciaisDiv.style.cssText = `
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #1B475D, #2A5F7A);
                color: white;
                font-size: 1.5rem;
                font-weight: 600;
                border-radius: 50%;
            `;
            if (!container.querySelector('.avatar-iniciais')) {
                container.appendChild(iniciaisDiv);
            }
        });
    }

    console.log('Perfil carregado para:', userData.nome);
}

/**
 * Atualiza avaliações e estrelas no perfil
 */
function updateRatings(userData) {
    const ratingContainer = document.querySelector('.profile-rating');
    if (!ratingContainer) return;
    
    const starsContainer = ratingContainer.querySelector('.stars');
    if (!starsContainer) return;
    
    // Busca avaliação dos dados do usuário (pode vir de diferentes fontes)
    const avaliacao = userData.avaliacao || userData.rating || 0;
    const numAvaliacoes = userData.numAvaliacoes || userData.num_avaliacoes || userData.totalAvaliacoes || 0;
    
    // Remove estrelas existentes
    const existingStars = starsContainer.querySelectorAll('i');
    existingStars.forEach(star => star.remove());
    
    // Remove texto de avaliação existente
    const existingText = starsContainer.querySelector('span');
    if (existingText) existingText.remove();
    
    // Se não houver avaliações, mostra zerado
    if (numAvaliacoes === 0 || avaliacao === 0 || !avaliacao) {
        // Cria estrelas vazias
        for (let i = 0; i < 5; i++) {
            const starIcon = document.createElement('i');
            starIcon.className = 'ph ph-star';
            starsContainer.appendChild(starIcon);
        }
        
        // Adiciona texto de "Sem avaliações"
        const textSpan = document.createElement('span');
        textSpan.textContent = 'Sem avaliações';
        starsContainer.appendChild(textSpan);
    } else {
        // Renderiza estrelas preenchidas conforme avaliação
        const fullStars = Math.floor(avaliacao);
        const hasHalfStar = (avaliacao % 1) >= 0.5;
        
        // Estrelas preenchidas
        for (let i = 0; i < fullStars; i++) {
            const starIcon = document.createElement('i');
            starIcon.className = 'ph ph-star-fill';
            starsContainer.appendChild(starIcon);
        }
        
        // Meia estrela se necessário
        if (hasHalfStar) {
            const halfStarIcon = document.createElement('i');
            halfStarIcon.className = 'ph ph-star-half';
            starsContainer.appendChild(halfStarIcon);
        }
        
        // Estrelas vazias
        const emptyStars = 5 - Math.ceil(avaliacao);
        for (let i = 0; i < emptyStars; i++) {
            const starIcon = document.createElement('i');
            starIcon.className = 'ph ph-star';
            starsContainer.appendChild(starIcon);
        }
        
        // Adiciona texto com avaliação
        const textSpan = document.createElement('span');
        textSpan.textContent = `${avaliacao.toFixed(1)} (${numAvaliacoes} avaliação${numAvaliacoes !== 1 ? 'ões' : ''})`;
        starsContainer.appendChild(textSpan);
    }
}

/**
 * Atualiza um campo de informação específico
 */
function updateInfoField(labelText, value) {
    const infoItems = document.querySelectorAll('.info-item');
    
    infoItems.forEach(item => {
        const label = item.querySelector('.info-label');
        const valueElement = item.querySelector('.info-value');
        
        if (label && valueElement && label.textContent.trim() === labelText) {
            valueElement.textContent = value;
        }
    });
}

/**
 * Formata número de telefone
 */
function formatPhone(phone) {
    // Remove caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');
    
    // Formata conforme o padrão brasileiro
    if (cleaned.length === 11) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    } else if (cleaned.length === 10) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    }
    
    return phone;
}

/**
 * Obtém dados do usuário do localStorage
 */
function getUserDataFromStorage() {
    try {
        const userData = localStorage.getItem('cuidafast_user');
        if (userData) {
            return JSON.parse(userData);
        }
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
    }
    return null;
}

/**
 * Inicializa botões de edição
 */
function initEditButtons() {
    const editButtons = document.querySelectorAll('.edit-link');
    
    editButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // O link já tem o href correto, apenas adiciona feedback visual
            console.log('Navegando para edição...');
        });
    });
}

/**
 * Inicializa botão de editar avatar
 */
function initEditAvatar() {
    const editAvatarBtn = document.querySelector('.edit-avatar-btn');
    const avatarImg = document.querySelector('.avatar-img');
    
    if (!editAvatarBtn || !avatarImg) return;

    editAvatarBtn.addEventListener('click', function() {
        // Criar input file dinamicamente
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            // Validar tamanho (5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Arquivo muito grande. Tamanho máximo: 5MB');
                return;
            }

            // Validar tipo
            if (!file.type.startsWith('image/')) {
                alert('Por favor, selecione uma imagem válida.');
                return;
            }

            // Ler e atualizar foto
            const reader = new FileReader();
            reader.onload = function(event) {
                const photoURL = event.target.result;
                
                // Atualizar imagem
                avatarImg.src = photoURL;
                
                // Atualizar todas as imagens de avatar na página
                const allAvatars = document.querySelectorAll('.user-avatar-img, .dropdown-avatar');
                allAvatars.forEach(img => {
                    img.src = photoURL;
                });

                // Atualizar no localStorage
                const userData = getUserDataFromStorage();
                if (userData) {
                    userData.photoURL = photoURL;
                    localStorage.setItem('cuidafast_user', JSON.stringify(userData));
                    
                    // Atualizar também na lista de usuários
                    const usuarios = localStorage.getItem('cuidafast_usuarios');
                    if (usuarios) {
                        const listaUsuarios = JSON.parse(usuarios);
                        const index = listaUsuarios.findIndex(u => u.email === userData.email);
                        if (index !== -1) {
                            listaUsuarios[index].photoURL = photoURL;
                            localStorage.setItem('cuidafast_usuarios', JSON.stringify(listaUsuarios));
                        }
                    }

                    // Atualizar no backend se tiver API
                    if (typeof PerfilAPI !== 'undefined' && userData.id) {
                        PerfilAPI.atualizarFotoPerfil(userData.id, photoURL)
                            .then(() => {
                                console.log('[PerfilCliente] Foto atualizada no backend');
                            })
                            .catch(error => {
                                console.error('[PerfilCliente] Erro ao atualizar foto no backend:', error);
                            });
                    }

                    alert('✅ Foto de perfil atualizada com sucesso!');
                }
            };
            reader.readAsDataURL(file);
        });

        // Disparar click no input
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    });
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditAvatar);
} else {
    initEditAvatar();
}
