/* <db-assistant> — isolated, framework-free learning assistant. */
(() => {
  const scriptUrl = document.currentScript?.src || new URL("./db-assistant.js", document.baseURI).href;
  const i18nBase = new URL("./i18n/", scriptUrl);
  const en = { lang: "en", dir: "ltr", strings: {
    launcher: "Open learning assistant", dialogTitle: "Learning assistant", close: "Close",
    greeting: "Ask a question about this lesson. The answer comes from the lesson text.",
    questionLabel: "Your question", questionPlaceholder: "Ask about this lesson", ask: "Send",
    errorEmpty: "Enter a question before sending.", person: "Talk to a person", language: "Language",
    you: "You", escalationNote: "Optional note", consent: "Share this conversation with a tutor",
    sendEscalation: "Send", waiting: "A tutor will answer here. It may take until morning.",
    queued: "Saved on this phone. It will send when you are online.", topicBlocked: "I can’t help with medical, legal, or immigration advice. You can talk to a person instead.", tutor: "Tutor"
  } };
  const bundled = {
    en,
    am: { lang: "am", dir: "ltr", strings: {
      launcher: "የትምህርት ረዳትን ክፈት", dialogTitle: "የትምህርት ረዳት", close: "ዝጋ",
      greeting: "ስለዚህ ትምህርት ጥያቄ ይጠይቁ። መልሱ ከትምህርቱ ጽሑፍ ይመጣል።",
      questionLabel: "ጥያቄዎ", questionPlaceholder: "ስለ ትምህርቱ ይጠይቁ", ask: "ላክ",
      errorEmpty: "ከመላክዎ በፊት ጥያቄ ያስገቡ።", person: "ከሰው ጋር ይነጋገሩ",
      language: "ቋንቋ", you: "እርስዎ", escalationNote: "አማራጭ ማስታወሻ",
      consent: "ይህን ውይይት ለአስተማሪ ያጋሩ", sendEscalation: "ላክ",
      waiting: "አስተማሪ እዚህ ይመልሳል። እስከ ጠዋት ሊወስድ ይችላል።",
      queued: "በዚህ ስልክ ላይ ተቀምጧል። ኢንተርኔት ሲኖር ይላካል።",
      topicBlocked: "ስለ ጤና፣ ሕግ ወይም ኢሚግሬሽን ምክር መስጠት አልችልም። ከሰው ጋር መነጋገር ይችላሉ።", tutor: "አስተማሪ"
    } }
  };
  const topicFallback = {
    en: ["medical", "medicine", "doctor", "diagnosis", "symptom", "treatment", "prescription", "legal", "lawyer", "law", "lawsuit", "court", "immigration", "visa", "asylum", "deportation", "green card"],
    am: ["ሕክምና", "ሐኪም", "ምርመራ", "ምልክት", "መድኃኒት", "ሕግ", "ጠበቃ", "ፍርድ ቤት", "ኢሚግሬሽን", "ቪዛ", "ጥገኝነት", "መባረር"]
  };

  class DbAssistant extends HTMLElement {
    static get observedAttributes() { return ["lang", "api", "content", "theme"]; }
    constructor() {
      super(); this.attachShadow({ mode: "open" }); this._built = false;
      this._loadToken = 0; this._pack = null; this._errorKey = ""; this._messages = []; this._topics = null;
    }
    connectedCallback() {
      if (this._built) return;
      this._built = true; this._storageKey = `db-assistant:${location.pathname}:${this.id || "default"}`;
      this._restore(); this._render(); this._bind(); this._loadI18n(); this._loadTopics();
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
          button, textarea { font: inherit; letter-spacing: normal; text-transform: none; }
          button { min-width: 44px; min-height: 44px; padding: 8px 12px; border-radius: 4px; cursor: pointer; }
          button:focus-visible, textarea:focus-visible, [tabindex="-1"]:focus-visible { outline: 3px solid #1a1a1a; outline-offset: 2px; }
          .launcher { position: fixed; z-index: 2147483647; right: 16px; bottom: 16px; max-width: calc(100vw - 32px); background: var(--assistant-primary, #002b56); color: white; border: 2px solid var(--assistant-primary, #002b56); }
          .panel { position: fixed; z-index: 2147483646; right: 16px; bottom: 76px; width: min(32rem, calc(100vw - 32px)); max-height: min(70vh, 42rem); overflow: auto; border: 2px solid var(--assistant-primary, #002b56); border-radius: 8px; background: var(--assistant-background, #fff); color: var(--assistant-foreground, #1a1a1a); padding: 16px; }
          .panel[hidden] { display: none; }
          .panel-inner { display: flex; flex-direction: column; gap: 12px; }
          .header { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: start; }
          h2, p { margin: 0; overflow-wrap: anywhere; }
          h2 { font-size: 20px; font-weight: 700; }
          .header-actions, .language { display: flex; flex-wrap: wrap; gap: 6px; }
          .person { grid-column: 1 / -1; justify-self: start; background: var(--assistant-primary, #002b56); color: white; border: 2px solid var(--assistant-primary, #002b56); }
          .secondary { background: var(--assistant-background, #fff); color: var(--assistant-foreground, #1a1a1a); border: 2px solid var(--assistant-primary, #002b56); }
          .language { align-items: center; }
          .language-label, label { font-weight: 700; }
          [aria-pressed="true"] { outline: 2px solid currentColor; outline-offset: 1px; }
          .log { display: flex; flex-direction: column; gap: 8px; max-height: 35vh; overflow: auto; padding: 4px; }
          .message { margin: 0; padding: 8px 10px; border-radius: 4px; background: #f0f2f4; color: #1a1a1a; white-space: pre-wrap; overflow-wrap: anywhere; }
          form, .field { display: flex; flex-direction: column; gap: 8px; }
          textarea { width: 100%; min-height: 4.5rem; max-height: 35vh; resize: vertical; padding: 8px 12px; border: 2px solid var(--assistant-foreground, #1a1a1a); border-radius: 4px; background: var(--assistant-background, #fff); color: var(--assistant-foreground, #1a1a1a); }
          textarea::placeholder { color: #595959; opacity: 1; }
          .error { margin: 0; color: #7f1d1d; }
          .escalation { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid currentColor; padding-top: 12px; }
          .escalation[hidden] { display: none; }
          .consent { display: flex; align-items: flex-start; gap: 8px; }
          .consent input { width: 20px; height: 20px; margin: 2px 0 0; flex: none; }
          #send { background: var(--assistant-primary, #002b56); color: white; border: 2px solid var(--assistant-primary, #002b56); }
          @media (max-width: 480px) {
            .panel { inset-inline: 0; inset-block-end: 0; width: 100%; max-height: 80vh; border-radius: 8px 8px 0 0; padding: 12px; }
            .log { max-height: 24vh; }
            .launcher { right: 12px; bottom: 12px; }
          }
          @media (prefers-reduced-motion: reduce) { :host, :host * { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
          @media (forced-colors: active) { button, textarea, .panel { border: 2px solid CanvasText; } .person, #send { background: ButtonFace; color: ButtonText; } }
        </style>
        <button type="button" class="launcher" id="launcher" disabled aria-haspopup="dialog" aria-controls="panel" aria-expanded="false"></button>
        <section class="panel" id="panel" role="dialog" aria-labelledby="panel-title" aria-modal="false" hidden>
          <div class="panel-inner">
            <header class="header">
              <h2 id="panel-title" tabindex="-1"></h2>
              <button type="button" class="secondary" id="close"></button>
              <button type="button" class="person" id="person"></button>
            </header>
            <div class="language" aria-label="Language"><span class="language-label" id="language-label"></span>
              <button type="button" class="secondary" id="english" lang="en" aria-pressed="false">English</button>
              <button type="button" class="secondary" id="amharic" lang="am" aria-pressed="false">አማርኛ</button>
            </div>
            <p id="greeting" dir="auto"></p>
            <div class="log" id="messages" role="log" aria-live="polite" aria-relevant="additions"></div>
            <form id="form" novalidate>
              <div class="field"><label id="question-label" for="question"></label>
                <textarea id="question" name="question" dir="auto" autocomplete="off" aria-required="true"></textarea>
                <p id="question-error" class="error" role="alert" dir="auto"></p></div>
              <button type="submit" id="send"></button>
            </form>
            <form id="escalation" class="escalation" novalidate hidden>
              <label for="note" id="note-label"></label><textarea id="note" name="note" rows="2" dir="auto"></textarea>
              <label class="consent" for="consent"><input id="consent" type="checkbox"><span id="consent-label"></span></label>
              <p id="escalation-status" class="error" role="status" aria-live="polite"></p>
              <button type="submit" id="send-escalation"></button>
            </form>
          </div>
        </section>`;
      const $ = (id) => this.shadowRoot.getElementById(id);
      this._els = { launcher: $("launcher"), panel: $("panel"), title: $("panel-title"), close: $("close"), person: $("person"), languageLabel: $("language-label"), english: $("english"), amharic: $("amharic"), greeting: $("greeting"), log: $("messages"), form: $("form"), label: $("question-label"), input: $("question"), error: $("question-error"), send: $("send"), escalation: $("escalation"), noteLabel: $("note-label"), note: $("note"), consent: $("consent"), consentLabel: $("consent-label"), escalationStatus: $("escalation-status"), sendEscalation: $("send-escalation") };
      this._applyTheme(); this._renderMessages();
    }
    _applyTheme() {
      const themes = { light: ["#002b56", "#fff", "#1a1a1a"], dark: ["#79b8ff", "#171717", "#f5f5f5"] };
      const values = themes[this.getAttribute("theme")] || themes.light;
      this.style.setProperty("--assistant-primary", values[0]); this.style.setProperty("--assistant-background", values[1]); this.style.setProperty("--assistant-foreground", values[2]);
    }
    _bind() {
      const e = this._els;
      e.launcher.addEventListener("click", () => this._open());
      e.close.addEventListener("click", () => this._close());
      e.form.addEventListener("submit", (event) => this._onSubmit(event));
      e.input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) { event.preventDefault(); e.form.requestSubmit(); }
      });
      e.input.addEventListener("input", () => { if (this._errorKey) this._setError(""); });
      e.english.addEventListener("click", () => this.setAttribute("lang", "en"));
      e.amharic.addEventListener("click", () => this.setAttribute("lang", "am"));
      e.person.addEventListener("click", () => this._showEscalation());
      e.escalation.addEventListener("submit", (event) => this._submitEscalation(event));
      window.addEventListener("online", () => this._sendQueued());
      this.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !e.panel.hidden) { event.preventDefault(); this._close(); }
      });
    }
    _restore() {
      try { const saved = JSON.parse(localStorage.getItem(this._storageKey) || "[]"); if (Array.isArray(saved)) this._messages = saved.filter((m) => m && typeof m.text === "string").slice(-200); }
      catch { this._messages = []; }
    }
    _save() { try { localStorage.setItem(this._storageKey, JSON.stringify(this._messages)); } catch { /* Storage may be unavailable or full. */ } }
    _saved(key, fallback) { try { const value = localStorage.getItem(`${this._storageKey}:${key}`); return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
    _store(key, value) { try { localStorage.setItem(`${this._storageKey}:${key}`, JSON.stringify(value)); } catch { /* Storage may be unavailable or full. */ } }
    _renderMessages() {
      if (!this._els) return;
      this._els.log.replaceChildren();
      for (const message of this._messages) this._appendMessage(message, false);
    }
    _appendMessage(message, persist = true) {
      const p = document.createElement("p"); p.className = "message"; p.dir = "auto";
      p.lang = message.lang === "am" ? "am" : "en";
      p.textContent = `${this._pack?.strings.you || (p.lang === "am" ? bundled.am.strings.you : en.strings.you)}: ${message.text}`;
      this._els.log.append(p);
      if (persist) { this._messages.push({ text: message.text, lang: message.lang || this._pack?.lang || "en" }); this._save(); }
    }
    async _loadI18n() {
      const requested = this.getAttribute("lang") === "am" ? "am" : "en", token = ++this._loadToken;
      let pack;
      try {
        const response = await fetch(new URL(`${requested}.json`, i18nBase));
        if (!response.ok) throw new Error("Translation fetch failed");
        pack = await response.json();
        if (!pack?.strings || pack.lang !== requested) throw new Error("Invalid translation pack");
      } catch { pack = bundled[requested]; }
      if (token !== this._loadToken) return;
      this._applyPack(pack);
    }
    _applyPack(pack) {
      this._pack = pack; this.dir = pack.dir || "ltr"; const s = pack.strings, e = this._els;
      const write = (node, key) => { node.textContent = s[key] || ""; node.lang = pack.lang; };
      write(e.launcher, "launcher"); write(e.title, "dialogTitle"); write(e.close, "close"); write(e.person, "person");
      write(e.languageLabel, "language"); write(e.greeting, "greeting"); write(e.label, "questionLabel"); write(e.send, "ask");
      write(e.noteLabel, "escalationNote"); write(e.consentLabel, "consent"); write(e.sendEscalation, "sendEscalation");
      e.input.lang = pack.lang; e.input.placeholder = s.questionPlaceholder || ""; e.panel.lang = pack.lang;
      e.launcher.disabled = false; e.english.setAttribute("aria-pressed", pack.lang === "en"); e.amharic.setAttribute("aria-pressed", pack.lang === "am");
      if (this._errorKey) this._setError(this._errorKey);
      this._renderMessages(); this._emit("ready", { lang: pack.lang, dir: this.dir });
    }
    _open() {
      if (!this._pack || !this._els.panel.hidden) return;
      this._els.panel.hidden = false; this._els.launcher.setAttribute("aria-expanded", "true"); this._els.title.focus(); this._emit("open", {});
      this._checkTickets(); this._sendQueued();
    }
    _close() {
      if (this._els.panel.hidden) return;
      this._els.panel.hidden = true; this._els.launcher.setAttribute("aria-expanded", "false"); this._emit("close", {}); this._els.launcher.focus();
    }
    async _onSubmit(event) {
      event.preventDefault(); const text = this._els.input.value.trim();
      if (!text) { this._setError("errorEmpty"); this._emit("error", { code: "empty-question" }); this._els.input.focus(); return; }
      if (await this._isSensitive(text)) {
        this._appendMessage({ text: this._pack.strings.topicBlocked, lang: this._pack.lang });
        this._els.note.value = text; this._showEscalation(); this._els.input.value = ""; return;
      }
      this._setError(""); this._appendMessage({ text, lang: this._pack.lang }); this._els.input.value = ""; this._emit("question", { text });
    }
    async _loadTopics() {
      try { const response = await fetch(new URL("topics.json", i18nBase)); if (response.ok) this._topics = await response.json(); }
      catch { this._topics = null; }
    }
    async _isSensitive(text) {
      if (!this._topics) await this._loadTopics();
      const words = [...(this._topics?.en || topicFallback.en), ...(this._topics?.am || topicFallback.am)];
      return words.some((word) => word && text.toLocaleLowerCase().includes(word.toLocaleLowerCase()));
    }
    _showEscalation() { this._els.escalation.hidden = false; this._els.note.focus(); this._emit("person", {}); }
    _api(path) { const base = (this.getAttribute("api") || location.origin).replace(/\/$/, ""); return `${base}${path}`; }
    _conversation() { return this._els.consent.checked ? this._messages.slice() : []; }
    async _submitEscalation(event) {
      event.preventDefault();
      const payload = { conversation: this._conversation(), language: this._pack.lang, page: location.href, note: this._els.note.value.trim() };
      if (!navigator.onLine) { this._queue(payload); return; }
      try { await this._postEscalation(payload); }
      catch (error) {
        if (error.status && error.status < 500) this._els.escalationStatus.textContent = error.message;
        else this._queue(payload);
      }
    }
    _queue(payload) {
      const queue = this._saved("queue", []); queue.push(payload); this._store("queue", queue);
      this._els.escalationStatus.textContent = this._pack.strings.queued;
    }
    async _postEscalation(payload) {
      const response = await fetch(this._api("/api/v1/escalations"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) {
        let message = "Escalation could not be sent.";
        try { message = (await response.json()).detail || message; } catch { /* Use the plain fallback message. */ }
        const error = new Error(message); error.status = response.status; throw error;
      }
      const result = await response.json();
      if (!result.ticketId) throw new Error("Missing ticket id");
      const tickets = this._saved("tickets", []); tickets.push({ id: result.ticketId, replied: false }); this._store("tickets", tickets);
      this._appendMessage({ text: this._pack.strings.waiting, lang: this._pack.lang });
      this._els.escalationStatus.textContent = this._pack.strings.waiting;
      this._els.note.value = ""; this._els.consent.checked = false;
      this._emit("escalated", { ticketId: result.ticketId });
    }
    async _sendQueued() {
      if (!navigator.onLine) return;
      const queue = this._saved("queue", []); if (!queue.length) return;
      const remaining = [];
      for (const payload of queue) { try { await this._postEscalation(payload); } catch { remaining.push(payload); } }
      this._store("queue", remaining);
    }
    async _checkTickets() {
      if (!navigator.onLine) return;
      const tickets = this._saved("tickets", []); let changed = false;
      for (const ticket of tickets) {
        if (ticket.replied) continue;
        try {
          const response = await fetch(this._api(`/api/v1/escalations/${encodeURIComponent(ticket.id)}`));
          if (!response.ok) continue;
          const data = await response.json();
          if (data.reply) { this._appendMessage({ text: data.reply, lang: data.language || this._pack.lang }); ticket.replied = true; changed = true; }
        } catch { /* Retry next time the learner opens the panel. */ }
      }
      if (changed) this._store("tickets", tickets);
    }
    _setError(key) {
      this._errorKey = key; const error = this._els.error, input = this._els.input;
      if (!key || !this._pack) { error.textContent = ""; input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby"); return; }
      error.textContent = this._pack.strings[key] || ""; error.lang = this._pack.lang;
      input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", "question-error");
    }
    _emit(name, detail) { this.dispatchEvent(new CustomEvent(`db-assistant:${name}`, { bubbles: true, composed: true, detail })); }
  }
  if (!customElements.get("db-assistant")) customElements.define("db-assistant", DbAssistant);
})();
