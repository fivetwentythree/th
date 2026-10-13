(function () {
  const name = "Lochana Perera";
  const path = window.location.pathname || "/";
  const markers = ["/chats/", "/chats.html", "/thoughts.html", "/index.html"];
  let base = "/";
  let found = false;

  for (const marker of markers) {
    const idx = path.indexOf(marker);
    if (idx > -1) {
      base = path.slice(0, idx) || "/";
      found = true;
      break;
    }
  }

  if (!found) {
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 1) {
      base = `/${segments[0]}`;
    }
  }

  if (!base.endsWith("/")) {
    base += "/";
  }

  window.CONFIG = {
    name,
    basePath: base
  };
})();
