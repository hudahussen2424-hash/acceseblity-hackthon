/* <db-assistant> — isolated, framework-free learning assistant. */
(() => {
  // Capture the classic script URL before the browser clears currentScript.
  const scriptUrl = document.currentScript && document.currentScript.src
    ? document.currentScript.src
    : new URL("./db-assistant.js", document.baseURI).href;
  const i18nBase = new URL("./i18n/", scriptUrl);
  const english = {
    lang: "en", dir: "ltr", strings: {
      launcher: "Open learning assistant", dialogTitle: "Learning assistant",
      close: "Close", greeting: "Ask a question about this lesson. The answer comes from the lesson text.",
      questionLabel: "Your question, required", questionPlaceholder: "Ask about this lesson",
      ask: "Ask", errorEmpty: "Enter a question."
    }
  };
  const packs = {
    am: {
      lang: "am", dir: "ltr", strings: {
        launcher: "የትምህርት ረዳትን ክፈት", dialogTitle: "የትምህርት ረዳት",
        close: "ዝጋ", greeting: "ስለዚህ ትምህርት ጥያቄ ይጠይቁ። መልሱ ከትምህርቱ ጽሑፍ ይመጣል።",
        questionLabel: "ጥያቄዎ፣ ግዴታ ነው", questionPlaceholder: "ስለ ትምህርቱ ይጠይቁ",
        ask: "ጠይቅ", errorEmpty: "ጥያቄ ያስገቡ።"
      }
    }
  };

  class DbAssistant extends HTMLElement {
    static get observedAttributes() { return ["lang", "api", "content", "theme"]; }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._built = false;
      this._loadToken = 0;
      this._pack = null;
      this._errorKey = "";
    }

    connectedCallback() {
      if (this._built) return;
      this._built = true;
      this._render();
      this._bind();
      this._loadI18n();
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (!this._built || oldValue === newValue) return;
      if (name === "lang") this._loadI18n();
      if (name === "theme") this._applyTheme();
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host { all: initial; font-family: system-ui, sans-serif; color: #1a1a1a; font-size: 16px; line-height: 1.5; }
          :host([lang="am"]) { line-height: 1.7; }
          *, *::before, *::after { box-sizing: border-box; }
          button, input { font: inherit; letter-spacing: normal; text-transform: none; }
          button { min-width: 44px; min-height: 44px; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
          button:focus-visible, input:focus-visible, dialog:focus-visible { outline: 3px solid #1a1a1a; outline-offset: 2px; }
          .launcher { position: fixed; z-index: 2147483647; right: 16px; bottom: 16px; max-width: calc(100vw - 32px); background: var(--assistant-primary, #002b56); color: white; border: 2px solid var(--assistant-primary, #002b56); }
          dialog { padding: 0; margin: auto; width: min(32rem, calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow: auto; border: 2px solid var(--assistant-primary, #002b56); border-radius: 8px; background: var(--assistant-background, #fff); color: var(--assistant-foreground, #1a1a1a); font: inherit; }
          dialog::backdrop { background: rgb(0 0 0 / 55%); }
          .panel { display: flex; flex-direction: column; gap: 16px; padding: 16px; }
          .header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
          h2, p { margin: 0; overflow-wrap: break-word; }
          h2 { font-size: 20px; font-weight: 700; }
          #close { flex: 0 0 auto; background: var(--assistant-background, #fff); color: var(--assistant-foreground, #1a1a1a); border: 2px solid var(--assistant-primary, #002b56); }
          form, .field { display: flex; flex-direction: column; gap: 8px; }
          form { gap: 12px; }
          label { font-weight: 700; }
          input { width: 100%; max-width: 100%; min-height: 44px; padding: 8px 12px; border: 2px solid var(--assistant-foreground, #1a1a1a); border-radius: 4px; background: var(--assistant-background, #fff); color: var(--assistant-foreground, #1a1a1a); }
          input::placeholder { color: #595959; opacity: 1; }
          input[aria-invalid="true"], .error { color: #7f1d1d; }
          #ask { align-self: stretch; background: var(--assistant-primary, #002b56); color: white; border: 2px solid var(--assistant-primary, #002b56); }
          @media (prefers-reduced-motion: reduce) { :host, :host * { animation: none; transition: none; scroll-behavior: auto; } }
          @media (forced-colors: active) { button, input, dialog { border: 2px solid CanvasText; } .launcher, #ask, #close { background: ButtonFace; color: ButtonText; } }
        </style>
        <button type="button" class="launcher" id="launcher" disabled aria-haspopup="dialog" aria-controls="dialog" aria-expanded="false"></button>
        <dialog id="dialog" aria-labelledby="dialog-title" aria-describedby="greeting">
          <div class="panel"><header class="header"><h2 id="dialog-title"></h2><button type="button" id="close"></button></header>
            <p id="greeting" dir="auto"></p><form id="form" novalidate><div class="field">
              <label id="question-label" for="question"></label><input id="question" name="question" type="text" dir="auto" autocomplete="off" enterkeyhint="send" aria-required="true">
              <p id="question-error" class="error" role="alert" dir="auto"></p></div><button type="submit" id="ask"></button></form>
          </div>
        </dialog>`;
      const $ = (id) => this.shadowRoot.getElementById(id);
      this._els = { launcher: $("launcher"), dialog: $("dialog"), title: $("dialog-title"), close: $("close"), greeting: $("greeting"), form: $("form"), label: $("question-label"), input: $("question"), error: $("question-error"), ask: $("ask") };
      this._applyTheme();
    }

    _applyTheme() {
      if (!this.shadowRoot) return;
      const themes = { light: ["#002b56", "#ffffff", "#1a1a1a"], dark: ["#79b8ff", "#171717", "#f5f5f5"] };
      const values = themes[this.getAttribute("theme")] || themes.light;
      this.style.setProperty("--assistant-primary", values[0]);
      this.style.setProperty("--assistant-background", values[1]);
      this.style.setProperty("--assistant-foreground", values[2]);
    }

    _bind() {
      const e = this._els;
      e.launcher.addEventListener("click", () => this._open());
      e.close.addEventListener("click", () => e.dialog.close());
      e.dialog.addEventListener("close", () => { e.launcher.setAttribute("aria-expanded", "false"); this._emit("close", {}); e.launcher.focus(); });
      e.dialog.addEventListener("click", (event) => { if (event.target === e.dialog) e.dialog.close(); });
      e.form.addEventListener("submit", (event) => this._onSubmit(event));
      e.input.addEventListener("input", () => { if (this._errorKey) this._setError(""); });
    }

    async _loadI18n() {
      const requested = this.getAttribute("lang") === "am" ? "am" : "en";
      const token = ++this._loadToken;
      let pack = null;
      try {
        const response = await fetch(new URL(`${requested}.json`, i18nBase));
        if (response.ok) pack = await response.json();
        if (!pack || !pack.strings || !pack.lang) throw new Error("Invalid translation pack");
      } catch { pack = requested === "am" ? packs.am : english; }
      if (token !== this._loadToken) return;
      this._applyPack(pack);
    }

    _applyPack(pack) {
      this._pack = pack;
      this.dir = pack.dir || "ltr";
      const strings = pack.strings;
      const write = (element, key) => { element.textContent = strings[key] || ""; element.lang = pack.lang; };
      write(this._els.launcher, "launcher"); write(this._els.title, "dialogTitle"); write(this._els.close, "close");
      write(this._els.greeting, "greeting"); write(this._els.label, "questionLabel"); write(this._els.ask, "ask");
      this._els.input.lang = pack.lang; this._els.input.placeholder = strings.questionPlaceholder || ""; this._els.dialog.lang = pack.lang;
      this._els.launcher.disabled = false;
      if (this._errorKey) this._setError(this._errorKey);
      this._emit("ready", { lang: pack.lang, dir: this.dir });
    }

    _open() { if (!this._pack || this._els.dialog.open) return; this._els.dialog.showModal(); this._els.launcher.setAttribute("aria-expanded", "true"); this._els.input.focus(); this._emit("open", {}); }
    _onSubmit(event) {
      event.preventDefault(); const text = this._els.input.value.trim();
      if (!text) { this._setError("errorEmpty"); this._emit("error", { code: "empty-question" }); this._els.input.focus(); return; }
      this._setError(""); this._emit("question", { text });
    }
    _setError(key) {
      this._errorKey = key; const error = this._els.error; const input = this._els.input;
      if (!key || !this._pack) { error.textContent = ""; input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby"); return; }
      error.textContent = this._pack.strings[key] || ""; error.lang = this._pack.lang;
      input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", "question-error");
    }
    _emit(name, detail) { this.dispatchEvent(new CustomEvent(`db-assistant:${name}`, { bubbles: true, composed: true, detail })); }
  }

  if (!customElements.get("db-assistant")) customElements.define("db-assistant", DbAssistant);
})();
