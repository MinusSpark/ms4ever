
// ======================
//  Estado + LocalStorage
// ======================
const STORAGE_KEY = "ms4ever_tasks_v1";

let tasks = loadTasks();
let currentMonth = new Date();         // mes que se está mostrando
let selectedDate = toISODate(new Date()); // fecha seleccionada (YYYY-MM-DD)

// ======================
//  Helpers
// ======================
function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function formatDateES(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function monthLabelES(date) {
  const months = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function hasPlansOnDate(iso) {
  return tasks.some(t => t.date === iso);
}

// ======================
//  DOM
// ======================
const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskDate = document.getElementById("taskDate");

const pendingList = document.getElementById("pendingList");
const doneList = document.getElementById("doneList");
const pendingCount = document.getElementById("pendingCount");
const doneCount = document.getElementById("doneCount");

const calendarGrid = document.getElementById("calendarGrid");
const monthLabel = document.getElementById("monthLabel");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");

const selectedDateLabel = document.getElementById("selectedDateLabel");
const dayPlans = document.getElementById("dayPlans");
const clearFilter = document.getElementById("clearFilter");

// Set fecha por defecto al abrir
taskDate.value = selectedDate;

// ======================
//  Render: listas
// ======================
function renderLists() {
  const pending = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);

  pendingCount.textContent = pending.length;
  doneCount.textContent = done.length;

  pendingList.innerHTML = "";
  doneList.innerHTML = "";

  pending.forEach(t => pendingList.appendChild(taskItem(t)));
  done.forEach(t => doneList.appendChild(taskItem(t)));
}

function taskItem(task) {
  const li = document.createElement("li");
  li.className = "list-group-item d-flex justify-content-between align-items-start";

  const left = document.createElement("div");
  left.className = "me-2";

  const title = document.createElement("div");
  title.className = "fw-bold";
  title.textContent = task.title;

  const date = document.createElement("div");
  date.className = "small-date";
  date.textContent = `📌 ${formatDateES(task.date)}`;

  left.appendChild(title);
  left.appendChild(date);

  const actions = document.createElement("div");
  actions.className = "task-actions d-flex gap-2";

  // Botón completar / deshacer
  const toggleBtn = document.createElement("button");
  toggleBtn.title = task.done ? "Marcar como pendiente" : "Marcar como hecho";
  toggleBtn.innerHTML = task.done
    ? `<i class="fas fa-undo"></i>`
    : `<i class="fas fa-check"></i>`;
  toggleBtn.onclick = () => toggleDone(task.id);

  // Botón borrar
  const delBtn = document.createElement("button");
  delBtn.title = "Eliminar";
  delBtn.innerHTML = `<i class="fas fa-trash"></i>`;
  delBtn.onclick = () => deleteTask(task.id);

  actions.appendChild(toggleBtn);
  actions.appendChild(delBtn);

  li.appendChild(left);
  li.appendChild(actions);
  return li;
}

function toggleDone(id) {
  tasks = tasks.map(t => (t.id === id ? { ...t, done: !t.done } : t));
  saveTasks();
  renderAll();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderAll();
}

// ======================
//  Render: calendario
// ======================
function renderCalendar() {
  monthLabel.textContent = monthLabelES(currentMonth);

  calendarGrid.innerHTML = "";

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Queremos que el calendario empiece en LUNES:
  // JS: 0=Dom...6=Sáb -> convertimos para que Lun=0
  const firstDay = new Date(year, month, 1);
  const firstDayIndex = (firstDay.getDay() + 6) % 7;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Total celdas (6 semanas x 7 días) para un calendario estable
  const totalCells = 42;

  const todayISO = toISODate(new Date());

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement("div");
    cell.className = "day";

    let dayNumber;
    let cellDate;

    if (i < firstDayIndex) {
      // Días del mes anterior
      dayNumber = daysInPrevMonth - firstDayIndex + i + 1;
      cell.classList.add("muted");
      cellDate = new Date(year, month - 1, dayNumber);
    } else if (i >= firstDayIndex + daysInMonth) {
      // Días del mes siguiente
      dayNumber = i - (firstDayIndex + daysInMonth) + 1;
      cell.classList.add("muted");
      cellDate = new Date(year, month + 1, dayNumber);
    } else {
      // Días del mes actual
      dayNumber = i - firstDayIndex + 1;
      cellDate = new Date(year, month, dayNumber);
    }

    const iso = toISODate(cellDate);
    cell.textContent = dayNumber;

    // Marcar hoy
    if (iso === todayISO) cell.classList.add("today");

    // Marcar seleccionado
    if (iso === selectedDate) cell.classList.add("selected");

    // Puntito si hay planes en ese día
    if (hasPlansOnDate(iso)) {
      const dot = document.createElement("span");
      dot.className = "dot";
      cell.appendChild(dot);
    }

    cell.onclick = () => {
      selectedDate = iso;
      taskDate.value = selectedDate;
      renderAll();
    };

    calendarGrid.appendChild(cell);
  }
}

// ======================
//  Render: planes del día
// ======================
function renderDayPlans() {
  selectedDateLabel.textContent = formatDateES(selectedDate);
  dayPlans.innerHTML = "";

  const plans = tasks
    .filter(t => t.date === selectedDate)
    .sort((a, b) => Number(a.done) - Number(b.done)); // pendientes primero

  if (plans.length === 0) {
    const li = document.createElement("li");
    li.className = "list-group-item";
    li.textContent = "No hay planes para este día ✨";
    dayPlans.appendChild(li);
    return;
  }

  plans.forEach(t => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";

    const left = document.createElement("div");
    left.innerHTML = t.done
      ? `✅ <span style="text-decoration: line-through; opacity:.85">${t.title}</span>`
      : `🕒 <span>${t.title}</span>`;

    const right = document.createElement("div");
    right.className = "task-actions d-flex gap-2";

    const toggleBtn = document.createElement("button");
    toggleBtn.innerHTML = t.done ? `<i class="fas fa-undo"></i>` : `<i class="fas fa-check"></i>`;
    toggleBtn.onclick = () => toggleDone(t.id);

    const delBtn = document.createElement("button");
    delBtn.innerHTML = `<i class="fas fa-trash"></i>`;
    delBtn.onclick = () => deleteTask(t.id);

    right.appendChild(toggleBtn);
    right.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(right);

    dayPlans.appendChild(li);
  });
}

// ======================
//  Eventos
// ======================
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = taskTitle.value.trim();
  const date = taskDate.value;

  if (!title || !date) return;

  const newTask = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title,
    date,
    done: false,
    createdAt: Date.now()
  };

  tasks.push(newTask);
  saveTasks();

  taskTitle.value = "";
  selectedDate = date;        // si agregas, te mueve a ese día
  currentMonth = new Date(date + "T00:00:00"); // abre el mes del plan

  renderAll();
});

prevMonth.addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  renderCalendar();
});

nextMonth.addEventListener("click", () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  renderCalendar();
});

clearFilter.addEventListener("click", () => {
  selectedDate = toISODate(new Date());
  taskDate.value = selectedDate;
  currentMonth = new Date();
  renderAll();
});

// ======================
//  Render completo
// ======================
function renderAll() {
  renderLists();
  renderCalendar();
  renderDayPlans();
}

// Inicial
renderAll();
