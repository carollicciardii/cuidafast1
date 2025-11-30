function initFAQ() {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach(item => {
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");

    if (!question || !answer) return;

    question.addEventListener("click", () => {
      const isActive = item.classList.contains("active");

      // fecha todos os outros
      faqItems.forEach(otherItem => {
        const otherAnswer = otherItem.querySelector(".faq-answer");
        const otherQuestion = otherItem.querySelector(".faq-question");

        otherItem.classList.remove("active");
        if (otherAnswer) otherAnswer.style.maxHeight = null;
        if (otherQuestion) otherQuestion.setAttribute("aria-expanded", "false");
      });

      // abre o atual (se estava fechado)
      if (!isActive) {
        item.classList.add("active");
        question.setAttribute("aria-expanded", "true");
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
  });
}
// ===== NEWSLETTER =====
 function initNewsletterForm() {
  const newsletterForm = document.getElementById('newsletterForm');

  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const name = this.querySelector('input[type="text"]').value.trim();
      const email = this.querySelector('input[type="email"]').value.trim();

      if (!name || !email) {
        showAlert('Por favor, preencha todos os campos.', 'error');
        return;
      }

      if (!isValidEmail(email)) {
        showAlert('Por favor, digite um e-mail válido.', 'error');
        return;
      }

      try {
        const response = await fetch('salvar_newsletter.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email })
        });

        const data = await response.json();

        if (data.success) {
          showAlert('Cadastro realizado com sucesso! Obrigado por se inscrever.', 'success');
          this.reset();
        } else {
          showAlert('Erro ao salvar no banco. Tente novamente.', 'error');
        }
      } catch (error) {
        console.error(error);
        showAlert('Erro na conexão com o servidor.', 'error');
      }
    });
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}



function showAlert(message, type = 'info') {
    // Criar elemento de alerta
    const alert = document.createElement('div');
    alert.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}`;
    alert.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 9999;
        max-width: 300px;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    alert.textContent = message;
    
    document.body.appendChild(alert);
    
    // Remover após 3 segundos
    setTimeout(() => {
        alert.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 300);
    }, 3000);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

