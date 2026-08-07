/* IBGE AC-TI — multi-device study app */
(function () {
  const STORE_KEY = "ibge-acti-progress-v1";
  const LETTERS = ["A", "B", "C", "D", "E"];

  const state = {
    lessons: [],
    questions: [],
    schedule: null,
    biblioteca: null,
    config: { syncEnabled: false, apiBase: "/api", token: "" },
    view: "home",
    progress: loadProgress(),
    quiz: null,
    flash: null,
    lessonFilter: "all",
    libTab: "editais",
    sync: { status: "local", lastOk: null, error: null, timer: null },
  };

  /* ---------- progress storage ---------- */
  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || defaultProgress();
    } catch {
      return defaultProgress();
    }
  }
  function defaultProgress() {
    return { lessonsRead: {}, daysDone: {}, answers: {}, history: [], updatedAt: 0 };
  }
  function touchProgress() {
    state.progress.updatedAt = Date.now();
  }
  function saveProgressLocal() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.progress));
  }
  function saveProgress() {
    touchProgress();
    saveProgressLocal();
    refreshStats();
    updateSyncPill();
    scheduleSyncPush();
  }

  function authHeaders() {
    const h = { "Content-Type": "application/json" };
    if (state.config.token) h.Authorization = "Bearer " + state.config.token;
    return h;
  }

  async function ensureAuth() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
      if (res.status === 401) {
        location.replace("/login.html");
        return false;
      }
      return res.ok;
    } catch {
      // if API down but page loaded via forward_auth, continue offline-ish
      return true;
    }
  }

  async function syncPullAndMerge() {
    if (!state.config.syncEnabled) {
      state.sync.status = "local";
      updateSyncPill();
      return;
    }
    state.sync.status = "syncing";
    updateSyncPill();
    try {
      const push = await fetch(state.config.apiBase + "/progress/merge", {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify(state.progress),
        cache: "no-store",
      });
      if (push.status === 401) {
        location.replace("/login.html");
        return;
      }
      if (!push.ok) throw new Error("HTTP " + push.status);
      const body = await push.json();
      if (body.progress) {
        state.progress = body.progress;
        saveProgressLocal();
      }
      state.sync.status = "ok";
      state.sync.lastOk = Date.now();
      state.sync.error = null;
    } catch (err) {
      state.sync.status = "error";
      state.sync.error = String(err.message || err);
    }
    updateSyncPill();
    refreshStats();
  }

  function scheduleSyncPush() {
    if (!state.config.syncEnabled) return;
    if (state.sync.timer) clearTimeout(state.sync.timer);
    state.sync.timer = setTimeout(syncPullAndMerge, 500);
  }

  function updateSyncPill() {
    const el = document.getElementById("sync-pill");
    if (!el) return;
    const map = {
      local: ["Local", ""],
      syncing: ["Sync…", "syncing"],
      ok: ["VPS ✓", "ok"],
      error: ["Offline", "err"],
    };
    const [label, cls] = map[state.sync.status] || map.local;
    el.textContent = label;
    el.className = "meta-pill sync-pill " + cls;
    el.title = state.sync.error || "Progresso sincronizado na VPS";
  }

  /* ---------- boot ---------- */
  async function boot() {
    const config = await fetch("data/config.json")
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
    state.config = Object.assign(state.config, config || {});

    if (state.config.authRequired !== false) {
      const ok = await ensureAuth();
      if (!ok) return;
    }

    const [lessons, questions, schedule, biblioteca] = await Promise.all([
      fetch("data/lessons.json", { credentials: "include" }).then((r) => r.json()),
      fetch("data/questions.json", { credentials: "include" }).then((r) => r.json()),
      fetch("data/schedule.json", { credentials: "include" }).then((r) => r.json()),
      fetch("data/biblioteca.json", { credentials: "include" }).then((r) => r.json()),
    ]);
    state.lessons = lessons;
    state.questions = questions;
    state.schedule = schedule;
    state.biblioteca = biblioteca;
    if (biblioteca.editais && biblioteca.editais.length) state.libTab = "editais";
    else if (biblioteca.pt) state.libTab = "pt";

    bindNav();
    bindGlobalKeys();
    bindLogout();
    updateSyncPill();
    await syncPullAndMerge();

    renderAll();
    const v = new URLSearchParams(location.search).get("view");
    if (v) showView(v);

    if (state.config.syncEnabled) {
      setInterval(() => {
        if (document.visibilityState === "visible") syncPullAndMerge();
      }, 120000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") syncPullAndMerge();
      });
    }

    // register SW if present
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  function bindLogout() {
    const btn = document.getElementById("btn-logout");
    if (!btn) return;
    btn.onclick = async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch (_) {}
      location.replace("/login.html");
    };
  }

  function renderAll() {
    renderHome();
    renderCronograma();
    renderLessons();
    renderQuizSetup();
    renderFlashSetup();
    renderBiblioteca();
    renderProgresso();
    refreshStats();
    scheduleReveals();
  }

  function scheduleReveals() {
    const cards = document.querySelectorAll(".view:not(.hidden) .card.reveal");
    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cards.forEach((el, i) => {
      if (reduce) {
        el.classList.add("in");
        return;
      }
      el.classList.remove("in");
      // small stagger — only first 6 to avoid long waits
      const delay = Math.min(i, 5) * 45;
      setTimeout(() => el.classList.add("in"), 20 + delay);
    });
  }

  /* ---------- nav ---------- */
  function bindNav() {
    document.querySelectorAll("[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => showView(btn.dataset.view));
    });
    document.querySelectorAll("[data-go]").forEach((btn) => {
      btn.addEventListener("click", () => showView(btn.dataset.go));
    });
    document.querySelectorAll("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => closeOverlay(btn.dataset.close));
    });
    document.getElementById("btn-hoje").addEventListener("click", () => {
      showView("home");
      document.getElementById("hoje-card").scrollIntoView({ behavior: "smooth" });
    });
    document.getElementById("btn-simulado60").addEventListener("click", () => {
      showView("quiz");
      document.getElementById("quiz-mode").value = "simulado";
      document.getElementById("quiz-n").value = 60;
      startQuiz({ mode: "simulado", cat: "all", topic: "all", n: 60 });
    });
    document.querySelectorAll(".overlay").forEach((ov) => {
      ov.addEventListener("click", (e) => {
        if (e.target === ov) closeOverlay(ov.id);
      });
    });
  }

  function showView(name) {
    state.view = name;
    document.querySelectorAll(".view").forEach((el) => el.classList.add("hidden"));
    const el = document.getElementById("view-" + name);
    if (el) el.classList.remove("hidden");
    document.querySelectorAll("[data-view]").forEach((b) => {
      b.classList.toggle("active", b.dataset.view === name);
    });
    if (name === "progresso") renderProgresso();
    if (name === "cronograma") renderCronograma();
    if (name === "biblioteca") renderBiblioteca();
    window.scrollTo(0, 0);
    scheduleReveals();
  }

  function todayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d - off).toISOString().slice(0, 10);
  }
  function daysUntilExam() {
    const exam = new Date(state.schedule.meta.examDate + "T12:00:00");
    return Math.ceil((exam - new Date()) / 86400000);
  }
  function fmtDate(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}`;
  }
  function fmtDateFull(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function lessonTitle(id) {
    const l = state.lessons.find((x) => x.id === id);
    return l ? l.title : id;
  }
  function findTodayPlan() {
    const t = todayISO();
    return state.schedule.days.find((d) => d.date === t) || state.schedule.days[0];
  }

  function refreshStats() {
    const days = daysUntilExam();
    document.getElementById("stat-days").textContent = days > 0 ? days : days === 0 ? "hoje" : "—";
    const read = Object.keys(state.progress.lessonsRead || {}).length;
    document.getElementById("stat-lessons").textContent = `${read}/${state.lessons.length}`;
    const ans = Object.values(state.progress.answers || {});
    const ok = ans.filter((a) => a.correct).length;
    document.getElementById("stat-quiz").textContent = ans.length ? `${ok}/${ans.length}` : "0";
  }

  /* ---------- home ---------- */
  function renderHome() {
    const day = findTodayPlan();
    const done = !!(state.progress.daysDone || {})[day.date];
    document.getElementById("hoje-content").innerHTML = `
      <div class="day-card ${done ? "done" : "today"}" style="cursor:default;margin:0">
        <div>
          <div class="dnum">Dia ${day.day}</div>
          <div class="ddate">${fmtDateFull(day.date)}</div>
        </div>
        <div>
          <h3>${esc(day.title)}</h3>
          <p>${esc(day.notes)}</p>
        </div>
        <div><span class="badge today">${done ? "feito" : "hoje"}</span></div>
      </div>
      <div class="btn-row">
        <button class="btn" type="button" id="btn-open-today">Abrir dia</button>
        <button class="btn secondary" type="button" id="btn-quiz-today">Quiz do dia</button>
        <button class="btn ghost" type="button" id="btn-toggle-today">${done ? "Desmarcar" : "Marcar feito"}</button>
      </div>`;
    document.getElementById("btn-open-today").onclick = () => openDaySheet(day);
    document.getElementById("btn-quiz-today").onclick = () => startQuizFromDay(day);
    document.getElementById("btn-toggle-today").onclick = () => {
      toggleDay(day.date);
      renderHome();
      renderCronograma();
    };
  }

  function toggleDay(date) {
    if (!state.progress.daysDone) state.progress.daysDone = {};
    if (state.progress.daysDone[date]) delete state.progress.daysDone[date];
    else state.progress.daysDone[date] = true;
    saveProgress();
  }

  /* ---------- cronograma ---------- */
  function renderCronograma() {
    if (!state.schedule) return;
    const meta = state.schedule.meta;
    document.getElementById("crono-meta").textContent =
      `${fmtDateFull(meta.startDate)} → ${fmtDateFull(meta.endDate)} · Prova ${fmtDateFull(meta.examDate)} · ${meta.goal}`;
    const total = state.schedule.days.length;
    const done = state.schedule.days.filter((d) => (state.progress.daysDone || {})[d.date]).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    document.getElementById("crono-bar").style.width = pct + "%";
    document.getElementById("crono-pct").textContent = pct;

    const today = todayISO();
    document.getElementById("crono-list").innerHTML = state.schedule.days
      .map((day) => {
        const isDone = !!(state.progress.daysDone || {})[day.date];
        const isToday = day.date === today;
        return `<div class="day-card ${isDone ? "done" : ""} ${isToday ? "today" : ""}" data-date="${day.date}">
          <div><div class="dnum">Dia ${day.day}</div><div class="ddate">${fmtDate(day.date)}</div></div>
          <div><h3>${esc(day.title)}</h3><p>${esc(day.notes)}</p></div>
          <div style="display:flex;flex-direction:column;gap:.3rem;align-items:flex-end">
            ${isToday ? '<span class="badge today">hoje</span>' : ""}
            <span class="badge ${isDone ? "ok" : ""}">${isDone ? "feito" : "pendente"}</span>
          </div>
        </div>`;
      })
      .join("");
    document.querySelectorAll("#crono-list .day-card").forEach((card) => {
      card.onclick = () => {
        const day = state.schedule.days.find((d) => d.date === card.dataset.date);
        openDaySheet(day);
      };
    });
  }

  function openDaySheet(day) {
    if (!day) return;
    const done = !!(state.progress.daysDone || {})[day.date];
    document.getElementById("day-sheet-title").textContent =
      `Dia ${day.day} · ${fmtDateFull(day.date)}`;
    document.getElementById("day-sheet-body").innerHTML = `
      <h2 style="margin-top:0">${esc(day.title)}</h2>
      <p class="muted">${esc(day.notes)}</p>
      <h3>Aulas</h3>
      <ul>${(day.lessons || []).map((id) => `<li>${esc(lessonTitle(id))}</li>`).join("") || "<li>—</li>"}</ul>
      <div class="btn-row">
        <button class="btn" type="button" id="day-start-lesson">Abrir 1ª aula</button>
        <button class="btn secondary" type="button" id="day-start-quiz">Quiz (${day.quizCount || 15})</button>
        <button class="btn ghost" type="button" id="day-toggle">${done ? "Desmarcar feito" : "Marcar feito"}</button>
      </div>`;
    document.getElementById("overlay-day").classList.remove("hidden");
    document.getElementById("day-start-lesson").onclick = () => {
      closeOverlay("overlay-day");
      showView("aulas");
      if (day.lessons && day.lessons[0]) openLesson(day.lessons[0]);
    };
    document.getElementById("day-start-quiz").onclick = () => {
      closeOverlay("overlay-day");
      startQuizFromDay(day);
    };
    document.getElementById("day-toggle").onclick = () => {
      toggleDay(day.date);
      closeOverlay("overlay-day");
      renderHome();
      renderCronograma();
    };
  }

  function closeOverlay(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("hidden");
    if (id === "overlay-pdf") {
      document.getElementById("pdf-frame").src = "about:blank";
    }
  }

  /* ---------- lessons ---------- */
  function renderLessons() {
    const box = document.getElementById("lesson-list");
    const items = state.lessons.filter(
      (l) => state.lessonFilter === "all" || l.category === state.lessonFilter
    );
    box.innerHTML = items
      .map((l) => {
        const read = !!(state.progress.lessonsRead || {})[l.id];
        return `<button type="button" class="lesson-item" data-id="${l.id}">
          <span><span class="cat">${l.category} · ~${l.minutes} min</span><br/><strong>${esc(l.title)}</strong></span>
          <span class="badge ${read ? "ok" : ""}">${read ? "lida" : "abrir"}</span>
        </button>`;
      })
      .join("");
    box.querySelectorAll(".lesson-item").forEach((b) => {
      b.onclick = () => openLesson(b.dataset.id);
    });
    document.querySelectorAll("#lesson-filters .chip").forEach((btn) => {
      btn.onclick = () => {
        state.lessonFilter = btn.dataset.cat;
        document.querySelectorAll("#lesson-filters .chip").forEach((x) =>
          x.classList.toggle("active", x === btn)
        );
        renderLessons();
      };
    });
    document.getElementById("btn-back-lessons").onclick = () => {
      document.getElementById("lesson-reader").classList.add("hidden");
      document.getElementById("lesson-index").classList.remove("hidden");
    };
    document.getElementById("btn-mark-read").onclick = () => {
      const id = document.getElementById("btn-mark-read").dataset.id;
      if (!id) return;
      if (!state.progress.lessonsRead) state.progress.lessonsRead = {};
      state.progress.lessonsRead[id] = new Date().toISOString();
      saveProgress();
      renderLessons();
    };
    document.getElementById("btn-lesson-quiz").onclick = () => {
      const id = document.getElementById("btn-mark-read").dataset.id;
      const map = {
        "ti-pmbok": "pmbok",
        "ti-riscos": "riscos",
        "ti-sec": "seguranca",
        "ti-iso": "normas",
        "ti-gov": "governanca",
        "ti-fw": "frameworks",
        "ti-gest": "gestao",
        pt: null,
        rl: null,
      };
      const topic = map[id];
      showView("quiz");
      if (id === "pt") startQuiz({ mode: "tema", cat: "pt", topic: "all", n: 12 });
      else if (id === "rl") startQuiz({ mode: "tema", cat: "rl", topic: "all", n: 12 });
      else startQuiz({ mode: "tema", cat: "ti", topic: topic || "all", n: 12 });
    };
  }

  function openLesson(id) {
    const l = state.lessons.find((x) => x.id === id);
    if (!l) return;
    showView("aulas");
    document.getElementById("lesson-index").classList.add("hidden");
    document.getElementById("lesson-reader").classList.remove("hidden");
    document.getElementById("lesson-body").innerHTML = l.html;
    document.getElementById("btn-mark-read").dataset.id = id;
    window.scrollTo(0, 0);
  }

  /* ---------- quiz ---------- */
  function renderQuizSetup() {
    document.getElementById("quiz-bank-info").textContent =
      `Banco: ${state.questions.length} questões · TI ${countCat("ti")} · PT ${countCat("pt")} · RL ${countCat("rl")}`;
    document.getElementById("btn-start-quiz").onclick = () => {
      startQuiz({
        mode: document.getElementById("quiz-mode").value,
        cat: document.getElementById("quiz-cat").value,
        topic: document.getElementById("quiz-topic").value,
        n: parseInt(document.getElementById("quiz-n").value, 10) || 15,
      });
    };
    document.getElementById("btn-next-q").onclick = nextQuestion;
    document.getElementById("btn-quit-quiz").onclick = quitQuiz;
    document.getElementById("btn-retry-quiz").onclick = () => {
      document.getElementById("quiz-result").classList.add("hidden");
      document.getElementById("quiz-setup").classList.remove("hidden");
    };
  }
  function countCat(c) {
    return state.questions.filter((q) => q.cat === c).length;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickQuestions({ mode, cat, topic, n }) {
    let pool = state.questions.slice();
    if (mode === "erros") {
      const wrong = Object.entries(state.progress.answers || {})
        .filter(([, v]) => v.correct === false)
        .map(([id]) => id);
      pool = pool.filter((q) => wrong.includes(q.id));
      if (!pool.length) {
        alert("Nenhum erro registrado ainda.");
        return [];
      }
    } else if (mode === "simulado") {
      const ti = shuffle(pool.filter((q) => q.cat === "ti"));
      const pt = shuffle(pool.filter((q) => q.cat === "pt"));
      const rl = shuffle(pool.filter((q) => q.cat === "rl"));
      let nTi = Math.round(n * 0.58);
      let nPt = Math.round(n * 0.25);
      let nRl = Math.max(0, n - nTi - nPt);
      if (n >= 60) {
        nTi = Math.min(35, ti.length);
        nPt = Math.min(15, pt.length);
        nRl = Math.min(10, rl.length);
      }
      return shuffle([...ti.slice(0, nTi), ...pt.slice(0, nPt), ...rl.slice(0, nRl)]).slice(0, n);
    } else {
      if (cat && cat !== "all") pool = pool.filter((q) => q.cat === cat);
      if (topic && topic !== "all" && (cat === "ti" || cat === "all"))
        pool = pool.filter((q) => q.topic === topic || cat !== "ti");
      if (topic && topic !== "all" && cat === "ti") pool = pool.filter((q) => q.topic === topic);
    }
    return shuffle(pool).slice(0, Math.min(n, pool.length));
  }

  function startQuizFromDay(day) {
    showView("quiz");
    const cats = day.quizCats || ["ti"];
    startQuiz({
      mode: cats.length > 1 ? "simulado" : "tema",
      cat: cats.length === 1 ? cats[0] : "all",
      topic: day.quizTopic || "all",
      n: day.quizCount || 15,
    });
  }

  function startQuiz(opts) {
    const items = pickQuestions(opts);
    if (!items.length) {
      alert("Nenhuma questão com esses filtros.");
      return;
    }
    state.quiz = { items, i: 0, correct: 0, answered: false };
    document.getElementById("quiz-setup").classList.add("hidden");
    document.getElementById("quiz-result").classList.add("hidden");
    document.getElementById("quiz-run").classList.remove("hidden");
    document.getElementById("btn-next-q").textContent = "Próxima";
    renderQuestion();
  }

  function renderQuestion() {
    const qz = state.quiz;
    const q = qz.items[qz.i];
    qz.answered = false;
    document.getElementById("btn-next-q").disabled = true;
    document.getElementById("quiz-progress-label").textContent =
      `Questão ${qz.i + 1}/${qz.items.length} · ${q.cat.toUpperCase()}`;
    document.getElementById("quiz-score-live").textContent = `${qz.correct} acertos`;
    document.getElementById("quiz-bar").style.width =
      Math.round((qz.i / qz.items.length) * 100) + "%";

    document.getElementById("quiz-question").innerHTML = `
      <div class="q-card">
        <div class="q-num"><span class="badge ${q.cat}">${q.cat}</span> ${esc(q.topic)} · ${q.id}</div>
        <div class="q-text">${esc(q.q)}</div>
        <div id="opts">
          ${q.options
            .map(
              (o, idx) =>
                `<button type="button" class="opt" data-idx="${idx}"><kbd>${idx + 1}</kbd> <strong>${LETTERS[idx]})</strong> ${esc(o)}</button>`
            )
            .join("")}
        </div>
        <div id="q-exp" class="explain hidden"></div>
      </div>`;
    document.querySelectorAll("#opts .opt").forEach((btn) => {
      btn.addEventListener("click", () => answerQuestion(parseInt(btn.dataset.idx, 10)));
    });
  }

  function answerQuestion(idx) {
    const qz = state.quiz;
    if (!qz || qz.answered) return;
    qz.answered = true;
    const q = qz.items[qz.i];
    const ok = idx === q.a;
    if (ok) qz.correct++;
    if (!state.progress.answers) state.progress.answers = {};
    state.progress.answers[q.id] = { correct: ok, cat: q.cat, ts: Date.now(), chosen: idx };
    saveProgress();

    document.querySelectorAll("#opts .opt").forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.a) btn.classList.add("correct");
      if (i === idx && !ok) btn.classList.add("wrong");
      if (i === idx) btn.classList.add("selected");
    });
    const exp = document.getElementById("q-exp");
    exp.classList.remove("hidden");
    exp.innerHTML = `<strong>${ok ? "Correto." : "Incorreto."}</strong> ${esc(q.exp)}`;
    document.getElementById("btn-next-q").disabled = false;
    document.getElementById("quiz-score-live").textContent = `${qz.correct} acertos`;
    if (qz.i === qz.items.length - 1)
      document.getElementById("btn-next-q").textContent = "Ver resultado";
  }

  function nextQuestion() {
    const qz = state.quiz;
    if (!qz || !qz.answered) return;
    if (qz.i >= qz.items.length - 1) return finishQuiz();
    qz.i++;
    document.getElementById("btn-next-q").textContent = "Próxima";
    renderQuestion();
  }

  function finishQuiz() {
    const qz = state.quiz;
    const total = qz.items.length;
    const pct = Math.round((qz.correct / total) * 100);
    document.getElementById("quiz-run").classList.add("hidden");
    document.getElementById("quiz-result").classList.remove("hidden");
    document.getElementById("quiz-final-score").textContent = pct + "%";
    document.getElementById("quiz-final-detail").textContent =
      `${qz.correct} de ${total} · ` +
      (pct >= 70
        ? "Excelente ritmo."
        : pct >= 40
          ? "No caminho do corte — revise os erros em Cards."
          : "Releia as aulas dos temas que errou.");
    if (!state.progress.history) state.progress.history = [];
    state.progress.history.push({ ts: Date.now(), correct: qz.correct, total, pct });
    saveProgress();
    state.quiz = null;
  }

  function quitQuiz() {
    if (!state.quiz) return;
    if (confirm("Sair do questionário?")) {
      state.quiz = null;
      document.getElementById("quiz-run").classList.add("hidden");
      document.getElementById("quiz-setup").classList.remove("hidden");
    }
  }

  function bindGlobalKeys() {
    document.addEventListener("keydown", (e) => {
      if (e.target.matches("input, textarea, select")) return;
      // PDF / day close
      if (e.key === "Escape") {
        closeOverlay("overlay-pdf");
        closeOverlay("overlay-day");
        if (state.quiz && !document.getElementById("quiz-run").classList.contains("hidden"))
          quitQuiz();
        return;
      }
      if (!state.quiz || document.getElementById("quiz-run").classList.contains("hidden")) {
        // flash keys
        if (state.flash && !document.getElementById("flash-run").classList.contains("hidden")) {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            flipFlash();
          }
          if (e.key === "ArrowRight") nextFlash();
          if (e.key === "ArrowLeft") prevFlash();
        }
        return;
      }
      if (!state.quiz.answered && e.key >= "1" && e.key <= "5") {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < state.quiz.items[state.quiz.i].options.length) answerQuestion(idx);
      }
      if (state.quiz.answered && (e.key === "Enter" || e.key === "ArrowRight")) {
        e.preventDefault();
        nextQuestion();
      }
    });
  }

  /* ---------- flashcards ---------- */
  function renderFlashSetup() {
    document.getElementById("btn-flash-start").onclick = startFlash;
    document.getElementById("flash-card").onclick = flipFlash;
    document.getElementById("btn-flash-flip").onclick = flipFlash;
    document.getElementById("btn-flash-next").onclick = nextFlash;
    document.getElementById("btn-flash-prev").onclick = prevFlash;
  }

  function startFlash() {
    const cat = document.getElementById("flash-cat").value;
    let pool = state.questions.slice();
    if (cat === "erros") {
      const wrong = Object.entries(state.progress.answers || {})
        .filter(([, v]) => v.correct === false)
        .map(([id]) => id);
      pool = pool.filter((q) => wrong.includes(q.id));
    } else if (cat !== "all") pool = pool.filter((q) => q.cat === cat);
    pool = shuffle(pool).slice(0, Math.min(40, pool.length));
    if (!pool.length) {
      alert("Sem cards nesse filtro.");
      return;
    }
    state.flash = { items: pool, i: 0, side: "q" };
    document.getElementById("flash-run").classList.remove("hidden");
    paintFlash();
  }

  function paintFlash() {
    const f = state.flash;
    const q = f.items[f.i];
    document.getElementById("flash-count").textContent = `${f.i + 1}/${f.items.length}`;
    document.getElementById("flash-side-label").textContent =
      f.side === "q" ? "pergunta" : "resposta";
    if (f.side === "q") {
      document.getElementById("flash-text").textContent = q.q;
      document.getElementById("flash-hint").textContent = "toque para revelar";
    } else {
      document.getElementById("flash-text").innerHTML =
        `<strong>${LETTERS[q.a]}) ${esc(q.options[q.a])}</strong><br/><span class="muted small">${esc(q.exp)}</span>`;
      document.getElementById("flash-hint").textContent = "→ próximo card";
    }
  }
  function flipFlash() {
    if (!state.flash) return;
    state.flash.side = state.flash.side === "q" ? "a" : "q";
    paintFlash();
  }
  function nextFlash() {
    if (!state.flash) return;
    state.flash.i = (state.flash.i + 1) % state.flash.items.length;
    state.flash.side = "q";
    paintFlash();
  }
  function prevFlash() {
    if (!state.flash) return;
    state.flash.i = (state.flash.i - 1 + state.flash.items.length) % state.flash.items.length;
    state.flash.side = "q";
    paintFlash();
  }

  /* ---------- biblioteca / PDF ---------- */
  function renderBiblioteca() {
    if (!state.biblioteca) return;
    const tabs = document.getElementById("lib-tabs");
    const order = ["editais", "compilados", "pt", "rl", "provas", "apostilas"];
    const labels = state.biblioteca.labels || {};
    tabs.innerHTML = order
      .filter((k) => (state.biblioteca[k] || []).length)
      .map((k) => {
        const n = state.biblioteca[k].length;
        const lab = (labels[k] || k) + ` (${n})`;
        return `<button type="button" class="chip ${state.libTab === k ? "active" : ""}" data-lib="${k}">${esc(lab)}</button>`;
      })
      .join("");
    tabs.querySelectorAll(".chip").forEach((btn) => {
      btn.onclick = () => {
        state.libTab = btn.dataset.lib;
        renderBiblioteca();
      };
    });
    document.getElementById("lib-search").oninput = paintLib;
    paintLib();
  }

  function paintLib() {
    const q = (document.getElementById("lib-search").value || "").toLowerCase();
    const items = (state.biblioteca[state.libTab] || []).filter(
      (x) => !q || (x.title + x.id + x.file).toLowerCase().includes(q)
    );
    const box = document.getElementById("lib-list");
    if (!items.length) {
      box.innerHTML = `<p class="muted" style="padding:1rem">Nenhum item.</p>`;
      return;
    }
    box.innerHTML = items
      .map(
        (x) => `<div class="lib-item">
        <div style="min-width:0">
          <strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.title)}</strong>
          <div class="small muted">${esc(x.id)}${x.sizeKb ? " · " + x.sizeKb + " KB" : ""}</div>
        </div>
        <button type="button" class="btn secondary" data-pdf="${esc(x.file)}" data-title="${esc(x.title)}">Abrir</button>
      </div>`
      )
      .join("");
    box.querySelectorAll("[data-pdf]").forEach((btn) => {
      btn.onclick = () => openPdf(btn.dataset.pdf, btn.dataset.title);
    });
  }

  function openPdf(url, title) {
    document.getElementById("pdf-title").textContent = title || "PDF";
    document.getElementById("pdf-open-tab").href = url;
    // encode URI components for special chars
    document.getElementById("pdf-frame").src = url;
    document.getElementById("overlay-pdf").classList.remove("hidden");
  }

  /* ---------- progresso ---------- */
  function renderProgresso() {
    const read = Object.keys(state.progress.lessonsRead || {}).length;
    const days = Object.keys(state.progress.daysDone || {}).length;
    const ans = Object.values(state.progress.answers || {});
    const ok = ans.filter((a) => a.correct).length;
    document.getElementById("p-lessons").textContent = `${read}/${state.lessons.length}`;
    document.getElementById("p-days").textContent = `${days}/${state.schedule.days.length}`;
    document.getElementById("p-answered").textContent = ans.length;
    document.getElementById("p-rate").textContent = ans.length
      ? Math.round((ok / ans.length) * 100) + "%"
      : "0%";

    const by = { ti: { ok: 0, n: 0 }, pt: { ok: 0, n: 0 }, rl: { ok: 0, n: 0 } };
    ans.forEach((a) => {
      if (!by[a.cat]) return;
      by[a.cat].n++;
      if (a.correct) by[a.cat].ok++;
    });
    document.getElementById("p-by-cat").innerHTML = ["ti", "pt", "rl"]
      .map((c) => {
        const r = by[c];
        const pct = r.n ? Math.round((r.ok / r.n) * 100) : 0;
        return `<div style="margin:.45rem 0"><strong>${c.toUpperCase()}</strong>: ${r.ok}/${r.n} (${pct}%)
          <div class="progress" style="margin-top:.25rem"><i style="width:${pct}%"></i></div></div>`;
      })
      .join("");

    const detail = document.getElementById("sync-detail");
    if (state.sync.status === "ok") {
      detail.textContent =
        "VPS sincronizada · " +
        (state.sync.lastOk ? new Date(state.sync.lastOk).toLocaleString("pt-BR") : "");
    } else if (state.sync.status === "error") {
      detail.textContent = "Falha na sync: " + (state.sync.error || "");
    } else detail.textContent = "Sincronização multi-dispositivo na VPS.";

    document.getElementById("btn-sync-now").onclick = async () => {
      await syncPullAndMerge();
      renderAll();
    };
    document.getElementById("btn-export").onclick = () => {
      const blob = new Blob([JSON.stringify(state.progress, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "ibge-acti-progresso.json";
      a.click();
    };
    document.getElementById("btn-reset").onclick = async () => {
      if (!confirm("Zerar progresso neste aparelho e na VPS?")) return;
      state.progress = defaultProgress();
      touchProgress();
      saveProgressLocal();
      if (state.config.syncEnabled) {
        try {
          await fetch(state.config.apiBase + "/progress", {
            method: "PUT",
            headers: authHeaders(),
            credentials: "include",
            body: JSON.stringify(state.progress),
          });
        } catch (_) {}
      }
      renderAll();
    };
  }

  boot().catch((err) => {
    console.error(err);
    document.getElementById("hoje-content").innerHTML =
      `<p style="color:var(--danger)">Erro ao carregar: ${esc(err.message)}</p>`;
  });
})();
