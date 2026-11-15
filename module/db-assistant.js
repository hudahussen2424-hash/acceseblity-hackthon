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
      cloudConsent: "Optional: if checked, your question and matched course section may be sent to this site's configured cloud AI. If unchecked, course search is used.",
      ask: "Send",
      errorEmpty: "Enter a question before sending.",
      person: "Talk to a person",
      language: "Language",
      you: "You",
      assistant: "Assistant",
      tutor: "Tutor",
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
      speechLimitations: "Speech recognition and voices depend on your browser, device, and selected language. Review recognized words before sending.",
      readBack: "Read it back",
      listen: "Listen",
      noAmharicVoice: "No Amharic voice on this phone",
      escalationNote: "Optional note",
      consent: "Share this conversation with a tutor",
      sendEscalation: "Send to a person",
      voiceNote: "Voice note for tutor",
      escalationSent: "Your request is queued. Tutors may be unavailable, including at 23:00. Response times vary and are not guaranteed. Return here and choose Check for tutor reply.",
      ticketReference: "Ticket ID: {ticketId}.",
      tutorAvailability: "Tutors may be unavailable, including at 23:00. Requests are queued, but response times vary and are not guaranteed. Return here and choose Check for tutor reply.",
      checkTutorReply: "Check for tutor reply",
      checkingTutorReply: "Checking for a tutor reply…",
      tutorReplyPending: "No reply yet. Your request is still waiting. Check again later.",
      tutorUpdateAvailable: "A tutor sent an update. Your request is still open; check again later for a final reply.",
      tutorReplyAvailable: "A tutor replied. The response is shown in this chat.",
      checkTutorReplyFailed: "Could not check for a tutor reply. Check your connection and try again.",
      ticketDataTitle: "Your tutor requests",
      ticketDataLabel: "Choose a request",
      exportTicketData: "Export request data",
      deleteTicketData: "Delete request data",
      ticketDataFailed: "Could not manage this request. Check your connection and try again.",
      ticketDataDeleted: "Request data deleted.",
      ticketDataDeleteConfirm: "Permanently delete this tutor request and its attachments?",
      ticketDataNote: "This browser stores a private ticket key for export and deletion. Keep this browser data private.",
      clearLocalData: "Clear this device's assistant data",
      clearLocalDataConfirm: "Clear local chat history, queued questions, cached lesson data, and saved ticket keys from this browser? This does not delete server tickets.",
      clearLocalDataDone: "Local assistant data cleared. Server tickets are unchanged unless you delete them above.",
      clearLocalDataFailed: "Could not clear this browser's assistant data. Use the browser's site-data controls.",
      escalationFailed: "Your request could not be sent. Check your connection and try again.",
      offlineSaved: "Saved on this phone. It will send when you are online.",
      phoneLabel: "Phone number (optional)",
      phoneInvalid: "Enter an Ethiopian number starting with 09, 07, +2519, or +2517.",
      accommodationButton: "I need an accommodation for my interview",
      accommodationPrivacy: "Your accommodation choices and note go only to a tutor. They are never shared with an employer.",
      whichJob: "Which test job is your interview for?",
      whichAccommodation: "What accommodation would help?",
      jobRemote: "Remote",
      jobOnSite: "On-site",
      jobAccommodations: "Accommodations",
      otherAccommodation: "Other (describe it in the note)",
      accommodationNote: "Optional note",
      sendAccommodation: "Ask a tutor about this accommodation",
      accommodationSent: "Your request was sent privately to a tutor.",
      accommodationFailed: "Your request could not be sent. Please try again.",
      screenShareConsent: "I consent to sharing my screen or page details with a tutor. Sharing starts only after I press a button. Live video is not recorded or stored. Page sharing sends this page URL, the focused element's accessible name and HTML, page headings, and only a screenshot I select; these are attached to a tutor request.",
      screenShareTitle: "Share with a tutor",
      screenShareNote: "Use HTTPS for screen capture. Desktop uses direct demo WebRTC with no configured STUN/TURN relay, so some networks may block it. On Android Chrome, live screen sharing is unavailable; you can share page details and optionally upload a screenshot instead.",
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
      screenSharePermissionDenied: "Screen access was not allowed. Check your browser permissions.",
      screenShareDisconnected: "The screen connection was lost. You can still stop sharing.",
      screenShareError: "Screen sharing could not start. Please try again.",
      screenContextSent: "Page details were sent to the tutor. This did not share your live screen.",
      screenContextFailed: "Page details could not be sent. Please try again.",
      screenShareCleanupFailed: "Screen sharing stopped, but demo signaling could not be cleared.",
      screenScreenshotTooLarge: "Choose an image smaller than 3 MB.",
      translationUnavailable: "This translation could not be loaded. English is being shown.",
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
      tutor: "አስተማሪ",
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
      speechLimitations: "የድምፅ ማወቂያና ድምፆች በአሳሹ፣ በመሣሪያውና በተመረጠው ቋንቋ ላይ ይመረኮዛሉ። ከመላክዎ በፊት የተገነዘቡትን ቃላት ይመልከቱ።",
      readBack: "መልሰህ አንብብ",
      listen: "አዳምጥ",
      noAmharicVoice: "በዚህ ስልክ ላይ የአማርኛ ድምፅ የለም",
      escalationNote: "አማራጭ ማስታወሻ",
      consent: "ይህን ውይይት ለአስተማሪ ያጋሩ",
      sendEscalation: "ለሰው ላክ",
      voiceNote: "ለአስተማሪ የድምፅ መልዕክት",
      cloudConsent: "አማራጭ፦ ከተመረጠ ጥያቄዎና የተዛመደው የትምህርት ክፍል በዚህ ጣቢያ ወደተዋቀረው የደመና AI ሊላኩ ይችላሉ። ካልተመረጠ የትምህርት ፍለጋ ይጠቀማል።",
      escalationSent: "ጥያቄዎ በወረፋ ላይ ተቀምጧል። አስተማሪዎች በ23:00 ላይም ላይገኙ ይችላሉ። የምላሽ ጊዜ ይለያያል እና ዋስትና የለውም። ተመልሰው እዚህ ይምጡና የአስተማሪ ምላሽን ይፈትሹ።",
      ticketReference: "የጥያቄ መለያ፦ {ticketId}።",
      tutorAvailability: "አስተማሪዎች በ23:00 ላይም ላይገኙ ይችላሉ። ጥያቄዎች በወረፋ ይቀመጣሉ፤ የምላሽ ጊዜ ይለያያል እና ዋስትና የለውም። ተመልሰው እዚህ ይምጡና የአስተማሪ ምላሽን ይፈትሹ።",
      checkTutorReply: "የአስተማሪ ምላሽ ይፈትሹ",
      checkingTutorReply: "የአስተማሪ ምላሽ በመፈተሽ ላይ…",
      tutorReplyPending: "እስካሁን ምላሽ የለም። ጥያቄዎ በመጠባበቅ ላይ ነው። ቆይተው እንደገና ይፈትሹ።",
      tutorUpdateAvailable: "አስተማሪ የሁኔታ መረጃ ልኳል። ጥያቄዎ ክፍት ነው፤ የመጨረሻ ምላሽ በኋላ እንደገና ይፈትሹ።",
      tutorReplyAvailable: "አስተማሪ መልሷል። ምላሹ በዚህ ውይይት ውስጥ ይታያል።",
      checkTutorReplyFailed: "የአስተማሪን ምላሽ መፈተሽ አልተቻለም። ግንኙነቱን ያረጋግጡና እንደገና ይሞክሩ።",
      ticketDataTitle: "የእርስዎ የአስተማሪ ጥያቄዎች",
      ticketDataLabel: "ጥያቄ ይምረጡ",
      exportTicketData: "የጥያቄ መረጃን ያውርዱ",
      deleteTicketData: "የጥያቄ መረጃን ይሰርዙ",
      ticketDataFailed: "ይህን ጥያቄ ማስተዳደር አልተቻለም። ግንኙነቱን ያረጋግጡና እንደገና ይሞክሩ።",
      ticketDataDeleted: "የጥያቄው መረጃ ተሰርዟል።",
      ticketDataDeleteConfirm: "ይህን የአስተማሪ ጥያቄና አባሪዎቹን በቋሚነት ይሰርዙ?",
      ticketDataNote: "ይህ አሳሽ ለማውረድና ለመሰረዝ የግል ቁልፍ ያስቀምጣል። የአሳሹን መረጃ በግል ይጠብቁ።",
      clearLocalData: "በዚህ መሣሪያ ያለውን የረዳት መረጃ አጽዳ",
      clearLocalDataConfirm: "የውይይት ታሪክን፣ የተጠባባቂ ጥያቄዎችን፣ የተቀመጠ የትምህርት መረጃንና የጥያቄ ቁልፎችን ከዚህ አሳሽ ያጽዱ? ይህ በአገልጋዩ ያሉ ጥያቄዎችን አይሰርዝም።",
      clearLocalDataDone: "በአሳሹ ያለው የረዳት መረጃ ተጽድቷል። ከላይ ካልሰረዙ በስተቀር የአገልጋይ ጥያቄዎች አልተሰረዙም።",
      clearLocalDataFailed: "በዚህ አሳሽ ያለውን የረዳት መረጃ ማጽዳት አልተቻለም። የአሳሹን የጣቢያ መረጃ ቁጥጥሮች ይጠቀሙ።",
      escalationFailed: "ጥያቄዎ ሊላክ አልቻለም። ግንኙነቱን ያረጋግጡና እንደገና ይሞክሩ።",
      offlineSaved: "በዚህ ስልክ ተቀምጧል። ኢንተርኔት ሲኖር ይላካል።",
      phoneLabel: "የስልክ ቁጥር (አማራጭ)",
      phoneInvalid: "ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ።",
      accommodationButton: "ለቃለ መጠይቄ ማስተካከያ እፈልጋለሁ",
      accommodationPrivacy: "የመረጡት ማስተካከያና ማስታወሻ ለአስተማሪ ብቻ ይሄዳሉ። ለቀጣሪ አይጋሩም።",
      whichJob: "ቃለ መጠይቅዎ ለየትኛው የሙከራ ሥራ ነው?",
      whichAccommodation: "ምን ማስተካከያ ይረዳዎታል?",
      jobRemote: "ከሩቅ",
      jobOnSite: "በሥራ ቦታ",
      jobAccommodations: "ማስተካከያዎች",
      otherAccommodation: "ሌላ (በማስታወሻ ይግለጹ)",
      accommodationNote: "አማራጭ ማስታወሻ",
      sendAccommodation: "ስለዚህ ማስተካከያ አስተማሪን ይጠይቁ",
      accommodationSent: "ጥያቄዎ በግል ለአስተማሪ ተልኳል።",
      accommodationFailed: "ጥያቄዎ ሊላክ አልቻለም። እንደገና ይሞክሩ።",
      screenShareConsent: "ማያዬን ወይም የገጹን መረጃ ለአስተማሪ ለማጋራት እስማማለሁ። ማጋራት የሚጀምረው አዝራሩን ከጫንኩ ብቻ ነው። ቀጥታ ቪዲዮ አይቀዳም ወይም አይቀመጥም። የገጽ ማጋራት የገጹን URL፣ የተመረጠውን አባል ተደራሽ ስምና HTML፣ የገጹን ርዕሶችና እኔ የመረጥኩትን ምስል ብቻ ይልካል፤ እነዚህም ከአስተማሪ ጥያቄ ጋር ይያያዛሉ።",
      screenShareTitle: "ከአስተማሪ ጋር አጋራ",
      screenShareNote: "የማያ ማጋራት ለመጠቀም HTTPS ያስፈልጋል። ዴስክቶፕ ቀጥታ የሙከራ WebRTC ግንኙነት ይጠቀማል፤ STUN/TURN ማስተላለፊያ ስላልተዋቀረ አንዳንድ ኔትወርኮች ሊከለክሉት ይችላሉ። በAndroid Chrome ቀጥታ የማያ ማጋራት አይገኝም፤ በምትኩ የገጹን መረጃ ማጋራትና ከፈለጉ የማያ ምስል መጫን ይችላሉ።",
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
      screenSharePermissionDenied: "የማያ ፈቃድ አልተሰጠም። የአሳሹን ፈቃዶች ይመልከቱ።",
      screenShareDisconnected: "የማያ ግንኙነት ጠፍቷል። ማጋራቱን አሁንም ማቆም ይችላሉ።",
      screenShareError: "የማያ ማጋራት መጀመር አልቻለም። እንደገና ይሞክሩ።",
      screenContextSent: "የገጹ መረጃ ለአስተማሪ ተልኳል። ቀጥታ ማያዎን አላጋራም።",
      screenContextFailed: "የገጹን መረጃ መላክ አልተቻለም። እንደገና ይሞክሩ።",
      screenShareCleanupFailed: "የማያ ማጋራት ቆሟል፣ ግን የሙከራ ምልክቶቹን ማጽዳት አልተቻለም።",
      screenScreenshotTooLarge: "ከ3 ሜባ ያነሰ ምስል ይምረጡ።",
      translationUnavailable: "ይህን ትርጉም መጫን አልተቻለም። እንግሊዝኛ እየታየ ነው።",
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
      this._learnerTickets = [];
      this._pendingTutorTicketId = "";
      this._cloudConsentRequired = false;
      this._assistantConfigToken = 0;
      this._rememberPageFocus = (event) => {
        const target = event.composedPath?.()[0] || event.target;
        if (!this.shadowRoot?.contains(target)) this._lastPageFocusedElement = target;
      };
    }

    connectedCallback() {
      document.addEventListener("focusin", this._rememberPageFocus, true);
      if (this._onlineHandler) window.addEventListener("online", this._onlineHandler);
      if (this._escapeHandler) document.addEventListener("keydown", this._escapeHandler);
      if (this._built) return;
      this._built = true;
      this._storageKey = `db-assistant:${location.pathname}:${this.id || "default"}`;
      this._queueKey = `${this._storageKey}:offline-questions`;
      this._pendingTutorKey = `${this._storageKey}:pending-tutor-ticket`;
      this._restore();
      this._render();
      this._restorePendingTutorTicket();
      this._restoreLearnerTickets();
      this._bind();
      this._loadAssistantConfig();
      this._registerServiceWorker();
      this._loadI18n();
      this._initSearchAndContent();
      if (navigator.onLine) this._flushQuestionQueue();
    }

    disconnectedCallback() {
      document.removeEventListener("focusin", this._rememberPageFocus, true);
      document.removeEventListener("keydown", this._escapeHandler);
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
      if (name === "api") {
        this._els.cloudConsent.checked = false;
        this._loadAssistantConfig();
      }
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
        this._sections = [...(Array.isArray(this._sections) ? this._sections.filter((item) => item.type !== "job") : []), ...this._jobSections()];
        this._populateAccommodationChoices();
      } catch (err) {
        console.warn("Could not load jobs source", err);
        try {
          const cachedJobs = JSON.parse(localStorage.getItem(`${this._storageKey}:jobs`) || "[]");
          this._jobs = Array.isArray(cachedJobs) ? cachedJobs : [];
          this._sections = [...(Array.isArray(this._sections) ? this._sections.filter((item) => item.type !== "job") : []), ...this._jobSections()];
          this._populateAccommodationChoices();
        } catch { /* An empty jobs source is still usable for lesson questions. */ }
      }
    }

    _jobSections() {
      return this._jobs.map((job) => {
        const titles = { en: job.title, am: job.title };
        const text = {};
        const englishDetails = [
          job.description,
          job.remote ? "Remote work telecommute" : "On site work",
          job.location,
          ...(job.accommodations || [])
        ].filter(Boolean).join(". ");
        text.en = englishDetails;
        text.am = englishDetails;
        for (const language of ["ti", "om", "so"]) {
          const translated = job.translations?.[language];
          if (!translated || typeof translated.description !== "string" || !translated.description.trim()) continue;
          titles[language] = translated.title;
          text[language] = [
            translated.description,
            job.location,
            ...(Array.isArray(translated.accommodations) ? translated.accommodations : [])
          ].filter(Boolean).join(". ");
        }
        return { ...job, type: "job", title: job.title, titles, text };
      });
    }

    _populateAccommodationChoices() {
      const jobSelect = this._els?.accommodationJob;
      if (!jobSelect || !this._jobs.length) return;
      const current = jobSelect.value;
      jobSelect.replaceChildren();
      for (const job of this._jobs) {
        const title = job.translations?.[this._pack?.lang]?.title || job.title;
        const option = document.createElement("option"); option.value = job.id; option.textContent = `${title} — ${job.location}`;
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
      const accommodations = job?.translations?.[this._pack?.lang]?.accommodations || job?.accommodations || [];
      for (const item of accommodations) {
        const option = document.createElement("option"); option.value = item; option.textContent = item; select.append(option);
      }
      const other = document.createElement("option"); other.value = "Other"; other.textContent = this._pack?.strings.otherAccommodation || "Other"; select.append(other);
      if ([...select.options].some((option) => option.value === current)) select.value = current;
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
      :host { all: initial; display: block; font-family: system-ui, sans-serif; color: #17251d; font-size: 16px; line-height: 1.5; }
          :host([lang="am"]) { line-height: 1.7; }
          *, *::before, *::after { box-sizing: border-box; }
          button, input, textarea { font: inherit; letter-spacing: normal; text-transform: none; }
          button { min-width: 44px; min-height: 44px; padding: 9px 14px; border-radius: 10px; cursor: pointer; transition: background-color .16s ease, border-color .16s ease, transform .16s ease; }
          button:hover:not(:disabled) { transform: translateY(-1px); }
          button:disabled { cursor: wait; opacity: .65; }
          button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible, [tabindex="-1"]:focus-visible, a:focus-visible { outline: 3px solid var(--assistant-focus, #92400e); outline-offset: 2px; }
          .launcher { position: fixed; z-index: 2147483647; inset-inline-end: 20px; inset-block-end: 20px; max-width: calc(100vw - 32px); padding: 12px 20px; border: 2px solid var(--assistant-primary, #166534); border-radius: 999px; background: var(--assistant-primary, #166534); color: var(--assistant-primary-contrast, #fff); font-weight: 700; box-shadow: 0 8px 24px rgba(20, 54, 31, .22); }
          .panel { position: fixed; z-index: 2147483646; inset-inline-end: 20px; inset-block-end: 84px; width: min(30rem, calc(100vw - 40px)); max-height: min(70vh, 48rem); overflow: auto; border: 1px solid #d5e1d8; border-top: 4px solid var(--assistant-primary, #166534); border-radius: 18px; background: var(--assistant-background, #fff); color: var(--assistant-foreground, #17251d); padding: 18px; box-shadow: 0 22px 64px rgba(17, 38, 23, .2); }
          .panel[hidden] { display: none; }
          .panel-inner { display: flex; flex-direction: column; gap: 14px; }
          .header { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; }
          h2, p { margin: 0; overflow-wrap: anywhere; }
          h2 { color: var(--assistant-foreground, #17251d); font-size: 20px; font-weight: 700; letter-spacing: -.02em; }
          .header-actions, .language { display: flex; flex-wrap: wrap; gap: 8px; }
          .person { grid-column: 1 / -1; justify-self: start; background: var(--assistant-primary, #166534); color: var(--assistant-primary-contrast, #fff); border: 2px solid var(--assistant-primary, #166534); font-weight: 700; }
          .accommodation-open { grid-column: 1 / -1; justify-self: start; }
          .secondary { background: var(--assistant-background, #fff); color: var(--assistant-foreground, #17251d); border: 1px solid #b9cbbd; }
          .secondary:hover:not(:disabled) { background: #f1f7f2; border-color: var(--assistant-primary, #166534); }
          .language { align-items: center; }
          .language-label, label { font-weight: 700; }
          [aria-pressed="true"] { outline: 2px solid currentColor; outline-offset: 1px; }
          .log { display: flex; flex-direction: column; gap: 12px; max-height: 40vh; overflow-y: auto; padding: 4px; }
          .message { max-width: 96%; margin: 0; padding: 12px 14px; border-radius: 16px; overflow-wrap: anywhere; }
          .message-user { align-self: flex-end; max-width: 90%; border: 1px solid #cfe2d3; border-radius: 16px 16px 4px 16px; background: #eaf4ec; color: #183322; }
          .message-assistant { align-self: flex-start; border: 1px solid #dce6de; border-radius: 16px 16px 16px 4px; background: #f8faf8; color: #18251d; }
          :host([theme="dark"]) .message-user { border-color: #47614d; background: #26382d; color: #f1f5f2; }
          :host([theme="dark"]) .message-assistant { border-color: #46534a; background: #202824; color: #f1f5f2; }
          .message-author { font-weight: 700; margin-bottom: 4px; font-size: 0.9em; color: var(--assistant-primary, #002b56); }
          .course-link { display: inline-block; margin-top: 8px; color: var(--assistant-primary, #002b56); font-weight: 600; text-decoration: underline; }
          .course-link:hover, .course-link:focus { text-decoration: none; }
          :host([theme="dark"]) .course-link:focus-visible { outline-color: #bbf7d0; }
          .debug-score { font-size: 0.8em; color: #64748b; margin-top: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
          .person-action { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; padding: 8px 14px; background: var(--assistant-primary, #166534); color: var(--assistant-primary-contrast, #fff); border: 2px solid var(--assistant-primary, #166534); border-radius: 10px; font-weight: 600; cursor: pointer; }
          .person-action:focus-visible { outline: 3px solid var(--assistant-focus, #92400e); outline-offset: 2px; }
          :host([theme="dark"]) .launcher:focus-visible, :host([theme="dark"]) .message :focus-visible { outline-color: #bbf7d0; }
          .voice-controls { display: flex; flex-wrap: wrap; gap: 8px; }
          .listen-button { display: block; margin-top: 8px; }
          .voice-status { min-height: 1.5em; margin: 0; }
          .voice-status:empty { display: none; }
          .voice-note audio { display: block; width: 100%; margin-block: 8px; }
          .escalation { display: flex; flex-direction: column; gap: 10px; border-top: 1px solid #d7e1d9; padding-top: 14px; }
          .escalation[hidden], [hidden] { display: none !important; }
          .consent { display: flex; align-items: flex-start; gap: 10px; }
          .consent input { width: 24px; height: 24px; flex: none; margin: 2px 0 0; }
          .screen-share { display: flex; flex-direction: column; gap: 10px; border: 1px solid #d5e1d8; border-radius: 12px; padding: 14px; background: #f8fbf8; }
          :host([theme="dark"]) .screen-share { border-color: #46534a; background: #202824; }
          .screen-share h3 { margin: 0; color: var(--assistant-foreground, #17251d); font-size: 1rem; }
          .screen-share input[type="file"] { max-width: 100%; min-height: 44px; }
          .screen-share-bar { position: fixed; z-index: 2147483647; inset-block-start: 8px; inset-inline: 8px; margin-inline: auto; max-width: 36rem; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; border: 2px solid #166534; border-radius: 12px; background: #ecf6ee; color: #174b2d; font-weight: 700; box-shadow: 0 8px 24px #0003; }
          .screen-share-bar[hidden] { display: none !important; }
          .screen-share-bar button { flex: none; color: #fff; background: #7f1d1d; border: 2px solid #7f1d1d; }
          .voice-button[aria-pressed="true"] { background: #7f1d1d; color: #fff; border-color: #7f1d1d; }
          form, .field { display: flex; flex-direction: column; gap: 8px; }
          select { min-height: 44px; padding: 9px 12px; font: inherit; color: var(--assistant-foreground, #17251d); background: var(--assistant-background, #fff); border: 1px solid #84968a; border-radius: 10px; }
          textarea { width: 100%; min-height: 4.5rem; max-height: 35vh; resize: vertical; padding: 10px 12px; border: 1px solid #84968a; border-radius: 10px; background: var(--assistant-background, #fff); color: var(--assistant-foreground, #17251d); }
          input[type="tel"] { width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #84968a; border-radius: 10px; background: var(--assistant-background, #fff); color: var(--assistant-foreground, #17251d); }
          textarea::placeholder { color: #595959; opacity: 1; }
          .error { margin: 0; color: #7f1d1d; }
          :host([theme="dark"]) .error { color: #fca5a5; }
          :host([theme="dark"]) textarea::placeholder { color: #cbd5e1; }
          #send { background: var(--assistant-primary, #166534); color: var(--assistant-primary-contrast, #fff); border: 2px solid var(--assistant-primary, #166534); font-weight: 700; }
          @media (max-width: 720px) {
            .panel { inset-inline: 0; inset-block-end: 0; width: 100%; max-height: min(70vh, calc(100vh - 3rem)); border-radius: 18px 18px 0 0; padding: 14px; }
            .log { max-height: 24vh; }
            .launcher { position: static; display: block; margin: 14px 14px 14px auto; max-width: calc(100vw - 28px); }
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
            <div class="language">
              <label class="language-label" id="language-label" for="language-select"></label>
              <select id="language-select" aria-labelledby="language-label">
                <option value="en" lang="en">English</option>
                <option value="am" lang="am">አማርኛ</option>
                <option value="ti" lang="ti">ትግርኛ</option>
                <option value="om" lang="om">Afaan Oromoo</option>
                <option value="so" lang="so">Soomaali</option>
                <option value="ar" lang="ar">العربية</option>
              </select>
            </div>
            <p id="greeting" dir="auto"></p>
            <div class="log" id="messages" role="log" aria-live="polite" aria-relevant="additions"></div>
            <form id="form" novalidate>
              <div class="field"><label id="question-label" for="question"></label>
                <textarea id="question" name="question" dir="auto" autocomplete="off" aria-required="true"></textarea>
                <p id="question-error" class="error" role="alert" dir="auto"></p></div>
              <label class="consent" id="cloud-consent-row" for="cloud-consent" hidden>
                <input id="cloud-consent" type="checkbox"><span id="cloud-consent-label"></span>
              </label>
              <div class="voice-controls">
                <button type="button" class="secondary voice-button" id="microphone" aria-pressed="false"></button>
                <button type="button" class="secondary" id="stop-voice" hidden></button>
                <button type="button" class="secondary" id="read-back" hidden></button>
              </div>
              <p id="voice-help" role="note"></p>
              <p id="voice-status" class="voice-status" role="status" aria-live="polite" aria-atomic="true"></p>
              <div class="voice-note" id="voice-note" hidden><strong id="voice-note-label"></strong><audio id="voice-player" aria-labelledby="voice-note-label" controls></audio></div>
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
              <p id="tutor-availability" role="note"></p>
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
              <button type="button" class="secondary" id="check-tutor-reply" hidden></button>
              <section id="ticket-data" class="screen-share" aria-labelledby="ticket-data-title" hidden>
                <h3 id="ticket-data-title"></h3>
                <label for="ticket-data-select" id="ticket-data-label"></label>
                <select id="ticket-data-select"></select>
                <p id="ticket-data-note" role="note"></p>
                <div class="voice-controls">
                  <button type="button" class="secondary" id="export-ticket-data"></button>
                  <button type="button" class="secondary" id="delete-ticket-data"></button>
                </div>
                <p id="ticket-data-status" role="status" aria-live="polite"></p>
              </section>
              <button type="button" class="secondary" id="clear-local-data"></button>
              <button type="submit" id="send-escalation"></button>
            </form>
          </div>
        </section>
        <div id="screen-share-bar" class="screen-share-bar" role="status" aria-live="polite" aria-atomic="true" hidden>
          <span id="screen-share-bar-text"></span>
          <button type="button" id="screen-share-stop"></button>
        </div>`;
      const isAndroidChrome = typeof navigator !== "undefined" &&
        /Android/i.test(navigator.userAgent) && /Chrome|Chromium/i.test(navigator.userAgent);
      const screenCaptureAvailable = !isAndroidChrome && typeof navigator !== "undefined" &&
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
        languageSelect: $("language-select"),
        greeting: $("greeting"),
        log: $("messages"),
        form: $("form"),
        label: $("question-label"),
        input: $("question"),
        error: $("question-error"),
        cloudConsentRow: $("cloud-consent-row"), cloudConsent: $("cloud-consent"),
        cloudConsentLabel: $("cloud-consent-label"),
        send: $("send"), microphone: $("microphone"), stopVoice: $("stop-voice"), readBack: $("read-back"),
        voiceStatus: $("voice-status"), voiceNote: $("voice-note"), voiceNoteLabel: $("voice-note-label"), voicePlayer: $("voice-player"),
        voiceHelp: $("voice-help"),
        escalation: $("escalation"), escalationNoteLabel: $("escalation-note-label"), escalationNote: $("escalation-note"),
        escalationPhoneLabel: $("escalation-phone-label"), escalationPhone: $("escalation-phone"), phoneError: $("phone-error"),
        consent: $("consent"), consentLabel: $("consent-label"), escalationStatus: $("escalation-status"),
        tutorAvailability: $("tutor-availability"),
        checkTutorReply: $("check-tutor-reply"), sendEscalation: $("send-escalation"),
        ticketData: $("ticket-data"), ticketDataTitle: $("ticket-data-title"),
        ticketDataLabel: $("ticket-data-label"), ticketDataSelect: $("ticket-data-select"),
        ticketDataNote: $("ticket-data-note"), ticketDataStatus: $("ticket-data-status"),
        exportTicketData: $("export-ticket-data"), deleteTicketData: $("delete-ticket-data"),
        clearLocalData: $("clear-local-data"),
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
      const themes = {
        light: ["#166534", "#fff", "#17251d", "#92400e", "#fff"],
        dark: ["#4ade80", "#171d19", "#f1f5f2", "#bbf7d0", "#052e16"]
      };
      const values = themes[this.getAttribute("theme")] || themes.light;
      this.style.setProperty("--assistant-primary", values[0]);
      this.style.setProperty("--assistant-background", values[1]);
      this.style.setProperty("--assistant-foreground", values[2]);
      this.style.setProperty("--assistant-focus", values[3]);
      this.style.setProperty("--assistant-primary-contrast", values[4]);
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
      e.escalationPhone.addEventListener("input", () => {
        e.phoneError.hidden = true;
        e.escalationPhone.removeAttribute("aria-invalid");
        e.escalationPhone.removeAttribute("aria-describedby");
      });
      e.languageSelect.addEventListener("change", () => this.setAttribute("lang", e.languageSelect.value));
      e.person.addEventListener("click", () => this._openEscalation());
      e.accommodationOpen.addEventListener("click", () => this._openAccommodation());
      e.screenShareStart.addEventListener("click", () => this._startScreenShare());
      e.screenContextStart.addEventListener("click", () => this._sharePageContext());
      e.screenShareStop.addEventListener("click", () => this._stopScreenShare());
      e.microphone.addEventListener("click", () => this._startVoiceInput());
      e.stopVoice.addEventListener("click", () => this._stopVoice());
      e.readBack.addEventListener("click", () => this._speakText(e.input.value, this._pack.lang, e.voiceStatus));
      e.escalation.addEventListener("submit", (event) => this._submitEscalation(event));
      e.checkTutorReply.addEventListener("click", () => this._checkTutorReply());
      e.ticketDataSelect.addEventListener("change", () => { e.ticketDataStatus.textContent = ""; });
      e.exportTicketData.addEventListener("click", () => this._exportLearnerTicket());
      e.deleteTicketData.addEventListener("click", () => this._deleteLearnerTicket());
      e.clearLocalData.addEventListener("click", () => this._clearLocalData());
      e.accommodationForm.addEventListener("submit", (event) => this._submitAccommodation(event));
      e.accommodationJob.addEventListener("change", () => this._populateAccommodationOptions());
      this._escapeHandler = (event) => {
        if (event.key === "Escape" && !e.panel.hidden) {
          event.preventDefault();
          this._close();
        }
      };
      document.addEventListener("keydown", this._escapeHandler);
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

    _restorePendingTutorTicket() {
      try {
        this._pendingTutorTicketId = localStorage.getItem(this._pendingTutorKey) || "";
      } catch {
        this._pendingTutorTicketId = "";
      }
      this._els.checkTutorReply.hidden = !this._pendingTutorTicketId;
    }

    _restoreLearnerTickets() {
      try {
        const saved = JSON.parse(localStorage.getItem(`${this._storageKey}:learner-tickets`) || "[]");
        if (Array.isArray(saved)) {
          this._learnerTickets = saved.filter((ticket) =>
            ticket && typeof ticket.ticketId === "string" && typeof ticket.accessToken === "string"
          );
        }
      } catch {
        this._learnerTickets = [];
      }
      this._renderLearnerTickets();
    }

    _rememberLearnerTicket(result) {
      if (typeof result.ticketId !== "string" || !result.ticketId ||
          typeof result.accessToken !== "string" || !result.accessToken) {
        throw new Error("Learner ticket credentials were missing.");
      }
      this._learnerTickets = [
        { ticketId: result.ticketId, accessToken: result.accessToken },
        ...this._learnerTickets.filter((ticket) => ticket.ticketId !== result.ticketId)
      ];
      try {
        localStorage.setItem(`${this._storageKey}:learner-tickets`, JSON.stringify(this._learnerTickets));
      } catch { /* Keep ticket management available for this page session. */ }
      this._renderLearnerTickets();
    }

    _renderLearnerTickets() {
      const e = this._els;
      if (!e?.ticketData) return;
      const selectedId = e.ticketDataSelect.value || this._learnerTickets[0]?.ticketId;
      e.ticketDataSelect.replaceChildren();
      for (const [index, ticket] of this._learnerTickets.entries()) {
        const option = document.createElement("option");
        option.value = ticket.ticketId;
        option.textContent = `Request ${index + 1} (${ticket.ticketId.slice(-6)})`;
        e.ticketDataSelect.append(option);
      }
      if (this._learnerTickets.some((ticket) => ticket.ticketId === selectedId)) {
        e.ticketDataSelect.value = selectedId;
      }
      e.ticketData.hidden = this._learnerTickets.length === 0;
    }

    _selectedLearnerTicket() {
      return this._learnerTickets.find((ticket) => ticket.ticketId === this._els.ticketDataSelect.value);
    }

    async _exportLearnerTicket() {
      const e = this._els;
      const ticket = this._selectedLearnerTicket();
      if (!ticket) return;
      e.exportTicketData.disabled = true;
      e.ticketDataStatus.textContent = "";
      try {
        const base = (this.getAttribute("api") || location.origin).replace(/\/$/, "");
        const response = await fetch(`${base}/api/v1/escalations/${encodeURIComponent(ticket.ticketId)}/data`, {
          headers: { "X-Learner-Token": ticket.accessToken }
        });
        if (!response.ok) throw new Error("Ticket export failed.");
        const blob = new Blob([JSON.stringify(await response.json(), null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `tutor-request-${ticket.ticketId}.json`;
        link.hidden = true;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch {
        e.ticketDataStatus.textContent = this._pack.strings.ticketDataFailed;
      } finally {
        e.exportTicketData.disabled = false;
      }
    }

    async _deleteLearnerTicket() {
      const e = this._els;
      const ticket = this._selectedLearnerTicket();
      if (!ticket || !window.confirm(this._pack.strings.ticketDataDeleteConfirm)) return;
      e.deleteTicketData.disabled = true;
      e.ticketDataStatus.textContent = "";
      try {
        const base = (this.getAttribute("api") || location.origin).replace(/\/$/, "");
        const response = await fetch(`${base}/api/v1/escalations/${encodeURIComponent(ticket.ticketId)}/data`, {
          method: "DELETE",
          headers: { "X-Learner-Token": ticket.accessToken }
        });
        if (!response.ok) throw new Error("Ticket deletion failed.");
        this._learnerTickets = this._learnerTickets.filter((item) => item.ticketId !== ticket.ticketId);
        try {
          localStorage.setItem(`${this._storageKey}:learner-tickets`, JSON.stringify(this._learnerTickets));
        } catch { /* The current page still reflects the deletion. */ }
        if (this._pendingTutorTicketId === ticket.ticketId) {
          this._pendingTutorTicketId = "";
          try { localStorage.removeItem(this._pendingTutorKey); } catch { /* Ignore unavailable storage. */ }
          e.checkTutorReply.hidden = true;
        }
        this._renderLearnerTickets();
        e.ticketDataStatus.textContent = this._pack.strings.ticketDataDeleted;
      } catch {
        e.ticketDataStatus.textContent = this._pack.strings.ticketDataFailed;
      } finally {
        e.deleteTicketData.disabled = false;
      }
    }

    _clearLocalData() {
      const e = this._els;
      if (!window.confirm(this._pack.strings.clearLocalDataConfirm)) return;
      try {
        const keys = Object.keys(localStorage).filter((key) =>
          key === this._storageKey || key.startsWith(`${this._storageKey}:`)
        );
        for (const key of keys) localStorage.removeItem(key);
      } catch {
        e.escalationStatus.textContent = this._pack.strings.clearLocalDataFailed;
        return;
      }
      this._messages = [];
      this._learnerTickets = [];
      this._pendingTutorTicketId = "";
      e.checkTutorReply.hidden = true;
      e.escalationStatus.textContent = this._pack.strings.clearLocalDataDone;
      this._renderMessages();
      this._renderLearnerTickets();
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
      const isTutor = message.role === "tutor";
      const isAssistant = message.role === "assistant" || isTutor;
      const div = document.createElement("div");
      div.className = `message ${isAssistant || isTutor ? "message-assistant" : "message-user"}`;
      div.dir = "auto";
      div.lang = lang;

      const author = document.createElement("div");
      author.className = "message-author";
      const authorName = isTutor
        ? (this._pack?.strings.tutor || (lang === "am" ? am.strings.tutor : en.strings.tutor))
        : isAssistant
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
        listen.addEventListener("click", () => this._speakText(content.textContent, lang, listenStatus));
        div.append(listen, listenStatus);
      }

      const links = Array.isArray(message.links)
        ? message.links
        : (message.linkUrl && message.linkTitle ? [{ url: message.linkUrl, title: message.linkTitle }] : []);
      for (const source of isAssistant ? links : []) {
        if (!source?.url || !source?.title) continue;
        const link = document.createElement("a");
        link.className = "course-link";
        link.href = source.url;
        const prefix = this._pack?.strings.readInCourse || (lang === "am" ? am.strings.readInCourse : en.strings.readInCourse);
        link.textContent = `${prefix}: ${source.title}`;
        div.appendChild(link);
      }

      if (isAssistant && message.type !== "system") {
        const feedback = document.createElement("div");
        feedback.className = "voice-controls";
        for (const reason of ["unhelpful", "incorrect"]) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "secondary";
          button.textContent = reason === "incorrect" ? "Flag as incorrect" : "Flag as unhelpful";
          button.addEventListener("click", async () => {
            button.disabled = true;
            try {
              const base = (this.getAttribute("api") || location.origin).replace(/\/$/, "");
              const response = await fetch(`${base}/api/v1/answer-feedback`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind: links.length ? "source" : "answer", reason, sourceUrl: links[0]?.url || "" })
              });
              if (!response.ok) throw new Error("Feedback could not be sent.");
              feedbackStatus.textContent = "Thanks. Your feedback was sent without your question text.";
              for (const option of feedback.querySelectorAll("button")) option.disabled = true;
            } catch {
              feedbackStatus.textContent = "Feedback could not be sent. Check your connection and try again.";
              button.disabled = false;
            }
          });
          feedback.append(button);
        }
        const feedbackStatus = document.createElement("p");
        feedbackStatus.setAttribute("role", "status");
        feedbackStatus.setAttribute("aria-live", "polite");
        feedback.append(feedbackStatus);
        div.append(feedback);
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
          links: message.links,
          sectionId: message.sectionId,
          ticketId: message.ticketId,
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
      this._translationUnavailable = false;
      try {
        const response = await fetch(new URL(`${requested}.json`, i18nBase));
        if (!response.ok) throw new Error("Translation fetch failed");
        pack = await response.json();
        if (!pack?.strings || pack.lang !== requested) throw new Error("Invalid translation pack");
        try { localStorage.setItem(`${this._storageKey}:i18n:${requested}`, JSON.stringify(pack)); } catch { /* Storage may be disabled or full. */ }
      } catch {
        try { pack = JSON.parse(localStorage.getItem(`${this._storageKey}:i18n:${requested}`) || "null"); } catch { /* Ignore an unavailable cache. */ }
        if (!pack) {
          pack = bundled[requested] || bundled.en;
          this._translationUnavailable = !bundled[requested];
        }
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
      if (this._translationUnavailable) e.greeting.textContent += ` ${s.translationUnavailable || en.strings.translationUnavailable}`;
      write(e.label, "questionLabel");
      write(e.cloudConsentLabel, "cloudConsent");
      write(e.send, "ask");
      write(e.microphone, "microphone");
      e.microphone.setAttribute("aria-label", s.microphone);
      e.microphone.lang = pack.lang;
      write(e.voiceHelp, "speechLimitations");
      write(e.stopVoice, "stop");
      write(e.readBack, "readBack");
      write(e.voiceNoteLabel, "voiceNote");
      write(e.escalationNoteLabel, "escalationNote");
      write(e.escalationPhoneLabel, "phoneLabel");
      write(e.consentLabel, "consent");
      write(e.sendEscalation, "sendEscalation");
      write(e.tutorAvailability, "tutorAvailability");
      write(e.checkTutorReply, "checkTutorReply");
      write(e.ticketDataTitle, "ticketDataTitle");
      write(e.ticketDataLabel, "ticketDataLabel");
      write(e.ticketDataNote, "ticketDataNote");
      write(e.exportTicketData, "exportTicketData");
      write(e.deleteTicketData, "deleteTicketData");
      write(e.clearLocalData, "clearLocalData");
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
      e.languageSelect.value = pack.lang;
      e.checkTutorReply.hidden = !this._pendingTutorTicketId;
      this._renderLearnerTickets();
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

    async _loadAssistantConfig() {
      const token = ++this._assistantConfigToken;
      const base = (this.getAttribute("api") || location.origin).replace(/\/$/, "");
      try {
        const response = await fetch(`${base}/api/v1/config`);
        if (!response.ok || token !== this._assistantConfigToken) return;
        const config = await response.json();
        if (token !== this._assistantConfigToken) return;
        this._cloudConsentRequired = config.externalAiConsentRequired === true;
        this._els.cloudConsentRow.hidden = !this._cloudConsentRequired;
        if (!this._cloudConsentRequired) this._els.cloudConsent.checked = false;
      } catch {
        if (token !== this._assistantConfigToken) return;
        this._cloudConsentRequired = false;
        this._els.cloudConsentRow.hidden = true;
        this._els.cloudConsent.checked = false;
      }
    }

    async _askServer(question, language, externalAiConsent = false) {
      const base = (this.getAttribute("api") || location.origin).replace(/\/$/, "");
      try {
        const response = await fetch(`${base}/api/v1/ask`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, language, externalAiConsent })
        });
        if (!response.ok) return false;
        const result = await response.json();
        if (typeof result.answer !== "string" || !result.answer.trim()) return false;
        const links = Array.isArray(result.sources)
          ? result.sources.filter((source) => typeof source?.url === "string" && source.url)
            .map((source) => ({ url: source.url, title: source.title || source.type || "Source" }))
          : [];
        this._appendMessage({ role: "assistant", text: result.answer, lang: language,
          links });
        return true;
      } catch { return false; }
    }

    _queueQuestion(question, language, externalAiConsent) {
      const queue = this._readQuestionQueue();
      queue.push({ question, language, externalAiConsent, queuedAt: new Date().toISOString() });
      this._writeQuestionQueue(queue);
    }

    async _flushQuestionQueue() {
      if (!navigator.onLine) return;
      const queue = this._readQuestionQueue();
      while (queue.length && navigator.onLine) {
        const pending = queue[0];
        if (!await this._askServer(pending.question, pending.language, pending.externalAiConsent === true)) return;
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
      const externalAiConsent = this._els.cloudConsent.checked;

      // 1. Append user's question
      this._appendMessage({ role: "user", text, lang: currentLang });
      this._emit("question", { text });

      const isOffline = !navigator.onLine;
      let wasQueued = isOffline;
      if (isOffline) this._queueQuestion(text, currentLang, externalAiConsent);
      else if (await this._askServer(text, currentLang, externalAiConsent)) return;

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
          const translated = job.translations?.[currentLang];
          const jobTitle = job.titles?.[currentLang] || job.title;
          const description = translated?.description || job.description;
          const accommodations = translated?.accommodations || job.accommodations || [];
          const detail = [
            `${job.employer} · ${job.location} · ${job.remote ? this._pack.strings.jobRemote : this._pack.strings.jobOnSite}`,
            description,
            `${this._pack.strings.jobAccommodations}: ${accommodations.join(", ")}`
          ].join("\n");
          this._appendMessage({
            role: "assistant", type: "job", text: `${jobTitle}\n${detail}`, lang: currentLang,
            linkUrl: job.url, linkTitle: jobTitle, sectionId: job.id, score: match.score
          });
        }
        if (wasQueued) this._appendOfflineSaved(currentLang);
        return;
      }

      if (searchResult.best) {
        const bestSection = searchResult.best.section;
        const score = searchResult.best.score;
        const strictTranslation = ["ti", "om", "so"].includes(currentLang);
        const fullText = (bestSection.text && (
          bestSection.text[currentLang] || (!strictTranslation && bestSection.text.en)
        )) || "";
        const snippet = getFirstSentences(fullText, 3);

        let linkTitle = bestSection.titles?.[currentLang] || (strictTranslation ? "" : bestSection.title);
        if (currentLang === "am" && !bestSection.titles?.[currentLang]) {
          if (typeof bestSection.title === "object" && bestSection.title.am) {
            linkTitle = bestSection.title.am;
          } else if (AMHARIC_TITLES[bestSection.id]) {
            linkTitle = AMHARIC_TITLES[bestSection.id];
          }
        } else if (!strictTranslation && typeof bestSection.title === "object" && bestSection.title.en) {
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
      const recognitionLanguages = { en: "en-US", am: "am-ET", ti: "ti-ET", om: "om-ET", so: "so-SO", ar: "ar-SA" };
      recognition.lang = recognitionLanguages[this._pack?.lang] || "en-US";
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

    _speakText(text, language, statusNode) {
      const languageTags = { en: "en-US", am: "am-ET", ti: "ti-ET", om: "om-ET", so: "so-SO", ar: "ar-SA" };
      const lang = languageTags[language] || languageTags.en;
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        statusNode.textContent = this._pack?.strings.noSpeechVoice || en.strings.noSpeechVoice;
        return;
      }
      const languageCode = lang.split("-")[0].toLowerCase();
      const voice = (window.speechSynthesis.getVoices?.() || [])
        .find((item) => (item.lang || "").toLowerCase().split("-")[0] === languageCode);
      if (!voice) {
        statusNode.textContent = this._pack?.strings.noSpeechVoice || en.strings.noSpeechVoice;
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.voice = voice;
      utterance.onerror = () => { statusNode.textContent = this._pack.strings.voiceUnavailable; };
      statusNode.textContent = "";
      window.speechSynthesis.speak(utterance);
    }

    _openEscalation() {
      this._els.escalation.hidden = false;
      this._els.checkTutorReply.hidden = !this._pendingTutorTicketId;
      this._els.escalationNote.focus();
      this._emit("person", {});
    }

    _ticketReference(ticketId) {
      const template = this._pack?.strings.ticketReference || en.strings.ticketReference;
      return template.replace("{ticketId}", ticketId);
    }

    async _checkTutorReply() {
      const e = this._els;
      if (!this._pendingTutorTicketId) return;
      e.checkTutorReply.disabled = true;
      e.escalationStatus.textContent = this._pack.strings.checkingTutorReply;
      try {
        const base = (this.getAttribute("api") || location.origin).replace(/\/$/, "");
        const ticketAccess = this._learnerTickets.find((ticket) => ticket.ticketId === this._pendingTutorTicketId);
        const headers = ticketAccess ? { "X-Learner-Token": ticketAccess.accessToken } : {};
        const response = await fetch(
          `${base}/api/v1/escalations/${encodeURIComponent(this._pendingTutorTicketId)}`,
          { headers }
        );
        if (!response.ok) throw new Error("Tutor reply could not be checked.");
        const ticket = await response.json();
        if (typeof ticket.reply === "string" && ticket.reply.trim()) {
          const previousUpdate = this._messages.some((message) =>
            message.role === "tutor" && message.ticketId === this._pendingTutorTicketId && message.text === ticket.reply.trim()
          );
          if (!previousUpdate) {
            this._appendMessage({
              role: "tutor", text: ticket.reply.trim(), lang: ticket.language || this._pack.lang,
              ticketId: this._pendingTutorTicketId
            });
          }
          if (ticket.status === "answered") {
            e.escalationStatus.textContent = this._pack.strings.tutorReplyAvailable;
            this._pendingTutorTicketId = "";
            try { localStorage.removeItem(this._pendingTutorKey); } catch { /* The reply is still shown in this chat. */ }
            e.checkTutorReply.hidden = true;
          } else {
            e.escalationStatus.textContent = previousUpdate
              ? this._pack.strings.tutorReplyPending
              : this._pack.strings.tutorUpdateAvailable;
          }
        } else if (ticket.status === "waiting") {
          e.escalationStatus.textContent = this._pack.strings.tutorReplyPending;
        } else {
          throw new Error("Tutor reply could not be checked.");
        }
      } catch {
        e.escalationStatus.textContent = this._pack.strings.checkTutorReplyFailed;
      } finally {
        e.checkTutorReply.disabled = false;
      }
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
      this._rememberLearnerTicket(result);
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
      if (typeof navigator.mediaDevices?.getDisplayMedia !== "function" ||
          (/Android/i.test(navigator.userAgent) && /Chrome|Chromium/i.test(navigator.userAgent))) {
        e.screenShareStatus.textContent = this._pack.strings.screenShareError;
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
        if (generation !== this._screenShareGeneration) {
          await this._cleanupScreenTicket(base, ticketId);
          this._screenTicketId = "";
          return;
        }

        const peer = new RTCPeerConnection();
        this._screenPeer = peer;
        peer.onconnectionstatechange = () => {
          if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {
            e.screenShareStatus.textContent = this._pack.strings.screenShareDisconnected;
          }
        };
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
        const denied = error?.name === "NotAllowedError";
        const cancelled = error?.name === "AbortError";
        this._stopScreenShare(false);
        e.screenShareStatus.textContent = cancelled
          ? this._pack.strings.screenShareCancelled
          : denied
            ? this._pack.strings.screenSharePermissionDenied
            : error?.message?.includes("Timed out")
              ? this._pack.strings.screenShareDisconnected
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
        this._cleanupScreenTicket(base, ticketId).catch(() => {
          if (this._els) this._els.screenShareStatus.textContent = this._pack.strings.screenShareCleanupFailed;
        });
      }
    }

    async _cleanupScreenTicket(base, ticketId) {
      const signalResponse = await fetch(
        `${base}/api/v1/escalations/${encodeURIComponent(ticketId)}/signal`,
        { method: "DELETE", keepalive: true }
      );
      const ticket = this._learnerTickets.find((item) => item.ticketId === ticketId);
      if (!ticket) {
        if (!signalResponse.ok) throw new Error("Screen signaling cleanup failed.");
        return;
      }
      const response = await fetch(
        `${base}/api/v1/escalations/${encodeURIComponent(ticketId)}/data`,
        {
          method: "DELETE",
          headers: { "X-Learner-Token": ticket.accessToken },
          keepalive: true
        }
      );
      if (!response.ok) throw new Error("Screen ticket cleanup failed.");
      this._learnerTickets = this._learnerTickets.filter((item) => item.ticketId !== ticketId);
      try {
        localStorage.setItem(`${this._storageKey}:learner-tickets`, JSON.stringify(this._learnerTickets));
      } catch { /* The server-side ticket is already removed. */ }
      this._renderLearnerTickets();
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
        e.escalationPhone.setAttribute("aria-invalid", "true");
        e.escalationPhone.setAttribute("aria-describedby", "phone-error");
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
        if (typeof result.ticketId !== "string" || !result.ticketId) throw new Error("Escalation ticket ID was missing");
        this._rememberLearnerTicket(result);
        this._pendingTutorTicketId = result.ticketId;
        try { localStorage.setItem(this._pendingTutorKey, this._pendingTutorTicketId); } catch { /* Keep reply checks available until the page closes. */ }
        e.checkTutorReply.hidden = false;
        e.escalationStatus.textContent = `${this._pack.strings.escalationSent} ${this._ticketReference(result.ticketId)}`;
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
        if (typeof result.ticketId !== "string" || !result.ticketId) throw new Error("Escalation ticket ID was missing");
        this._rememberLearnerTicket(result);
        e.accommodationStatus.textContent = `${this._pack.strings.accommodationSent} ${this._ticketReference(result.ticketId)}`;
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
