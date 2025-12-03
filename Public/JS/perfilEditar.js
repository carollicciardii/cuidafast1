// perfilEditar.js - Funcionalidade de editar perfil e foto

document.addEventListener('DOMContentLoaded', function() {
    initProfileEdit();
});

async function initProfileEdit() {
    await loadUserData();
    initAvatarUpload();
    initFormSubmit();
    console.log('[PerfilEditar] Inicializado');
}

/**
 * Carrega dados do usuário no formulário
 */
async function loadUserData() {
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
            console.warn('[PerfilEditar] Erro ao buscar dados do banco, usando localStorage:', error);
        }
    }
    
    if (!userData) {
        console.warn('[PerfilEditar] Nenhum dado de usuário encontrado');
        return;
    }

    // Carregar foto atual
    const avatarPreview = document.getElementById('avatarPreview');
    if (avatarPreview && userData.photoURL) {
        avatarPreview.src = userData.photoURL;
    }

    // Preencher campos do formulário
    const fullNameInput = document.getElementById('fullName');
    if (fullNameInput) {
        fullNameInput.value = userData.nome || '';
    }

    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.value = userData.email || '';
    }

    const phoneInput = document.getElementById('phone');
    if (phoneInput && userData.telefone) {
        phoneInput.value = userData.telefone || '';
    }

    const birthDateInput = document.getElementById('birthDate');
    if (birthDateInput) {
        // Tentar diferentes formatos de data
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
                birthDateInput.value = date.toISOString().split('T')[0];
            }
        }
    }

    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        // Tentar diferentes formatos de CPF
        const cpf = userData.cpf || userData.cpf_numero || userData.documento;
        if (cpf) {
            cpfInput.value = cpf;
        }
    }

    // Carregar endereço se houver campos de endereço na página
    // Prioriza campos diretos do banco, depois objeto endereco
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        // Primeiro tenta campos diretos, depois objeto endereco
        const cep = userData.cep || (userData.endereco && (typeof userData.endereco === 'string' ? JSON.parse(userData.endereco) : userData.endereco).cep);
        if (cep) {
            cepInput.value = cep;
        }
    }

    const ruaInput = document.getElementById('rua');
    if (ruaInput) {
        const rua = userData.rua || (userData.endereco && (typeof userData.endereco === 'string' ? JSON.parse(userData.endereco) : userData.endereco).rua);
        if (rua) {
            ruaInput.value = rua;
        }
    }

    const numeroInput = document.getElementById('numero');
    if (numeroInput) {
        const numero = userData.numero || (userData.endereco && (typeof userData.endereco === 'string' ? JSON.parse(userData.endereco) : userData.endereco).numero);
        if (numero) {
            numeroInput.value = numero;
        }
    }

    const complementoInput = document.getElementById('complemento');
    if (complementoInput) {
        const complemento = userData.complemento || (userData.endereco && (typeof userData.endereco === 'string' ? JSON.parse(userData.endereco) : userData.endereco).complemento);
        if (complemento) {
            complementoInput.value = complemento;
        }
    }

    const bairroInput = document.getElementById('bairro');
    if (bairroInput) {
        const bairro = userData.bairro || (userData.endereco && (typeof userData.endereco === 'string' ? JSON.parse(userData.endereco) : userData.endereco).bairro);
        if (bairro) {
            bairroInput.value = bairro;
        }
    }

    const cidadeInput = document.getElementById('cidade');
    if (cidadeInput) {
        const cidade = userData.cidade || (userData.endereco && (typeof userData.endereco === 'string' ? JSON.parse(userData.endereco) : userData.endereco).cidade);
        if (cidade) {
            cidadeInput.value = cidade;
        }
    }

    const estadoInput = document.getElementById('estado');
    if (estadoInput) {
        const estado = userData.estado || (userData.endereco && (typeof userData.endereco === 'string' ? JSON.parse(userData.endereco) : userData.endereco).estado);
        if (estado) {
            estadoInput.value = estado;
        }
    }

    // Carregar dados específicos do cuidador se for cuidador
    if (userData.tipo === 'cuidador') {
        // Carregar telefone se não foi carregado acima
        if (phoneInput && !phoneInput.value && userData.telefone) {
            phoneInput.value = userData.telefone;
        }
        
        // Carregar tipo de serviço, áreas de atuação e valor por hora
        const tiposServicoSelect = document.getElementById('tiposServico') || document.getElementById('tipoServico');
        if (tiposServicoSelect && userData.tipos_cuidado) {
            const tiposArray = Array.isArray(userData.tipos_cuidado) 
                ? userData.tipos_cuidado 
                : (typeof userData.tipos_cuidado === 'string' ? userData.tipos_cuidado.split(',') : [userData.tipos_cuidado]);
            
            // Se for select múltiplo
            if (tiposServicoSelect.multiple) {
                Array.from(tiposServicoSelect.options).forEach(option => {
                    if (tiposArray.includes(option.value)) {
                        option.selected = true;
                    }
                });
            } else {
                // Se for select simples, usar o primeiro tipo
                tiposServicoSelect.value = tiposArray[0] || '';
            }
        }
        
        const areasAtuacaoInput = document.getElementById('areasAtuacao');
        if (areasAtuacaoInput && userData.especialidades) {
            areasAtuacaoInput.value = Array.isArray(userData.especialidades) 
                ? userData.especialidades.join(', ') 
                : userData.especialidades;
        }
        
        const valorHoraInput = document.getElementById('valorHora');
        if (valorHoraInput && (userData.valor_hora || userData.valorHora)) {
            valorHoraInput.value = userData.valor_hora || userData.valorHora;
        }
    }

    console.log('[PerfilEditar] Dados carregados');
}

/**
 * Inicializa upload de avatar
 */
function initAvatarUpload() {
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('avatarPreview');
    const btnRemove = document.getElementById('removeAvatar');

    if (!avatarInput || !avatarPreview) {
        console.warn('[PerfilEditar] Elementos de avatar não encontrados');
        return;
    }

    let uploadedPhotoURL = null;

    // Quando selecionar arquivo
    avatarInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tamanho (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Arquivo muito grande. Tamanho máximo: 5MB');
            avatarInput.value = '';
            return;
        }

        // Validar tipo
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione uma imagem válida.');
            avatarInput.value = '';
            return;
        }

        // Ler e mostrar preview
        const reader = new FileReader();
        reader.onload = function(event) {
            uploadedPhotoURL = event.target.result;
            avatarPreview.src = uploadedPhotoURL;
            console.log('[PerfilEditar] Foto carregada');
        };
        reader.readAsDataURL(file);
    });

    // Botão remover foto
    if (btnRemove) {
        btnRemove.addEventListener('click', function() {
            if (confirm('Tem certeza que deseja remover a foto de perfil?')) {
                uploadedPhotoURL = null;
                avatarPreview.src = '../assets/images.webp'; // Foto padrão
                avatarInput.value = '';
                console.log('[PerfilEditar] Foto removida');
            }
        });
    }

    // Salvar uploadedPhotoURL para uso no submit
    window.uploadedPhotoURL = uploadedPhotoURL;
}

/**
 * Inicializa submit do formulário
 */
function initFormSubmit() {
    const form = document.querySelector('.edit-profile-form');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const userData = getUserDataFromStorage();
        if (!userData) {
            alert('Erro: Usuário não encontrado. Faça login novamente.');
            return;
        }

        // Coletar dados do formulário
        const fullName = document.getElementById('fullName')?.value || '';
        const email = document.getElementById('email')?.value || '';
        const phone = document.getElementById('phone')?.value || '';
        const birthDate = document.getElementById('birthDate')?.value || '';
        const cpf = document.getElementById('cpf')?.value || '';

        // Validar campos obrigatórios
        if (!fullName || !email) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        // Coletar dados de endereço se houver campos na página
        const cep = document.getElementById('cep')?.value || '';
        const rua = document.getElementById('rua')?.value || '';
        const numero = document.getElementById('numero')?.value || '';
        const complemento = document.getElementById('complemento')?.value || '';
        const bairro = document.getElementById('bairro')?.value || '';
        const cidade = document.getElementById('cidade')?.value || '';
        const estado = document.getElementById('estado')?.value || '';

        // Atualizar dados do usuário
        const updatedData = {
            ...userData,
            nome: fullName,
            email: email,
            telefone: phone || userData.telefone,
            dataNascimento: birthDate || userData.dataNascimento,
            data_nascimento: birthDate || userData.data_nascimento || userData.dataNascimento,
            cpf: cpf || userData.cpf,
            cpf_numero: cpf || userData.cpf_numero || userData.cpf,
            // Campos de endereço
            cep: cep || userData.cep,
            rua: rua || userData.rua,
            numero: numero || userData.numero,
            complemento: complemento || userData.complemento,
            bairro: bairro || userData.bairro,
            cidade: cidade || userData.cidade,
            estado: estado || userData.estado,
            // Endereço como objeto também
            endereco: {
                cep: cep || userData.cep || (userData.endereco && userData.endereco.cep),
                rua: rua || userData.rua || (userData.endereco && userData.endereco.rua),
                numero: numero || userData.numero || (userData.endereco && userData.endereco.numero),
                complemento: complemento || userData.complemento || (userData.endereco && userData.endereco.complemento),
                bairro: bairro || userData.bairro || (userData.endereco && userData.endereco.bairro),
                cidade: cidade || userData.cidade || (userData.endereco && userData.endereco.cidade),
                estado: estado || userData.estado || (userData.endereco && userData.endereco.estado)
            }
        };

        // Atualizar foto se foi selecionada
        const avatarPreview = document.getElementById('avatarPreview');
        if (avatarPreview && avatarPreview.src && !avatarPreview.src.includes('images.webp')) {
            updatedData.photoURL = avatarPreview.src;
        }

        // Salvar no localStorage
        try {
            localStorage.setItem('cuidafast_user', JSON.stringify(updatedData));
            console.log('[PerfilEditar] Dados atualizados no localStorage');

            // Atualizar também na lista de usuários se existir
            const usuarios = localStorage.getItem('cuidafast_usuarios');
            if (usuarios) {
                const listaUsuarios = JSON.parse(usuarios);
                const index = listaUsuarios.findIndex(u => u.email === userData.email);
                if (index !== -1) {
                    listaUsuarios[index] = { ...listaUsuarios[index], ...updatedData };
                    localStorage.setItem('cuidafast_usuarios', JSON.stringify(listaUsuarios));
                }
            }

            // Atualizar no backend usando a API de complete-profile
            const userId = userData.id || userData.usuario_id;
            if (userId) {
                try {
                    const API_URL = window.API_CONFIG?.AUTH || "/api/auth";
                    const completeProfileUrl = `${API_URL}/complete-profile`;
                    
                    const payload = {
                        usuario_id: userId,
                        nome: fullName,
                        email: email,
                        telefone: phone || userData.telefone || null,
                        data_nascimento: birthDate || userData.data_nascimento || userData.dataNascimento || null,
                        cpf: cpf || userData.cpf || userData.cpf_numero || null,
                        cpf_numero: cpf || userData.cpf_numero || userData.cpf || null,
                        // Campos de endereço
                        cep: cep || null,
                        rua: rua || null,
                        numero: numero || null,
                        complemento: complemento || null,
                        bairro: bairro || null,
                        cidade: cidade || null,
                        estado: estado || null,
                        photo_url: updatedData.photoURL && !updatedData.photoURL.includes('images.webp') 
                            ? updatedData.photoURL 
                            : userData.photo_url || userData.photoURL || null,
                        tipo: userData.tipo || 'cliente'
                    };
                    
                    const response = await fetch(completeProfileUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('cuidafast_token') || ''}`
                        },
                        body: JSON.stringify(payload)
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        console.log('[PerfilEditar] Dados atualizados no backend:', result);
                        
                        // Atualizar localStorage com dados retornados do backend
                        if (result.user) {
                            const mergedData = { ...updatedData, ...result.user };
                            localStorage.setItem('cuidafast_user', JSON.stringify(mergedData));
                        }
                    } else {
                        console.warn('[PerfilEditar] Erro ao atualizar no backend, mas dados salvos localmente');
                    }
                } catch (error) {
                    console.error('[PerfilEditar] Erro ao atualizar no backend:', error);
                    // Continua mesmo com erro no backend
                }
            }

            alert('✅ Perfil atualizado com sucesso!');
            
            // Redirecionar para página de perfil
            const currentPath = window.location.pathname;
            if (currentPath.includes('Cliente')) {
                window.location.href = 'perfilCliente.html';
            } else if (currentPath.includes('Cuidador')) {
                window.location.href = 'perfilCuidador.html';
            } else {
                window.location.href = '../HTML/perfilCliente.html';
            }
        } catch (error) {
            console.error('[PerfilEditar] Erro ao salvar:', error);
            alert('❌ Erro ao salvar alterações. Tente novamente.');
        }
    });

    // Botão cancelar
    const btnCancel = document.querySelector('.btn-cancel');
    if (btnCancel) {
        btnCancel.addEventListener('click', function() {
            if (confirm('Tem certeza que deseja cancelar? As alterações não salvas serão perdidas.')) {
                const currentPath = window.location.pathname;
                if (currentPath.includes('Cliente')) {
                    window.location.href = 'perfilCliente.html';
                } else if (currentPath.includes('Cuidador')) {
                    window.location.href = 'perfilCuidador.html';
                } else {
                    window.location.href = '../HTML/perfilCliente.html';
                }
            }
        });
    }
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
        console.error('[PerfilEditar] Erro ao carregar dados do usuário:', error);
    }
    return null;
}

