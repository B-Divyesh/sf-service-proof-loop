# Demo sandbox

- URL: `http://localhost:8080/demo` locally or
  `https://service-proof-loop.sociobot.in/demo` after deployment.
- Sample: Northstar Home Care has one visit for Maya Chen at Willow Street.
  Elena completed four checks, shared two illustrations, and left one note.
- The client can accept the visit, rate it, and choose one of three extras.
- The business view then shows the extra beside the next date and exports it.
- Each demo is a separate SQLite workspace with a random access token and a
  24-hour expiry. The browser stores access under `sessionStorage` key
  `demo:workspace`. Real access uses `localStorage` key `real:workspace`.
- **Reset demo** removes the current demo token and provisions a new workspace.
  It does not read or change real workspace storage.
