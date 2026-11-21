import os
import sqlite3
import traceback
from pathlib import Path
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config

try:
    import pymysql
    import pymysql.cursors
    PYMYSQL_AVAILABLE = True
except ImportError:
    PYMYSQL_AVAILABLE = False

try:
    import mysql.connector
    from mysql.connector import errorcode
    MYSQL_CONNECTOR_AVAILABLE = True
except ImportError:
    MYSQL_CONNECTOR_AVAILABLE = False

SCHEMA_FILE = Path(__file__).resolve().parent.parent.parent / "database" / "schema.sql"
FALLBACK_SQLITE_PATH = Path(__file__).resolve().parent.parent / "smart_printing.db"

class DatabaseManager:
    _instance = None

    def __init__(self):
        self.driver = None # 'mysql' or 'sqlite'
        self.connection = None
        self.init_attempted = False
        self._check_and_init()

    def _check_and_init(self):
        # 1. Attempt MySQL connection
        mysql_connected = self._try_mysql_connect()
        if mysql_connected:
            self.driver = 'mysql'
            print("[DatabaseManager] Successfully connected to MySQL database:", Config.DB_NAME)
            self._ensure_mysql_schema()
        else:
            self.driver = 'sqlite'
            print(f"[DatabaseManager] MySQL not reachable on {Config.DB_HOST}:{Config.DB_PORT}.")
            print(f"[DatabaseManager] Using fallback database: {FALLBACK_SQLITE_PATH}")
            self._ensure_sqlite_schema()

    def _try_mysql_connect(self):
    # Connect directly to the existing database.
    # Do not attempt to create a database using the application account.

    if PYMYSQL_AVAILABLE:
        try:
            conn = pymysql.connect(
                host=Config.DB_HOST,
                port=Config.DB_PORT,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                database=Config.DB_NAME,
                charset='utf8mb4',
                connect_timeout=5
            )
            conn.close()
            print("[DatabaseManager] MySQL connection test successful.")
            return True
        except Exception as e:
            print("[DatabaseManager] PyMySQL connection failed:", e)

    if MYSQL_CONNECTOR_AVAILABLE:
        try:
            conn = mysql.connector.connect(
                host=Config.DB_HOST,
                port=Config.DB_PORT,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                database=Config.DB_NAME,
                connection_timeout=5
            )
            conn.close()
            print("[DatabaseManager] MySQL Connector connection test successful.")
            return True
        except Exception as e:
            print("[DatabaseManager] MySQL Connector connection failed:", e)

    return False

    def get_connection(self):
        if self.driver == 'mysql':
            if PYMYSQL_AVAILABLE:
                return pymysql.connect(
                    host=Config.DB_HOST,
                    port=Config.DB_PORT,
                    user=Config.DB_USER,
                    password=Config.DB_PASSWORD,
                    database=Config.DB_NAME,
                    charset='utf8mb4',
                    cursorclass=pymysql.cursors.DictCursor,
                    autocommit=True
                )
            elif MYSQL_CONNECTOR_AVAILABLE:
                return mysql.connector.connect(
                    host=Config.DB_HOST,
                    port=Config.DB_PORT,
                    user=Config.DB_USER,
                    password=Config.DB_PASSWORD,
                    database=Config.DB_NAME,
                    autocommit=True
                )
        else:
            conn = sqlite3.connect(FALLBACK_SQLITE_PATH)
            conn.row_factory = sqlite3.Row
            return conn

    def _ensure_mysql_schema(self):
        try:
            conn = self.get_connection()
            with conn.cursor() as cursor:
                cursor.execute("SHOW TABLES LIKE 'students';")
                res = cursor.fetchone()
                if not res:
                    print("[DatabaseManager] MySQL tables not found. Executing schema.sql...")
                    if SCHEMA_FILE.exists():
                        with open(SCHEMA_FILE, 'r', encoding='utf-8') as f:
                            sql = f.read()
                        # Execute statements
                        for stmt in sql.split(';'):
                            stmt = stmt.strip()
                            if stmt:
                                cursor.execute(stmt)
                    self._seed_default_users()
            conn.close()
        except Exception as e:
            print("[DatabaseManager] Error setting up MySQL schema:", e)

    def _ensure_sqlite_schema(self):
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.executescript('''
        CREATE TABLE IF NOT EXISTS admins (
            admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'admin',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS staff (
            staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            phone TEXT,
            counter_number TEXT NOT NULL DEFAULT 'Counter 1',
            role TEXT NOT NULL DEFAULT 'staff',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS students (
            student_id INTEGER PRIMARY KEY AUTOINCREMENT,
            roll_number TEXT NOT NULL UNIQUE,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT,
            department TEXT NOT NULL,
            semester TEXT NOT NULL DEFAULT 'Semester 4',
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'student',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS documents (
            document_id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
            original_filename TEXT NOT NULL,
            stored_filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size_bytes INTEGER NOT NULL,
            total_pages INTEGER NOT NULL DEFAULT 1,
            mime_type TEXT NOT NULL DEFAULT 'application/pdf',
            uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS print_settings (
            setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
            color_mode TEXT NOT NULL DEFAULT 'bw',
            sides TEXT NOT NULL DEFAULT 'single',
            copies INTEGER NOT NULL DEFAULT 1,
            paper_size TEXT NOT NULL DEFAULT 'A4',
            paper_type TEXT NOT NULL DEFAULT 'standard',
            orientation TEXT NOT NULL DEFAULT 'portrait',
            page_range TEXT NOT NULL DEFAULT 'all',
            binding_type TEXT NOT NULL DEFAULT 'none',
            pages_to_print INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS print_orders (
            order_id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_code TEXT NOT NULL UNIQUE,
            student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
            document_id INTEGER NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
            setting_id INTEGER NOT NULL REFERENCES print_settings(setting_id) ON DELETE CASCADE,
            total_pages_billed INTEGER NOT NULL,
            base_price_per_page REAL NOT NULL DEFAULT 2.0,
            color_surcharge REAL NOT NULL DEFAULT 0.0,
            paper_surcharge REAL NOT NULL DEFAULT 0.0,
            binding_price REAL NOT NULL DEFAULT 0.0,
            total_price REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            rejection_reason TEXT,
            special_instructions TEXT,
            processed_by_staff_id INTEGER REFERENCES staff(staff_id) ON DELETE SET NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS queue (
            queue_id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL UNIQUE REFERENCES print_orders(order_id) ON DELETE CASCADE,
            position INTEGER NOT NULL,
            estimated_wait_minutes INTEGER NOT NULL DEFAULT 5,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS printing_prices (
            price_id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL UNIQUE,
            display_name TEXT NOT NULL,
            unit_price REAL NOT NULL,
            description TEXT,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notifications (
            notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
            recipient_role TEXT NOT NULL,
            recipient_id INTEGER NOT NULL,
            order_id INTEGER REFERENCES print_orders(order_id) ON DELETE SET NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        ''')
        conn.commit()
        conn.close()

        self._seed_default_users()
        self._seed_default_prices()

    def _seed_default_prices(self):
        prices = [
            ('bw_single', 'B&W Single Sided (A4)', 2.00, 'Standard Black and White print per page'),
            ('bw_double', 'B&W Double Sided (A4)', 1.50, 'Discounted per side cost for eco-friendly duplex'),
            ('color_single', 'Color Single Sided (A4)', 8.00, 'High quality laser color print per page'),
            ('color_double', 'Color Double Sided (A4)', 7.00, 'High quality color print on both sides per side'),
            ('a3_multiplier', 'A3 Paper Multiplier', 2.00, 'Multiplier factor applied for A3 larger sheet'),
            ('paper_standard', 'Standard 75gsm Paper', 0.00, 'Standard regular 75gsm bond paper'),
            ('paper_premium', 'Premium 100gsm Paper', 2.00, 'Thick 100gsm smooth bond paper per sheet'),
            ('paper_glossy', 'Glossy Photo / Cardstock', 5.00, '200gsm high gloss cardstock per sheet'),
            ('bind_none', 'No Binding', 0.00, 'Loose printed sheets'),
            ('bind_staple', 'Corner / Side Stapling', 5.00, 'Heavy-duty industrial staples'),
            ('bind_spiral', 'Spiral / Comb Binding', 30.00, 'Plastic spiral binding with transparent PVC front cover'),
            ('bind_hardbound', 'Hard Cover Project Binding', 150.00, 'Gold embossed hardbound thesis cover')
        ]
        for cat, name, cost, desc in prices:
            row = self.query_one("SELECT price_id FROM printing_prices WHERE category = ?", (cat,))
            if not row:
                self.execute(
                    "INSERT INTO printing_prices (category, display_name, unit_price, description) VALUES (?, ?, ?, ?)",
                    (cat, name, cost, desc)
                )

    def _seed_default_users(self):
        # Admin
        admin_pass = generate_password_hash("admin123")
        if not self.query_one("SELECT admin_id FROM admins WHERE email = ?", ("admin@campus.edu",)):
            self.execute(
                "INSERT INTO admins (full_name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
                ("Campus Print Admin", "admin@campus.edu", admin_pass)
            )

        # Staff
        staff_pass = generate_password_hash("staff123")
        if not self.query_one("SELECT staff_id FROM staff WHERE email = ?", ("staff@campus.edu",)):
            self.execute(
                "INSERT INTO staff (full_name, email, password_hash, phone, counter_number, role) VALUES (?, ?, ?, ?, ?, 'staff')",
                ("David Miller", "staff@campus.edu", staff_pass, "+91 9876543210", "Counter 1 (Main Library)")
            )
        if not self.query_one("SELECT staff_id FROM staff WHERE email = ?", ("staff2@campus.edu",)):
            self.execute(
                "INSERT INTO staff (full_name, email, password_hash, phone, counter_number, role) VALUES (?, ?, ?, ?, ?, 'staff')",
                ("Sarah Jenkins", "staff2@campus.edu", staff_pass, "+91 9876543211", "Counter 2 (Engineering Block)")
            )

        # Students
        student_pass = generate_password_hash("student123")
        if not self.query_one("SELECT student_id FROM students WHERE email = ?", ("student@campus.edu",)):
            self.execute(
                "INSERT INTO students (roll_number, full_name, email, phone, department, semester, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?, 'student')",
                ("2024CS101", "Alex Johnson", "student@campus.edu", "+91 9123456780", "Computer Science & Engineering", "Semester 6", student_pass)
            )
        if not self.query_one("SELECT student_id FROM students WHERE email = ?", ("emily@campus.edu",)):
            self.execute(
                "INSERT INTO students (roll_number, full_name, email, phone, department, semester, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?, 'student')",
                ("2024EC204", "Emily Davis", "emily@campus.edu", "+91 9123456781", "Electronics & Communication", "Semester 4", student_pass)
            )

    def _normalize_sql(self, sql):
        # Convert ? placeholders to %s for MySQL if needed
        if self.driver == 'mysql':
            return sql.replace('?', '%s')
        return sql

    def query_all(self, sql, params=()):
        sql = self._normalize_sql(sql)
        conn = self.get_connection()
        try:
            if self.driver == 'mysql':
                with conn.cursor() as cursor:
                    cursor.execute(sql, params)
                    return cursor.fetchall() or []
            else:
                cursor = conn.cursor()
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        finally:
            conn.close()

    def query_one(self, sql, params=()):
        sql = self._normalize_sql(sql)
        conn = self.get_connection()
        try:
            if self.driver == 'mysql':
                with conn.cursor() as cursor:
                    cursor.execute(sql, params)
                    return cursor.fetchone()
            else:
                cursor = conn.cursor()
                cursor.execute(sql, params)
                row = cursor.fetchone()
                return dict(row) if row else None
        finally:
            conn.close()

    def execute(self, sql, params=()):
        sql = self._normalize_sql(sql)
        conn = self.get_connection()
        try:
            if self.driver == 'mysql':
                with conn.cursor() as cursor:
                    cursor.execute(sql, params)
                    last_id = cursor.lastrowid
                    row_count = cursor.rowcount
                    return {"lastrowid": last_id, "rowcount": row_count}
            else:
                cursor = conn.cursor()
                cursor.execute(sql, params)
                conn.commit()
                return {"lastrowid": cursor.lastrowid, "rowcount": cursor.rowcount}
        finally:
            conn.close()

    def recalculate_queue_positions(self):
        """
        Recalculates active queue order, positions (1, 2, 3...)
        and dynamic estimated wait times based on pending pages.
        """
        # Active orders are Pending, Accepted, or Printing
        active_orders = self.query_all("""
            SELECT po.order_id, po.status, ps.pages_to_print, ps.copies, po.created_at
            FROM print_orders po
            JOIN print_settings ps ON po.setting_id = ps.setting_id
            WHERE po.status IN ('Accepted', 'Printing', 'Pending')
            ORDER BY 
                CASE po.status 
                    WHEN 'Printing' THEN 1 
                    WHEN 'Accepted' THEN 2 
                    WHEN 'Pending' THEN 3 
                END ASC,
                po.created_at ASC
        """)

        # Clear existing queue table
        self.execute("DELETE FROM queue;")

        cumulative_wait_minutes = Config.BASE_QUEUE_BUFFER_MINUTES
        for idx, ord_info in enumerate(active_orders, start=1):
            order_id = ord_info['order_id']
            pages = (ord_info.get('pages_to_print') or 1) * (ord_info.get('copies') or 1)
            time_for_order = max(1, round(pages * Config.ESTIMATED_MINUTES_PER_PAGE))
            
            # For the currently printing order, estimated wait is minimal
            est_wait = 1 if ord_info['status'] == 'Printing' else cumulative_wait_minutes

            self.execute("""
                INSERT INTO queue (order_id, position, estimated_wait_minutes)
                VALUES (?, ?, ?)
            """, (order_id, idx, est_wait))

            cumulative_wait_minutes += time_for_order

db_manager = DatabaseManager()
