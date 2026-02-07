document.addEventListener("DOMContentLoaded", async () => {
  const basePath = import.meta?.env?.BASE_URL || CONFIG.basePath || '/';
  
  // Build nav
  document.getElementById("nav").innerHTML = `
    <a href="${basePath}index.html" class="name">${CONFIG.name}</a>
    <a href="${basePath}thoughts.html">Thoughts</a>
    <a href="${basePath}chats/index.html">Chats</a>
  `;
  
  // Load homepage content
  try {
    const res = await fetch(`${basePath}content/index.md?v=${Date.now()}`);
    if (res.ok) {
      const md = await res.text();
      document.getElementById("content").innerHTML = marked.parse(md);
    }
  } catch (e) {
    document.getElementById("content").innerHTML = "<p>Welcome.</p>";
  }
});
