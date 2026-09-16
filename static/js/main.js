let allGroups = [];
let allTeachers = [];
let allSubjects = [];
let allClassrooms = [];
let allLessons = [];

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const PAIRS = [1, 2, 3, 4, 5];

// данные о перетаскиваемом занятии
let dragData = null;

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

function renderSchedule() {
    const container = document.getElementById('schedule-container');
    if (!container) return;

    if (allGroups.length === 0) {
        container.innerHTML = '<p>Сначала добавьте группы в разделе «Группы».</p>';
        return;
    }

    let html = '<table class="schedule-table">';
    html += '<thead><tr><th class="day-col">День / Пара</th>';
    allGroups.forEach(g => {
        html += `<th class="group-col">${g.name}</th>`;
    });
    html += '</tr></thead><tbody>';

    DAYS.forEach(day => {
        html += `<tr class="day-row"><td colspan="${allGroups.length + 1}">${day.toUpperCase()}</td></tr>`;

        PAIRS.forEach(pair => {
            html += `<tr><td class="pair-col">${pair} пара</td>`;

            allGroups.forEach(group => {
                const lessons = allLessons.filter(l =>
                    l.group_id === group.id &&
                    l.day === day &&
                    (l.week1_lesson === pair || l.week2_lesson === pair)
                );

                html += `<td class="cell" 
                             data-group="${group.id}" 
                             data-day="${day}" 
                             data-pair="${pair}"
                             ondragover="onDragOver(event)"
                             ondragleave="onDragLeave(event)"
                             ondrop="onDrop(event)">
                    <div class="cell-inner">`;

                if (lessons.length > 0) {
                    lessons.forEach(l => {
                        html += renderCard(l);
                    });
                }

                html += `</div></td>`;
            });

            html += '</tr>';
        });
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderCard(lesson) {
    const week1 = lesson.week1_lesson ? `${lesson.week1_lesson} пара` : '—';
    const week2 = lesson.week2_lesson ? `${lesson.week2_lesson} пара` : '—';
    const classroom = lesson.classroom_number ? `каб. ${lesson.classroom_number}` : '';

    return `
        <div class="lesson-card" 
             style="background:${lesson.teacher_color};"
             draggable="true"
             data-lesson-id="${lesson.id}"
             ondragstart="onDragStart(event, ${lesson.id})"
             ondragend="onDragEnd(event)"
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
                <div class="teacher-subjects">`;

        if (t.subjects.length === 0) {
            html += `<em style="font-size:12px; color:#999;">Нет дисциплин</em>`;
        } else {
            t.subjects.forEach(s => {
                html += `<div class="subject-item"
                              draggable="true"
                              data-teacher-id="${t.id}"
                              data-subject-id="${s.id}"
                              ondragstart="onSubjectDragStart(event, ${t.id}, ${s.id})"
                              ondragend="onDragEnd(event)">
                            • ${s.name}
                         </div>`;
            });
        }

        html += `</div></div>`;
    });
    container.innerHTML = html;
}


// перетаскивание дисциплины из панели (создание новой карточки)
function onSubjectDragStart(event, teacherId, subjectId) {
    dragData = {
        type: 'new',
        teacherId: teacherId,
        subjectId: subjectId
    };
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', 'new-lesson');
}

// перетаскивание существующей карточки (перемещение)
function onDragStart(event, lessonId) {
    dragData = {
        type: 'move',
        lessonId: lessonId
    };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', 'move-lesson');
    event.target.classList.add('dragging');
}

function onDragEnd(event) {
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.drop-hover').forEach(el => el.classList.remove('drop-hover'));
}

function onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = dragData && dragData.type === 'move' ? 'move' : 'copy';
    const cell = event.currentTarget;
    if (!cell.classList.contains('drop-hover')) {
        cell.classList.add('drop-hover');
    }
}

function onDragLeave(event) {
    event.currentTarget.classList.remove('drop-hover');
}

function onDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drop-hover');

    if (!dragData) return;

    const cell = event.currentTarget;
    const groupId = parseInt(cell.dataset.group);
    const day = cell.dataset.day;
    const pair = parseInt(cell.dataset.pair);

    if (dragData.type === 'new') {
        // создаю занятие из перетащенной дисциплины
        createFromDrop(dragData.teacherId, dragData.subjectId, groupId, day, pair);
    } else if (dragData.type === 'move') {
        // перемещаем существующее занятие
        moveLesson(dragData.lessonId, groupId, day, pair);
    }

    dragData = null;
}

// создание занятия перетаскиванием
async function createFromDrop(teacherId, subjectId, groupId, day, pair) {
    const data = {
        group_id: groupId,
        teacher_id: teacherId,
        subject_id: subjectId,
        day: day,
        week1_lesson: pair,
        week2_lesson: pair,
        classroom_id: null,
        lesson_type: 'Лекция'
    };

    const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });

    if (res.status === 409) {
        const err = await res.json();
        showConflicts(err.conflicts);
        return;
    }

    if (!res.ok) {
        alert('Ошибка создания занятия');
        return;
    }

    await loadAll();
}

// перемещение занятия
async function moveLesson(lessonId, groupId, day, pair) {
    const lesson = allLessons.find(l => l.id === lessonId);
    if (!lesson) return;

    const data = {
        group_id: groupId,
        teacher_id: lesson.teacher_id,
        subject_id: lesson.subject_id,
        classroom_id: lesson.classroom_id,
        day: day,
        week1_lesson: pair,
        week2_lesson: pair,
        lesson_type: lesson.lesson_type
    };

    const res = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });

    if (res.status === 409) {
        const err = await res.json();
        showConflicts(err.conflicts);
        return;
    }

    if (!res.ok) {
        alert('Ошибка перемещения');
        return;
    }

    await loadAll();
}

function showConflicts(conflicts) {
    const text = conflicts.join('\n\n');
    alert('Обнаружены конфликты:\n\n' + text);
}

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
    const groupSel = document.getElementById('lesson-group');
    groupSel.innerHTML = allGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');

    const teacherSel = document.getElementById('lesson-teacher');
    teacherSel.innerHTML = allTeachers.map(t =>
        `<option value="${t.id}">${t.name}</option>`
    ).join('');

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

    if (res.status === 409) {
        const err = await res.json();
        showConflicts(err.conflicts);
        return;
    }

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

loadAll();