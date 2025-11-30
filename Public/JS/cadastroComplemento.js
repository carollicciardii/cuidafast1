// Public/JS/cadastroComplemento.js
import { createClient } from "https://esm.sh/@supabase/supabase-js";

/* ================== CONFIG ================== */
// coloque sua URL/ANON_KEY corretas
const SUPABASE_URL = "https://omvwicetojhqurdeuequ.supabase.co";
const SUPABASE_ANON_KEY = "COLE_SUA_ANON_KEY_AQUI";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Endpoint do backend que valida token e faz upsert na tabela usuario
// Quando API_CONFIG.AUTH existe, usamos proxy /api/auth/complete-profile; senão, chamamos rota direta.
const API_COMPLETE_PROFILE = window.API_CONFIG?.AUTH
  ? `${window.API_CONFIG.AUTH}/complete-profile`
  : "/api/authe/complete-profile";
window.supabase = supabase;
/* ============== HELPERS ÚTEIS =============== */
const $ = (id) => document.getElementById(id);
const qs = (sel) => document.querySelector(sel);

function uiBusy(isBusy, btn) {
  if (!btn) return;
  btn.disabled = isBusy;
  btn.textContent = isBusy ? "Salvando..." : "Finalizar";
}

function showAlert(msg) {
  // simples: alert. Você pode trocar para um componente visual.
  alert(msg);
}

/* ============== INICIALIZAÇÃO =============== */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[cadastroComplemento] iniciado");

  // 1) tenta recuperar session do Supabase
  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data?.session ?? null;
    console.log("[cadastroComplemento] session:", session ? "(presente)" : "(ausente)");
  } catch (err) {
    console.warn("[cadastroComplemento] erro ao obter session:", err);
  }

  // 2) Se houver user via OAuth, preencha campos públicos
  const user = session?.user ?? null;
  if (user) {
    console.log("[cadastroComplemento] usuário detectado:", user.email);
    // popula localStorage temporário e/ou campo visível (se tiver)
    localStorage.setItem("cuidafast_oauth_user", JSON.stringify({
      email: user.email,
      nome: user.user_metadata?.full_name ?? "",
      photo_url: user.user_metadata?.avatar_url ?? ""
    }));

    // opcional: preenche inputs se existirem (ex.: nome já no form)
    const nomeInput = $("nome") || $("input-nome");
    if (nomeInput && !nomeInput.value) nomeInput.value = user.user_metadata?.full_name || user.email.split("@")[0];
  } else {
    // se não autenticado via Supabase, talvez venha de cadastro tradicional
    console.log("[cadastroComplemento] sem session supabase — fluxo tradicional ou sessão no backend.");
  }

  // 3) Hook do submit do form
  const form = $("form-complemento");
  if (!form) {
    console.error("[cadastroComplemento] form-complemento não encontrado no DOM");
    return;
  }
  form.addEventListener("submit", (ev) => handleSubmit(ev, session));
});

/* ============== SUBMIT HANDLER =============== */
async function handleSubmit(ev, initialSession) {
  ev.preventDefault();
  const submitBtn = ev.target.querySelector("button[type='submit']") || qs("button.btn");
  uiBusy(true, submitBtn);

  try {
    // 1) coleta dos campos do formulário
    const dataNascimento = $("dataNascimento")?.value || null;
    const cpf = $("cpf")?.value?.trim() || null;
    const cep = $("cep")?.value?.trim() || null;
    const numero = $("numero")?.value?.trim() || null;
    const rua = $("rua")?.value?.trim() || null;
    const complemento = $("complemento")?.value?.trim() || null;
    const bairro = $("bairro")?.value?.trim() || null;
    const cidade = $("cidade")?.value?.trim() || null;
    const estado = $("estado")?.value?.trim() || null;

    // validações básicas (exemplo)
    if (!cpf || !cep || !rua || !bairro || !cidade || !estado) {
      showAlert("Preencha os campos obrigatórios: CPF, CEP, Rua, Bairro, Cidade e UF.");
      uiBusy(false, submitBtn);
      return;
    }

    // 2) pega sessão atual (em caso de refresh)
    const { data } = await supabase.auth.getSession();
    const session = data?.session ?? initialSession ?? null;
    const user = session?.user ?? null;
    const accessToken = session?.access_token ?? null;

    // 3) decide qual fluxo usar para enviar dados ao backend
    // Fluxo A (recomendado): usuário autenticado via Supabase -> enviar token para backend e deixar backend validar e upsert por auth_uid
    if (user && accessToken) {
      console.log("[cadastroComplemento] enviando complete-profile com token (fluxo OAuth). user.id=", user.id);

      // Verifica se já tem usuario_id no localStorage (criado pelo google-login)
      const localUser = (() => {
        try { return JSON.parse(localStorage.getItem("cuidafast_user") || null); } catch(e){ return null; }
      })();

      const payload = {
        cpf,
        data_nascimento: dataNascimento,
        cep, numero, rua, bairro, cidade, estado, complemento
      };

      // Se tiver usuario_id, envia junto para usar FLUXO 1 (update por usuario_id)
      // Isso evita problemas com upsert quando auth_uid não foi salvo corretamente
      if (localUser && localUser.usuario_id) {
        payload.usuario_id = localUser.usuario_id;
      }

      const resp = await fetch(API_COMPLETE_PROFILE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      const result = await resp.json().catch(()=>({}));
      if (!resp.ok) {
        console.warn("[cadastroComplemento] backend respondeu erro:", result);
        showAlert(result?.error || "Não foi possível salvar seus dados. Tente novamente.");
        uiBusy(false, submitBtn);
        return;
      }

      // sucesso: backend retornou usuario atualizado
      if (result.user) {
        const resolvedId = result.user.usuario_id ?? result.user.id;
        
        // Monta objeto de endereço a partir dos campos do banco
        const endereco = {};
        if (result.user.rua) endereco.rua = result.user.rua;
        if (result.user.numero) endereco.numero = result.user.numero;
        if (result.user.complemento) endereco.complemento = result.user.complemento;
        if (result.user.bairro) endereco.bairro = result.user.bairro;
        if (result.user.cidade) endereco.cidade = result.user.cidade;
        if (result.user.estado) endereco.estado = result.user.estado;
        if (result.user.cep) endereco.cep = result.user.cep;
        
        // Prepara dados completos para salvar
        const storedUser = {
          ...result.user,
          id: resolvedId,
          usuario_id: resolvedId,
          tipo: result.user.tipo || 'cliente',
          endereco: Object.keys(endereco).length > 0 ? endereco : null,
          photoURL: result.user.photo_url || null,
          primeiroNome: (result.user.nome || '').split(' ')[0],
          cpf: result.user.cpf || result.user.cpf_numero || null,
          dataNascimento: result.user.data_nascimento || null
        };
        
        localStorage.setItem("cuidafast_user", JSON.stringify(storedUser));
        localStorage.setItem("cuidafast_isLoggedIn", "true");
        localStorage.setItem("cuidafast_usuario_id", String(resolvedId));
        
        console.log("[cadastroComplemento] Dados salvos no localStorage com endereço:", storedUser);
      }

      // redireciona para home do cliente
      window.location.href = `${window.location.origin}/HTML/homeCliente.html`;
      return;
    }

    // Fluxo B (alternativa): não autenticado via Supabase, mas backend já criou usuario no registro anterior
    // usa usuario armazenado no localStorage (por exemplo veio do /register)
    const localUser = (() => {
      try { return JSON.parse(localStorage.getItem("cuidafast_user") || null); } catch(e){ return null; }
    })();

    if (localUser && localUser.id) {
      console.log("[cadastroComplemento] usando usuario_id do localStorage:", localUser.id);

      const payload = {
        usuario_id: localUser.id,
        cpf,
        data_nascimento: dataNascimento,
        cep, numero, rua, bairro, cidade, estado, complemento,
        tipo: 'cliente'
      };

      const resp = await fetch(API_COMPLETE_PROFILE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await resp.json().catch(()=>({}));
      if (!resp.ok) {
        console.warn("[cadastroComplemento] backend (usuario_id) erro:", result);
        showAlert(result?.error || "Não foi possível salvar. Tente novamente.");
        uiBusy(false, submitBtn);
        return;
      }

      if (result.user) {
        const resolvedId = result.user.usuario_id ?? result.user.id;
        
        // Monta objeto de endereço a partir dos campos do banco
        const endereco = {};
        if (result.user.rua) endereco.rua = result.user.rua;
        if (result.user.numero) endereco.numero = result.user.numero;
        if (result.user.complemento) endereco.complemento = result.user.complemento;
        if (result.user.bairro) endereco.bairro = result.user.bairro;
        if (result.user.cidade) endereco.cidade = result.user.cidade;
        if (result.user.estado) endereco.estado = result.user.estado;
        if (result.user.cep) endereco.cep = result.user.cep;
        
        // Prepara dados completos para salvar
        const storedUser = {
          ...result.user,
          id: resolvedId,
          usuario_id: resolvedId,
          tipo: result.user.tipo || 'cliente',
          endereco: Object.keys(endereco).length > 0 ? endereco : null,
          photoURL: result.user.photo_url || null,
          primeiroNome: (result.user.nome || '').split(' ')[0],
          cpf: result.user.cpf || result.user.cpf_numero || null,
          dataNascimento: result.user.data_nascimento || null
        };
        
        localStorage.setItem("cuidafast_user", JSON.stringify(storedUser));
        localStorage.setItem("cuidafast_isLoggedIn", "true");
        
        console.log("[cadastroComplemento] Dados salvos no localStorage com endereço (fluxo B):", storedUser);
      }
      // após complementar cadastro normal de cliente, ir para homeCliente
      window.location.href = `${window.location.origin}/HTML/homeCliente.html`;
      return;
    }

    // Fluxo C (fallback): sem token e sem usuario_id — instruir o usuário a logar novamente
    showAlert("Sessão expirada ou não autenticado. Por favor, faça login novamente.");
    window.location.href = `${window.location.origin}/HTML/cadastro.html`;

  } catch (err) {
    console.error("[cadastroComplemento] erro no submit:", err);
    showAlert("Erro inesperado ao salvar seus dados. Tente novamente.");
  } finally {
    uiBusy(false, submitBtn);
  }
}
// DEBUG TEMPORÁRIO - colocar dentro do módulo (cadastroComplemento.js)
window.supabase = supabase; // expõe para o console (REMOVA depois em produção)

(async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('[DEBUG] supabase.auth.getSession() ->', { data, error });
    // mostra usuário e token de forma segura (não imprimir token inteiro em produção)
    const session = data?.session ?? null;
    console.log('[DEBUG] session present?', !!session);
    console.log('[DEBUG] user (session.user):', session?.user ?? null);
    console.log('[DEBUG] access_token (preview):', session?.access_token ? session.access_token.slice(0,20) + '…' : null);
  } catch (err) {
    console.error('[DEBUG] erro ao chamar getSession():', err);
  }
})();
