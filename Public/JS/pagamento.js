document.getElementById("btnContinuePayment")?.addEventListener("click", async () => {
    const metodo = document.querySelector("input[name='payment']:checked")?.value;
  
    if (!metodo) {
      alert("Selecione um método de pagamento.");
      return;
    }
  
    if (metodo === "pix") {
      try {
        // Busca dados atualizados do usuário do banco
        let userData = null;
        if (typeof window.CuidaFastAuth !== 'undefined' && window.CuidaFastAuth.fetchUserDataFromDB) {
            userData = await window.CuidaFastAuth.fetchUserDataFromDB();
        }
        
        // Se não conseguiu buscar do banco, usa localStorage
        if (!userData) {
            try {
                userData = JSON.parse(localStorage.getItem('cuidafast_user') || '{}');
            } catch (e) {
                userData = {};
            }
        }
        
        // Monta endereço completo
        let endereco = userData.endereco;
        if (!endereco && (userData.rua || userData.cidade)) {
            endereco = {
                cep: userData.cep,
                rua: userData.rua,
                numero: userData.numero,
                complemento: userData.complemento,
                bairro: userData.bairro,
                cidade: userData.cidade,
                estado: userData.estado
            };
        }
        
        const userId = userData.id || userData.usuario_id || localStorage.getItem("userId") || null;
        
        const response = await fetch("/api/pagamento/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            valor: 105.90,
            descricao: "Serviço CuidaFast",
            idUsuario: userId,
            // Dados completos do usuário para o pagamento
            usuario: {
              id: userId,
              nome: userData.nome,
              email: userData.email,
              telefone: userData.telefone,
              cpf: userData.cpf || userData.cpf_numero,
              endereco: endereco
            }
          })
        });
  
        const data = await response.json();
        console.log("Resposta do pagamento:", data);
  
        if (data.init_point) {
          window.location.href = data.init_point; // redireciona para o Mercado Pago
        } else {
          alert("Erro ao iniciar pagamento Pix");
        }
  
      } catch (err) {
        console.error("Erro ao criar pagamento:", err);
        alert("Erro ao conectar com o servidor.");
      }
    }
  });  