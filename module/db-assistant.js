/* <db-assistant> — isolated, framework-free learning assistant. */
(() => {
  const scriptUrl = document.currentScript?.src || new URL("./db-assistant.js", document.baseURI).href;
  const i18nBase = new URL("./i18n/", scriptUrl);

  function normalizeEthiopianPhone(value) {
    const compact = String(value || "").replace(/[\s()-]/g, "");
    const national = compact.replace(/^\+251/, "0");
    if (/^09\d{8}$/.test(national)) return `+251${national.slice(1)}`;
    if (/^07\d{8}$/.test(national)) return `+251${national.slice(1)}`;
    return "";
  }

  const en = {
    lang: "en",
    dir: "ltr",
    strings: {
      launcher: "Open learning assistant",
      dialogTitle: "Learning assistant",
      close: "Close",
      greeting: "Ask a question about this lesson. The answer comes from the lesson text.",
      questionLabel: "Your question",
      questionPlaceholder: "Ask about this lesson",
      ask: "Send",
      errorEmpty: "Enter a question before sending.",
      person: "Talk to a person",
      language: "Language",
      you: "You",
      assistant: "Assistant",
      notFound: "I could not find this in the course",
      readInCourse: "Read in the course",
      microphone: "Use microphone",
      stop: "Stop",
      listening: "Listening with speech recognition. Review the words before sending.",
      stopped: "Listening stopped.",
      recording: "Recording a voice note for a tutor. It will not be sent to the assistant.",
      recordedReady: "Voice note ready. It will only be sent to a tutor.",
      speechAdded: "Speech added to your question. Review it before sending.",
      voiceUnavailable: "Speech recognition failed and voice recording is unavailable.",
      readBack: "Read it back",
      listen: "Listen",
      noAmharicVoice: "No Amharic voice on this phone",
      escalationNote: "Optional note",
      consent: "Share this conversation with a tutor",
      sendEscalation: "Send to a person",
      voiceNote: "Voice note for tutor",
      escalationSent: "Your request was sent to a tutor.",
      escalationFailed: "Your request could not be sent. Check your connection and try again.",
      offlineSaved: "Saved on this phone. It will send when you are online.",
      phoneLabel: "Phone number (optional)",
      phoneInvalid: "Enter an Ethiopian number starting with 09, 07, +2519, or +2517.",
      accommodationButton: "I need an accommodation for my interview",
      accommodationPrivacy: "Your accommodation choices and note go only to a tutor. They are never shared with an employer.",
      whichJob: "Which test job is your interview for?",
      whichAccommodation: "What accommodation would help?",
      otherAccommodation: "Other (describe it in the note)",
      accommodationNote: "Optional note",
      sendAccommodation: "Ask a tutor about this accommodation",
      accommodationSent: "Your request was sent privately to a tutor.",
      accommodationFailed: "Your request could not be sent. Please try again.",
      screenShareConsent: "I consent to sharing my screen or page details with a tutor. Sharing starts only after I press a button. Live video is not recorded or stored; page details and any selected screenshot are attached to a tutor request.",
      screenShareTitle: "Share with a tutor",
      screenShareNote: "Desktop uses a direct demo WebRTC connection; some networks may block it. Android Chrome sends page details and an optional image only, not live video.",
      screenShareStart: "Share my screen",
      screenContextStart: "Show my tutor where I am",
      screenScreenshot: "Optional screenshot (image)",
      screenShareOn: "You are sharing your screen",
      screenShareStop: "Stop sharing",
      screenShareConsentRequired: "Please consent before sharing.",
      screenShareStarting: "Requesting screen access…",
      screenShareConnecting: "Waiting for the tutor to connect (demo transport).",
      screenShareConnected: "Connected to the tutor. Live video is not recorded.",
      screenShareStopped: "Screen sharing stopped.",
      screenShareCancelled: "Screen sharing was cancelled.",
      screenShareError: "Screen sharing could not start. Please try again.",
      screenContextSent: "Page details were sent to the tutor. This did not share your live screen.",
      screenContextFailed: "Page details could not be sent. Please try again.",
      screenShareCleanupFailed: "Screen sharing stopped, but demo signaling could not be cleared.",
      screenScreenshotTooLarge: "Choose an image smaller than 3 MB.",
      describeOther: "Describe the accommodation you need in the note."
    }
  };

  const am = {
    lang: "am",
    dir: "ltr",
    strings: {
      launcher: "የትምህርት ረዳትን ክፈት",
      dialogTitle: "የትምህርት ረዳት",
      close: "ዝጋ",
      greeting: "ስለዚህ ትምህርት ጥያቄ ይጠይቁ። መልሱ ከትምህርቱ ጽሑፍ ይመጣል።",
      questionLabel: "ጥያቄዎ",
      questionPlaceholder: "ስለ ትምህርቱ ይጠይቁ",
      ask: "ላክ",
      errorEmpty: "ከመላክዎ በፊት ጥያቄ ያስገቡ።",
      person: "ከሰው ጋር ይነጋገሩ",
      language: "ቋንቋ",
      you: "እርስዎ",
      assistant: "ረዳት",
      notFound: "ይህንን በትምህርቱ ውስጥ ማግኘት አልቻልኩም",
      readInCourse: "በትምህርቱ ውስጥ ያንብቡ",
      microphone: "ማይክሮፎን ተጠቀም",
      stop: "አቁም",
      listening: "በድምፅ ማወቂያ እያዳመጥኩ ነው። ከመላክዎ በፊት ቃላቱን ይመልከቱ።",
      stopped: "ማዳመጥ ቆሟል።",
      recording: "ለአስተማሪ የድምፅ መልዕክት እየቀዳሁ ነው። ወደ ረዳቱ አይላክም።",
      recordedReady: "የድምፅ መልዕክቱ ዝግጁ ነው። ለአስተማሪ ብቻ ይላካል።",
      speechAdded: "የተነገረው ወደ ጥያቄዎ ተጨምሯል። ከመላክዎ በፊት ይመልከቱ።",
      voiceUnavailable: "የድምፅ ማወቂያና ቀረጻ በዚህ ስልክ ላይ አይገኙም።",
      readBack: "መልሰህ አንብብ",
      listen: "አዳምጥ",
      noAmharicVoice: "በዚህ ስልክ ላይ የአማርኛ ድምፅ የለም",
      escalationNote: "አማራጭ ማስታወሻ",
      consent: "ይህን ውይይት ለአስተማሪ ያጋሩ",
      sendEscalation: "ለሰው ላክ",
      voiceNote: "ለአስተማሪ የድምፅ መልዕክት",
      escalationSent: "ጥያቄዎ ለአስተማሪ ተልኳል።",
      escalationFailed: "ጥያቄዎ ሊላክ አልቻለም። ግንኙነቱን ያረጋግጡና እንደገና ይሞክሩ።",
      offlineSaved: "በዚህ ስልክ ተቀምጧል። ኢንተርኔት ሲኖር ይላካል።",
      phoneLabel: "የስልክ ቁጥር (አማራጭ)",
      phoneInvalid: "ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ።",
      accommodationButton: "ለቃለ መጠይቄ ማስተካከያ እፈልጋለሁ",
      accommodationPrivacy: "የመረጡት ማስተካከያና ማስታወሻ ለአስተማሪ ብቻ ይሄዳሉ። ለቀጣሪ አይጋሩም።",
      whichJob: "ቃለ መጠይቅዎ ለየትኛው የሙከራ ሥራ ነው?",
      whichAccommodation: "ምን ማስተካከያ ይረዳዎታል?",
      otherAccommodation: "ሌላ (በማስታወሻ ይግለጹ)",
      accommodationNote: "አማራጭ ማስታወሻ",
      sendAccommodation: "ስለዚህ ማስተካከያ አስተማሪን ይጠይቁ",
      accommodationSent: "ጥያቄዎ በግል ለአስተማሪ ተልኳል።",
      accommodationFailed: "ጥያቄዎ ሊላክ አልቻለም። እንደገና ይሞክሩ።",
      screenShareConsent: "ማያዬን ወይም የገጹን መረጃ ለአስተማሪ ለማጋራት እስማማለሁ። ማጋራት የሚጀምረው አዝራሩን ከጫንኩ ብቻ ነው። ቀጥታ ቪዲዮ አይቀዳም ወይም አይቀመጥም፤ የገጽ መረጃና የመረጡት ምስል ከአስተማሪ ጥያቄ ጋር ይቀመጣሉ።",
      screenShareTitle: "ከአስተማሪ ጋር አጋራ",
      screenShareNote: "ዴስክቶፕ ቀጥታ የሙከራ WebRTC ግንኙነት ይጠቀማል፤ አንዳንድ ኔትወርኮች ሊከለክሉት ይችላሉ። Android Chrome የገጽ መረጃና አማራጭ ምስል ብቻ ይልካል፤ ቀጥታ ቪዲዮ አይደለም።",
      screenShareStart: "ማያዬን አጋራ",
      screenContextStart: "ያለሁበትን ለአስተማሪ አሳይ",
      screenScreenshot: "አማራጭ የማያ ምስል",
      screenShareOn: "ማያዎን እያጋሩ ነው",
      screenShareStop: "ማጋራትን አቁም",
      screenShareConsentRequired: "ከማጋራትዎ በፊት ፈቃድዎን ይስጡ።",
      screenShareStarting: "የማያ ፈቃድ በመጠየቅ ላይ…",
      screenShareConnecting: "አስተማሪው እስኪገናኝ በመጠበቅ ላይ (የሙከራ ማስተላለፊያ)።",
      screenShareConnected: "ከአስተማሪው ጋር ተገናኝቷል። ቀጥታ ቪዲዮ አይቀዳም።",
      screenShareStopped: "የማያ ማጋራት ቆሟል።",
      screenShareCancelled: "የማያ ማጋራት ተሰርዟል።",
      screenShareError: "የማያ ማጋራት መጀመር አልቻለም። እንደገና ይሞክሩ።",
      screenContextSent: "የገጹ መረጃ ለአስተማሪ ተልኳል። ቀጥታ ማያዎን አላጋራም።",
      screenContextFailed: "የገጹን መረጃ መላክ አልተቻለም። እንደገና ይሞክሩ።",
      screenShareCleanupFailed: "የማያ ማጋራት ቆሟል፣ ግን የሙከራ ምልክቶቹን ማጽዳት አልተቻለም።",
      screenScreenshotTooLarge: "ከ3 ሜባ ያነሰ ምስል ይምረጡ።",
      describeOther: "በማስታወሻው የሚፈልጉትን ማስተካከያ ይግለጹ።"
    }
  };

  const bundled = { en, am };

  const AMHARIC_TITLES = {
    "what-is-shaping-the-future-of-va-work": "የቨርቹዋል አሲስታንት ሥራን ወደፊት ምን እየቀየረው ነው",
    "artificial-intelligence-and-the-future-of-va-work": "አርቴፊሻል ኢንተለጀንስ እና የቨርቹዋል አሲስታንት ሥራ ወደፊት",
    "what-clients-are-likely-to-value-more-and-more": "ቀጣሪዎች ወደፊት ይበልጥ ትኩረት የሚሰጡባቸው ነገሮች",
    "what-this-means-for-aspiring-virtual-assistants": "ይህ ለአዳዲስ ቨርቹዋል አሲስታንቶች ምን ትርጉም አለው",
    "so-is-the-future-of-va-promising": "ታዲያ የቨርቹዋል አሲስታንት ሥራ የወደፊት ተስፋው ጥሩ ነው"
  };

  function getFirstSentences(text, maxSentences = 3) {
    if (!text || typeof text !== "string") return "";
    const matches = text.match(/[^.!?።]+[.!?።]*/g);
    if (!matches || matches.length === 0) return text.trim();
    const clean = matches.map((s) => s.trim()).filter(Boolean);
    return clean.slice(0, maxSentences).join(" ");
  }

  function isDebugMode() {
    try {
      const search = window.location?.search || "";
      return new URLSearchParams(search).get("debug") === "1";
    } catch {
      return false;
    }
  }

  class DbAssistant extends HTMLElement {
    static get observedAttributes() {
      return ["lang", "api", "content", "theme", "debug"];
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._built = false;
      this._loadToken = 0;
      this._pack = null;
      this._errorKey = "";
      this._messages = [];
      this._sections = [];
      this._jobs = [];
      this._searchModule = null;
      this._recognition = null;
      this._voiceMode = "";
      this._voiceBlob = null;
      this._voiceObjectUrl = "";
      this._ignoreRecognitionEnd = false;
      this._voiceGeneration = 0;
      this._screenStream = null;
      this._screenPeer = null;
      this._screenTicketId = "";
      this._screenShareGeneration = 0;
      this._screenShareStarting = false;
      this._lastPageFocusedElement = null;
      this._rememberPageFocus = (event) => {
        const target = event.composedPath?.()[0] || event.target;
        if (!this.shadowRoot?.contains(target)) this._lastPageFocusedElement = target;
      };
    }

    connectedCallback() {
      document.addEventListener("focusin", this._rememberPageFocus, true);
      if (this._onlineHandler) window.addEventListener("online", this._onlineHandler);
      if (this._built) return;
      this._built = true;
      this._storageKey = `db-assistant:${location.pathname}:${this.id || "default"}`;
      this._queueKey = `${this._storageKey}:offline-questions`;
      this._restore();
      this._render();
      this._bind();
      this._registerServiceWorker();
      this._loadI18n();
      this._initSearchAndContent();
      if (navigator.onLine) this._flushQuestionQueue();
    }

    disconnectedCallback() {
      document.removeEventListener("focusin", this._rememberPageFocus, true);
      this._stopScreenShare(false);
      try { this._recognition?.stop(); } catch { /* Recognition may already be closed. */ }
      try { if (this._mediaRecorder?.state === "recording") this._mediaRecorder.stop(); } catch { /* Recorder may already be closed. */ }
      for (const track of this._mediaStream?.getTracks?.() || []) track.stop();
      this._mediaStream = null;
      window.speechSynthesis?.cancel?.();
      window.removeEventListener("online", this._onlineHandler);
      if (this._voiceObjectUrl) URL.revokeObjectURL(this._voiceObjectUrl);
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (!this._built || oldValue === newValue) return;
      if (name === "lang") this._loadI18n();
      if (name === "theme") this._applyTheme();
      if (name === "content") this._loadContent();
    }

    async _initSearchAndContent() {
      try {
        if (typeof globalThis !== "undefined" && globalThis.DbSearch?.search) {
          this._searchModule = globalThis.DbSearch;
        } else {
          const searchUrl = new URL("./search.js", scriptUrl).href;
          this._searchModule = await import(searchUrl);
        }
      } catch (err) {
        console.warn("Could not load search module:", err);
      }
      await this._loadContent();
    }

    _registerServiceWorker() {
      if (!window.isSecureContext || !navigator.serviceWorker) return;
      const appRoot = new URL("../", scriptUrl);
      const workerUrl = new URL("sw.js", appRoot);
      const safeScope = appRoot.pathname;
      navigator.serviceWorker.register(workerUrl.href, { scope: safeScope }).catch(() => {});
    }

    async _loadContent() {
      const attr = this.getAttribute("content");
      const url = attr
        ? new URL(attr, document.baseURI).href
        : new URL("../demo/data/content.json", scriptUrl).href;
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          const sections = await resp.json();
          this._sections = Array.isArray(sections) ? sections.map((section) => ({ ...section, type: section.type || "lesson" })) : [];
          try { localStorage.setItem(`${this._storageKey}:content`, JSON.stringify(this._sections)); } catch { /* Storage may be disabled or full. */ }
        }
      } catch (err) {
        console.warn("Could not load content sections from", url, err);
        try {
          const cached = JSON.parse(localStorage.getItem(`${this._storageKey}:content`) || "[]");
          if (Array.isArray(cached)) this._sections = cached;
        } catch { /* Keep an empty source when local storage is unavailable. */ }
      }
      try {
        const response = await fetch(new URL("../demo/data/jobs.json", scriptUrl));
        if (!response.ok) throw new Error("Jobs source unavailable");
        this._jobs = await response.json();
        try { localStorage.setItem(`${this._storageKey}:jobs`, JSON.stringify(this._jobs)); } catch { /* Storage may be disabled or full. */ }
        const jobSections = this._jobs.map((job) => ({
          ...job,
          type: "job",
          title: job.title,
          text: {
            en: [job.description, job.remote ? "Remote work telecommute" : "On site work", job.location, ...(job.accommodations || [])].join(". "),
            am: [job.description, job.remote ? "Remote work telecommute" : "On site work", job.location, ...(job.accommodations || [])].join(". ")
          }
        }));
        this._sections = [...(Array.isArray(this._sections) ? this._sections.filter((item) => item.type !== "job") : []), ...jobSections];
        this._populateAccommodationChoices();
      } catch (err) {
        console.warn("Could not load jobs source", err);
        try {
          const cachedJobs = JSON.parse(localStorage.getItem(`${this._storageKey}:jobs`) || "[]");
          this._jobs = Array.isArray(cachedJobs) ? cachedJobs : [];
          const jobSections = this._jobs.map((job) => ({
            ...job, type: "job",
            text: { en: [job.description, job.remote ? "Remote work telecommute" : "On site work", job.location, ...(job.accommodations || [])].join(". "), am: [job.description, job.remote ? "Remote work telecommute" : "On site work", job.location, ...(job.accommodations || [])].join(". ") }
          }));
          this._sections = [...(Array.isArray(this._sections) ? this._sections.filter((item) => item.type !== "job") : []), ...jobSections];
          this._populateAccommodationChoices();
        } catch { /* An empty jobs source is still usable for lesson questions. */ }
      }
    }

    _populateAccommodationChoices() {
      const jobSelect = this._els?.accommodationJob;
      if (!jobSelect || !this._jobs.length) return;
      const current = jobSelect.value;
      jobSelect.replaceChildren();
      for (const job of this._jobs) {
        const option = document.createElement("option"); option.value = job.id; option.textContent = `${job.title} — ${job.location}`;
        jobSelect.append(option);
      }
      if (this._jobs.some((job) => job.id === current)) jobSelect.value = current;
      this._populateAccommodationOptions();
    }

    _populateAccommodationOptions() {
      const job = this._jobs.find((item) => item.id === this._els.accommodationJob.value) || this._jobs[0];
      const select = this._els.accommodationChoice;
      if (!select) return;
      const current = select.value;
      select.replaceChildren();
      for (const item of job?.accommodations || []) {
        const option = document.createElement("option"); option.value = item; option.textContent = item; select.append(option);
      }
      const other = document.createElement("option"); other.value = "Other"; other.textContent = this._pack?.strings.otherAccommodation || "Other"; select.append(other);
      if ([...select.options].some((option) => option.value === current)) select.value = current;
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
      :host { all: initial; font-family: system-ui, sans-serif; color: #1a1a1a; font-size: 16px; line-height: 1.5; }
          :host([lang="am"]) { line-height: 1.7; }
          *, *::before, *::after { box-sizing: border-box; }
          button, input, textarea { font: inherit; letter-spacing: normal; text-transform: none; }
          button { min-width: 44px; min-height: 44px; padding: 8px 12px; border-radius: 4px; cursor: pointer; }
          button:focus-visible, textarea:focus-visible, select:focus-visible, [tabindex="-1"]:focus-visible, a:focus-visible { outline: 3px solid #1a1a1a; outline-offset: 2px; }
          .launcher { position: fixed; z-index: 2147483647; inset-inline-end: 16px; inset-block-end: 16px; max-width: calc(100vw - 32px); background: var(--assistant-primary, #002b56); color: white; border: 2px solid var(--assistant-primary, #002b56); }
          .panel { position: fixed; z-index: 2147483646; inset-inline-end: 16px; inset-block-end: 76px; width: min(32rem, calc(100vw - 32px)); max-height: min(70vh, 42rem); overflow: auto; border: 2px solid var(--assistant-primary, #002b56); border-radius: 8px; background: var(--assistant-background, #fff); color: var(--assistant-foreground, #1a1a1a); padding: 16px; }
          .panel[hidden] { display: none; }
          .panel-inner { display: flex; flex-direction: column; gap: 12px; }
          .header { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: start; }
          h2, p { margin: 0; overflow-wrap: anywhere; }
          h2 { font-size: 20px; font-weight: 700; }
          .header-actions, .language { display: flex; flex-wrap: wrap; gap: 6px; }
          .person { grid-column: 1 / -1; justify-self: start; background: var(--assistant-primary, #002b56); color: white; border: 2px solid var(--assistant-primary, #002b56); }
          .accommodation-open { grid-column: 1 / -1; justify-self: start; }
          .secondary { background: var(--assistant-background, #fff); color: var(--assistant-foreground, #1a1a1a); border: 2px solid var(--assistant-primary, #002b56); }
          .language { align-items: center; }
          .language-label, label { font-weight: 700; }
          [aria-pressed="true"] { outline: 2px solid currentColor; outline-offset: 1px; }
          .log { display: flex; flex-direction: column; gap: 10px; max-height: 35vh; overflow-y: auto; padding: 4px; }
          .message { margin: 0; padding: 10px 12px; border-radius: 6px; overflow-wrap: anywhere; }
          .message-user { background: #eef2f6; color: #1a1a1a; align-self: stretch; }
          .message-assistant { background: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; align-self: stretch; }
          .message-author { font-weight: 700; margin-bottom: 4px; font-size: 0.9em; color: var(--assistant-primary, #002b56); }
          .course-link { display: inline-block; margin-top: 8px; color: var(--assistant-primary, #002b56); font-weight: 600; text-decoration: underline; }
          .course-link:hover, .course-link:focus { text-decoration: none; }
          .debug-score { font-size: 0.8em; color: #64748b; margin-top: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
          .person-action { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; padding: 8px 14px; background: var(--assistant-primary, #002b56); color: white; border: 2px solid var(--assistant-primary, #002b56); border-radius: 4px; font-weight: 600; cursor: pointer; }
          .person-action:focus-visible { outline: 3px solid #1a1a1a; outline-offset: 2px; }
          .voice-controls { display: flex; flex-wrap: wrap; gap: 8px; }
          .listen-button { display: block; margin-top: 8px; }
          .voice-status { min-height: 1.5em; margin: 0; }
          .voice-status:empty { display: none; }
          .voice-note audio { display: block; width: 100%; margin-block: 8px; }
          .escalation { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid #94a3b8; padding-top: 12px; }
          .escalation[hidden], [hidden] { display: none !important; }
          .consent { display: flex; align-items: flex-start; gap: 8px; }
          .consent input { width: 20px; height: 20px; flex: none; margin: 2px 0 0; }
          .screen-share { display: flex; flex-direction: column; gap: 8px; border: 1px solid #94a3b8; border-radius: 6px; padding: 10px; }
          .screen-share h3 { margin: 0; font-size: 1rem; }
          .screen-share input[type="file"] { max-width: 100%; min-height: 44px; }
          .screen-share-bar { position: fixed; z-index: 2147483647; inset-block-start: 8px; inset-inline: 8px; margin-inline: auto; max-width: 36rem; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; border: 2px solid #14532d; border-radius: 6px; background: #ecfdf5; color: #14532d; font-weight: 700; box-shadow: 0 2px 8px #0005; }
          .screen-share-bar[hidden] { display: none !important; }
          .screen-share-bar button { flex: none; color: #fff; background: #7f1d1d; border: 2px solid #7f1d1d; }
          .voice-button[aria-pressed="true"] { background: #7f1d1d; color: #fff; border-color: #7f1d1d; }
          form, .field { display: flex; flex-direction: column; gap: 8px; }
          select { min-height: 44px; padding: 8px 12px; font: inherit; color: var(--assistant-foreground, #1a1a1a); background: var(--assistant-background, #fff); border: 2px solid var(--assistant-foreground, #1a1a1a); border-radius: 4px; }
          textarea { width: 100%; min-height: 4.5rem; max-height: 35vh; resize: vertical; padding: 8px 12px; border: 2px solid var(--assistant-foreground, #1a1a1a); border-radius: 4px; background: var(--assistant-background, #fff); color: var(--assistant-foreground, #1a1a1a); }
          input[type="tel"] { width: 100%; min-height: 44px; padding: 8px 12px; border: 2px solid var(--assistant-foreground, #1a1a1a); border-radius: 4px; background: var(--assistant-background, #fff); color: var(--assistant-foreground, #1a1a1a); }
          textarea::placeholder { color: #595959; opacity: 1; }
          .error { margin: 0; color: #7f1d1d; }
          #send { background: var(--assistant-primary, #002b56); color: white; border: 2px solid var(--assistant-primary, #002b56); }
          @media (max-width: 480px) {
            .panel { inset-inline: 0; inset-block-end: 0; width: 100%; max-height: 80vh; border-radius: 8px 8px 0 0; padding: 12px; }
            .log { max-height: 24vh; }
            .launcher { inset-inline-end: 12px; inset-block-end: 12px; }
          }
          @media (prefers-reduced-motion: reduce) { :host, :host * { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
          @media (forced-colors: active) { button, textarea, .panel, .message-assistant { border: 2px solid CanvasText; } .person, #send, .person-action { background: ButtonFace; color: ButtonText; } }
        </style>
        <button type="button" class="launcher" id="launcher" disabled aria-haspopup="dialog" aria-controls="panel" aria-expanded="false"></button>
        <section class="panel" id="panel" role="dialog" aria-labelledby="panel-title" aria-modal="false" hidden>
          <div class="panel-inner">
            <header class="header">
              <h2 id="panel-title" tabindex="-1"></h2>
              <button type="button" class="secondary" id="close"></button>
              <button type="button" class="person" id="person"></button>
              <button type="button" class="secondary accommodation-open" id="accommodation-open"></button>
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
              <div class="voice-controls">
                <button type="button" class="secondary voice-button" id="microphone" aria-pressed="false"></button>
                <button type="button" class="secondary" id="stop-voice" hidden></button>
                <button type="button" class="secondary" id="read-back" hidden></button>
              </div>
              <p id="voice-status" class="voice-status" role="status" aria-live="polite" aria-atomic="true"></p>
              <div class="voice-note" id="voice-note" hidden><strong id="voice-note-label"></strong><audio id="voice-player" controls></audio></div>
              <button type="submit" id="send"></button>
            </form>
            <form id="accommodation-form" class="escalation" novalidate hidden>
              <p id="accommodation-privacy" role="note"></p>
              <label for="accommodation-job" id="accommodation-job-label"></label>
              <select id="accommodation-job" required></select>
              <label for="accommodation-choice" id="accommodation-choice-label"></label>
              <select id="accommodation-choice" required></select>
              <label for="accommodation-note" id="accommodation-note-label"></label>
              <textarea id="accommodation-note" rows="2" dir="auto"></textarea>
              <p id="accommodation-status" class="error" role="status" aria-live="polite"></p>
              <button type="submit" id="accommodation-send"></button>
            </form>
            <form id="escalation" class="escalation" novalidate hidden>
              <label for="escalation-phone" id="escalation-phone-label"></label>
              <input id="escalation-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel">
              <p id="phone-error" class="error" role="alert" hidden></p>
              <label for="escalation-note" id="escalation-note-label"></label>
              <textarea id="escalation-note" name="note" rows="2" dir="auto"></textarea>
              <label class="consent" for="consent"><input id="consent" type="checkbox"><span id="consent-label"></span></label>
              <section class="screen-share" aria-labelledby="screen-share-title">
                <h3 id="screen-share-title"></h3>
                <p id="screen-share-note" role="note"></p>
                <label class="consent" for="screen-share-consent"><input id="screen-share-consent" type="checkbox"><span id="screen-share-consent-label"></span></label>
                <button type="button" class="secondary" id="screen-share-start" hidden></button>
                <label for="screen-screenshot" id="screen-screenshot-label" hidden></label>
                <input id="screen-screenshot" type="file" accept="image/*" hidden>
                <button type="button" class="secondary" id="screen-context-start" hidden></button>
                <p id="screen-share-status" class="error" role="status" aria-live="polite"></p>
              </section>
              <p id="escalation-status" class="error" role="status" aria-live="polite"></p>
              <button type="submit" id="send-escalation"></button>
            </form>
          </div>
        </section>
        <div id="screen-share-bar" class="screen-share-bar" role="status" aria-live="polite" aria-atomic="true" hidden>
          <span id="screen-share-bar-text"></span>
          <button type="button" id="screen-share-stop"></button>
        </div>`;
      const screenCaptureAvailable = typeof navigator !== "undefined" &&
        typeof navigator.mediaDevices?.getDisplayMedia === "function";
      const $ = (id) => this.shadowRoot.getElementById(id);
      this._els = {
        launcher: $("launcher"),
        panel: $("panel"),
        title: $("panel-title"),
        close: $("close"),
        person: $("person"),
        accommodationOpen: $("accommodation-open"),
        languageLabel: $("language-label"),
        english: $("english"),
        amharic: $("amharic"),
        greeting: $("greeting"),
        log: $("messages"),
        form: $("form"),
        label: $("question-label"),
        input: $("question"),
        error: $("question-error"),
        send: $("send"), microphone: $("microphone"), stopVoice: $("stop-voice"), readBack: $("read-back"),
        voiceStatus: $("voice-status"), voiceNote: $("voice-note"), voiceNoteLabel: $("voice-note-label"), voicePlayer: $("voice-player"),
        escalation: $("escalation"), escalationNoteLabel: $("escalation-note-label"), escalationNote: $("escalation-note"),
        escalationPhoneLabel: $("escalation-phone-label"), escalationPhone: $("escalation-phone"), phoneError: $("phone-error"),
        consent: $("consent"), consentLabel: $("consent-label"), escalationStatus: $("escalation-status"), sendEscalation: $("send-escalation"),
        screenShareTitle: $("screen-share-title"), screenShareNote: $("screen-share-note"),
        screenShareConsent: $("screen-share-consent"), screenShareConsentLabel: $("screen-share-consent-label"),
        screenShareStart: $("screen-share-start"), screenScreenshotLabel: $("screen-screenshot-label"),
        screenScreenshot: $("screen-screenshot"), screenContextStart: $("screen-context-start"),
        screenShareStatus: $("screen-share-status"), screenShareBar: $("screen-share-bar"),
        screenShareBarText: $("screen-share-bar-text"), screenShareStop: $("screen-share-stop"),
        accommodationForm: $("accommodation-form"), accommodationPrivacy: $("accommodation-privacy"),
        accommodationJobLabel: $("accommodation-job-label"), accommodationJob: $("accommodation-job"),
        accommodationChoiceLabel: $("accommodation-choice-label"), accommodationChoice: $("accommodation-choice"),
        accommodationNoteLabel: $("accommodation-note-label"), accommodationNote: $("accommodation-note"),
        accommodationStatus: $("accommodation-status"), accommodationSend: $("accommodation-send")
      };
      this._els.screenShareStart.hidden = !screenCaptureAvailable;
      this._els.screenContextStart.hidden = screenCaptureAvailable;
      this._els.screenScreenshotLabel.hidden = screenCaptureAvailable;
      this._els.screenScreenshot.hidden = screenCaptureAvailable;
      this._applyTheme();
      this._renderMessages();
    }

    _applyTheme() {
      const themes = { light: ["#002b56", "#fff", "#1a1a1a"], dark: ["#79b8ff", "#171717", "#f5f5f5"] };
      const values = themes[this.getAttribute("theme")] || themes.light;
      this.style.setProperty("--assistant-primary", values[0]);
      this.style.setProperty("--assistant-background", values[1]);
      this.style.setProperty("--assistant-foreground", values[2]);
    }

    _bind() {
      const e = this._els;
      e.launcher.addEventListener("click", () => this._open());
      e.close.addEventListener("click", () => this._close());
      e.form.addEventListener("submit", (event) => this._onSubmit(event));
      this._onlineHandler = () => this._flushQuestionQueue();
      window.addEventListener("online", this._onlineHandler);
      e.input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
          event.preventDefault();
          e.form.requestSubmit();
        }
      });
      e.input.addEventListener("input", () => {
        if (this._errorKey) this._setError("");
      });
      e.escalationPhone.addEventListener("input", () => { e.phoneError.hidden = true; });
      e.english.addEventListener("click", () => this.setAttribute("lang", "en"));
      e.amharic.addEventListener("click", () => this.setAttribute("lang", "am"));
      e.person.addEventListener("click", () => this._openEscalation());
      e.accommodationOpen.addEventListener("click", () => this._openAccommodation());
      e.screenShareStart.addEventListener("click", () => this._startScreenShare());
      e.screenContextStart.addEventListener("click", () => this._sharePageContext());
      e.screenShareStop.addEventListener("click", () => this._stopScreenShare());
      e.microphone.addEventListener("click", () => this._startVoiceInput());
      e.stopVoice.addEventListener("click", () => this._stopVoice());
      e.readBack.addEventListener("click", () => this._speakText(e.input.value, this._pack.lang, null, e.voiceStatus));
      e.escalation.addEventListener("submit", (event) => this._submitEscalation(event));
      e.accommodationForm.addEventListener("submit", (event) => this._submitAccommodation(event));
      e.accommodationJob.addEventListener("change", () => this._populateAccommodationOptions());
      this.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !e.panel.hidden) {
          event.preventDefault();
          this._close();
        }
      });
    }

    _restore() {
      try {
        const saved = JSON.parse(localStorage.getItem(this._storageKey) || "[]");
        if (Array.isArray(saved)) {
          this._messages = saved.filter((m) => m && typeof m.text === "string").slice(-200);
        }
      } catch {
        this._messages = [];
      }
    }

    _save() {
      try {
        localStorage.setItem(this._storageKey, JSON.stringify(this._messages));
      } catch {
        /* Storage may be unavailable or quota exceeded. */
      }
    }

    _renderMessages() {
      if (!this._els) return;
      this._els.log.replaceChildren();
      for (const message of this._messages) {
        this._appendMessage(message, false);
      }
    }

    _appendMessage(message, persist = true) {
      const lang = message.lang || this._pack?.lang || "en";
      const isAssistant = message.role === "assistant";
      const div = document.createElement("div");
      div.className = `message ${isAssistant ? "message-assistant" : "message-user"}`;
      div.dir = "auto";
      div.lang = lang;

      const author = document.createElement("div");
      author.className = "message-author";
      const authorName = isAssistant
        ? (this._pack?.strings.assistant || (lang === "am" ? am.strings.assistant : en.strings.assistant))
        : (this._pack?.strings.you || (lang === "am" ? am.strings.you : en.strings.you));
      author.textContent = authorName;
      div.appendChild(author);

      const timestamp = message.timestamp || new Date().toISOString();
      const time = document.createElement("time");
      time.className = "message-time";
      time.dateTime = timestamp;
      try {
        const calendarLocale = lang === "am" ? "am-ET-u-ca-ethiopic" : lang;
        time.textContent = new Intl.DateTimeFormat(calendarLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
      } catch { time.textContent = new Date(timestamp).toLocaleString(); }
      div.appendChild(time);

      const content = document.createElement("div");
      content.className = "message-body";
      content.textContent = message.text;
      div.appendChild(content);

      if (isAssistant) {
        const listen = document.createElement("button");
        listen.type = "button";
        listen.className = "secondary listen-button";
        listen.textContent = this._pack?.strings.listen || (lang === "am" ? am.strings.listen : en.strings.listen);
        const listenStatus = document.createElement("p");
        listenStatus.className = "voice-status";
        listenStatus.setAttribute("role", "status");
        listenStatus.setAttribute("aria-live", "polite");
        listen.addEventListener("click", () => this._speakText(content.textContent, lang, message.sectionId, listenStatus));
        div.append(listen, listenStatus);
      }

      if (isAssistant && message.linkUrl && message.linkTitle) {
        const link = document.createElement("a");
        link.className = "course-link";
        link.href = message.linkUrl;
        const prefix = this._pack?.strings.readInCourse || (lang === "am" ? am.strings.readInCourse : en.strings.readInCourse);
        link.textContent = `${prefix}: ${message.linkTitle}`;
        div.appendChild(link);
      }

      const showDebug = isDebugMode() || this.hasAttribute("debug");
      if (isAssistant && showDebug && typeof message.score === "number") {
        const debug = document.createElement("div");
        debug.className = "debug-score";
        debug.textContent = `[debug] match score: ${message.score.toFixed(4)}`;
        div.appendChild(debug);
      }

      if (isAssistant && message.showPerson) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "person-action";
        btn.textContent = this._pack?.strings.person || (lang === "am" ? am.strings.person : en.strings.person);
        btn.addEventListener("click", () => this._emit("person", {}));
        div.appendChild(btn);
      }

      this._els.log.appendChild(div);
      this._els.log.scrollTop = this._els.log.scrollHeight;

      if (persist) {
        this._messages.push({
          role: message.role || "user",
          type: message.type || "lesson",
          text: message.text,
          lang: message.lang || this._pack?.lang || "en",
          timestamp,
          linkUrl: message.linkUrl,
          linkTitle: message.linkTitle,
          sectionId: message.sectionId,
          score: message.score,
          showPerson: message.showPerson
        });
        this._save();
      }
    }

    async _loadI18n() {
      const requested = (this.getAttribute("lang") || "en").toLowerCase();
      const token = ++this._loadToken;
      let pack = null;
      try {
        const response = await fetch(new URL(`${requested}.json`, i18nBase));
        if (!response.ok) throw new Error("Translation fetch failed");
        pack = await response.json();
        if (!pack?.strings || pack.lang !== requested) throw new Error("Invalid translation pack");
        try { localStorage.setItem(`${this._storageKey}:i18n:${requested}`, JSON.stringify(pack)); } catch { /* Storage may be disabled or full. */ }
      } catch {
        try { pack = JSON.parse(localStorage.getItem(`${this._storageKey}:i18n:${requested}`) || "null"); } catch { /* Ignore an unavailable cache. */ }
        if (!pack) pack = bundled[requested] || bundled.en;
      }
      if (token !== this._loadToken) return;
      this._applyPack({ ...pack, lang: requested, strings: { ...en.strings, ...(pack.strings || {}) } });
    }

    _applyPack(pack) {
      this._pack = pack;
      this.dir = pack.dir || "ltr";
      const s = pack.strings;
      const e = this._els;
      const write = (node, key) => {
        node.textContent = s[key] || "";
        node.lang = pack.lang;
      };
      write(e.launcher, "launcher");
      write(e.title, "dialogTitle");
      write(e.close, "close");
      write(e.person, "person");
      write(e.accommodationOpen, "accommodationButton");
      write(e.languageLabel, "language");
      write(e.greeting, "greeting");
      write(e.label, "questionLabel");
      write(e.send, "ask");
      write(e.microphone, "microphone");
      e.microphone.setAttribute("aria-label", s.microphone);
      e.microphone.lang = pack.lang;
      write(e.stopVoice, "stop");
      write(e.readBack, "readBack");
      write(e.voiceNoteLabel, "voiceNote");
      write(e.escalationNoteLabel, "escalationNote");
      write(e.escalationPhoneLabel, "phoneLabel");
      write(e.consentLabel, "consent");
      write(e.sendEscalation, "sendEscalation");
      write(e.screenShareTitle, "screenShareTitle");
      write(e.screenShareNote, "screenShareNote");
      write(e.screenShareConsentLabel, "screenShareConsent");
      write(e.screenShareStart, "screenShareStart");
      write(e.screenScreenshotLabel, "screenScreenshot");
      write(e.screenContextStart, "screenContextStart");
      write(e.screenShareStop, "screenShareStop");
      e.screenShareBarText.textContent = s.screenShareOn || "";
      e.screenShareBarText.lang = pack.lang;
      write(e.accommodationPrivacy, "accommodationPrivacy");
      write(e.accommodationJobLabel, "whichJob");
      write(e.accommodationChoiceLabel, "whichAccommodation");
      write(e.accommodationNoteLabel, "accommodationNote");
      write(e.accommodationSend, "sendAccommodation");
      e.input.lang = pack.lang;
      e.input.placeholder = s.questionPlaceholder || "";
      e.panel.lang = pack.lang;
      e.panel.dir = pack.dir || "ltr";
      e.launcher.disabled = false;
      e.english.setAttribute("aria-pressed", pack.lang === "en");
      e.amharic.setAttribute("aria-pressed", pack.lang === "am");
      this._populateAccommodationChoices();
      if (this._errorKey) this._setError(this._errorKey);
      this._renderMessages();
      this._emit("ready", { lang: pack.lang, dir: this.dir });
    }

    _open() {
      if (!this._pack || !this._els.panel.hidden) return;
      this._els.panel.hidden = false;
      this._els.launcher.setAttribute("aria-expanded", "true");
      this._els.title.focus();
      this._emit("open", {});
    }

    _close() {
      if (this._els.panel.hidden) return;
      this._els.panel.hidden = true;
      this._els.launcher.setAttribute("aria-expanded", "false");
      this._emit("close", {});
      this._els.launcher.focus();
    }

    _readQuestionQueue() {
      try {
        const queue = JSON.parse(localStorage.getItem(this._queueKey) || "[]");
        return Array.isArray(queue) ? queue : [];
      } catch { return []; }
    }

    _writeQuestionQueue(queue) {
      try { localStorage.setItem(this._queueKey, JSON.stringify(queue)); } catch { /* Keep the current session usable if storage is full. */ }
    }

    async _askServer(question, language) {
      const base = (this.getAttribute("api") || location.origin).replace(/\/$/, "");
      try {
        const response = await fetch(`${base}/api/v1/ask`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, language })
        });
        if (!response.ok) return false;
        const result = await response.json();
        if (typeof result.answer !== "string" || !result.answer.trim()) return false;
        const source = Array.isArray(result.sources) ? result.sources[0] : null;
        this._appendMessage({ role: "assistant", text: result.answer, lang: language,
          linkUrl: source?.url, linkTitle: source?.title || source?.type || "Source" });
        return true;
      } catch { return false; }
    }

    _queueQuestion(question, language) {
      const queue = this._readQuestionQueue();
      queue.push({ question, language, queuedAt: new Date().toISOString() });
      this._writeQuestionQueue(queue);
    }

    async _flushQuestionQueue() {
      if (!navigator.onLine) return;
      const queue = this._readQuestionQueue();
      while (queue.length && navigator.onLine) {
        const pending = queue[0];
        if (!await this._askServer(pending.question, pending.language)) return;
        queue.shift();
        this._writeQuestionQueue(queue);
      }
    }

    _appendOfflineSaved(language) {
      const strings = this._pack?.strings || en.strings;
      this._appendMessage({ role: "assistant", text: strings.offlineSaved || en.strings.offlineSaved, lang: language });
    }

    async _onSubmit(event) {
      event.preventDefault();
      const text = this._els.input.value.trim();
      if (!text) {
        this._setError("errorEmpty");
        this._emit("error", { code: "empty-question" });
        this._els.input.focus();
        return;
      }
      this._setError("");
      this._els.input.value = "";

      const currentLang = (this.getAttribute("lang") || "en").toLowerCase();

      // 1. Append user's question
      this._appendMessage({ role: "user", text, lang: currentLang });
      this._emit("question", { text });

      const isOffline = !navigator.onLine;
      let wasQueued = isOffline;
      if (isOffline) this._queueQuestion(text, currentLang);
      else if (await this._askServer(text, currentLang)) return;

      // 2. Ensure content and search function are ready
      if (!this._sections || this._sections.length === 0) {
        await this._loadContent();
      }
      if (!this._searchModule) {
        try {
          if (typeof globalThis !== "undefined" && globalThis.DbSearch?.search) {
            this._searchModule = globalThis.DbSearch;
          } else {
            const searchUrl = new URL("./search.js", scriptUrl).href;
            this._searchModule = await import(searchUrl);
          }
        } catch {
          // ignore
        }
      }

      const searchFn = this._searchModule?.search || globalThis.DbSearch?.search;
      const searchResult = searchFn
        ? searchFn(text, this._sections, currentLang)
        : { best: null, others: [] };

      // 3. Process result
      const allMatches = searchResult.best
        ? [searchResult.best, ...(searchResult.others || [])]
        : (searchResult.others || []);
      const threshold = this._searchModule?.THRESHOLD || 0.25;
      const matchingJobs = allMatches.filter((item) => item.section?.type === "job" && item.score >= threshold).slice(0, 5);
      if (matchingJobs.length) {
        for (const match of matchingJobs) {
          const job = match.section;
          const detail = [
            `${job.employer} · ${job.location} · ${job.remote ? "Remote" : "On site"}`,
            job.description,
            `Accommodations: ${(job.accommodations || []).join(", ")}`
          ].join("\n");
          this._appendMessage({
            role: "assistant", type: "job", text: `${job.title}\n${detail}`, lang: currentLang,
            linkUrl: job.url, linkTitle: job.title, sectionId: job.id, score: match.score
          });
        }
        if (wasQueued) this._appendOfflineSaved(currentLang);
        return;
      }

      if (searchResult.best) {
        const bestSection = searchResult.best.section;
        const score = searchResult.best.score;
        const fullText = (bestSection.text && (bestSection.text[currentLang] || bestSection.text.en)) || "";
        const snippet = getFirstSentences(fullText, 3);

        let linkTitle = bestSection.title;
        if (currentLang === "am") {
          if (typeof bestSection.title === "object" && bestSection.title.am) {
            linkTitle = bestSection.title.am;
          } else if (AMHARIC_TITLES[bestSection.id]) {
            linkTitle = AMHARIC_TITLES[bestSection.id];
          }
        } else if (typeof bestSection.title === "object" && bestSection.title.en) {
          linkTitle = bestSection.title.en;
        }

        this._appendMessage({
          role: "assistant",
          text: snippet,
          lang: currentLang,
          linkUrl: bestSection.url,
          linkTitle,
          sectionId: bestSection.id,
          score,
          showPerson: false
        });
      } else {
        // If best is null, answer the i18n string "I could not find this in the course"
        // and show the Talk to a person button.
        const notFoundText = this._pack?.strings.notFound || (currentLang === "am" ? am.strings.notFound : en.strings.notFound);
        const topScore = searchResult.others?.[0]?.score || 0;

        // Ensure header person button is also visible and prominent
        if (this._els.person) this._els.person.hidden = false;

        this._appendMessage({
          role: "assistant",
          text: notFoundText,
          lang: currentLang,
          score: topScore,
          showPerson: true
        });
      }
      if (wasQueued) this._appendOfflineSaved(currentLang);
    }

    _setVoiceState(active, mode = "") {
      this._voiceMode = mode;
      this._els.microphone.setAttribute("aria-pressed", active ? "true" : "false");
      this._els.stopVoice.hidden = !active;
    }

    _startVoiceInput() {
      if (this._voiceMode) {
        this._stopVoice();
        return;
      }
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) {
        this._startVoiceRecorder();
        return;
      }
      const recognition = new Recognition();
      recognition.lang = this._pack?.lang === "am" ? "am-ET" : "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      this._recognition = recognition;
      this._recognitionGotResult = false;
      this._ignoreRecognitionEnd = false;
      this._setVoiceState(true, "recognition");
      this._els.voiceStatus.textContent = this._pack.strings.listening;
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results || []).map((result) => result[0]?.transcript || "").join(" ").trim();
        if (transcript) {
          this._recognitionGotResult = true;
          this._els.input.value = transcript;
          this._els.input.dispatchEvent(new Event("input", { bubbles: true }));
          this._els.readBack.hidden = false;
          this._els.voiceStatus.textContent = this._pack.strings.speechAdded;
          this._finishRecognition();
        } else {
          this._recognition = null;
          this._setVoiceState(false);
          this._startVoiceRecorder();
        }
      };
      recognition.onerror = () => {
        if (this._recognition !== recognition) return;
        this._recognition = null;
        this._setVoiceState(false);
        if (!this._recognitionGotResult) this._startVoiceRecorder();
      };
      recognition.onend = () => {
        if (this._recognition !== recognition) return;
        this._recognition = null;
        const shouldFallback = !this._recognitionGotResult && !this._ignoreRecognitionEnd;
        if (shouldFallback) this._startVoiceRecorder();
        else if (!this._recognitionGotResult) this._setVoiceState(false);
      };
      try {
        recognition.start();
      } catch {
        this._recognition = null;
        this._startVoiceRecorder();
      }
    }

    _finishRecognition() {
      const recognition = this._recognition;
      this._recognition = null;
      this._setVoiceState(false);
      try { recognition?.stop(); } catch { /* Recognition may already have stopped. */ }
    }

    async _startVoiceRecorder() {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || !window.isSecureContext) {
        this._setVoiceState(false);
        this._els.voiceStatus.textContent = this._pack.strings.voiceUnavailable;
        return;
      }
      this._setVoiceState(true, "recording-pending");
      const generation = ++this._voiceGeneration;
      this._els.voiceStatus.textContent = this._pack.strings.recording;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (generation !== this._voiceGeneration) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        this._mediaStream = stream;
        this._voiceChunks = [];
        const recorder = new MediaRecorder(stream);
        this._mediaRecorder = recorder;
        recorder.addEventListener("dataavailable", (event) => {
          if (event.data?.size) this._voiceChunks.push(event.data);
        });
        recorder.addEventListener("stop", () => {
          const blob = new Blob(this._voiceChunks, { type: recorder.mimeType || "audio/webm" });
          this._voiceBlob = blob.size ? blob : null;
          for (const track of stream.getTracks()) track.stop();
          this._mediaStream = null;
          this._mediaRecorder = null;
          this._setVoiceState(false);
          if (this._voiceBlob) {
            if (this._voiceObjectUrl) URL.revokeObjectURL(this._voiceObjectUrl);
            this._voiceObjectUrl = URL.createObjectURL(this._voiceBlob);
            this._els.voicePlayer.src = this._voiceObjectUrl;
            this._els.voiceNote.hidden = false;
            this._els.voiceStatus.textContent = this._pack.strings.recordedReady;
          }
        }, { once: true });
        recorder.start();
        this._voiceMode = "recording";
      } catch {
        for (const track of this._mediaStream?.getTracks?.() || []) track.stop();
        this._mediaStream = null;
        this._mediaRecorder = null;
        this._setVoiceState(false);
        this._els.voiceStatus.textContent = this._pack.strings.voiceUnavailable;
      }
    }

    _stopVoice() {
      if (this._voiceMode === "recognition" && this._recognition) {
        this._ignoreRecognitionEnd = true;
        const recognition = this._recognition;
        this._recognition = null;
        this._setVoiceState(false);
        try { recognition.stop(); } catch { /* Already stopped. */ }
        this._els.voiceStatus.textContent = this._pack.strings.stopped;
        return;
      }
      if ((this._voiceMode === "recording" || this._voiceMode === "recording-pending") && this._mediaRecorder?.state === "recording") {
        this._mediaRecorder.stop();
      } else if (this._voiceMode === "recording-pending") {
        this._voiceGeneration++;
        for (const track of this._mediaStream?.getTracks?.() || []) track.stop();
        this._mediaStream = null;
        this._setVoiceState(false);
        this._els.voiceStatus.textContent = this._pack.strings.stopped;
      }
    }

    _speakText(text, language, sectionId, statusNode) {
      const lang = language === "am" ? "am-ET" : "en-US";
      if (language === "am") {
        const voices = window.speechSynthesis?.getVoices?.() || [];
        const voice = voices.find((item) => (item.lang || "").toLowerCase().startsWith("am"));
        if (!voice) {
          const message = this._pack?.strings.noAmharicVoice || am.strings.noAmharicVoice;
          statusNode.textContent = message;
          if (sectionId) this._playAmharicAudio(sectionId, statusNode);
          return;
        }
      }
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        statusNode.textContent = language === "am" ? (this._pack?.strings.noAmharicVoice || am.strings.noAmharicVoice) : this._pack.strings.voiceUnavailable;
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      if (language === "am") utterance.voice = window.speechSynthesis.getVoices().find((item) => (item.lang || "").toLowerCase().startsWith("am")) || null;
      utterance.onerror = () => { statusNode.textContent = this._pack.strings.voiceUnavailable; };
      statusNode.textContent = "";
      window.speechSynthesis.speak(utterance);
    }

    async _playAmharicAudio(sectionId, statusNode) {
      const url = new URL(`./audio/${encodeURIComponent(sectionId)}.am.mp3`, scriptUrl);
      const audio = new Audio(url.href);
      audio.play().catch(() => { /* Keep the explicit no-voice message visible. */ });
    }

    _openEscalation() {
      this._els.escalation.hidden = false;
      this._els.escalationNote.focus();
      this._emit("person", {});
    }

    _openAccommodation() {
      this._els.accommodationForm.hidden = false;
      this._populateAccommodationChoices();
      this._els.accommodationJob.focus();
    }

    _blobAsDataUrl(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error("Could not read the voice note."));
        reader.readAsDataURL(blob);
      });
    }

    async _createScreenTicket(type, screenContext = null) {
      const base = (this.getAttribute("api") || location.origin).replace(/\/$/, "");
      const payload = {
        type,
        conversation: [],
        language: this._pack.lang,
        page: location.href,
        note: type === "screen-share" ? "Demo WebRTC screen share; no recording." : ""
      };
      if (screenContext) payload.screenContext = screenContext;
      const response = await fetch(`${base}/api/v1/escalations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Screen-share request could not be created.");
      const result = await response.json();
      if (typeof result.ticketId !== "string") throw new Error("Screen-share ticket ID was missing.");
      return { base, ticketId: result.ticketId };
    }

    _waitForIceGathering(peer) {
      if (peer.iceGatheringState === "complete") return Promise.resolve();
      return new Promise((resolve) => {
        const finish = () => {
          clearTimeout(timeout);
          peer.removeEventListener("icegatheringstatechange", checkState);
          resolve();
        };
        const checkState = () => {
          if (peer.iceGatheringState === "complete") finish();
        };
        const timeout = setTimeout(finish, 10000);
        peer.addEventListener("icegatheringstatechange", checkState);
      });
    }

    async _waitForScreenAnswer(base, ticketId, generation) {
      for (let attempt = 0; attempt < 60 && generation === this._screenShareGeneration; attempt++) {
        const response = await fetch(
          `${base}/api/v1/escalations/${encodeURIComponent(ticketId)}/signal?type=answer`
        );
        if (!response.ok) throw new Error("The tutor's WebRTC answer could not be loaded.");
        const result = await response.json();
        if (typeof result.sdp === "string" && result.sdp) return result.sdp;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (generation !== this._screenShareGeneration) return "";
      throw new Error("Timed out waiting for the tutor's WebRTC answer.");
    }

    async _startScreenShare() {
      const e = this._els;
      if (!e.screenShareConsent.checked) {
        e.screenShareStatus.textContent = this._pack.strings.screenShareConsentRequired;
        e.screenShareConsent.focus();
        return;
      }
      if (this._screenShareStarting || this._screenStream) return;

      this._screenShareStarting = true;
      e.screenShareStart.disabled = true;
      e.screenShareStatus.textContent = this._pack.strings.screenShareStarting;
      const generation = ++this._screenShareGeneration;
      let stream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        if (generation !== this._screenShareGeneration) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        this._screenStream = stream;
        e.screenShareBar.hidden = false;
        e.screenShareBarText.textContent = this._pack.strings.screenShareOn;
        e.screenShareStatus.textContent = this._pack.strings.screenShareConnecting;
        for (const track of stream.getTracks()) {
          track.addEventListener("ended", () => {
            if (this._screenStream === stream) this._stopScreenShare();
          }, { once: true });
        }

        const { base, ticketId } = await this._createScreenTicket("screen-share");
        this._screenTicketId = ticketId;
        if (generation !== this._screenShareGeneration) return;

        const peer = new RTCPeerConnection();
        this._screenPeer = peer;
        for (const track of stream.getTracks()) peer.addTrack(track, stream);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await this._waitForIceGathering(peer);
        if (generation !== this._screenShareGeneration) return;

        const signalUrl = `${base}/api/v1/escalations/${encodeURIComponent(ticketId)}/signal`;
        const offerResponse = await fetch(signalUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "offer", sdp: peer.localDescription.sdp })
        });
        if (!offerResponse.ok) throw new Error("The WebRTC offer could not be sent.");

        const answer = await this._waitForScreenAnswer(base, ticketId, generation);
        if (generation !== this._screenShareGeneration) return;
        await peer.setRemoteDescription({ type: "answer", sdp: answer });
        e.screenShareStatus.textContent = this._pack.strings.screenShareConnected;
        try {
          const clearResponse = await fetch(
            `${base}/api/v1/escalations/${encodeURIComponent(ticketId)}/signal`,
            { method: "DELETE", keepalive: true }
          );
          if (!clearResponse.ok) throw new Error("Signal cleanup failed.");
        } catch {
          e.screenShareStatus.textContent = this._pack.strings.screenShareCleanupFailed;
        }
      } catch (error) {
        if (generation !== this._screenShareGeneration) return;
        const cancelled = error?.name === "AbortError" || error?.name === "NotAllowedError";
        this._stopScreenShare(false);
        e.screenShareStatus.textContent = cancelled
          ? this._pack.strings.screenShareCancelled
          : this._pack.strings.screenShareError;
      } finally {
        this._screenShareStarting = false;
        if (this._els) e.screenShareStart.disabled = Boolean(this._screenStream);
      }
    }

    _stopScreenShare(announce = true) {
      const stream = this._screenStream;
      const peer = this._screenPeer;
      const ticketId = this._screenTicketId;
      this._screenShareGeneration++;
      this._screenStream = null;
      this._screenPeer = null;
      this._screenTicketId = "";
      for (const track of stream?.getTracks?.() || []) track.stop();
      peer?.close();
      if (this._els) {
        this._els.screenShareBar.hidden = true;
        this._els.screenShareConsent.checked = false;
        this._els.screenShareStart.disabled = false;
        if (announce && (stream || ticketId)) {
          this._els.screenShareStatus.textContent = this._pack.strings.screenShareStopped;
        }
      }
      if (ticketId) {
        const base = (this.getAttribute("api") || location.origin).replace(/\/$/, "");
        fetch(`${base}/api/v1/escalations/${encodeURIComponent(ticketId)}/signal`, {
          method: "DELETE",
          keepalive: true
        }).catch(() => {
          if (this._els) this._els.screenShareStatus.textContent = this._pack.strings.screenShareCleanupFailed;
        });
      }
    }

    _focusedAccessibleName(element) {
      if (!element) return "";
      const root = element.getRootNode();
      const labelledBy = element.getAttribute("aria-labelledby")
        ?.split(/\s+/)
        .map((id) => root.getElementById?.(id) || document.getElementById(id))
        .filter(Boolean)
        .map((node) => node.textContent.trim())
        .join(" ");
      const labels = Array.from(element.labels || []).map((label) => label.textContent.trim()).join(" ");
      return (
        element.getAttribute("aria-label") ||
        labelledBy ||
        labels ||
        element.getAttribute("alt") ||
        element.getAttribute("title") ||
        element.getAttribute("placeholder") ||
        element.textContent ||
        ""
      ).trim().slice(0, 500);
    }

    async _sharePageContext() {
      const e = this._els;
      if (!e.screenShareConsent.checked) {
        e.screenShareStatus.textContent = this._pack.strings.screenShareConsentRequired;
        e.screenShareConsent.focus();
        return;
      }
      const file = e.screenScreenshot.files?.[0];
      if (file && (file.size > 3_000_000 || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type))) {
        e.screenShareStatus.textContent = this._pack.strings.screenScreenshotTooLarge;
        return;
      }

      e.screenContextStart.disabled = true;
      e.screenShareStatus.textContent = this._pack.strings.screenShareStarting;
      try {
        const focused = (this._lastPageFocusedElement?.isConnected ? this._lastPageFocusedElement : null)
          || this.shadowRoot.activeElement || document.activeElement;
        const screenContext = {
          pageUrl: location.href,
          focusedAccessibleName: this._focusedAccessibleName(focused),
          focusedOuterHTML: typeof focused?.outerHTML === "string" ? focused.outerHTML.slice(0, 500) : "",
          headings: Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"))
            .map((heading) => heading.textContent.trim().slice(0, 300))
            .filter(Boolean)
            .slice(0, 20),
          screenshot: file
            ? { mimeType: file.type, dataUrl: await this._blobAsDataUrl(file) }
            : null
        };
        await this._createScreenTicket("screen-context", screenContext);
        e.screenShareStatus.textContent = this._pack.strings.screenContextSent;
        e.screenShareConsent.checked = false;
        e.screenScreenshot.value = "";
      } catch {
        e.screenShareStatus.textContent = this._pack.strings.screenContextFailed;
      } finally {
        e.screenContextStart.disabled = false;
      }
    }

    async _submitEscalation(event) {
      event.preventDefault();
      const e = this._els;
      const rawPhone = e.escalationPhone.value.trim();
      const normalizedPhone = rawPhone ? normalizeEthiopianPhone(rawPhone) : "";
      if (rawPhone && !normalizedPhone) {
        e.phoneError.textContent = this._pack.strings.phoneInvalid || en.strings.phoneInvalid;
        e.phoneError.lang = this._pack.lang;
        e.phoneError.hidden = false;
        e.escalationPhone.focus();
        return;
      }
      try {
        const conversation = e.consent.checked ? this._messages : [];
        const payload = {
          conversation,
          language: this._pack.lang,
          page: location.href,
          note: e.escalationNote.value.trim(),
          phone: normalizedPhone
        };
        if (this._voiceBlob) {
          payload.audio = { mimeType: this._voiceBlob.type || "audio/webm", dataUrl: await this._blobAsDataUrl(this._voiceBlob) };
        }
        const base = (this.getAttribute("api") || location.origin).replace(/\/$/, "");
        const response = await fetch(`${base}/api/v1/escalations`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("Escalation send failed");
        const result = await response.json();
        e.escalationStatus.textContent = this._pack.strings.escalationSent;
        this._emit("escalated", { ticketId: result.ticketId });
        e.escalationNote.value = "";
        e.escalationPhone.value = "";
        e.consent.checked = false;
        this._voiceBlob = null;
        e.voiceNote.hidden = true;
        e.voicePlayer.removeAttribute("src");
      } catch {
        e.escalationStatus.textContent = this._pack.strings.escalationFailed;
      }
    }

    async _submitAccommodation(event) {
      event.preventDefault();
      const e = this._els;
      const job = this._jobs.find((item) => item.id === e.accommodationJob.value);
      if (!job || !e.accommodationChoice.value) {
        e.accommodationStatus.textContent = this._pack.strings.accommodationFailed;
        return;
      }
      const note = e.accommodationNote.value.trim();
      if (e.accommodationChoice.value === "Other" && !note) {
        e.accommodationStatus.textContent = this._pack.strings.describeOther;
        e.accommodationNote.focus();
        return;
      }
      try {
        const payload = {
          type: "accommodation",
          jobId: job.id,
          accommodation: e.accommodationChoice.value === "Other" ? `Other: ${note}` : e.accommodationChoice.value,
          conversation: [],
          language: this._pack.lang,
          page: location.href,
          note
        };
        const base = (this.getAttribute("api") || location.origin).replace(/\/$/, "");
        const response = await fetch(`${base}/api/v1/escalations`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("Escalation send failed");
        const result = await response.json();
        e.accommodationStatus.textContent = this._pack.strings.accommodationSent;
        this._emit("escalated", { ticketId: result.ticketId, type: "accommodation" });
        e.accommodationNote.value = "";
      } catch {
        e.accommodationStatus.textContent = this._pack.strings.accommodationFailed;
      }
    }

    _setError(key) {
      this._errorKey = key;
      const error = this._els.error;
      const input = this._els.input;
      if (!key || !this._pack) {
        error.textContent = "";
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
        return;
      }
      error.textContent = this._pack.strings[key] || "";
      error.lang = this._pack.lang;
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", "question-error");
    }

    _emit(name, detail) {
      this.dispatchEvent(new CustomEvent(`db-assistant:${name}`, { bubbles: true, composed: true, detail }));
    }
  }

  if (!customElements.get("db-assistant")) customElements.define("db-assistant", DbAssistant);
})();
