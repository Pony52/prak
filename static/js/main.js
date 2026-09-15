// ================== ГЛОБАЛЬНЫЕ ДАННЫЕ ==================
let allGroups = [];
let allTeachers = [];
let allSubjects = [];
let allClassrooms = [];
let allLessons = [];

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const PAIRS = [1, 2, 3, 4, 5];

// ================== ЗАГРУЗКА ДАННЫХ ==================
async function loadAll() {
    const [groups, teachers, subjects, classrooms, lessons] = await Promise.all([
        fetch('/api/groups').then(r => r.json()),
        fetch('/api/teachers').then(r => r.json()),
        fetch('/api/subjects').then(r => r.json()),
        fetch('/api/classrooms').then(r => r.json()),
        fetch('/api/lessons').then(r => r.json())
    ]);
    allGroups = groups;
    allTeachers = teachers;
    allSubjects = subjects;
    allClassrooms = classrooms;
    allLessons = lessons;

    renderSchedule();
    renderTeachersPanel();
}

// ================== ТАБЛИЦА РАСПИСАНИЯ ==================
function renderSchedule() {
    const container = document.getElementById('schedule-container');
    if (!container) return;

    if (allGroups.length === 0) {
        container.innerHTML = '<p>Сначала добавьте группы в разделе «Группы».</p>';
        return;
    }

    let html = '<table class="schedule-table">';

    // Заголовок: группы в столбцах
    html += '<thead><tr><th class="day-col">День / Пара</th>';
    allGroups.forEach(g => {
        html += `<th class="group-col">${g.name}</th>`;
    });
    html += '</tr></thead><tbody>';

    // Строки: дни недели и пары
    DAYS.forEach(day => {
        // Строка с названием дня
        html += `<tr class="day-row"><td colspan="${allGroups.length + 1}">${day.toUpperCase()}</td></tr>`;

        PAIRS.forEach(pair => {
            html += `<tr><td class="pair-col">${pair} пара</td>`;

            allGroups.forEach(group => {
                // Ищем занятия для этой группы, дня и пары (в любой из недель)
                const lessons = allLessons.filter(l =>
                    l.group_id === group.id &&
                    l.day === day &&
                    (l.week1_lesson === pair || l.week2_lesson === pair)
                );

                html += `<td class="cell" data-group="${group.id}" data-day="${day}" data-pair="${pair}">`;
                if (lessons.length > 0) {
                    lessons.forEach(l => {
                        html += renderCard(l);
                    });
                }
                html += '</td>';
            });

            html += '</tr>';
        });
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ================== КАРТОЧКА ЗАНЯТИЯ ==================
function renderCard(lesson) {
    const week1 = lesson.week1_lesson ? `${lesson.week1_lesson} пара` : '—';
    const week2 = lesson.week2_lesson ? `${lesson.week2_lesson} пара` : '—';
    const classroom = lesson.classroom_number ? `каб. ${lesson.classroom_number}` : '';

    return `
        <div class="lesson-card" 
             style="background:${lesson.teacher_color};"
             onclick="openEditForm(${lesson.id})">
            <div class="card-teacher">
                <span class="card-short">${lesson.teacher_short || ''}</span>
                ${lesson.teacher_name || ''}
            </div>
            <div class="card-subject">${lesson.subject_name || ''}</div>
            <div class="card-weeks">
                <div>1 нед.: <b>${week1}</b></div>
                <div>2 нед.: <b>${week2}</b></div>
            </div>
            <div class="card-footer">
                ${classroom} ${lesson.lesson_type ? '• ' + lesson.lesson_type : ''}
            </div>
        </div>
    `;
}

// ================== ПАНЕЛЬ ПРЕПОДАВАТЕЛЕЙ ==================
function renderTeachersPanel() {
    const container = document.getElementById('teachers-list');
    if (!container) return;

    if (allTeachers.length === 0) {
        container.innerHTML = '<p>Нет преподавателей</p>';
        return;
    }

    let html = '';
    allTeachers.forEach(t => {
        html += `
            <div class="teacher-block">
                <div class="teacher-header" style="border-left: 6px solid ${t.color};">
                    <span class="teacher-short" style="background:${t.color};">${t.short_name || ''}</span>
                    ${t.name}
                </div>
                <div class="teacher-subjects">
                    ${t.subjects.map(s => `
                        <div class="subject-item" onclick="quickAdd(${t.id}, ${s.id})">
                            • ${s.name}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ================== МОДАЛЬНОЕ ОКНО ==================
function openAddForm() {
    document.getElementById('modal-title').textContent = 'Добавление занятия';
    document.getElementById('lesson-id').value = '';
    document.getElementById('btn-delete-lesson').style.display = 'none';

    fillSelects();

    document.getElementById('lesson-group').value = allGroups[0]?.id || '';
    document.getElementById('lesson-teacher').value = allTeachers[0]?.id || '';
    updateSubjectOptions();
    document.getElementById('lesson-day').value = 'Понедельник';
    document.getElementById('lesson-week1').value = '1';
    document.getElementById('lesson-week2').value = '1';
    document.getElementById('lesson-classroom').value = '';
    document.getElementById('lesson-type').value = 'Лекция';

    document.getElementById('lesson-modal').style.display = 'flex';
}

function openEditForm(lessonId) {
    const lesson = allLessons.find(l => l.id === lessonId);
    if (!lesson) return;

    document.getElementById('modal-title').textContent = 'Редактирование занятия';
    document.getElementById('lesson-id').value = lesson.id;
    document.getElementById('btn-delete-lesson').style.display = 'inline-block';

    fillSelects();

    document.getElementById('lesson-group').value = lesson.group_id;
    document.getElementById('lesson-teacher').value = lesson.teacher_id;
    updateSubjectOptions();
    document.getElementById('lesson-subject').value = lesson.subject_id;
    document.getElementById('lesson-day').value = lesson.day;
    document.getElementById('lesson-week1').value = lesson.week1_lesson || '';
    document.getElementById('lesson-week2').value = lesson.week2_lesson || '';
    document.getElementById('lesson-classroom').value = lesson.classroom_id || '';
    document.getElementById('lesson-type').value = lesson.lesson_type || 'Лекция';

    document.getElementById('lesson-modal').style.display = 'flex';
}

function fillSelects() {
    // Группы
    const groupSel = document.getElementById('lesson-group');
    groupSel.innerHTML = allGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');

    // Преподаватели
    const teacherSel = document.getElementById('lesson-teacher');
    teacherSel.innerHTML = allTeachers.map(t =>
        `<option value="${t.id}">${t.name}</option>`
    ).join('');

    // Кабинеты
    const classSel = document.getElementById('lesson-classroom');
    classSel.innerHTML = '<option value="">—</option>' +
        allClassrooms.map(c => `<option value="${c.id}">${c.number}${c.name ? ' — ' + c.name : ''}</option>`).join('');
}

function updateSubjectOptions() {
    const teacherId = parseInt(document.getElementById('lesson-teacher').value);
    const teacher = allTeachers.find(t => t.id === teacherId);
    const subjectSel = document.getElementById('lesson-subject');

    if (!teacher) {
        subjectSel.innerHTML = '';
        return;
    }

    subjectSel.innerHTML = teacher.subjects.map(s =>
        `<option value="${s.id}">${s.name}</option>`
    ).join('');
}

function closeModal() {
    document.getElementById('lesson-modal').style.display = 'none';
}

// ================== СОХРАНЕНИЕ ==================
async function saveLesson() {
    const id = document.getElementById('lesson-id').value;

    const data = {
        group_id: parseInt(document.getElementById('lesson-group').value),
        teacher_id: parseInt(document.getElementById('lesson-teacher').value),
        subject_id: parseInt(document.getElementById('lesson-subject').value),
        day: document.getElementById('lesson-day').value,
        week1_lesson: document.getElementById('lesson-week1').value,
        week2_lesson: document.getElementById('lesson-week2').value,
        classroom_id: document.getElementById('lesson-classroom').value,
        lesson_type: document.getElementById('lesson-type').value
    };

    if (!data.week1_lesson && !data.week2_lesson) {
        alert('Укажите хотя бы одну неделю');
        return;
    }

    let url = '/api/lessons';
    let method = 'POST';

    if (id) {
        url = `/api/lessons/${id}`;
        method = 'PUT';
    }

    const res = await fetch(url, {
        method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });

    if (res.ok) {
        closeModal();
        await loadAll();
    } else {
        const err = await res.json();
        alert('Ошибка: ' + (err.error || 'неизвестная'));
    }
}

async function deleteCurrentLesson() {
    const id = document.getElementById('lesson-id').value;
    if (!id) return;
    if (!confirm('Удалить занятие?')) return;

    await fetch(`/api/lessons/${id}`, {method: 'DELETE'});
    closeModal();
    await loadAll();
}

// ================== БЫСТРОЕ ДОБАВЛЕНИЕ ИЗ ПАНЕЛИ ==================
function quickAdd(teacherId, subjectId) {
    openAddForm();
    document.getElementById('lesson-teacher').value = teacherId;
    updateSubjectOptions();
    document.getElementById('lesson-subject').value = subjectId;
}

// ================== СТАРТ ==================
loadAll();