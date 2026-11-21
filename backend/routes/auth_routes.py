from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from database.db import db_manager
from utils.auth import generate_token, token_required

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip().lower()
    roll_number = data.get('roll_number', '').strip().upper()
    department = data.get('department', '').strip()
    semester = data.get('semester', 'Semester 4').strip()
    phone = data.get('phone', '').strip()
    password = data.get('password', '').strip()

    # Validations
    if not full_name or not email or not roll_number or not department or not password:
        return jsonify({"success": False, "message": "Please fill in all required fields (Name, Email, Roll Number, Department, Password)."}), 400

    if len(password) < 6:
        return jsonify({"success": False, "message": "Password must be at least 6 characters long."}), 400

    if '@' not in email or '.' not in email:
        return jsonify({"success": False, "message": "Please enter a valid email address."}), 400

    # Check existing email in students, staff, admins
    if (db_manager.query_one("SELECT student_id FROM students WHERE email = ?", (email,)) or
        db_manager.query_one("SELECT staff_id FROM staff WHERE email = ?", (email,)) or
        db_manager.query_one("SELECT admin_id FROM admins WHERE email = ?", (email,))):
        return jsonify({"success": False, "message": "An account with this email address already exists."}), 409

    # Check roll number
    if db_manager.query_one("SELECT student_id FROM students WHERE roll_number = ?", (roll_number,)):
        return jsonify({"success": False, "message": "A student with this Roll / Student ID already exists."}), 409

    hashed_pw = generate_password_hash(password)
    result = db_manager.execute(
        """
        INSERT INTO students (roll_number, full_name, email, phone, department, semester, password_hash, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'student')
        """,
        (roll_number, full_name, email, phone, department, semester, hashed_pw)
    )

    new_id = result['lastrowid']
    token_payload = {
        "user_id": new_id,
        "email": email,
        "full_name": full_name,
        "role": "student",
        "roll_number": roll_number,
        "department": department
    }
    token = generate_token(token_payload)

    return jsonify({
        "success": True,
        "message": "Student registration successful! Welcome to SmartPrint.",
        "token": token,
        "user": token_payload
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()
    role_preference = data.get('role', None) # optional: 'student', 'staff', 'admin'

    if not email or not password:
        return jsonify({"success": False, "message": "Please enter both email and password."}), 400

    user_record = None
    role = None

    # Check Admin table
    if not role_preference or role_preference == 'admin':
        admin = db_manager.query_one("SELECT * FROM admins WHERE email = ?", (email,))
        if admin and check_password_hash(admin['password_hash'], password):
            user_record = admin
            role = 'admin'

    # Check Staff table
    if not user_record and (not role_preference or role_preference == 'staff'):
        staff = db_manager.query_one("SELECT * FROM staff WHERE email = ?", (email,))
        if staff and check_password_hash(staff['password_hash'], password):
            if not staff.get('is_active', True):
                return jsonify({"success": False, "message": "Your staff account has been deactivated. Please contact the administrator."}), 403
            user_record = staff
            role = 'staff'

    # Check Student table
    if not user_record and (not role_preference or role_preference == 'student'):
        student = db_manager.query_one("SELECT * FROM students WHERE email = ?", (email,))
        if student and check_password_hash(student['password_hash'], password):
            if not student.get('is_active', True):
                return jsonify({"success": False, "message": "Your student account is deactivated. Please contact campus print admin."}), 403
            user_record = student
            role = 'student'

    if not user_record:
        return jsonify({"success": False, "message": "Invalid email or password. Please check your credentials."}), 401

    user_id = user_record.get('admin_id') or user_record.get('staff_id') or user_record.get('student_id')
    token_payload = {
        "user_id": user_id,
        "email": user_record['email'],
        "full_name": user_record['full_name'],
        "role": role,
        "phone": user_record.get('phone', ''),
        "department": user_record.get('department', ''),
        "roll_number": user_record.get('roll_number', ''),
        "counter_number": user_record.get('counter_number', '')
    }
    token = generate_token(token_payload)

    return jsonify({
        "success": True,
        "message": f"Welcome back, {user_record['full_name']}!",
        "token": token,
        "user": token_payload
    }), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({"success": True, "message": "Successfully logged out."}), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_me(current_user):
    return jsonify({
        "success": True,
        "user": current_user
    }), 200
