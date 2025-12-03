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
    // Tenta buscar dados atualizados do banco primeiro
    let userData = null;
    if (typeof window.CuidaFastAuth !== 'undefined' && window.CuidaFastAuth.fetchUserDataFromDB) {
        userData = await window.CuidaFastAuth.fetchUserDataFromDB();
    }
    
    // Se não conseguiu buscar do banco, usa localStorage
    if (!userData) {
        userData = getUserDataFromStorage();
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
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        const endereco = userData.endereco;
        if (endereco) {
            const enderecoObj = typeof endereco === 'string' ? JSON.parse(endereco) : endereco;
            if (enderecoObj.cep) cepInput.value = enderecoObj.cep;
        } else if (userData.cep) {
            cepInput.value = userData.cep;
        }
    }

    const ruaInput = document.getElementById('rua');
    if (ruaInput) {
        const endereco = userData.endereco;
        if (endereco) {
            const enderecoObj = typeof endereco === 'string' ? JSON.parse(endereco) : endereco;
            if (enderecoObj.rua) ruaInput.value = enderecoObj.rua;
        } else if (userData.rua) {
            ruaInput.value = userData.rua;
        }
    }

    const numeroInput = document.getElementById('numero');
    if (numeroInput) {
        const endereco = userData.endereco;
        if (endereco) {
            const enderecoObj = typeof endereco === 'string' ? JSON.parse(endereco) : endereco;
            if (enderecoObj.numero) numeroInput.value = enderecoObj.numero;
        } else if (userData.numero) {
            numeroInput.value = userData.numero;
        }
    }

    const complementoInput = document.getElementById('complemento');
    if (complementoInput) {
        const endereco = userData.endereco;
        if (endereco) {
            const enderecoObj = typeof endereco === 'string' ? JSON.parse(endereco) : endereco;
            if (enderecoObj.complemento) complementoInput.value = enderecoObj.complemento;
        } else if (userData.complemento) {
            complementoInput.value = userData.complemento;
        }
    }

    const bairroInput = document.getElementById('bairro');
    if (bairroInput) {
        const endereco = userData.endereco;
        if (endereco) {
            const enderecoObj = typeof endereco === 'string' ? JSON.parse(endereco) : endereco;
            if (enderecoObj.bairro) bairroInput.value = enderecoObj.bairro;
        } else if (userData.bairro) {
            bairroInput.value = userData.bairro;
        }
    }

    const cidadeInput = document.getElementById('cidade');
    if (cidadeInput) {
        const endereco = userData.endereco;
        if (endereco) {
            const enderecoObj = typeof endereco === 'string' ? JSON.parse(endereco) : endereco;
            if (enderecoObj.cidade) cidadeInput.value = enderecoObj.cidade;
        } else if (userData.cidade) {
            cidadeInput.value = userData.cidade;
        }
    }

    const estadoInput = document.getElementById('estado');
    if (estadoInput) {
        const endereco = userData.endereco;
        if (endereco) {
            const enderecoObj = typeof endereco === 'string' ? JSON.parse(endereco) : endereco;
            if (enderecoObj.estado) estadoInput.value = enderecoObj.estado;
        } else if (userData.estado) {
            estadoInput.value = userData.estado;
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

        // Atualizar dados do usuário
        const updatedData = {
            ...userData,
            nome: fullName,
            email: email,
            telefone: phone || userData.telefone,
            dataNascimento: birthDate || userData.dataNascimento,
            cpf: cpf || userData.cpf
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

            // Se tiver API, atualizar no backend
            if (typeof PerfilAPI !== 'undefined' && userData.id) {
                try {
                    if (updatedData.photoURL && updatedData.photoURL !== userData.photoURL) {
                        await PerfilAPI.atualizarFotoPerfil(userData.id, updatedData.photoURL);
                    }
                } catch (error) {
                    console.error('[PerfilEditar] Erro ao atualizar foto no backend:', error);
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

