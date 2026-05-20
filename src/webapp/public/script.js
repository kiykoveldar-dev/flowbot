(function () {
  const tg = window.Telegram?.WebApp;
  const isBrowserDev = !tg || !tg.initData;

  if (tg) {
    tg.ready();
    tg.expand();
  } else {
    document.body.classList.add("browser-dev");
  }

  const initData = tg?.initData || "local-dev-mode";
  const API_BASE = window.location.origin;

  let state = {
    date: todayISO(),
    tasks: [],
    streak: 0,
    week: [],
  };

  const els = {
    loading: document.getElementById("loading"),
    streakBadge: document.getElementById("streakBadge"),
    dateLabel: document.getElementById("dateLabel"),
    taskList: document.getElementById("taskList"),
    weekCalendar: document.getElementById("weekCalendar"),
    addTaskBtn: document.getElementById("addTaskBtn"),
    taskModal: document.getElementById("taskModal"),
    taskForm: document.getElementById("taskForm"),
    taskInput: document.getElementById("taskInput"),
    cancelTask: document.getElementById("cancelTask"),
    helpBtn: document.getElementById("helpBtn"),
  };

  applyTheme();
  if (tg) {
    setupMainButton();
    tg.onEvent("themeChanged", applyTheme);
    tg.onEvent("viewportChanged", () => {
      if (tg.isExpanded) tg.expand();
    });
    const startParam = tg.initDataUnsafe?.start_param;
    if (startParam === "shared") {
      tg.showAlert("Добро пожаловать! Добавь свои цели на сегодня 🎯");
    }
  } else {
    showBrowserDevBanner();
  }
  bindEvents();

  loadAll();

  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function showBrowserDevBanner() {
    const banner = document.createElement("div");
    banner.className = "dev-banner";
    banner.textContent =
      "Режим предпросмотра в браузере. В Telegram функции будут полными.";
    document.getElementById("app").prepend(banner);
  }

  function applyTheme() {
    const p = tg?.themeParams;
    if (!p) return;
    const root = document.documentElement;
    const map = {
      bg_color: "--tg-theme-bg-color",
      text_color: "--tg-theme-text-color",
      hint_color: "--tg-theme-hint-color",
      link_color: "--tg-theme-link-color",
      button_color: "--tg-theme-button-color",
      button_text_color: "--tg-theme-button-text-color",
      secondary_bg_color: "--tg-theme-secondary-bg-color",
    };
    for (const [key, cssVar] of Object.entries(map)) {
      if (p[key]) root.style.setProperty(cssVar, p[key]);
    }
    if (tg) {
      tg.setHeaderColor(p.bg_color || "#ffffff");
      tg.setBackgroundColor(p.bg_color || "#ffffff");
    }
  }

  function setupMainButton() {
    if (!tg) return;
    tg.MainButton.setText("📤 Поделиться прогрессом");
    tg.MainButton.color = tg.themeParams?.button_color || "#3390ec";
    tg.MainButton.textColor = tg.themeParams?.button_text_color || "#ffffff";
    tg.MainButton.onClick(onShare);
    updateMainButton();
  }

  function updateMainButton() {
    if (!tg) return;
    if (state.tasks.length > 0) tg.MainButton.show();
    else tg.MainButton.hide();
  }

  function bindEvents() {
    els.addTaskBtn.addEventListener("click", openModal);
    els.cancelTask.addEventListener("click", closeModal);
    els.taskForm.addEventListener("submit", onAddTask);
    els.helpBtn.addEventListener("click", () => {
      if (!tg) {
        alert("FlowBot: планируй день, отмечай цели, делись прогрессом.");
        return;
      }
      tg.showPopup({
        title: "FlowBot",
        message:
          "Добавь цели на день, отмечай выполненные и делись карточкой в любом чате через кнопку внизу.",
        buttons: [{ type: "ok" }],
      });
    });

    if (tg) tg.BackButton.onClick(() => tg.close());
  }

  function openModal() {
    els.taskInput.value = "";
    els.taskModal.hidden = false;
    els.taskModal.classList.add("open");
    document.body.classList.add("modal-open");
    setTimeout(() => els.taskInput.focus(), 100);
  }

  function closeModal() {
    els.taskModal.classList.remove("open");
    els.taskModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": initData,
    };
    const res = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  }

  async function loadAll() {
    try {
      const [today, weekData] = await Promise.all([
        api("/today"),
        api("/week"),
      ]);
      state.date = today.date;
      state.tasks = today.tasks;
      state.streak = today.streak;
      state.week = weekData.week;
      render();
    } catch (e) {
      console.error(e);
      if (tg) tg.showAlert("Ошибка загрузки: " + e.message);
      else alert("Ошибка загрузки: " + e.message);
    } finally {
      els.loading.classList.add("hidden");
    }
  }

  function formatDateLabel(dateStr) {
    const d = new Date(dateStr + "T12:00:00");
    const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const months = [
      "янв", "фев", "мар", "апр", "мая", "июн",
      "июл", "авг", "сен", "окт", "ноя", "дек",
    ];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  }

  function render() {
    els.streakBadge.textContent = `🔥 ${state.streak}`;
    els.dateLabel.textContent = formatDateLabel(state.date);
    renderTasks();
    renderWeek();
    updateMainButton();
  }

  function renderTasks() {
    els.taskList.innerHTML = "";
    if (state.tasks.length === 0) {
      const li = document.createElement("li");
      li.className = "empty-state";
      li.textContent = "Добавь первую цель на сегодня";
      els.taskList.appendChild(li);
      return;
    }

    for (const task of state.tasks) {
      const li = document.createElement("li");
      li.className = "task-item" + (task.completed ? " completed" : "");

      const check = document.createElement("button");
      check.type = "button";
      check.className = "task-check";
      check.setAttribute("aria-label", "Отметить");
      check.textContent = task.completed ? "✓" : "";
      check.addEventListener("click", () => toggleTask(task.id));

      const title = document.createElement("span");
      title.className = "task-title";
      title.textContent = task.title;

      const del = document.createElement("button");
      del.type = "button";
      del.className = "task-delete";
      del.textContent = "×";
      del.addEventListener("click", () => deleteTask(task.id));

      li.append(check, title, del);
      els.taskList.appendChild(li);
    }
  }

  function renderWeek() {
    els.weekCalendar.innerHTML = "";
    const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

    for (let i = 0; i < state.week.length; i++) {
      const day = state.week[i];
      const d = new Date(day.date + "T12:00:00");
      const isToday = day.date === state.date;
      const ratio = day.total > 0 ? day.completed / day.total : 0;

      const cell = document.createElement("div");
      cell.className =
        "week-day" +
        (isToday ? " active" : "") +
        (!day.hasPlan ? " empty" : "");

      cell.innerHTML = `
        <div class="week-day-name">${dayNames[i]}</div>
        <div class="week-day-num">${d.getDate()}</div>
        <div class="week-day-bar">
          <div class="week-day-bar-fill" style="width:${day.hasPlan ? Math.round(ratio * 100) : 0}%"></div>
        </div>
      `;
      els.weekCalendar.appendChild(cell);
    }
  }

  async function onAddTask(e) {
    e.preventDefault();
    const title = els.taskInput.value.trim();
    if (!title) return;
    closeModal();
    tg?.HapticFeedback?.impactOccurred("light");

    try {
      const { task } = await api("/tasks", {
        method: "POST",
        body: JSON.stringify({ title, date: state.date }),
      });
      state.tasks.push(task);
      render();
    } catch (err) {
      if (tg) tg.showAlert(err.message);
      else alert(err.message);
    }
  }

  async function toggleTask(id) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    tg?.HapticFeedback?.impactOccurred("medium");

    try {
      const data = await api(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !task.completed }),
      });
      const idx = state.tasks.findIndex((t) => t.id === id);
      state.tasks[idx] = data.task;
      state.streak = data.streak;
      render();
    } catch (err) {
      if (tg) tg.showAlert(err.message);
      else alert(err.message);
    }
  }

  async function deleteTask(id) {
    tg?.HapticFeedback?.impactOccurred("light");
    try {
      await api(`/tasks/${id}`, { method: "DELETE" });
      state.tasks = state.tasks.filter((t) => t.id !== id);
      render();
    } catch (err) {
      if (tg) tg.showAlert(err.message);
      else alert(err.message);
    }
  }

  async function onShare() {
    if (!tg) {
      alert("Шаринг доступен только внутри Telegram");
      return;
    }
    if (state.tasks.length === 0) {
      tg.showAlert("Добавь хотя бы одну цель");
      return;
    }

    tg.MainButton.showProgress();
    try {
      const isDark =
        tg.colorScheme === "dark" ||
        (tg.themeParams?.bg_color &&
          parseInt(tg.themeParams.bg_color.replace("#", ""), 16) < 0x888888);

      await api("/card", {
        method: "POST",
        body: JSON.stringify({
          initData,
          date: state.date,
          theme: isDark ? "dark" : "light",
        }),
      });

      const query = "день";
      if (typeof tg.switchInlineQuery === "function") {
        tg.switchInlineQuery(query, ["users", "groups", "channels"]);
      } else {
        tg.showAlert(
          "Выберите чат и введите @" +
            (tg.initDataUnsafe?.user?.username || "flowbot") +
            " день"
        );
      }
    } catch (err) {
      tg.showAlert("Не удалось подготовить карточку: " + err.message);
    } finally {
      tg.MainButton.hideProgress();
    }
  }
})();
