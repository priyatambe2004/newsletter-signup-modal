(() => {
  "use strict";

  // ---------- Settings: change these to tune the behaviour ----------
  const CONFIG = {
    delayMs: 4000,                   // wait before the modal appears
    storageKey: "nl_modal_state",
    dismissedDays: 7,                // hide for this long after closing
  };

  // ---------- Elements ----------
  const $ = (id) => document.getElementById(id);
  const page = $("page"), overlay = $("overlay"), form = $("form");
  const email = $("email"), msg = $("msg"), submitBtn = $("submit");
  const signupView = $("signup-view"), successView = $("success-view");

  let timer = null;
  let lastFocus = null;

  // ---------- Storage (falls back to memory if localStorage is blocked) ----------
  let memory = null;
  const store = {
    read() {
      try { return JSON.parse(localStorage.getItem(CONFIG.storageKey)); }
      catch { return memory; }
    },
    write(value) {
      memory = value;
      try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(value)); } catch {}
    },
    clear() {
      memory = null;
      try { localStorage.removeItem(CONFIG.storageKey); } catch {}
    },
  };

  function shouldShow() {
    const s = store.read();
    if (!s) return true;
    if (s.status === "subscribed") return false;           // never again
    const ageMs = Date.now() - s.at;
    return ageMs > CONFIG.dismissedDays * 864e5;           // dismissed: wait N days
  }

  // ---------- Validation ----------
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const TYPOS = {
    "gmial.com": "gmail.com", "gmail.con": "gmail.com", "gamil.com": "gmail.com",
    "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "hotmial.com": "hotmail.com",
    "outlok.com": "outlook.com",
  };

  function validateEmail(value) {
    if (!value) return "Enter your email address.";
    if (value.length > 254 || !EMAIL_RE.test(value)) {
      return "That doesn’t look right. Try a format like name@example.com.";
    }
    const domain = value.split("@")[1].toLowerCase();
    if (TYPOS[domain]) return `Did you mean ${value.split("@")[0]}@${TYPOS[domain]}?`;
    return "";
  }

  function showError(text) {
    email.setAttribute("aria-invalid", "true");
    msg.textContent = text;
    email.focus();
  }
  function clearError() {
    email.removeAttribute("aria-invalid");
    msg.textContent = "";
  }

  // ---------- Open / close ----------
  function openModal() {
    if (!shouldShow() || !overlay.hidden) return;
    lastFocus = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("open"));  // lets the fade play
    page.inert = true;                       // background can't be tabbed or clicked
    document.body.classList.add("modal-open");
    email.focus();
  }

  function closeModal(status) {
    // status: "dismissed" or "subscribed"
    store.write({ status, at: Date.now() });
    overlay.classList.remove("open");
    page.inert = false;
    document.body.classList.remove("modal-open");
    setTimeout(() => { overlay.hidden = true; }, 250);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  const dismiss = () => closeModal("dismissed");

  // ---------- Events ----------
  $("close").addEventListener("click", dismiss);
  $("later").addEventListener("click", dismiss);
  $("done").addEventListener("click", () => closeModal("subscribed"));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) dismiss(); });

  document.addEventListener("keydown", (e) => {
    if (overlay.hidden) return;
    if (e.key === "Escape") {
      store.read()?.status === "subscribed" ? closeModal("subscribed") : dismiss();
      return;
    }
    if (e.key === "Tab") {                   // keep keyboard focus inside the dialog
      const items = [...overlay.querySelectorAll("button, input")]
        .filter((el) => !el.disabled && el.offsetParent !== null);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  email.addEventListener("input", clearError);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = email.value.trim();
    const error = validateEmail(value);
    if (error) return showError(error);

    // Pretend to call a server. Replace with fetch("/subscribe", ...) in a real project.
    submitBtn.disabled = true;
    submitBtn.textContent = "Subscribing…";
    await new Promise((r) => setTimeout(r, 800));

    store.write({ status: "subscribed", at: Date.now() });
    signupView.hidden = true;
    successView.hidden = false;
    $("done").focus();
  });

  $("reset").addEventListener("click", () => {
    store.clear();
    clearTimeout(timer);
    form.reset(); clearError();
    submitBtn.disabled = false; submitBtn.textContent = "Subscribe";
    signupView.hidden = false; successView.hidden = true;
    timer = setTimeout(openModal, CONFIG.delayMs);
  });

  // ---------- Start ----------
  timer = setTimeout(openModal, CONFIG.delayMs);
})();
