// cadastro.js
// Versão revisada — mantém seu fluxo original (POST /api/auth/register) e adiciona
// fallback/integração com Supabase (anon key) quando necessário.
// REMOVER referências ao Firebase (feito).
//
// AÇÕES NECESSÁRIAS: substitua SUPABASE_ANON_KEY por sua anon key pública.
// Se usar serverless (recomendado para casos com confirmação por e-mail), veja instruções abaixo.

import { createClient } from "https://esm.sh/@supabase/supabase-js";

// ---------------------- CONFIGURAÇÃO ----------------------
const SUPABASE_URL = "https://omvwicetojhqurdeuequ.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tdndpY2V0b2pocXVyZGV1ZXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTI5MTEsImV4cCI6MjA3ODk4ODkxMX0.3XyOux7wjBIC2kIlmdSCTYzznzZOk5tJcHJJMA3Jggc"; // substitua pela sua anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Opcional: endpoint serverless que criamos/discutimos (usado quando signUp retorna user = null).
// Usa rota proxy do backend: /api/auth/create-or-associate-user
const SERVERLESS_CREATE_ENDPOINT = "/api/auth/create-or-associate-user";
const SERVERLESS_SECRET_TO_SEND = ""; // opcional: se você configurou CREATE_USER_SECRET no server, coloque aqui

// ---------------------- HELPERS ----------------------
/**
 * Retorna o valor do primeiro elemento que existir entre os ids informados.
 * Útil para suportar variantes do HTML (input-nome ou nome etc).
 */
function getVal(...ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el.value.trim();
  }
  return "";
}

/**
 * Retorna o elemento by ids (first that exists)
 */
function getEl(...ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

/**
 * Mensagem de UI simples (usa alert por padrão; pode ser substituído)
 */
function uiMsg(text, type = "info") {
  // type: info | success | error
  // Você pode trocar isso para injetar em um elemento da página
  console[type === "error" ? "error" : "log"]("[Cadastro] " + text);
  // exibir alert apenas para erros críticos ou para feedback imediato:
  if (type === "error") alert(text);
}

// ---------------------- VARS GLOBAIS ----------------------
let btnCuidador, btnCliente, form, btnSubmit, btnGoogle;

// ---------------------- BOOTSTRAP ----------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("[Cadastro] Inicializando página...");

  // Localiza elementos tentando múltiplos IDs para compatibilidade com seu HTML
  btnCuidador = getEl("btn-cuidador", "btnCuidador", "btnCuidadorId");
  btnCliente = getEl("btn-cliente", "btnCliente", "btnClienteId");
  form = getEl("form-cadastro", "form-step1", "form-completo");
  btnSubmit = form ? form.querySelector("button[type='submit'], button.btn") : null;

  // Botão Google pode ter vários ids - tente alguns
  btnGoogle = getEl("btn-google", "btnGoogle", "btnGoogleSupabase", "btnGoogleOauth");

  if (!btnCuidador || !btnCliente || !form || !btnSubmit) {
    uiMsg("Elementos principais não encontrados (btn-cuidador, btn-cliente, form-cadastro, submit). Verifique IDs no HTML.", "error");
    return;
  }

  // Estado inicial visual
  btnCuidador.classList.add("active");
  btnCliente.classList.add("inactive");
  btnSubmit.textContent = "Continuar";

  // Event listeners
  btnCuidador.addEventListener("click", ativarCuidador);
  btnCliente.addEventListener("click", ativarCliente);
  form.addEventListener("submit", handleFormSubmit);

  if (btnGoogle) {
    btnGoogle.addEventListener("click", loginGoogleSupabase);
  } else {
    console.warn("[Cadastro] Botão Google não encontrado — OAuth Google ficará desabilitado.");
  }
});

// ---------------------- UI: Toggle ----------------------
function ativarCuidador() {
  btnCuidador.classList.add("active");
  btnCuidador.classList.remove("inactive");
  btnCliente.classList.remove("active");
  btnCliente.classList.add("inactive");
  if (btnSubmit) btnSubmit.textContent = "Continuar";
}

function ativarCliente() {
  btnCliente.classList.add("active");
  btnCliente.classList.remove("inactive");
  btnCuidador.classList.remove("active");
  btnCuidador.classList.add("inactive");
  if (btnSubmit) btnSubmit.textContent = "Continuar";
}

// ---------------------- HANDLER: submit do form ----------------------
async function handleFormSubmit(event) {
  event.preventDefault();
  console.log("[Cadastro] Formulário enviado");

  // Suporta vários nomes de ids (compatibilidade)
  const nome = getVal("input-nome", "nome", "input-name");
  const email = getVal("input-email", "email", "input-email-address");
  const telefone = getVal("input-telefone", "telefone", "input-phone");
  const senha = getVal("input-senha", "senha", "input-password");

  if (!nome || !email || !senha) {
    uiMsg("Preencha todos os campos obrigatórios: nome, e-mail e senha.", "error");
    return;
  }

  const tipoUsuario = btnCuidador.classList.contains("active") ? "cuidador" : "cliente";

  // Disable botão
  btnSubmit.disabled = true;
  btnSubmit.textContent = "Cadastrando...";

  try {
    // Se existir configuração de API externa (backend), use ela como primário
    const API_URL = window.API_CONFIG?.AUTH || "/api/auth";

    // Se backend estiver presente (rota /register), mantenha seu fluxo original
    // Faz POST para /api/auth/register — essa é sua implementação atual
    // Se você não tiver backend, a resposta será 404 e cairemos para o fallback com Supabase
    let usedBackend = false;
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          senha,
          telefone: telefone || null,
          data_nascimento: null,
          tipo: tipoUsuario,
        }),
      });

      if (response.ok) {
        usedBackend = true;
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          console.error("[Cadastro] Erro ao parsear resposta JSON:", parseError);
          uiMsg("Resposta do servidor inválida. Tente novamente.", "error");
          return;
        }
        
        // Supondo que seu backend responda com user object (como antes)
        const user = data.user || data;
        
        if (!user) {
          uiMsg("Resposta do servidor não contém dados do usuário.", "error");
          return;
        }
        
        const resolvedId = user.usuario_id ?? user.id;
        
        if (!resolvedId) {
          console.error("[Cadastro] Resposta do servidor não contém ID do usuário:", data);
          uiMsg("Erro: ID do usuário não encontrado na resposta do servidor.", "error");
          return;
        }
        
        const userData = {
          id: resolvedId,
          usuario_id: resolvedId,
          nome: user.nome || nome,
          email: user.email || email,
          telefone: user.telefone || telefone,
          tipo: tipoUsuario,
          dataCadastro: user.data_cadastro || user.dataCadastro || new Date().toISOString(),
          primeiroNome: nome.split(" ")[0],
        };

        // Salva accessToken se fornecido pelo backend
        if (data.accessToken) {
          userData.accessToken = data.accessToken;
          localStorage.setItem("cuidafast_accessToken", data.accessToken);
        }

        localStorage.setItem("cuidafast_user", JSON.stringify(userData));
        localStorage.setItem("cuidafast_isLoggedIn", "true");

        console.log("[Cadastro] Usuário cadastrado com sucesso. Redirecionando...");
        
        // Pequeno delay para garantir que localStorage foi salvo
        setTimeout(() => {
          // redireciona conforme tipo
          if (tipoUsuario === "cuidador") {
            window.location.href = "../HTML/cadastroComplementoCuidador.html";
          } else {
            window.location.href = "../HTML/cadastroComplemento.html";
          }
        }, 100);
        return;
      } else {
        // response não ok -> mostrar msg e tentar fallback se supabase configurado
        let err;
        try {
          err = await response.json();
        } catch (parseError) {
          err = { message: `Erro HTTP ${response.status}: ${response.statusText}` };
        }
        
        console.error("[Cadastro] Erro do backend:", err);
        uiMsg(err.message || err.error || `Erro do backend (${response.status}). Tentando fallback (Supabase)...`, "error");
        // não 'return' aqui: deixa passar para tentar fallback abaixo
      }
    } catch (err) {
      console.warn("[Cadastro] Erro ao chamar backend /register:", err);
      // tenta fallback se supabase estiver configurado
    }

    // ---------- Fallback: tentar usar Supabase diretamente (se anonim key estiver setada) ----------
    if (!supabase) {
      uiMsg("Nenhum backend responsivo e Supabase não configurado no frontend. Configure uma das opções.", "error");
      return;
    }

    // 1) signUp via Supabase Auth
    const { data: signData, error: signError } = await supabase.auth.signUp({ email, password: senha });

    if (signError) {
      console.error("[Cadastro] signUp error:", signError);
      uiMsg("Erro ao criar conta no Supabase: " + signError.message, "error");
      return;
    }

    // signData.user pode ser null se confirmação por e-mail estiver ativada
    const user = signData?.user ?? null;
    if (!user) {
      // user === null -> email confirmation required
      uiMsg("Conta criada. Verifique seu e-mail para confirmar. Salvando dados temporariamente via serverless (se disponível).", "info");

      // Tenta chamar endpoint serverless (create-or-associate-user) para salvar dados pendentes
      try {
        const payload = {
          email,
          name: nome,
          phone: telefone || null,
          cpf: null,
          birth_date: null,
          role: tipoUsuario,
          address: null,
          avatar_path: null
        };

        const serverRes = await fetch(SERVERLESS_CREATE_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(SERVERLESS_SECRET_TO_SEND ? { "x-create-secret": SERVERLESS_SECRET_TO_SEND } : {})
          },
          body: JSON.stringify(payload)
        });

        if (serverRes.ok) {
          uiMsg("Seus dados foram salvos temporariamente no servidor. Após confirmar o e-mail será feita a associação.", "success");
        } else {
          console.warn("[Cadastro] Falha ao chamar serverless:", await serverRes.text());
          uiMsg("Conta criada — verifique seu e-mail. Não foi possível salvar dados temporariamente (serverless ausente).", "error");
        }
      } catch (err) {
        console.error("[Cadastro] Erro ao chamar serverless:", err);
        uiMsg("Conta criada — verifique seu e-mail. Não foi possível salvar dados temporariamente (erro de conexão).", "error");
      }

      return;
    }

    // Se temos 'user' (sem confirmação por e-mail), prosseguir criando linha em sua tabela 'usuario'
    const authUid = user.id;
    console.log("[Cadastro] signUp success, authUid=", authUid);

    // Inserir na sua tabela public.usuario via anon key: se RLS exigir auth.uid() = auth_uid, você já está autenticado
    const insertPayload = {
      nome,
      email,
      senha: null, // não armazene senha se fizer auth pelo Supabase (a senha está no auth.users)
      telefone: telefone || null,
      data_nascimento: null,
      auth_uid: authUid
    };

    const { data: newUsuario, error: errUsr } = await supabase
      .from("usuario")
      .insert([insertPayload])
      .select("usuario_id")
      .single();

    if (errUsr) {
      console.error("[Cadastro] erro ao inserir usuario:", errUsr);
      uiMsg("Erro ao gravar dados do usuário. Verifique regras do banco (RLS/policies).", "error");
      return;
    }

    const usuarioId = newUsuario.usuario_id;
    // cria registro em cliente ou cuidador
    if (tipoUsuario === "cuidador") {
      await supabase.from("cuidador").insert([{ usuario_id: usuarioId }]).catch((e)=>console.warn("aviso: erro inserir cuidador", e));
    } else {
      await supabase.from("cliente").insert([{ usuario_id: usuarioId }]).catch((e)=>console.warn("aviso: erro inserir cliente", e));
    }

    // login local/session: gravar localStorage
    const userData = {
      id: usuarioId,
      usuario_id: usuarioId,
      nome,
      email,
      telefone,
      tipo: tipoUsuario,
      primeiroNome: nome.split(" ")[0]
    };
    localStorage.setItem("cuidafast_user", JSON.stringify(userData));
    localStorage.setItem("cuidafast_isLoggedIn", "true");

    // Pequeno delay para garantir que localStorage foi salvo
    setTimeout(() => {
      // redireciona para complemento conforme tipo
      if (tipoUsuario === "cuidador") {
        window.location.href = "../HTML/cadastroComplementoCuidador.html";
      } else {
        window.location.href = "../HTML/cadastroComplemento.html";
      }
    }, 100);
  } catch (err) {
    console.error("[Cadastro] erro inesperado:", err);
    uiMsg("Erro inesperado no processo de cadastro. Veja console.", "error");
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Continuar";
  }
}

async function loginGoogleSupabase() {
  if (!supabase) {
    uiMsg("Supabase não configurado no frontend. Não é possível iniciar OAuth.", "error");
    return;
  }

  console.log("[Cadastro] Login Google via Supabase iniciado…");
  const tipoUsuario = btnCuidador.classList.contains("active") ? "cuidador" : "cliente";

  // Guarda escolha para o callback ler e decidir (callback pode usar localStorage)
  localStorage.setItem("cuidafast_tipoRegistro", tipoUsuario);

  // Redireciona para o fluxo OAuth do Supabase (configure Redirect URLs no painel Supabase)
  // IMPORTANTE: Configure esta URL no painel do Supabase em Authentication > URL Configuration > Redirect URLs
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/HTML/callbackGoogle.html`
    }
  });
}

export {
  ativarCuidador,
  ativarCliente,
  handleFormSubmit,
  loginGoogleSupabase
};
