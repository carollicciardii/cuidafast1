document.getElementById("cpf").addEventListener("blur", function() {
    const cpf = this.value.replace(/[^\d]+/g, '');
  
    if (cpf.length !== 11) {
      alert("CPF incompleto!");
      return;
    }
  
    if (/^(\d)\1{10}$/.test(cpf)) {
      alert("CPF inválido!");
      return;
    }
  
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let dig1 = (sum * 10) % 11;
    if (dig1 === 10) dig1 = 0;
  
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    let dig2 = (sum * 10) % 11;
    if (dig2 === 10) dig2 = 0;
  
    if (dig1 != cpf.charAt(9) || dig2 != cpf.charAt(10)) {
      alert("CPF inválido!");
    }
  });
  