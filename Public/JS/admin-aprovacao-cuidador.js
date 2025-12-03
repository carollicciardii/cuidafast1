// Painel simples de aprovação de cuidadores baseado em localStorage

document.addEventListener('DOMContentLoaded', function () {
  console.log('[AdminAprovacao] Painel carregado');

  const statusTexto = document.getElementById('statusTexto');
  const campoNome = document.getElementById('campo-nome');
  const campoEmail = document.getElementById('campo-email');
  const campoTipo = document.getElementById('campo-tipo');
  const campoStatusAprovacao = document.getElementById('campo-status-aprovacao');
  const listaDocumentos = document.getElementById('lista-documentos');
  const btnAprovar = document.getElementById('btn-aprovar');
  const btnReprovar = document.getElementById('btn-reprovar');

  // Verificar se há um admin logado
  let usuarioSessao = {};
  try {
    usuarioSessao = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');
  } catch (e) {
    usuarioSessao = {};
  }

  const isLoggedIn = localStorage.getItem('cuidafast_isLoggedIn') === 'true';
  if (!isLoggedIn || (usuarioSessao.tipo !== 'admin' && usuarioSessao.role !== 'admin')) {
    alert('Acesso restrito. Faça login como administrador.');
    window.location.href = 'admin-login.html';
    return;
  }

  // Ler dados atuais do cuidador no navegador (simples: cuidador atual deste browser)
  let userData = {};
  try {
    userData = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');
  } catch (e) {
    console.error('[AdminAprovacao] Erro ao ler cuidafast_user:', e);
  }

  const flagAprovado = localStorage.getItem('cuidafast_cuidador_aprovado');

  if (!userData || !userData.email || userData.tipo !== 'cuidador') {
    statusTexto.textContent = 'Nenhum cuidador pendente encontrado neste navegador.';
    campoNome.textContent = '-';
    campoEmail.textContent = '-';
    campoTipo.textContent = '-';
    campoStatusAprovacao.textContent = 'N/A';
    btnAprovar.disabled = true;
    btnReprovar.disabled = true;
    return;
  }

  // Preencher campos básicos
  campoNome.textContent = userData.nome || '-';
  campoEmail.textContent = userData.email || '-';
  campoTipo.textContent = userData.tipo || 'cuidador';

  const documentos = userData.documentos || {};

  function addItem(label, valor) {
    const li = document.createElement('li');
    li.style.marginBottom = '0.35rem';
    li.innerHTML = `<strong>${label}:</strong> ${valor || '<span style="color:#999">não enviado</span>'}`;
    listaDocumentos.appendChild(li);
  }

  listaDocumentos.innerHTML = '';
  addItem('RG / CNH', documentos.rgCnh);
  addItem('Certificados', (documentos.certificados || []).join(', '));
  addItem('Feedbacks', (documentos.feedbacks || []).join(', '));
  addItem('Certidão de antecedentes criminais', documentos.antecedentesCriminais);
  addItem('Foto atual', documentos.fotoAtual);
  addItem('Registro de classe (opcional)', documentos.registroClasse);

  function atualizarStatusTexto() {
    if (flagAprovado === 'true') {
      campoStatusAprovacao.textContent = 'APROVADO';
      campoStatusAprovacao.style.color = '#1B5E20';
      statusTexto.textContent = 'Cuidador aprovado. Ele já pode fazer login normalmente.';
    } else if (flagAprovado === 'reprovado') {
      campoStatusAprovacao.textContent = 'REPROVADO';
      campoStatusAprovacao.style.color = '#B3261E';
      statusTexto.textContent = 'Cuidador reprovado. Ele não poderá acessar como cuidador.';
    } else {
      campoStatusAprovacao.textContent = 'EM ANÁLISE';
      campoStatusAprovacao.style.color = '#E65100';
      statusTexto.textContent = 'Cadastro em análise. Use os botões abaixo para aprovar ou reprovar.';
    }
  }

  atualizarStatusTexto();

  btnAprovar.addEventListener('click', function () {
    localStorage.setItem('cuidafast_cuidador_aprovado', 'true');
    userData.cadastroEmAnalise = false;
    userData.statusAprovacao = 'aprovado';
    localStorage.setItem('cuidafast_user', JSON.stringify(userData));
    alert('✅ Cuidador aprovado. Ele já pode fazer login.');
    atualizarStatusTexto();
  });

  btnReprovar.addEventListener('click', function () {
    if (!confirm('Tem certeza que deseja reprovar este cadastro?')) return;
    localStorage.setItem('cuidafast_cuidador_aprovado', 'reprovado');
    userData.cadastroEmAnalise = false;
    userData.statusAprovacao = 'reprovado';
    localStorage.setItem('cuidafast_user', JSON.stringify(userData));
    alert('Cadastro reprovado. O cuidador não poderá acessar como cuidador.');
    atualizarStatusTexto();
  });
});


