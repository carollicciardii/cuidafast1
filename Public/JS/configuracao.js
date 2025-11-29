  const toggle = document.getElementById("themeToggle");
  const icon = document.getElementById("themeIcon");
  const title = document.getElementById("themeTitle");

  // Aplicar tema salvo caso exista
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    toggle.checked = true;
    icon.classList.replace("ph-sun", "ph-moon");
    title.textContent = "Modo escuro";
  }

  // Alternar tema
  toggle.addEventListener("change", () => {
    document.body.classList.toggle("dark-mode");

    if (document.body.classList.contains("dark-mode")) {
      icon.classList.replace("ph-sun", "ph-moon");
      title.textContent = "Modo escuro";
      localStorage.setItem("theme", "dark");
    } else {
      icon.classList.replace("ph-moon", "ph-sun");
      title.textContent = "Modo claro";
      localStorage.setItem("theme", "light");
    }
  });
