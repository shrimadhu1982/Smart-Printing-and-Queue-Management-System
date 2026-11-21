from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from database.db import db_manager
from utils.auth import roles_required

admin_bp = Blueprint('admin_bp', __name__)

@admin_bp.route('/dashboard', methods=['GET'])
@roles_required('admin')
def get_admin_dashboard(current_user):
    total_students = db_manager.query_one("SELECT COUNT(*) as count FROM students")['count']
    total_staff = db_manager.query_one("SELECT COUNT(*) as count FROM staff")['count']
    total_orders = db_manager.query_one("SELECT COUNT(*) as count FROM print_orders")['count']
    pending_orders = db_manager.query_one("SELECT COUNT(*) as count FROM print_orders WHERE status IN ('Pending', 'Accepted', 'Printing')")['count']
    completed_orders = db_manager.query_one("SELECT COUNT(*) as count FROM print_orders WHERE status = 'Completed'")['count']
    total_revenue = db_manager.query_one("SELECT SUM(total_price) as sum FROM print_orders WHERE status != 'Cancelled'")['sum'] or 0.0

    # Orders distribution by status
    status_distribution = db_manager.query_all("""
        SELECT status, COUNT(*) as count, SUM(total_price) as revenue
        FROM print_orders
        GROUP BY status
    """)

    # Popular print types
    print_types = db_manager.query_all("""
        SELECT ps.color_mode, ps.sides, ps.paper_size, COUNT(*) as count
        FROM print_orders po
        JOIN print_settings ps ON po.setting_id = ps.setting_id
        GROUP BY ps.color_mode, ps.sides, ps.paper_size
    """)

    # Recent orders
    recent_orders = db_manager.query_all("""
        SELECT po.order_id, po.order_code, po.total_price, po.status, po.created_at,
               s.full_name as student_name, s.department, d.original_filename
        FROM print_orders po
        JOIN students s ON po.student_id = s.student_id
        JOIN documents d ON po.document_id = d.document_id
        ORDER BY po.created_at DESC
        LIMIT 6
    """)

    return jsonify({
        "success": True,
        "metrics": {
            "total_students": total_students,
            "total_staff": total_staff,
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "completed_orders": completed_orders,
            "total_revenue": round(float(total_revenue), 2)
        },
        "status_distribution": status_distribution,
        "print_types": print_types,
        "recent_orders": recent_orders
    }), 200

@admin_bp.route('/users', methods=['GET'])
@roles_required('admin')
def get_students(current_user):
    students = db_manager.query_all("""
        SELECT s.student_id, s.roll_number, s.full_name, s.email, s.phone, s.department, s.semester, s.is_active, s.created_at,
               COUNT(po.order_id) as total_orders,
               COALESCE(SUM(po.total_price), 0.0) as total_spent
        FROM students s
        LEFT JOIN print_orders po ON s.student_id = po.student_id
        GROUP BY s.student_id
        ORDER BY s.created_at DESC
    """)
    return jsonify({"success": True, "users": students}), 200

@admin_bp.route('/users/<int:student_id>/toggle', methods=['PUT'])
@roles_required('admin')
def toggle_student_status(current_user, student_id):
    student = db_manager.query_one("SELECT is_active FROM students WHERE student_id = ?", (student_id,))
    if not student:
        return jsonify({"success": False, "message": "Student not found."}), 404
    
    new_status = 0 if student['is_active'] else 1
    db_manager.execute("UPDATE students SET is_active = ? WHERE student_id = ?", (new_status, student_id))
    return jsonify({
        "success": True, 
        "message": f"Student account {'activated' if new_status else 'deactivated'} successfully.",
        "is_active": bool(new_status)
    }), 200

@admin_bp.route('/staff', methods=['GET'])
@roles_required('admin')
def get_staff_list(current_user):
    staff_list = db_manager.query_all("""
        SELECT s.staff_id, s.full_name, s.email, s.phone, s.counter_number, s.role, s.is_active, s.created_at,
               COUNT(po.order_id) as processed_orders
        FROM staff s
        LEFT JOIN print_orders po ON s.staff_id = po.processed_by_staff_id
        GROUP BY s.staff_id
        ORDER BY s.created_at DESC
    """)
    return jsonify({"success": True, "staff": staff_list}), 200

@admin_bp.route('/staff', methods=['POST'])
@roles_required('admin')
def create_staff_member(current_user):
    data = request.get_json() or {}
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip().lower()
    phone = data.get('phone', '').strip()
    counter_number = data.get('counter_number', 'Counter 1').strip()
    password = data.get('password', 'staff123').strip()

    if not full_name or not email or not password:
        return jsonify({"success": False, "message": "Name, email, and password are required."}), 400

    # Check duplicate email
    if (db_manager.query_one("SELECT email FROM staff WHERE email = ?", (email,)) or
        db_manager.query_one("SELECT email FROM admins WHERE email = ?", (email,)) or
        db_manager.query_one("SELECT email FROM students WHERE email = ?", (email,))):
        return jsonify({"success": False, "message": "Email is already in use by another user."}), 409

    hashed_pw = generate_password_hash(password)
    res = db_manager.execute(
        """
        INSERT INTO staff (full_name, email, password_hash, phone, counter_number, role, is_active)
        VALUES (?, ?, ?, ?, ?, 'staff', 1)
        """,
        (full_name, email, hashed_pw, phone, counter_number)
    )
    return jsonify({"success": True, "message": "Staff member created successfully.", "staff_id": res['lastrowid']}), 201

@admin_bp.route('/staff/<int:staff_id>', methods=['DELETE'])
@roles_required('admin')
def delete_staff_member(current_user, staff_id):
    staff = db_manager.query_one("SELECT * FROM staff WHERE staff_id = ?", (staff_id,))
    if not staff:
        return jsonify({"success": False, "message": "Staff member not found."}), 404

    db_manager.execute("DELETE FROM staff WHERE staff_id = ?", (staff_id,))
    return jsonify({"success": True, "message": "Staff member removed successfully."}), 200

@admin_bp.route('/pricing', methods=['GET'])
def get_pricing_list():
    """
    Public / Admin endpoint to fetch current system pricing table
    """
    prices = db_manager.query_all("SELECT * FROM printing_prices ORDER BY price_id ASC")
    return jsonify({"success": True, "pricing": prices}), 200

@admin_bp.route('/pricing', methods=['PUT'])
@roles_required('admin')
def update_pricing_table(current_user):
    data = request.get_json() or {}
    prices_list = data.get('prices', [])

    if not prices_list or not isinstance(prices_list, list):
        return jsonify({"success": False, "message": "A list of pricing items is required."}), 400

    for item in prices_list:
        category = item.get('category')
        unit_price = item.get('unit_price')
        if category and unit_price is not None:
            try:
                price_val = float(unit_price)
                db_manager.execute(
                    "UPDATE printing_prices SET unit_price = ? WHERE category = ?",
                    (price_val, category)
                )
            except ValueError:
                pass

    return jsonify({"success": True, "message": "Pricing rules updated successfully!"}), 200

@admin_bp.route('/orders', methods=['GET'])
@roles_required('admin')
def get_all_orders_admin(current_user):
    orders = db_manager.query_all("""
        SELECT po.*, 
               d.original_filename, d.total_pages as doc_pages, d.file_size_bytes,
               ps.color_mode, ps.sides, ps.copies, ps.paper_size, ps.paper_type, ps.binding_type, ps.page_range, ps.pages_to_print,
               s.full_name as student_name, s.roll_number, s.email as student_email, s.department,
               st.full_name as staff_name, st.counter_number,
               q.position as queue_position
        FROM print_orders po
        JOIN documents d ON po.document_id = d.document_id
        JOIN print_settings ps ON po.setting_id = ps.setting_id
        JOIN students s ON po.student_id = s.student_id
        LEFT JOIN staff st ON po.processed_by_staff_id = st.staff_id
        LEFT JOIN queue q ON po.order_id = q.order_id
        ORDER BY po.created_at DESC
    """)
    return jsonify({"success": True, "orders": orders}), 200

@admin_bp.route('/reports', methods=['GET'])
@roles_required('admin')
def get_system_reports(current_user):
    # Orders by department
    dept_stats = db_manager.query_all("""
        SELECT s.department, COUNT(po.order_id) as order_count, SUM(po.total_price) as revenue
        FROM students s
        JOIN print_orders po ON s.student_id = po.student_id
        GROUP BY s.department
        ORDER BY order_count DESC
    """)

    # Color vs BW breakdown
    color_stats = db_manager.query_all("""
        SELECT ps.color_mode, COUNT(po.order_id) as total_orders, SUM(ps.pages_to_print * ps.copies) as total_pages, SUM(po.total_price) as total_revenue
        FROM print_orders po
        JOIN print_settings ps ON po.setting_id = ps.setting_id
        GROUP BY ps.color_mode
    """)

    # Paper size breakdown
    paper_stats = db_manager.query_all("""
        SELECT ps.paper_size, COUNT(po.order_id) as count
        FROM print_orders po
        JOIN print_settings ps ON po.setting_id = ps.setting_id
        GROUP BY ps.paper_size
    """)

    return jsonify({
        "success": True,
        "department_stats": dept_stats,
        "color_stats": color_stats,
        "paper_stats": paper_stats
    }), 200
