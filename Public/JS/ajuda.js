
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const sections = document.querySelectorAll(".help-section");

  function searchHelp() {
    const query = searchInput.value.toLowerCase().trim();

    sections.forEach(section => {
      const items = section.querySelectorAll("li");
      let visibleCount = 0;

      items.forEach(item => {
        const match = item.textContent.toLowerCase().includes(query);
        item.style.display = match || query === "" ? "block" : "none";
        if (match) visibleCount++;
      });

      section.style.display = visibleCount > 0 || query === "" ? "block" : "none";
    });
  }

  searchBtn.addEventListener("click", searchHelp);
  searchInput.addEventListener("input", searchHelp);
});
