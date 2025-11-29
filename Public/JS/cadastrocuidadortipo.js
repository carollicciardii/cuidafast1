// cadastrocuidadortipo.js - Seleção de tipo de serviço do cuidador

document.addEventListener('DOMContentLoaded', function() {
  console.log('[cadastrocuidadortipo] Página carregada');

  const form = document.getElementById('servicoForm');
  
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('[cadastrocuidadortipo] Formulário submetido');

      // Pegar checkboxes selecionados
      const checkboxes = document.querySelectorAll('input[name="servico"]:checked');
      
      if (checkboxes.length === 0) {
        alert('Por favor, selecione pelo menos um tipo de serviço.');
        return;
      }

      // Coletar serviços selecionados
      const servicosSelecionados = Array.from(checkboxes).map(cb => cb.value);
      console.log('[cadastrocuidadortipo] Serviços selecionados:', servicosSelecionados);

      // Pegar dados existentes do localStorage
      const existingData = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');
      
      if (!existingData.email) {
        alert('❌ Erro: Dados do cadastro não encontrados. Por favor, faça o cadastro novamente.');
        window.location.href = 'cadastro.html';
        return;
      }

      // Adicionar serviços aos dados do usuário
      const updatedData = {
        ...existingData,
        servicosOferecidos: servicosSelecionados,
        tipoServico: servicosSelecionados.join(', '), // Para exibição
        updatedAt: new Date().toISOString(),
      };

      // Salvar dados atualizados
      localStorage.setItem('cuidafast_user', JSON.stringify(updatedData));
      
      // Atualizar também na lista de usuários
      atualizarUsuarioNaLista(updatedData);
      
      console.log('[cadastrocuidadortipo] Dados salvos:', updatedData);
      
      // Redirecionar para enviar documentos
      window.location.href = 'enviardocumentoscuidador.html';
    });
  }
});

/**
 * Atualiza o usuário na lista de cadastrados
 */
function atualizarUsuarioNaLista(userData) {
  let usuarios = [];
  
  const usuariosExistentes = localStorage.getItem('cuidafast_usuarios');
  if (usuariosExistentes) {
    try {
      usuarios = JSON.parse(usuariosExistentes);
    } catch (error) {
      console.error('[cadastrocuidadortipo] Erro ao carregar lista:', error);
      usuarios = [];
    }
  }

  // Procurar usuário por email
  const index = usuarios.findIndex(u => u.email === userData.email);
  if (index !== -1) {
    // Atualizar usuário existente
    usuarios[index] = userData;
    localStorage.setItem('cuidafast_usuarios', JSON.stringify(usuarios));
    console.log('[cadastrocuidadortipo] Usuário atualizado na lista');
  }
}
