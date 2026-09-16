from flask import Flask, render_template, request, jsonify
from database import get_db, init_db

app = Flask(__name__)



@app.route('/')
def index():
    return render_template('index.html')



@app.route('/api/groups', methods=['GET'])
def get_groups():
    """Получить список всех групп"""
    conn = get_db()
    groups = conn.execute('SELECT * FROM groups ORDER BY name').fetchall()
    conn.close()
    return jsonify([dict(g) for g in groups])


@app.route('/api/groups', methods=['POST'])
def add_group():
    """Добавить новую группу"""
    data = request.get_json()
    name = data.get('name')
    speciality = data.get('speciality', '')
    course = data.get('course', 1)

    if not name:
        return jsonify({'error': 'Название группы обязательно'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO groups (name, speciality, course) VALUES (?, ?, ?)',
        (name, speciality, course)
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'name': name, 'speciality': speciality, 'course': course}), 201


@app.route('/api/groups/<int:group_id>', methods=['PUT'])
def update_group(group_id):
    """Редактировать группу"""
    data = request.get_json()
    conn = get_db()
    conn.execute(
        'UPDATE groups SET name = ?, speciality = ?, course = ? WHERE id = ?',
        (data.get('name'), data.get('speciality'), data.get('course'), group_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/groups/<int:group_id>', methods=['DELETE'])
def delete_group(group_id):
    """Удалить группу"""
    conn = get_db()
    conn.execute('DELETE FROM groups WHERE id = ?', (group_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/teachers', methods=['GET'])
def get_teachers():
    """Получить список всех преподавателей с их дисциплинами"""
    conn = get_db()
    teachers = conn.execute('SELECT * FROM teachers ORDER BY name').fetchall()
    result = []
    for t in teachers:
        teacher = dict(t)
        subjects = conn.execute('''
            SELECT s.id, s.name, s.short_name
            FROM subjects s
            JOIN teacher_subjects ts ON s.id = ts.subject_id
            WHERE ts.teacher_id = ?
        ''', (t['id'],)).fetchall()
        teacher['subjects'] = [dict(s) for s in subjects]
        result.append(teacher)
    conn.close()
    return jsonify(result)


@app.route('/api/teachers', methods=['POST'])
def add_teacher():
    """Добавить преподавателя с привязкой дисциплин"""
    data = request.get_json()
    name = data.get('name')
    short_name = data.get('short_name', '')
    color = data.get('color', '#3498db')
    subject_ids = data.get('subject_ids', [])

    if not name:
        return jsonify({'error': 'ФИО преподавателя обязательно'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO teachers (name, short_name, color) VALUES (?, ?, ?)',
        (name, short_name, color)
    )
    teacher_id = cursor.lastrowid

    for sid in subject_ids:
        cursor.execute(
            'INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)',
            (teacher_id, sid)
        )

    conn.commit()
    conn.close()
    return jsonify({'id': teacher_id, 'name': name}), 201


@app.route('/api/teachers/<int:teacher_id>', methods=['PUT'])
def update_teacher(teacher_id):
    """Редактировать преподавателя"""
    data = request.get_json()
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        'UPDATE teachers SET name = ?, short_name = ?, color = ? WHERE id = ?',
        (data.get('name'), data.get('short_name'), data.get('color'), teacher_id)
    )

    if 'subject_ids' in data:
        cursor.execute('DELETE FROM teacher_subjects WHERE teacher_id = ?', (teacher_id,))
        for sid in data['subject_ids']:
            cursor.execute(
                'INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)',
                (teacher_id, sid)
            )

    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/teachers/<int:teacher_id>', methods=['DELETE'])
def delete_teacher(teacher_id):
    """Удалить преподавателя"""
    conn = get_db()
    conn.execute('DELETE FROM teachers WHERE id = ?', (teacher_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    """Получить список всех дисциплин"""
    conn = get_db()
    subjects = conn.execute('SELECT * FROM subjects ORDER BY name').fetchall()
    conn.close()
    return jsonify([dict(s) for s in subjects])


@app.route('/api/subjects', methods=['POST'])
def add_subject():
    """Добавить дисциплину"""
    data = request.get_json()
    name = data.get('name')
    short_name = data.get('short_name', '')

    if not name:
        return jsonify({'error': 'Название дисциплины обязательно'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO subjects (name, short_name) VALUES (?, ?)',
        (name, short_name)
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'name': name, 'short_name': short_name}), 201


@app.route('/api/subjects/<int:subject_id>', methods=['PUT'])
def update_subject(subject_id):
    """Редактировать дисциплину"""
    data = request.get_json()
    conn = get_db()
    conn.execute(
        'UPDATE subjects SET name = ?, short_name = ? WHERE id = ?',
        (data.get('name'), data.get('short_name'), subject_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/subjects/<int:subject_id>', methods=['DELETE'])
def delete_subject(subject_id):
    """Удалить дисциплину"""
    conn = get_db()
    conn.execute('DELETE FROM subjects WHERE id = ?', (subject_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/groups')
def page_groups():
    return render_template('groups.html')


@app.route('/teachers')
def page_teachers():
    return render_template('teachers.html')


@app.route('/subjects')
def page_subjects():
    return render_template('subjects.html')


@app.route('/api/classrooms', methods=['GET'])
def get_classrooms():
    """Получить список всех кабинетов"""
    conn = get_db()
    classrooms = conn.execute('SELECT * FROM classrooms ORDER BY number').fetchall()
    conn.close()
    return jsonify([dict(c) for c in classrooms])


@app.route('/api/classrooms', methods=['POST'])
def add_classroom():
    """Добавить кабинет"""
    data = request.get_json()
    number = data.get('number')
    name = data.get('name', '')
    capacity = data.get('capacity', 0)

    if not number:
        return jsonify({'error': 'Номер кабинета обязателен'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO classrooms (number, name, capacity) VALUES (?, ?, ?)',
        (number, name, capacity)
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'number': number}), 201


@app.route('/api/classrooms/<int:cid>', methods=['DELETE'])
def delete_classroom(cid):
    conn = get_db()
    conn.execute('DELETE FROM classrooms WHERE id = ?', (cid,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/lessons', methods=['GET'])
def get_lessons():
    """Получить все занятия с полной информацией"""
    conn = get_db()
    lessons = conn.execute('''
        SELECT 
            l.id, l.group_id, l.teacher_id, l.subject_id, l.classroom_id,
            l.day, l.week1_lesson, l.week2_lesson, l.lesson_type,
            g.name AS group_name,
            t.name AS teacher_name, t.short_name AS teacher_short, t.color AS teacher_color,
            s.name AS subject_name, s.short_name AS subject_short,
            c.number AS classroom_number
        FROM lessons l
        LEFT JOIN groups g ON l.group_id = g.id
        LEFT JOIN teachers t ON l.teacher_id = t.id
        LEFT JOIN subjects s ON l.subject_id = s.id
        LEFT JOIN classrooms c ON l.classroom_id = c.id
        ORDER BY l.day, l.week1_lesson
    ''').fetchall()
    conn.close()
    return jsonify([dict(l) for l in lessons])

# ============ ПРОВЕРКА КОНФЛИКТОВ ============

def check_conflicts(conn, lesson_data, exclude_id=None):
    """
    Проверяет конфликты расписания.
    Возвращает список сообщений о конфликтах.
    exclude_id — ID занятия, которое исключается из проверки (при редактировании).
    """
    conflicts = []

    group_id = lesson_data.get('group_id')
    teacher_id = lesson_data.get('teacher_id')
    classroom_id = lesson_data.get('classroom_id')
    day = lesson_data.get('day')
    week1 = lesson_data.get('week1_lesson')
    week2 = lesson_data.get('week2_lesson')

    # Нормализуем значения
    if week1 in ('', None, 'null'):
        week1 = None
    else:
        week1 = int(week1)

    if week2 in ('', None, 'null'):
        week2 = None
    else:
        week2 = int(week2)

    if classroom_id in ('', None, 'null'):
        classroom_id = None
    else:
        classroom_id = int(classroom_id)

    # Собираем все занятия в тот же день, кроме редактируемого
    if exclude_id:
        rows = conn.execute(
            'SELECT * FROM lessons WHERE day = ? AND id != ?',
            (day, exclude_id)
        ).fetchall()
    else:
        rows = conn.execute(
            'SELECT * FROM lessons WHERE day = ?',
            (day,)
        ).fetchall()

    # Пары, которые занимает новое занятие
    new_pairs = []
    if week1:
        new_pairs.append(('1 неделя', week1))
    if week2:
        new_pairs.append(('2 неделя', week2))

    if not new_pairs:
        return conflicts

    # Получаем имена для сообщений
    group = conn.execute('SELECT name FROM groups WHERE id = ?', (group_id,)).fetchone()
    teacher = conn.execute('SELECT name FROM teachers WHERE id = ?', (teacher_id,)).fetchone()
    group_name = group['name'] if group else '?'
    teacher_name = teacher['name'] if teacher else '?'

    classroom_name = None
    if classroom_id:
        cr = conn.execute('SELECT number FROM classrooms WHERE id = ?', (classroom_id,)).fetchone()
        classroom_name = cr['number'] if cr else None

    # Проверяем каждое существующее занятие
    for r in rows:
        for (week_label, pair_num) in new_pairs:
            # Определяем пару в существующем занятии для соответствующей недели
            existing_pair = r['week1_lesson'] if week_label == '1 неделя' else r['week2_lesson']

            if existing_pair != pair_num:
                continue

            # Конфликт группы
            if r['group_id'] == group_id:
                other = conn.execute(
                    'SELECT s.name FROM subjects s WHERE s.id = ?',
                    (r['subject_id'],)
                ).fetchone()
                other_name = other['name'] if other else '?'
                conflicts.append(
                    f"Конфликт группы: группа «{group_name}» уже имеет занятие "
                    f"«{other_name}» в {day}, {pair_num} пара, {week_label}."
                )

            # Конфликт преподавателя
            if r['teacher_id'] == teacher_id:
                other = conn.execute(
                    'SELECT name FROM groups g WHERE g.id = ?',
                    (r['group_id'],)
                ).fetchone()
                other_name = other['name'] if other else '?'
                conflicts.append(
                    f"Конфликт преподавателя: «{teacher_name}» уже занят в другой группе "
                    f"({other_name}) в {day}, {pair_num} пара, {week_label}."
                )

            # Конфликт кабинета
            if classroom_id and r['classroom_id'] == classroom_id:
                other = conn.execute(
                    'SELECT name FROM groups g WHERE g.id = ?',
                    (r['group_id'],)
                ).fetchone()
                other_name = other['name'] if other else '?'
                conflicts.append(
                    f"Конфликт кабинета: кабинет «{classroom_name}» уже занят группой "
                    f"«{other_name}» в {day}, {pair_num} пара, {week_label}."
                )

    return conflicts

@app.route('/api/lessons', methods=['POST'])
def add_lesson():
    """Добавить занятие"""
    data = request.get_json()

    group_id = data.get('group_id')
    teacher_id = data.get('teacher_id')
    subject_id = data.get('subject_id')
    classroom_id = data.get('classroom_id')
    day = data.get('day')
    week1_lesson = data.get('week1_lesson')
    week2_lesson = data.get('week2_lesson')
    lesson_type = data.get('lesson_type', 'Лекция')

    if not all([group_id, teacher_id, subject_id, day]):
        return jsonify({'error': 'Заполните обязательные поля'}), 400

    if week1_lesson in ('', None, 'null'):
        week1_lesson = None
    if week2_lesson in ('', None, 'null'):
        week2_lesson = None
    if classroom_id in ('', None, 'null'):
        classroom_id = None

    conn = get_db()

    # Проверка конфликтов
    conflicts = check_conflicts(conn, data)
    if conflicts:
        conn.close()
        return jsonify({'error': 'Обнаружены конфликты', 'conflicts': conflicts}), 409

    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO lessons 
        (group_id, teacher_id, subject_id, classroom_id, day, week1_lesson, week2_lesson, lesson_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (group_id, teacher_id, subject_id, classroom_id, day, week1_lesson, week2_lesson, lesson_type))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id}), 201


@app.route('/api/lessons/<int:lesson_id>', methods=['PUT'])
def update_lesson(lesson_id):
    """Редактировать занятие"""
    data = request.get_json()

    week1_lesson = data.get('week1_lesson')
    week2_lesson = data.get('week2_lesson')
    classroom_id = data.get('classroom_id')

    if week1_lesson in ('', None, 'null'):
        week1_lesson = None
    if week2_lesson in ('', None, 'null'):
        week2_lesson = None
    if classroom_id in ('', None, 'null'):
        classroom_id = None

    conn = get_db()

    # Проверка конфликтов (исключая само занятие)
    conflicts = check_conflicts(conn, data, exclude_id=lesson_id)
    if conflicts:
        conn.close()
        return jsonify({'error': 'Обнаружены конфликты', 'conflicts': conflicts}), 409

    conn.execute('''
        UPDATE lessons 
        SET group_id = ?, teacher_id = ?, subject_id = ?, classroom_id = ?,
            day = ?, week1_lesson = ?, week2_lesson = ?, lesson_type = ?
        WHERE id = ?
    ''', (
        data.get('group_id'), data.get('teacher_id'), data.get('subject_id'),
        classroom_id, data.get('day'), week1_lesson, week2_lesson,
        data.get('lesson_type'), lesson_id
    ))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/lessons/<int:lesson_id>', methods=['DELETE'])
def delete_lesson(lesson_id):
    """Удалить занятие"""
    conn = get_db()
    conn.execute('DELETE FROM lessons WHERE id = ?', (lesson_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)