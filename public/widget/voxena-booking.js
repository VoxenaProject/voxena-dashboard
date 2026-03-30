/**
 * Voxena Booking Widget — Script embeddable
 *
 * Usage:
 * <script src="https://app.getvoxena.com/widget/voxena-booking.js"
 *   data-restaurant="mon-restaurant"
 *   data-color="#4237C4"
 *   data-position="right">
 * </script>
 *
 * Attributes:
 * - data-restaurant (required): slug du restaurant
 * - data-color (optional): couleur du bouton (défaut: #4237C4)
 * - data-position (optional): "left" ou "right" (défaut: "right")
 * - data-label (optional): texte du bouton (défaut: "Réserver")
 */
(function () {
  "use strict";

  // Récupérer les attributs du script
  var script = document.currentScript || document.querySelector("script[data-restaurant]");
  if (!script) return;

  var slug = script.getAttribute("data-restaurant");
  if (!slug) {
    console.warn("[Voxena] data-restaurant attribute is required");
    return;
  }

  var color = script.getAttribute("data-color") || "#4237C4";
  var position = script.getAttribute("data-position") || "right";
  var label = script.getAttribute("data-label") || "Réserver";
  var baseUrl = script.src ? new URL(script.src).origin : "https://app.getvoxena.com";
  var bookingUrl = baseUrl + "/book/" + slug;

  // Créer les styles
  var style = document.createElement("style");
  style.textContent = [
    ".voxena-widget-btn {",
    "  position: fixed;",
    "  bottom: 24px;",
    "  " + position + ": 24px;",
    "  z-index: 99999;",
    "  display: flex;",
    "  align-items: center;",
    "  gap: 8px;",
    "  padding: 12px 20px;",
    "  background: " + color + ";",
    "  color: white;",
    "  border: none;",
    "  border-radius: 50px;",
    "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;",
    "  font-size: 14px;",
    "  font-weight: 600;",
    "  cursor: pointer;",
    "  box-shadow: 0 4px 14px rgba(0,0,0,0.15);",
    "  transition: transform 0.2s, box-shadow 0.2s;",
    "}",
    ".voxena-widget-btn:hover {",
    "  transform: translateY(-2px);",
    "  box-shadow: 0 6px 20px rgba(0,0,0,0.2);",
    "}",
    ".voxena-widget-btn svg {",
    "  width: 18px;",
    "  height: 18px;",
    "}",
    ".voxena-widget-overlay {",
    "  display: none;",
    "  position: fixed;",
    "  inset: 0;",
    "  z-index: 100000;",
    "  background: rgba(0,0,0,0.5);",
    "  backdrop-filter: blur(4px);",
    "  justify-content: center;",
    "  align-items: center;",
    "}",
    ".voxena-widget-overlay.open {",
    "  display: flex;",
    "}",
    ".voxena-widget-frame {",
    "  width: 100%;",
    "  max-width: 560px;",
    "  height: 90vh;",
    "  max-height: 700px;",
    "  border: none;",
    "  border-radius: 16px;",
    "  background: white;",
    "  box-shadow: 0 20px 60px rgba(0,0,0,0.3);",
    "}",
    ".voxena-widget-close {",
    "  position: absolute;",
    "  top: 16px;",
    "  right: 16px;",
    "  z-index: 100001;",
    "  width: 36px;",
    "  height: 36px;",
    "  display: flex;",
    "  align-items: center;",
    "  justify-content: center;",
    "  background: rgba(0,0,0,0.3);",
    "  color: white;",
    "  border: none;",
    "  border-radius: 50%;",
    "  font-size: 18px;",
    "  cursor: pointer;",
    "  transition: background 0.2s;",
    "}",
    ".voxena-widget-close:hover {",
    "  background: rgba(0,0,0,0.5);",
    "}",
    "@media (max-width: 600px) {",
    "  .voxena-widget-frame {",
    "    width: 100%;",
    "    height: 100vh;",
    "    max-height: 100vh;",
    "    border-radius: 0;",
    "  }",
    "}",
  ].join("\n");
  document.head.appendChild(style);

  // Créer le bouton
  var btn = document.createElement("button");
  btn.className = "voxena-widget-btn";
  btn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />' +
    "</svg> " +
    label;

  // Créer l'overlay + iframe
  var overlay = document.createElement("div");
  overlay.className = "voxena-widget-overlay";

  var closeBtn = document.createElement("button");
  closeBtn.className = "voxena-widget-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.setAttribute("aria-label", "Fermer");

  var iframe = document.createElement("iframe");
  iframe.className = "voxena-widget-frame";
  iframe.title = "Réservation Voxena";

  overlay.appendChild(closeBtn);
  overlay.appendChild(iframe);

  // Events
  btn.addEventListener("click", function () {
    iframe.src = bookingUrl;
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  });

  function closeWidget() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    iframe.src = "";
  }

  closeBtn.addEventListener("click", closeWidget);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeWidget();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeWidget();
  });

  // Inject dans le DOM
  document.body.appendChild(btn);
  document.body.appendChild(overlay);
})();
