import sqlite3
import os

DATABASE = 'schedule.db'


def get_db():
    """Подключение к базе данных"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Инициализация базы данных - создание всех таблиц"""
    conn = get_db()
    cursor = conn.cursor()

    # Таблица групп
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            speciality TEXT,
            course INTEGER
        )
    ''')

    # Таблица преподавателей
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS teachers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            short_name TEXT,
            color TEXT DEFAULT '#3498db'
        )
    ''')

    # Таблица дисциплин
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            short_name TEXT
        )
    ''')

    # Таблица связи преподавателей и дисциплин (многие ко многим)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS teacher_subjects (
            teacher_id INTEGER,
            subject_id INTEGER,
            PRIMARY KEY (teacher_id, subject_id),
            FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
        )
    ''')

    # Таблица кабинетов
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS classrooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            number TEXT NOT NULL,
            name TEXT,
            capacity INTEGER
        )
    ''')

    # Таблица занятий
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS lessons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER,
            teacher_id INTEGER,
            subject_id INTEGER,
            classroom_id INTEGER,
            day TEXT,
            week1_lesson INTEGER,
            week2_lesson INTEGER,
            lesson_type TEXT,
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
            FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
            FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE SET NULL
        )
    ''')

    conn.commit()
    conn.close()
    print("База данных успешно инициализирована")


if __name__ == '__main__':
    init_db()