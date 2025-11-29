/**
 * perfilAPI.js
 * 
 * Módulo para interagir com a API de perfis do backend
 * Substitui o uso inseguro de localStorage para dados de perfil
 * 
 * USO:
 * import { buscarPerfilCuidador, buscarPerfilCliente, listarCuidadores } from './perfilAPI.js';
 */

// Configuração da API
const API_BASE_URL = 'http://localhost:3000/api/perfil';

/**
 * Buscar perfil público de um cuidador
 * @param {number} cuidadorId - ID do cuidador
 * @returns {Promise<Object>} Dados públicos do cuidador
 */
export async function buscarPerfilCuidador(cuidadorId) {
  try {
    const response = await fetch(`${API_BASE_URL}/cuidador/${cuidadorId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Cuidador não encontrado');
      }
      throw new Error('Erro ao buscar perfil do cuidador');
    }
    
    const perfil = await response.json();
    console.log('[PerfilAPI] Perfil do cuidador carregado:', perfil.nome);
    
    return perfil;
  } catch (error) {
    console.error('[PerfilAPI] Erro ao buscar perfil do cuidador:', error);
    throw error;
  }
}

/**
 * Buscar perfil público de um cliente
 * @param {number} clienteId - ID do cliente
 * @returns {Promise<Object>} Dados públicos do cliente
 */
export async function buscarPerfilCliente(clienteId) {
  try {
    const response = await fetch(`${API_BASE_URL}/cliente/${clienteId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Cliente não encontrado');
      }
      throw new Error('Erro ao buscar perfil do cliente');
    }
    
    const perfil = await response.json();
    console.log('[PerfilAPI] Perfil do cliente carregado:', perfil.nome);
    
    return perfil;
  } catch (error) {
    console.error('[PerfilAPI] Erro ao buscar perfil do cliente:', error);
    throw error;
  }
}

/**
 * Buscar perfil por email
 * @param {string} email - Email do usuário
 * @param {string} tipo - Tipo do usuário ('cuidador' ou 'cliente')
 * @returns {Promise<Object>} Dados públicos do perfil
 */
export async function buscarPerfilPorEmail(email, tipo) {
  try {
    const url = `${API_BASE_URL}/buscar?email=${encodeURIComponent(email)}&tipo=${tipo}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Perfil não encontrado');
      }
      throw new Error('Erro ao buscar perfil');
    }
    
    const perfil = await response.json();
    console.log('[PerfilAPI] Perfil encontrado:', perfil.nome);
    
    return perfil;
  } catch (error) {
    console.error('[PerfilAPI] Erro ao buscar perfil por email:', error);
    throw error;
  }
}

/**
 * Listar todos os cuidadores disponíveis
 * @param {Object} filtros - Filtros opcionais (especialidade, cidade, valorMax)
 * @returns {Promise<Array>} Lista de cuidadores
 */
export async function listarCuidadores(filtros = {}) {
  try {
    // Construir query params
    const params = new URLSearchParams();
    if (filtros.especialidade) params.append('especialidade', filtros.especialidade);
    if (filtros.cidade) params.append('cidade', filtros.cidade);
    if (filtros.valorMax) params.append('valorMax', filtros.valorMax);
    
    const url = `${API_BASE_URL}/cuidadores?${params.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Erro ao listar cuidadores');
    }
    
    const data = await response.json();
    console.log(`[PerfilAPI] ${data.total} cuidadores encontrados`);
    
    return data.cuidadores;
  } catch (error) {
    console.error('[PerfilAPI] Erro ao listar cuidadores:', error);
    throw error;
  }
}

/**
 * Atualizar foto de perfil
 * @param {number} userId - ID do usuário
 * @param {string} fotoUrl - URL da nova foto
 * @returns {Promise<Object>} Confirmação da atualização
 */
export async function atualizarFotoPerfil(userId, fotoUrl) {
  try {
    const response = await fetch(`${API_BASE_URL}/foto`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        fotoUrl: fotoUrl
      })
    });
    
    if (!response.ok) {
      throw new Error('Erro ao atualizar foto de perfil');
    }
    
    const data = await response.json();
    console.log('[PerfilAPI] Foto de perfil atualizada');
    
    return data;
  } catch (error) {
    console.error('[PerfilAPI] Erro ao atualizar foto:', error);
    throw error;
  }
}

/**
 * Função auxiliar para preencher dados do cuidador na página
 * @param {Object} perfil - Dados do perfil do cuidador
 */
export function preencherPerfilCuidador(perfil) {
  // Nome
  const nameElement = document.getElementById('caregiverName');
  if (nameElement) nameElement.textContent = perfil.nome || 'Cuidador';
  
  // Foto
  const avatarElement = document.getElementById('caregiverAvatar');
  if (avatarElement) {
    avatarElement.src = perfil.foto_perfil || '../assets/images.webp';
    avatarElement.alt = perfil.nome;
  }
  
  // Especialidade
  const specialtyElement = document.getElementById('caregiverSpecialty');
  if (specialtyElement) {
    const tipos = perfil.tipos_cuidado ? perfil.tipos_cuidado.split(',') : [];
    const tiposTexto = tipos.map(tipo => {
      const map = {
        'idoso': 'Cuidador de Idosos',
        'crianca': 'Cuidador Infantil',
        'pet': 'Cuidador de Pets'
      };
      return map[tipo.trim()] || tipo;
    }).join(', ');
    specialtyElement.textContent = tiposTexto || 'Cuidador Geral';
  }
  
  // Descrição/Bio
  const bioElement = document.getElementById('caregiverBio');
  if (bioElement) bioElement.textContent = perfil.descricao || 'Informações não disponíveis.';
  
  // Email
  const emailElement = document.getElementById('caregiverEmail');
  if (emailElement) emailElement.textContent = perfil.email || 'Não informado';
  
  // Telefone
  const phoneElement = document.getElementById('caregiverPhone');
  if (phoneElement) phoneElement.textContent = perfil.telefone || 'Não informado';
  
  // Avaliação
  const ratingElement = document.getElementById('caregiverRating');
  if (ratingElement) {
    const rating = perfil.avaliacao || 0;
    const reviews = 0; // TODO: buscar do backend
    ratingElement.textContent = rating > 0 ? `${rating.toFixed(1)} (${reviews} avaliações)` : 'Sem avaliações';
  }
  
  // Estrelas
  const starsContainer = document.getElementById('caregiverStars');
  if (starsContainer && perfil.avaliacao) {
    const rating = perfil.avaliacao;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let starsHTML = '';
    
    for (let i = 0; i < fullStars; i++) {
      starsHTML += '<i class="ph-fill ph-star"></i>';
    }
    if (hasHalfStar) {
      starsHTML += '<i class="ph ph-star-half"></i>';
    }
    for (let i = Math.ceil(rating); i < 5; i++) {
      starsHTML += '<i class="ph ph-star"></i>';
    }
    starsContainer.innerHTML = starsHTML;
  }
  
  // Valor por hora
  const valorElement = document.getElementById('caregiverValor');
  if (valorElement && perfil.valor_hora) {
    valorElement.textContent = `R$ ${perfil.valor_hora.toFixed(2)}/hora`;
  }
  
  // Experiência
  const experienciaElement = document.getElementById('caregiverExperiencia');
  if (experienciaElement) experienciaElement.textContent = perfil.experiencia || 'Não informado';
  
  // Formação
  const formacaoElement = document.getElementById('caregiverFormacao');
  if (formacaoElement) formacaoElement.textContent = perfil.formacao || 'Não informado';
  
  // Localização
  const cidadeElement = document.getElementById('caregiverCity');
  const estadoElement = document.getElementById('caregiverState');
  if (perfil.local_trabalho) {
    const partes = perfil.local_trabalho.split(',');
    if (cidadeElement) cidadeElement.textContent = partes[0]?.trim() || '-';
    if (estadoElement) estadoElement.textContent = partes[1]?.trim() || '-';
  }
  
  console.log('[PerfilAPI] Página preenchida com dados do cuidador');
}

/**
 * Função auxiliar para preencher dados do cliente na página
 * @param {Object} perfil - Dados do perfil do cliente
 */
export function preencherPerfilCliente(perfil) {
  // Nome
  const nameElement = document.getElementById('clientName');
  if (nameElement) nameElement.textContent = perfil.nome || 'Cliente';
  
  // Foto
  const avatarElement = document.getElementById('clientAvatar');
  if (avatarElement) {
    avatarElement.src = perfil.foto_perfil || '../assets/images.webp';
    avatarElement.alt = perfil.nome;
  }
  
  // Endereço (apenas cidade/estado)
  const enderecoElement = document.getElementById('clientEndereco');
  if (enderecoElement) enderecoElement.textContent = perfil.endereco || 'Não informado';
  
  // Preferências
  const preferenciasElement = document.getElementById('clientPreferencias');
  if (preferenciasElement) preferenciasElement.textContent = perfil.preferencias || 'Não informado';
  
  console.log('[PerfilAPI] Página preenchida com dados do cliente');
}

// Exportar para uso global (se não usar módulos ES6)
if (typeof window !== 'undefined') {
  window.PerfilAPI = {
    buscarPerfilCuidador,
    buscarPerfilCliente,
    buscarPerfilPorEmail,
    listarCuidadores,
    atualizarFotoPerfil,
    preencherPerfilCuidador,
    preencherPerfilCliente
  };
}
