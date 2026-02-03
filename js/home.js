document.addEventListener("DOMContentLoaded", async () => {
  // Build nav
  document.getElementById("nav").innerHTML = `
    <a href="index.html" class="name">${CONFIG.name}</a>
    <a href="thoughts.html">Thoughts</a>
  `;
  
  // Load homepage content
  try {
    const res = await fetch("content/index.md");
    if (res.ok) {
      const md = await res.text();
      document.getElementById("content").innerHTML = marked.parse(md);
    }
  } catch (e) {
    document.getElementById("content").innerHTML = "<p>Welcome.</p>";
  }
});
