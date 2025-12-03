// Login exclusivo para administrador

document.addEventListener('DOMContentLoaded', function () {
  console.log('[AdminLogin] Tela de login admin carregada');

  const form = document.getElementById('adminLoginForm');
  const emailInput = document.getElementById('adminEmail');
  const passwordInput = document.getElementById('adminPassword');
  const msg = document.getElementById('adminLoginMsg');

  if (!form) {
    console.error('[AdminLogin] Formulário não encontrado');
    return;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const senha = passwordInput.value.trim();

    if (!email || !senha) {
      mostrarErro('Preencha e-mail e senha.');
      return;
    }

    try {
      const API_URL = window.API_CONFIG?.AUTH || '/api/auth';

      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, senha })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.warn('[AdminLogin] Erro no login admin:', data);
        mostrarErro(data.message || 'Falha no login do administrador.');
        return;
      }

      if (!data.user || (data.user.tipo !== 'admin' && data.user.role !== 'admin')) {
        mostrarErro('Este usuário não tem permissão de administrador.');
        return;
      }

      // Login admin bem-sucedido
      const userData = {
        id: data.user.id,
        nome: data.user.nome,
        email: data.user.email,
        tipo: 'admin',
        primeiroNome: data.user.nome?.split(' ')[0] || 'Admin'
      };

      localStorage.setItem('cuidafast_admin_token', data.accessToken || '');
      localStorage.setItem('cuidafast_user', JSON.stringify(userData));
      localStorage.setItem('cuidafast_isLoggedIn', 'true');

      console.log('[AdminLogin] Admin autenticado com sucesso');
      window.location.href = 'admin-aprovacao-cuidador.html';
    } catch (err) {
      console.error('[AdminLogin] Erro inesperado:', err);
      mostrarErro('Erro ao conectar com o servidor.');
    }
  });

  function mostrarErro(texto) {
    msg.textContent = texto;
    msg.style.display = 'block';
  }
});


