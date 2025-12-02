// Public/JS/cadastroComplementoCuidador.js
document.addEventListener('DOMContentLoaded', function() {
  console.log('[cadastroComplementoCuidador] Página carregada');

  const userData = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');
  const photoUploadGroup = document.getElementById('photoUploadGroup');
  const photoUpload = document.getElementById('photoUpload');
  const photoPreview = document.getElementById('photoPreview');
  const selectPhotoBtn = document.getElementById('selectPhotoBtn');

  let uploadedPhotoURL = null;

  // Mostrar campo de foto apenas se NÃO cadastrou com Google
  if (!userData.photo_url && photoUploadGroup) {
    photoUploadGroup.style.display = 'block';
    console.log('[cadastroComplementoCuidador] Campo de foto exibido (sem Google)');
  } else if (userData.photo_url) {
    console.log('[cadastroComplementoCuidador] Usando foto do Google:', userData.photo_url);
  }

  if (selectPhotoBtn && photoUpload) {
    selectPhotoBtn.addEventListener('click', function() {
      photoUpload.click();
    });
  }

  if (photoUpload && photoPreview) {
    photoUpload.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          alert('Arquivo muito grande. Tamanho máximo: 5MB');
          return;
        }
        if (!file.type.startsWith('image/')) {
          alert('Por favor, selecione uma imagem válida.');
          return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
          uploadedPhotoURL = event.target.result;
          photoPreview.innerHTML = `<img src="${uploadedPhotoURL}" alt="Preview da foto">`;
          console.log('[cadastroComplementoCuidador] Foto carregada');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const cpfInput = document.getElementById('cpf');
  const telefoneInput = document.getElementById('telefone');

  if (cpfInput) {
    cpfInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      }
      e.target.value = value;
    });
  }

  // --- helper para detectar UUID v4 ---
  function looksLikeUUID(v) {
    return typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
  }

  // --- função helper para depurar respostas que não sejam JSON ---
  async function safeFetchJson(url, options) {
    const r = await fetch(url, options);
    const text = await r.text(); // pega sempre o texto cru

    try {
      const json = JSON.parse(text);
      return { ok: r.ok, status: r.status, data: json, raw: text };
    } catch (e) {
      console.error('[DEBUG] Resposta NÃO é JSON válido:', text);
      const err = new Error(`Resposta inválida do servidor. Não é JSON. Status ${r.status}`);
      err.raw = text;
      err.status = r.status;
      throw err;
    }
  }

  const form = document.getElementById('complementForm');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log('[cadastroComplementoCuidador] Formulário submetido');

      const existingData = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');
      if (!existingData.email && !existingData.usuario_id && !existingData.id) {
        alert('❌ Erro: Dados do cadastro inicial não encontrados. Por favor, faça o cadastro novamente.');
        window.location.href = 'cadastro.html';
        return;
      }

      const cpf = document.getElementById('cpf').value;
      const dataNascimento = document.getElementById('dataNascimento').value;

      if (!cpf || !dataNascimento) {
        alert('Por favor, preencha todos os campos.');
        return;
      }

      const usuarioId = existingData.usuario_id || existingData.id;
      if (!usuarioId) {
        alert('❌ Erro: ID do usuário não encontrado. Por favor, faça o cadastro novamente.');
        window.location.href = 'cadastro.html';
        return;
      }

      const updatedData = {
        ...existingData,
        cpf_numero: cpf,
        data_nascimento: dataNascimento,
        cadastroComplementoCompleto: true,
        updatedAt: new Date().toISOString(),
      };

      if (uploadedPhotoURL && !existingData.photo_url) {
        updatedData.photo_url = uploadedPhotoURL;
        console.log('[cadastroComplementoCuidador] Foto do upload adicionada');
      }

      try {
        const API_URL = window.API_CONFIG?.AUTH || "/api/auth";

        // Prepara dados para envio - inclui email obrigatório
        const payload = {
          tipo: 'cuidador',
          cpf: cpf.replace(/\D/g, ''),
          cpf_numero: cpf.replace(/\D/g, ''),
          data_nascimento: dataNascimento,
          photo_url: updatedData.photo_url || null,
          email: existingData.email || null // ✅ Adicionado
        };

        // Decide como enviar o identificador
        const idStr = String(usuarioId);
        if (looksLikeUUID(idStr)) {
          payload.auth_uid = idStr;
          console.log('[cadastroComplementoCuidador] Enviando auth_uid (UUID):', idStr);
        } else {
          const maybeNum = Number(usuarioId);
          if (!Number.isNaN(maybeNum) && Number.isInteger(maybeNum)) {
            payload.usuario_id = maybeNum;
            console.log('[cadastroComplementoCuidador] Enviando usuario_id (num):', maybeNum);
          } else {
            payload.usuario_id = usuarioId;
            console.log('[cadastroComplementoCuidador] Enviando usuario_id (string fallback):', usuarioId);
          }
        }

        console.log('[cadastroComplementoCuidador] Enviando dados:', payload);

        const result = await safeFetchJson(`${API_URL}/complete-profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!result.ok) {
          console.error('[cadastroComplementoCuidador] Erro do backend:', result.data || result.raw);
          alert(result.data?.message || result.data?.error || `Erro ${result.status}`);
          return;
        }

        const resData = result.data;

        if (resData.user) {
          const userData = {
            ...updatedData,
            usuario_id: resData.user.usuario_id || resData.user.id || usuarioId,
            id: resData.user.usuario_id || resData.user.id || usuarioId,
            cpf_numero: resData.user.cpf || resData.user.cpf_numero || cpf.replace(/\D/g, ''),
            data_nascimento: resData.user.data_nascimento || dataNascimento,
            photo_url: resData.user.photo_url || updatedData.photo_url,
            tipo: resData.user.tipo || 'cuidador'
          };
          localStorage.setItem('cuidafast_user', JSON.stringify(userData));
          localStorage.setItem('cuidafast_isLoggedIn', 'true');
        } else {
          updatedData.usuario_id = usuarioId;
          updatedData.id = usuarioId;
          updatedData.tipo = 'cuidador';
          localStorage.setItem('cuidafast_user', JSON.stringify(updatedData));
        }

        console.log('[cadastroComplementoCuidador] Dados salvos com sucesso');
        window.location.href = 'cadastrocuidadortipo.html';
      } catch (error) {
        console.error('[cadastroComplementoCuidador] erro ao enviar ao backend', error);
        if (error.raw) console.error('[cadastroComplementoCuidador] corpo cru retornado:', error.raw);
        alert('Erro ao salvar no servidor: ' + (error.message || 'Erro desconhecido'));
      }
    });
  }
});
