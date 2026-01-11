// ==== GLOBALS ====
let habits = JSON.parse(localStorage.getItem('habits') || '[]');
let events = JSON.parse(localStorage.getItem('events') || '{}');
let stats = JSON.parse(localStorage.getItem('habitStats') || '{}');
let currentCalendarMonth = new Date();

// ==== DOM ELEMENTS ====
const themeToggleBtn = document.getElementById('themeToggleBtn');
const notificationsBtn = document.getElementById('enableNotificationsBtn');
const todayBtn = document.getElementById('todayBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Habits
const habitNameInput = document.getElementById('habitName');
const habitNoteInput = document.getElementById('habitNote');
const addHabitBtn = document.getElementById('addHabitBtn');
const habitsList = document.getElementById('habitsList');
const todaySummary = document.getElementById('todaySummary');

// Calendar
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const currentMonthEl = document.getElementById('currentMonth');
const calendarGrid = document.getElementById('calendarGrid');
const eventPanel = document.getElementById('eventPanel');
const selectedDateEl = document.getElementById('selectedDate');
const eventTitleInput = document.getElementById('eventTitle');
const eventNoteInput = document.getElementById('eventNote');
const addEventBtn = document.getElementById('addEventBtn');
const clearEventBtn = document.getElementById('clearEventBtn');
const eventsList = document.getElementById('eventsList');

// Stats
const monthlyChart = document.getElementById('monthlyChart');
const streakInfo = document.getElementById('streakInfo');

// Companion
const companionAvatar = document.getElementById('companionAvatar');
const companionText = document.getElementById('companionText');

// ==== INIT ====
document.addEventListener('DOMContentLoaded', () => {
  applySavedTheme();
  setupEventListeners();
  renderHabits();
  renderCalendar();
  renderStats();
  updateCompanion(getTodayHabits());
  registerServiceWorker();
  scheduleDailyReminder();
});

// ==== THEME ==== 
function applySavedTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark');
    themeToggleBtn.textContent = '☀️ Light';
  } else {
    document.body.classList.remove('dark');
    themeToggleBtn.textContent = '🌙 Dark';
  }
}

// ==== EVENT LISTENERS ====
function setupEventListeners() {
  // Theme toggle
  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  });

  // Notifications
  if ('Notification' in window) {
    notificationsBtn.addEventListener('click', async () => {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        alert('✅ Daily reminders enabled!');
      }
    });
  } else {
    notificationsBtn.style.display = 'none';
  }

  // Today button
  todayBtn.addEventListener('click', () => {
    currentCalendarMonth = new Date();
    renderCalendar();
  });

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });

  // Habits
  addHabitBtn.addEventListener('click', addHabit);
  habitNameInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') addHabit();
  });

  // Calendar
  prevMonthBtn.addEventListener('click', () => {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
    renderCalendar();
  });
  nextMonthBtn.addEventListener('click', () => {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
    renderCalendar();
  });
  addEventBtn.addEventListener('click', addEvent);
  clearEventBtn.addEventListener('click', clearEventForm);
}

function switchTab(tabName) {
  tabBtns.forEach(btn => btn.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));
  
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(tabName).classList.add('active');
}

// ==== HABITS ==== 
function addHabit() {
  const name = habitNameInput.value.trim();
  if (!name) return;

  const habit = {
    id: Date.now().toString(),
    name,
    note: habitNoteInput.value.trim(),
    created: new Date().toISOString().slice(0, 10),
    streak: 0,
    dates: {}
  };

  habits.push(habit);
  saveHabits();
  renderHabits();
  updateCompanion(getTodayHabits());
  
  habitNameInput.value = '';
  habitNoteInput.value = '';
}

function toggleHabit(habitId, date) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;

  const key = date;
  const wasCompleted = habit.dates[key];
  
  if (wasCompleted) {
    delete habit.dates[key];
    habit.streak = calculateStreak(habit);
  } else {
    habit.dates[key] = true;
    habit.streak = calculateStreak(habit);
  }

  updateDailyStats(key, getTodayHabits());
  saveHabits();
  renderHabits();
  updateCompanion(getTodayHabits());
}

function deleteHabit(habitId) {
  if (confirm('Delete this habit?')) {
    habits = habits.filter(h => h.id !== habitId);
    saveHabits();
    renderHabits();
    updateCompanion(getTodayHabits());
  }
}

function renderHabits() {
  const today = getTodayDate();
  const todayHabits = getTodayHabits();

  // Update summary
  const done = todayHabits.filter(h => h.dates[today]).length;
  const total = todayHabits.length;
  todaySummary.textContent = `${done}/${total} habits done today`;

  // Render list
  habitsList.innerHTML = habits.map(habit => {
    const completedToday = habit.dates[today];
    return `
      <li class="habit-item ${completedToday ? 'completed' : ''}">
        <div>
          <div class="habit-name">${habit.name}</div>
          ${habit.note ? `<div class="habit-note">${habit.note}</div>` : ''}
          <div class="habit-streak">Streak: ${habit.streak} days</div>
        </div>
        <div class="habit-actions">
          <button class="btn ${completedToday ? 'btn-success' : 'btn-primary'}" 
                  onclick="toggleHabit('${habit.id}', '${today}')">
            ${completedToday ? '✓ Done' : '○ Mark done'}
          </button>
          <button class="btn btn-sm" onclick="deleteHabit('${habit.id}')">🗑️</button>
        </div>
      </li>
    `;
  }).join('');
}

function getTodayHabits() {
  const today = getTodayDate();
  return habits.filter(habit => {
    // Show habits created in last 30 days or completed recently
    const createdDays = daysBetween(habit.created, today);
    const lastCompleted = Object.keys(habit.dates).sort().pop();
    return createdDays <= 30 || (lastCompleted && daysBetween(lastCompleted, today) <= 7);
  });
}

function calculateStreak(habit) {
  const dates = Object.keys(habit.dates).sort();
  let streak = 0;
  let currentDate = getTodayDate();

  while (dates.includes(currentDate)) {
    streak++;
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    currentDate = prevDate.toISOString().slice(0, 10);
  }

  return streak;
}

// ==== CALENDAR ==== 
function renderCalendar() {
  const year = currentCalendarMonth.getFullYear();
  const month = currentCalendarMonth.getMonth();
  
  // Update title
  currentMonthEl.textContent = currentCalendarMonth.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long' 
  });

  // Generate days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  calendarGrid.innerHTML = '';

  // Day headers
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = day;
    header.style.fontWeight = '600';
    calendarGrid.appendChild(header);
  });

  // Days
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.dataset.date = date.toISOString().slice(0, 10);

    const isCurrentMonth = date.getMonth() === month;
    const dayNum = date.getDate();
    const isToday = isSameDay(date, new Date());

    dayEl.innerHTML = `
      <div class="calendar-day-header">${dayNum}</div>
      <div class="calendar-day-events">${getEventCount(date)}</div>
    `;

    if (!isCurrentMonth) dayEl.classList.add('other-month');
    if (isToday) dayEl.classList.add('today');
    if (getEventCount(date) > 0) dayEl.classList.add('has-events');

    dayEl.addEventListener('click', () => selectDate(date));
    calendarGrid.appendChild(dayEl);
  }
}

function selectDate(date) {
  const dateStr = date.toISOString().slice(0, 10);
  selectedDateEl.textContent = `📅 ${date.toLocaleDateString()}`;
  
  const dayEvents = events[dateStr] || [];
  renderEvents(dayEvents, dateStr);
  eventPanel.scrollIntoView({ behavior: 'smooth' });
}

function addEvent() {
  const dateStr = selectedDateEl.dataset.date;
  if (!dateStr) return;

  const title = eventTitleInput.value.trim();
  if (!title) return;

  if (!events[dateStr]) events[dateStr] = [];
  
  events[dateStr].push({
    id: Date.now().toString(),
    title,
    note: eventNoteInput.value.trim(),
    created: new Date().toISOString()
  });

  saveEvents();
  renderEvents(events[dateStr], dateStr);
  clearEventForm();
}

function renderEvents(eventsList, dateStr) {
  eventsListEl.innerHTML = eventsList.map(event => `
    <li class="event-item">
      <strong>${event.title}</strong>
      ${event.note ? `<br><small>${event.note}</small>` : ''}
      <button class="btn btn-sm" style="float:right; margin-top:0.25rem;" 
              onclick="deleteEvent('${event.id}', '${dateStr}')">🗑️</button>
    </li>
  `).join('');
}

function deleteEvent(eventId, dateStr) {
  events[dateStr] = events[dateStr].filter(e => e.id !== eventId);
  if (events[dateStr].length === 0) delete events[dateStr];
  saveEvents();
  renderEvents(events[dateStr] || [], dateStr);
}

function clearEventForm() {
  eventTitleInput.value = '';
  eventNoteInput.value = '';
}

// ==== STATS ==== 
function renderStats() {
  renderMonthlyChart();
  renderStreakInfo();
}

function renderMonthlyChart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const bars = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const stat = stats[dateStr];
    const percent = stat && stat.total > 0 ? (stat.completed / stat.total) * 100 : 0;

    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.title = `${day}: ${stat ? stat.completed : 0}/${stat ? stat.total : 0}`;

    const fill = document.createElement('div');
    fill.className = 'chart-bar-fill';
    fill.style.height = percent + '%';
    bar.appendChild(fill);
    bars.push(bar);
  }

  monthlyChart.innerHTML = '';
  bars.forEach(bar => monthlyChart.appendChild(bar));
}

function renderStreakInfo() {
  const bestHabit = habits.reduce((best, habit) => habit.streak > best.streak ? habit : best, { streak: 0 });
  streakInfo.textContent = `Longest streak: ${bestHabit.streak} days (${bestHabit.name})`;
}

// ==== DATA ==== 
function saveHabits() {
  localStorage.setItem('habits', JSON.stringify(habits));
}

function saveEvents() {
  localStorage.setItem('events', JSON.stringify(events));
}

function updateDailyStats(dateKey, todayHabits) {
  const completed = todayHabits.filter(h => h.dates[dateKey]).length;
  const total = todayHabits.length;
  
  stats[dateKey] = { completed, total };
  localStorage.setItem('habitStats', JSON.stringify(stats));
}

// ==== COMPANION ==== 
function updateCompanion(todayHabits) {
  const total = todayHabits.length;
  const done = todayHabits.filter(h => h.dates[getTodayDate()]).length;
  const ratio = total > 0 ? done / total : 0;

  if (total === 0) {
    companionAvatar.textContent = '🐱';
    companionText.textContent = 'Add a habit to get started!';
    companionAvatar.classList.remove('happy');
  } else if (ratio === 1) {
    companionAvatar.textContent = '🐯';
    companionText.textContent = 'Perfect! All habits done! 🎉';
    companionAvatar.classList.add('happy');
  } else if (ratio >= 0.5) {
    companionAvatar.textContent = '🐶';
    companionText.textContent = 'Great progress! Keep going! 👍';
    companionAvatar.classList.add('happy');
  } else if (done > 0) {
    companionAvatar.textContent = '🐰';
    companionText.textContent = 'Good start! You can do more! 💪';
  } else {
    companionAvatar.textContent = '🐱';
    companionText.textContent = "Let's make today count! 🚀";
  }
}

// ==== UTILS ==== 
function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function isSameDay(date1, date2) {
  return date1.toDateString() === date2.toDateString();
}

function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function getEventCount(date) {
  const dateStr = date.toISOString().slice(0, 10);
  return events[dateStr] ? events[dateStr].length : 0;
}

// ==== PWA ==== 
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
  }
}

function scheduleDailyReminder() {
  if (Notification.permission !== 'granted') return;

  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 20 && now.getMinutes() === 0) { // 8 PM
      new Notification('Habit Tracker', {
        body: 'Time to check your habits! 🔔',
        icon: '/icon-192.png'
      });
    }
  }, 60000);
}
