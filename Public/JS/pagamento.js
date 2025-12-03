async function consultarStatusPagamento(mpId) {
    const response = await fetch(`/api/pagamento/create/pagamento/${mpId}`);
    const data = await response.json();
    return data.pagamento;
}
async function criarPagamentoPIX(valor, descricao) {
    const response = await fetch('/api/pagamento/create', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            valor,
            descricao,
            metodo: "pix"
        })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao criar pagamento PIX");
    }

    return {
        qr_code: data.pagamento.qr_code,
        qr_code_base64: data.pagamento.qr_code_base64,
        mercado_pago_id: data.pagamento.mercado_pago_id,
        external_reference: data.pagamento.external_reference
    };
}
// public/js/pagamento.js
document.addEventListener('DOMContentLoaded', () => {
    const containerzin = document.querySelector('.containerzin');

    // Simulação de dados do pedido
    const order = {
        service: 95.00,
        tax: 10.00,
        total: 105.00
    };

    // Função para carregar o conteúdo da página
    function loadPage(page, data = {}) {
        switch (page) {
            case 'agendado':
                renderAgendado();
                break;
            case 'metodo-pagamento':
                renderMetodoPagamento();
                break;
            case 'pix':
                renderPix();
                break;
            case 'pagseguro':
                renderPagseguro();
                break;
            case 'pagseguro-finalizar':
                renderPagseguroFinalizar(data);
                break;
            case 'pix-finalizar':
                renderPixFinalizar(data);
                break;
            case 'intime':
                renderInTime();
                break;
            case 'resumo-intime':
                renderResumoInTime(data);
                break;
            default:
                renderAgendado();
                break;
        }
    }

    // Renderiza a página de agendamento
    function renderAgendado() {
        containerzin.innerHTML = `
            <div class="main-content">
                <div class="header">
                    <button class="back-button"><i class="ph ph-arrow-left"></i></button>
                    <h1>Contratar</h1>
                </div>
                <div class="cardzin">
                    <div class="form-group">
                        <label for="cep">CEP</label>
                        <input type="text" id="cep" value="015001-002">
                    </div>
                    <div class="form-group">
                        <label for="logradouro">Logradouro</label>
                        <input type="text" id="logradouro" value="Rua zumbi dos palmares 201">
                    </div>
                    <div class="form-group">
                        <label for="bairro">Bairro</label>
                        <input type="text" id="bairro" value="Liberdade">
                    </div>
                    <div class="form-group">
                        <label for="cidade">Cidade</label>
                        <input type="text" id="cidade" value="São Paulo">
                    </div>
                    <div class="form-group">
                        <label for="estado">Estado</label>
                        <input type="text" id="estado" value="SP">
                    </div>
                    <div class="form-group">
                        <label for="complemento">Complemento</label>
                        <input type="text" id="complemento" value="Apt 123">
                    </div>
                </div>
                <button class="button" id="continue-btn">➡️ Continuar agora</button>
            </div>
            <div class="summary-panel">
                <h3>Resumo da compra</h3>
                <div class="summary-item">
                    <span>Serviço</span>
                    <span>R$ ${order.service.toFixed(2)}</span>
                </div>
                <div class="summary-item">
                    <span>Taxa</span>
                    <span>R$ ${order.tax.toFixed(2)}</span>
                </div>
                <div class="summary-total">
                    <span>Você pagará</span>
                    <span>R$ ${order.total.toFixed(2)}</span>
                </div>
            </div>
        `;

        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                loadPage('metodo-pagamento');
            });
        }
    }

    // Renderiza a página de método de pagamento
    function renderMetodoPagamento() {
        containerzin.innerHTML = `
            <div class="main-content">
                <div class="header">
                    <button class="back-button"><i class="ph ph-arrow-left"></i></button>
                    <h1>Método de pagamento</h1>
                </div>
                <div class="cardzin">
                    <div class="payment-method-option">
                        <input type="radio" id="pix" name="payment-method" value="pix" checked>
                        <label for="pix"><i class="ph ph-pix-logo"></i> Pix</label>
                    </div>
                    <div class="payment-method-option">
                        <input type="radio" id="pagseguro" name="payment-method" value="pagseguro">
                        <label for="pagseguro"><i class="ph ph-credit-card"></i> Pag Seguro</label>
                    </div>
                </div>
                <button class="button" id="continue-payment-btn">➡️ Continuar</button>
            </div>
            <div class="summary-panel">
                <h3>Resumo da compra</h3>
                <div class="summary-item">
                    <span>Serviço</span>
                    <span>R$ ${order.service.toFixed(2)}</span>
                </div>
                <div class="summary-item">
                    <span>Taxa</span>
                    <span>R$ ${order.tax.toFixed(2)}</span>
                </div>
                <div class="summary-total">
                    <span>Você pagará</span>
                    <span>R$ ${order.total.toFixed(2)}</span>
                </div>
            </div>
        `;

        const backBtn = containerzin.querySelector('.back-button');
        if (backBtn) backBtn.addEventListener('click', () => loadPage('agendado'));

        // (a sua lógica global já trata clicks em continue-payment-btn via delegação,
        // mas adiciono listener local para garantir comportamento mesmo sem delegação)
        const continuePaymentBtn = document.getElementById('continue-payment-btn');
        if (continuePaymentBtn) {
            continuePaymentBtn.addEventListener('click', () => {
                const selected = document.querySelector("input[name='payment-method']:checked");
                const method = selected ? selected.value : 'pix';
                if (method === 'pix') loadPage('pix'); else loadPage('pagseguro');
            });
        }
    }

    // Renderiza a página de pagamento com PIX
    async function renderPix() {
        containerzin.innerHTML = `
            <div class="main-content">
                <div class="header">
                    <button class="back-button"><i class="ph ph-arrow-left"></i></button>
                    <h1>Pagamento PIX</h1>
                </div>
                <div class="cardzin text-center">
                    <div class="qr-code-containerzin">
                        <div style="text-align: center; padding: 2rem;">
                            <i class="ph ph-spinner ph-spin" style="font-size: 3rem;"></i>
                            <p>Gerando QR Code...</p>
                        </div>
                    </div>
                    <button class="button" id="copy-pix-btn" disabled>📋 Copiar código Pix</button>
                    <button class="button secondary" id="view-order-btn" disabled>👁️ Ver Pedido</button>
                </div>
            </div>
            <div class="summary-panel">
                <h3>Resumo da compra</h3>
                <div class="summary-item">
                    <span>Serviço</span>
                    <span>R$ ${order.service.toFixed(2)}</span>
                </div>
                <div class="summary-item">
                    <span>Taxa</span>
                    <span>R$ ${order.tax.toFixed(2)}</span>
                </div>
                <div class="summary-total">
                    <span>Você pagará</span>
                    <span>R$ ${order.total.toFixed(2)}</span>
                </div>
            </div>
        `;

        const backBtn = containerzin.querySelector(".back-button");
        if (backBtn) backBtn.addEventListener("click", () => loadPage("metodo-pagamento"));

        // Cria pagamento PIX real via API
        try {
            const dadosPagamento = await criarPagamentoPIX(order.total, 'Pagamento de serviço CuidaFast');

            // Atualiza QR Code
            const qrContainer = document.querySelector('.qr-code-containerzin');
            if (dadosPagamento && qrContainer) {
                if (dadosPagamento.qr_code_base64) {
                    qrContainer.innerHTML = `
                        <img src="data:image/png;base64,${dadosPagamento.qr_code_base64}" alt="QR Code PIX" style="width: 100%; max-width: 300px; margin-bottom: 20px;">
                        <p><strong>Pedido #${dadosPagamento.external_reference || '0001'}</strong></p>
                    `;
                } else if (dadosPagamento.qr_code) {
                    // mostrar código legível
                    qrContainer.innerHTML = `
                        <pre style="word-break: break-word; white-space: pre-wrap; text-align: left; padding: 10px;">${dadosPagamento.qr_code}</pre>
                        <p><strong>Pedido #${dadosPagamento.external_reference || '0001'}</strong></p>
                    `;
                } else {
                    qrContainer.innerHTML = `<p style="color: #e74c3c;">Erro ao gerar QR Code</p>`;
                }
            }

            // Habilita botões
            const copyBtn = document.getElementById("copy-pix-btn");
            const viewBtn = document.getElementById("view-order-btn");

            if (copyBtn && dadosPagamento && dadosPagamento.qr_code) {
                copyBtn.disabled = false;
                copyBtn.addEventListener("click", () => {
                    navigator.clipboard.writeText(dadosPagamento.qr_code).then(() => {
                        alert("Código PIX copiado!");
                    }).catch(() => {
                        alert("Erro ao copiar código PIX.");
                    });
                });
            }

            if (viewBtn && dadosPagamento && (dadosPagamento.mercado_pago_id || dadosPagamento.id)) {
                viewBtn.disabled = false;
                viewBtn.addEventListener("click", async () => {
                    try {
                        // usa id do MP se existir, senão tenta campo id
                        const mpId = dadosPagamento.mercado_pago_id || dadosPagamento.id;
                        const status = await consultarStatusPagamento(mpId);
                        alert(`Status do pagamento: ${status.status}`);
                        if (status.status === 'approved') {
                            loadPage("pix-finalizar", { status: "success" });
                        }
                    } catch (error) {
                        alert('Erro ao consultar status do pagamento.');
                    }
                });
            }

        } catch (error) {
            console.error('[Pagamento] Erro ao criar pagamento PIX:', error);
            const qrContainer = document.querySelector('.qr-code-containerzin');
            if (qrContainer) {
                qrContainer.innerHTML = `
                    <p style="color: #e74c3c;">Erro: ${error.message || 'Não foi possível gerar o QR Code'}</p>
                `;
            }
            alert(`Erro ao processar pagamento: ${error.message || 'Tente novamente mais tarde'}`);
        }
    }

    // Renderiza a página de pagamento com PagSeguro
    function renderPagseguro() {
        containerzin.innerHTML = `
            <div class="main-content">
                <div class="header">
                    <button class="back-button"><i class="ph ph-arrow-left"></i></button>
                    <h1>Pagamento PagSeguro</h1>
                </div>
                <div class="cardzin">
                    <p>Simulação de formulário de cartão de crédito:</p>
                    <div class="form-group">
                        <label for="card-number">Número do Cartão</label>
                        <input type="text" id="card-number" placeholder="**** **** **** ****">
                    </div>
                    <div class="form-group">
                        <label for="card-validity">Validade</label>
                        <input type="text" id="card-validity" placeholder="MM/AA">
                    </div>
                    <div class="form-group">
                        <label for="card-cvv">CVV</label>
                        <input type="text" id="card-cvv" placeholder="***">
                    </div>
                    <button class="button" id="submit-card-btn">💳 Pagar com Cartão</button>
                    <p style="text-align: center; margin: 20px 0; color: var(--color-text-secondary);">Ou</p>
                    <button class="button secondary" id="redirect-pagseguro-btn">🔗 Simular Redirecionamento PagSeguro</button>
                </div>
            </div>
            <div class="summary-panel">
                <h3>Resumo da compra</h3>
                <div class="summary-item">
                    <span>Serviço</span>
                    <span>R$ ${order.service.toFixed(2)}</span>
                </div>
                <div class="summary-item">
                    <span>Taxa</span>
                    <span>R$ ${order.tax.toFixed(2)}</span>
                </div>
                <div class="summary-total">
                    <span>Você pagará</span>
                    <span>R$ ${order.total.toFixed(2)}</span>
                </div>
            </div>
        `;

        const backBtn = containerzin.querySelector(".back-button");
        if (backBtn) backBtn.addEventListener("click", () => loadPage("metodo-pagamento"));

        const submitCardBtn = document.getElementById("submit-card-btn");
        if (submitCardBtn) {
            submitCardBtn.addEventListener("click", () => {
                alert("Simulando pagamento com cartão...");
                setTimeout(() => {
                    if (Math.random() > 0.5) {
                        loadPage("pagseguro-finalizar", { status: "success" });
                    } else {
                        loadPage("pagseguro-finalizar", { status: "error" });
                    }
                }, 1500);
            });
        }

        const redirectBtn = document.getElementById("redirect-pagseguro-btn");
        if (redirectBtn) {
            redirectBtn.addEventListener("click", () => {
                alert("Simulando redirecionamento para PagSeguro...");
                setTimeout(() => {
                    if (Math.random() > 0.5) {
                        loadPage("pagseguro-finalizar", { status: "success" });
                    } else {
                        loadPage("pagseguro-finalizar", { status: "error" });
                    }
                }, 1500);
            });
        }
    }

    // Renderiza a página de finalização do PagSeguro
    function renderPagseguroFinalizar(data) {
        containerzin.innerHTML = `
            <div class="main-content">
                <div class="header">
                    <button class="back-button"><i class="ph ph-arrow-left"></i></button>
                    <h1>Pagamento ${data.status === "success" ? "realizado com sucesso!" : "falhou!"}</h1>
                </div>
                <div class="cardzin text-center">
                    ${data.status === "success" ? `<div class="qr-code-container"><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://github.com/google/generative-ai-docs" alt="QR Code" style="margin-bottom: 20px;"><p><strong>Resumo do Pedido #0001</strong></p></div>` : `<p>❌ Ocorreu um erro no pagamento.</p>`}
                    <button class="button" id="cancel-order-btn">❌ Cancelar pedido</button>
                    <button class="button secondary" id="back-btn">⬅️ Voltar</button>
                </div>
            </div>
            <div class="summary-panel">
                <h3>Resumo da compra</h3>
                <div class="summary-item">
                    <span>Serviço</span>
                    <span>R$ ${order.service.toFixed(2)}</span>
                </div>
                <div class="summary-item">
                    <span>Taxa</span>
                    <span>R$ ${order.tax.toFixed(2)}</span>
                </div>
                <div class="summary-total">
                    <span>Você pagará</span>
                    <span>R$ ${order.total.toFixed(2)}</span>
                </div>
            </div>
        `;

        const backBtn = containerzin.querySelector(".back-button");
        if (backBtn) backBtn.addEventListener("click", () => loadPage("metodo-pagamento"));

        const backBtn2 = document.getElementById("back-btn");
        if (backBtn2) backBtn2.addEventListener("click", () => loadPage("agendado"));

        const cancelBtn = document.getElementById("cancel-order-btn");
        if (cancelBtn) cancelBtn.addEventListener("click", () => {
            alert("Pedido cancelado (simulação).");
            loadPage("agendado");
        });
    }

    // Renderiza a página de finalização do Pix
    function renderPixFinalizar(data) {
        // FIX: use containerzin (antes estava container)
        containerzin.innerHTML = `
            <div class="main-content">
                <div class="header">
                    <button class="back-button"><i class="ph ph-arrow-left"></i></button>
                    <h1>Pagamento ${data.status === "success" ? "realizado com sucesso!" : "falhou!"}</h1>
                </div>
                <div class="cardzin text-center">
                    ${data.status === "success" ? `<div class="qr-code-container"><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://github.com/google/generative-ai-docs" alt="QR Code" style="margin-bottom: 20px;"><p><strong>Resumo do Pedido #0001</strong></p></div>` : `<p>❌ Ocorreu um erro no pagamento.</p>`}
                    <button class="button" id="cancel-order-btn">❌ Cancelar pedido</button>
                    <button class="button secondary" id="back-btn">⬅️ Voltar</button>
                </div>
            </div>
            <div class="summary-panel">
                <h3>Resumo da compra</h3>
                <div class="summary-item">
                    <span>Serviço</span>
                    <span>R$ ${order.service.toFixed(2)}</span>
                </div>
                <div class="summary-item">
                    <span>Taxa</span>
                    <span>R$ ${order.tax.toFixed(2)}</span>
                </div>
                <div class="summary-total">
                    <span>Você pagará</span>
                    <span>R$ ${order.total.toFixed(2)}</span>
                </div>
            </div>
        `;

        const backBtn = containerzin.querySelector(".back-button");
        if (backBtn) backBtn.addEventListener("click", () => loadPage("metodo-pagamento"));

        const backBtn2 = document.getElementById("back-btn");
        if (backBtn2) backBtn2.addEventListener("click", () => loadPage("agendado"));

        const cancelBtn = document.getElementById("cancel-order-btn");
        if (cancelBtn) cancelBtn.addEventListener("click", () => {
            alert("Pedido cancelado (simulação).");
            loadPage("agendado");
        });
    }

    // Renderiza a página de pagamento In Time
    function renderInTime() {
        containerzin.innerHTML = `
            <div class="main-content">
                <div class="header">
                    <button class="back-button"><i class="ph ph-arrow-left"></i></button>
                    <h1>Pagamento In Time</h1>
                </div>
                <div class="cardzin">
                    <p>Esta é uma simulação de pagamento rápido.</p>
                    <button class="button" id="process-intime-btn">⚡ Processar Pagamento Rápido</button>
                </div>
            </div>
            <div class="summary-panel">
                <h3>Resumo da compra</h3>
                <div class="summary-item">
                    <span>Serviço</span>
                    <span>R$ ${order.service.toFixed(2)}</span>
                </div>
                <div class="summary-item">
                    <span>Taxa</span>
                    <span>R$ ${order.tax.toFixed(2)}</span>
                </div>
                <div class="summary-total">
                    <span>Você pagará</span>
                    <span>R$ ${order.total.toFixed(2)}</span>
                </div>
            </div>
        `;

        const backBtn = containerzin.querySelector(".back-button");
        if (backBtn) backBtn.addEventListener("click", () => loadPage("agendado"));

        const processBtn = document.getElementById("process-intime-btn");
        if (processBtn) {
            processBtn.addEventListener("click", () => {
                alert("Processando pagamento rápido...");
                setTimeout(() => {
                    if (Math.random() > 0.5) {
                        loadPage("resumo-intime", { status: "success" });
                    } else {
                        loadPage("resumo-intime", { status: "error" });
                    }
                }, 1500);
            });
        }
    }

    // Renderiza a página de resumo In Time
    function renderResumoInTime(data) {
        containerzin.innerHTML = `
            <div class="main-content">
                <div class="header">
                    <button class="back-button"><i class="ph ph-arrow-left"></i></button>
                    <h1>Resumo do Pagamento In Time</h1>
                </div>
                <div class="cardzin text-center">
                    ${data.status === "success" ? `<p>Pagamento rápido realizado com sucesso!</p>` : `<p>O pagamento rápido falhou.</p>`}
                    <p>Detalhes do Pedido #0001</p>
                    <div class="summary-item">
                        <span>Serviço</span>
                        <span>R$ ${order.service.toFixed(2)}</span>
                    </div>
                    <div class="summary-item">
                        <span>Taxa</span>
                        <span>R$ ${order.tax.toFixed(2)}</span>
                    </div>
                    <div class="summary-total">
                        <span>Total Pago</span>
                        <span>R$ ${order.total.toFixed(2)}</span>
                    </div>
                    <button class="button" id="back-to-home-btn">🏠 Voltar ao Início</button>
                </div>
            </div>
            <div class="summary-panel">
                <h3>Resumo da compra</h3>
                <div class="summary-item">
                    <span>Serviço</span>
                    <span>R$ ${order.service.toFixed(2)}</span>
                </div>
                <div class="summary-item">
                    <span>Taxa</span>
                    <span>R$ ${order.tax.toFixed(2)}</span>
                </div>
                <div class="summary-total">
                    <span>Você pagará</span>
                    <span>R$ ${order.total.toFixed(2)}</span>
                </div>
            </div>
        `;

        const backBtn = containerzin.querySelector(".back-button");
        if (backBtn) backBtn.addEventListener("click", () => loadPage("intime"));

        const backHome = document.getElementById("back-to-home-btn");
        if (backHome) backHome.addEventListener("click", () => loadPage("agendado"));
    }

    // Event Listeners Globais (delegation)
    document.addEventListener("click", (e) => {
        if (e.target && e.target.id === "continue-payment-btn") {
            const selected = document.querySelector("input[name='payment-method']:checked");
            const selectedPaymentMethod = selected ? selected.value : 'pix';
            if (selectedPaymentMethod === "pix") {
                loadPage("pix");
            } else if (selectedPaymentMethod === "pagseguro") {
                loadPage("pagseguro");
            }
        } else if (e.target && e.target.id === "view-order-btn") {
            alert("Verificando status do pedido...");
            setTimeout(() => {
                if (Math.random() > 0.5) {
                    loadPage("pix-finalizar", { status: "success" });
                } else {
                    loadPage("pix-finalizar", { status: "error" });
                }
            }, 1500);
        }
    });

    // Carregar a página inicial
    if (containerzin) {
        loadPage('agendado');
    }
});

// ==================== INTEGRAÇÃO COM MERCADO PAGO ====================

// Configuração da API
const API_PAGAMENTO_BASE = window.API_CONFIG?.PAGAMENTO || '/api/pagamento';

/**
 * Obtém dados completos do cliente do localStorage e/ou API
 */
async function obterDadosCliente() {
    try {
        const localUser = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');

        if (localUser && localUser.id) {
            let endereco = localUser.endereco;
            if (typeof endereco === 'string') {
                try {
                    endereco = JSON.parse(endereco);
                } catch (e) {
                    endereco = null;
                }
            }

            return {
                id: localUser.id,
                nome: localUser.nome || '',
                email: localUser.email || '',
                telefone: localUser.telefone || '',
                cpf: localUser.cpf || localUser.cpf_numero || '',
                endereco: endereco || {
                    cep: localUser.cep || '',
                    rua: localUser.rua || '',
                    numero: localUser.numero || '',
                    complemento: localUser.complemento || '',
                    bairro: localUser.bairro || '',
                    cidade: localUser.cidade || '',
                    estado: localUser.estado || ''
                }
            };
        }

        console.warn('[Pagamento] Dados do cliente não encontrados no localStorage');
        return null;
    } catch (error) {
        console.error('[Pagamento] Erro ao obter dados do cliente:', error);
        return null;
    }
}

/**
 * Cria um pagamento PIX via Mercado Pago
 * @param {number} valor - Valor em reais (ex: 105.90)
 * @param {string} descricao - Descrição do pagamento
 * @param {Object} dadosAdicionais - Dados adicionais como consulta_id, cuidador_id, etc.
 * @returns {Promise<Object>} Resposta da API com dados do pagamento
 */
async function criarPagamentoPIX(valor, descricao = 'Pagamento de serviço', dadosAdicionais = {}) {
    try {
        console.log('[Pagamento] Criando pagamento PIX:', { valor, descricao });

        const cliente = await obterDadosCliente();

        if (!cliente || !cliente.email) {
            throw new Error('Dados do cliente não encontrados. Por favor, complete seu cadastro.');
        }

        const payload = {
            valor: valor,
            descricao: descricao,
            cliente: cliente,
            ...dadosAdicionais
        };

        // Mantive a chamada para API exatamente como você tinha — envia metodo: 'pix' no body.
        const response = await fetch(`${API_PAGAMENTO_BASE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ valor, descricao, cliente, metodo: 'pix' })
        });

        const resultado = await response.json();

        if (!response.ok) {
            throw new Error(resultado.error || 'Erro ao criar pagamento PIX');
        }

        if (!resultado.success) {
            throw new Error(resultado.error || 'Falha ao processar pagamento');
        }

        console.log('[Pagamento] Pagamento PIX criado com sucesso:', resultado.pagamento);
        return resultado.pagamento;

    } catch (error) {
        console.error('[Pagamento] Erro ao criar pagamento PIX:', error);
        throw error;
    }
}

/**
 * Consulta o status de um pagamento
 * @param {string} paymentId - ID do pagamento (interno ou Mercado Pago)
 * @returns {Promise<Object>} Status do pagamento
 */
async function consultarStatusPagamento(paymentId) {
    try {
        console.log('[Pagamento] Consultando status do pagamento:', paymentId);

        const response = await fetch(`${API_PAGAMENTO_BASE}/${paymentId}`);
        const resultado = await response.json();

        if (!response.ok) {
            throw new Error(resultado.error || 'Erro ao consultar pagamento');
        }

        return resultado.pagamento;

    } catch (error) {
        console.error('[Pagamento] Erro ao consultar pagamento:', error);
        throw error;
    }
}

/**
 * Inicializa pagamento PIX na página pagamentopix.html
 */
window.initPagamentoPIX = async function() {
    console.log('[PagamentoPIX] Inicializando integração com Mercado Pago');

    // Obtém valor do resumo ou usa valor padrão
    const valorElement = document.querySelector('.info-item span:last-child');
    let valor = 105.90; // Valor padrão

    if (valorElement) {
        const valorText = valorElement.textContent.replace(/[^\d,]/g, '').replace(',', '.');
        valor = parseFloat(valorText) || 105.90;
    }

    // Mostra loading
    const qrCodeContainer = document.querySelector('.qr-code-container');
    const actionButtons = document.querySelector('.action-buttons');

    if (qrCodeContainer) {
        qrCodeContainer.innerHTML = '<div style="text-align: center; padding: 2rem;"><i class="ph ph-spinner ph-spin" style="font-size: 3rem;"></i><p>Gerando QR Code...</p></div>';
    }

    if (actionButtons) {
        actionButtons.style.opacity = '0.5';
        actionButtons.style.pointerEvents = 'none';
    }

    try {
        const dadosPagamento = await criarPagamentoPIX(valor, 'Pagamento de serviço CuidaFast');

        console.log('[PagamentoPIX] Pagamento criado:', dadosPagamento);

        // Exibe QR Code
        if (dadosPagamento.qr_code_base64 && qrCodeContainer) {
            qrCodeContainer.innerHTML = `<img src="data:image/png;base64,${dadosPagamento.qr_code_base64}" alt="QR Code PIX" style="width: 100%; max-width: 300px;">`;
        }

        // Atualiza informações do pedido
        const pedidoSpan = document.querySelectorAll('.info-item span')[1];
        if (pedidoSpan && dadosPagamento.external_reference) {
            pedidoSpan.textContent = `#${dadosPagamento.external_reference}`;
        }

        // Configura botão de copiar código PIX
        const btnCopyPix = document.querySelector('.btn-copy-pix');
        if (btnCopyPix && dadosPagamento.qr_code) {
            btnCopyPix.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(dadosPagamento.qr_code);
                    alert('Código PIX copiado para a área de transferência!');
                } catch (error) {
                    alert('Erro ao copiar código PIX.');
                }
            });
        }

        // Configura botão de ver pedido
        const btnViewOrder = document.querySelector('.btn-view-order');
        if (btnViewOrder && (dadosPagamento.mercado_pago_id || dadosPagamento.id)) {
            btnViewOrder.addEventListener('click', async () => {
                try {
                    const mpId = dadosPagamento.mercado_pago_id || dadosPagamento.id;
                    const status = await consultarStatusPagamento(mpId);
                    alert(`Status do pagamento: ${status.status}`);
                } catch (error) {
                    alert('Erro ao consultar status do pagamento.');
                }
            });
        }

        // Restaura botões
        if (actionButtons) {
            actionButtons.style.opacity = '1';
            actionButtons.style.pointerEvents = 'auto';
        }

        // Salva dados do pagamento no localStorage
        localStorage.setItem('cuidafast_ultimo_pagamento', JSON.stringify(dadosPagamento));

    } catch (error) {
        console.error('[PagamentoPIX] Erro ao criar pagamento:', error);

        if (qrCodeContainer) {
            qrCodeContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #e74c3c;">
                    <i class="ph ph-x-circle" style="font-size: 3rem;"></i>
                    <p>Erro ao gerar QR Code</p>
                    <p style="font-size: 0.9rem;">${error.message || 'Tente novamente mais tarde'}</p>
                </div>
            `;
        }

        if (actionButtons) {
            actionButtons.style.opacity = '1';
            actionButtons.style.pointerEvents = 'auto';
        }

        alert(`Erro ao processar pagamento: ${error.message || 'Tente novamente mais tarde'}`);
    }
};
