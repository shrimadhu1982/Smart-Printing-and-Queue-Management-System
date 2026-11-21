from flask import Blueprint, request, jsonify
from database.db import db_manager
from utils.auth import token_required, roles_required

student_bp = Blueprint('student_bp', __name__)

@student_bp.route('/dashboard', methods=['GET'])
@roles_required('student')
def get_student_dashboard(current_user):
    student_id = current_user['user_id']

    student = db_manager.query_one("SELECT * FROM students WHERE student_id = ?", (student_id,))
    if not student:
        return jsonify({"success": False, "message": "Student profile not found."}), 404

    # Order counts
    total_orders = db_manager.query_one("SELECT COUNT(*) as count FROM print_orders WHERE student_id = ?", (student_id,))['count']
    pending_orders = db_manager.query_one("SELECT COUNT(*) as count FROM print_orders WHERE student_id = ? AND status IN ('Pending', 'Accepted', 'Printing')", (student_id,))['count']
    completed_orders = db_manager.query_one("SELECT COUNT(*) as count FROM print_orders WHERE student_id = ? AND status = 'Completed'", (student_id,))['count']
    total_spent = db_manager.query_one("SELECT SUM(total_price) as sum FROM print_orders WHERE student_id = ? AND status != 'Cancelled'", (student_id,))['sum'] or 0.0

    # Current queue position for active order
    active_order = db_manager.query_one("""
        SELECT po.*, d.original_filename, ps.copies, ps.color_mode, ps.sides, ps.paper_size,
               q.position as queue_position, q.estimated_wait_minutes
        FROM print_orders po
        JOIN documents d ON po.document_id = d.document_id
        JOIN print_settings ps ON po.setting_id = ps.setting_id
        LEFT JOIN queue q ON po.order_id = q.order_id
        WHERE po.student_id = ? AND po.status IN ('Pending', 'Accepted', 'Printing')
        ORDER BY po.created_at ASC
        LIMIT 1
    """, (student_id,))

    # Recent 5 orders
    recent_orders = db_manager.query_all("""
        SELECT po.order_id, po.order_code, po.total_price, po.status, po.created_at,
               d.original_filename, ps.color_mode, ps.sides, ps.copies, ps.paper_size,
               q.position as queue_position, q.estimated_wait_minutes
        FROM print_orders po
        JOIN documents d ON po.document_id = d.document_id
        JOIN print_settings ps ON po.setting_id = ps.setting_id
        LEFT JOIN queue q ON po.order_id = q.order_id
        WHERE po.student_id = ?
        ORDER BY po.created_at DESC
        LIMIT 5
    """, (student_id,))

    # Notifications
    unread_notifs = db_manager.query_one("SELECT COUNT(*) as count FROM notifications WHERE recipient_role = 'student' AND recipient_id = ? AND is_read = 0", (student_id,))['count']

    return jsonify({
        "success": True,
        "student": {
            "student_id": student['student_id'],
            "full_name": student['full_name'],
            "email": student['email'],
            "roll_number": student['roll_number'],
            "department": student['department'],
            "semester": student['semester'],
            "phone": student.get('phone', '')
        },
        "stats": {
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "completed_orders": completed_orders,
            "total_spent": round(float(total_spent), 2),
            "current_queue_position": active_order.get('queue_position') if active_order else None,
            "unread_notifications": unread_notifs
        },
        "active_order": active_order,
        "recent_orders": recent_orders
    }), 200

@student_bp.route('/profile', methods=['GET'])
@roles_required('student')
def get_student_profile(current_user):
    student = db_manager.query_one("SELECT student_id, roll_number, full_name, email, phone, department, semester, created_at FROM students WHERE student_id = ?", (current_user['user_id'],))
    if not student:
        return jsonify({"success": False, "message": "Student not found."}), 404
    return jsonify({"success": True, "profile": student}), 200

@student_bp.route('/profile', methods=['PUT'])
@roles_required('student')
def update_student_profile(current_user):
    data = request.get_json() or {}
    phone = data.get('phone', '').strip()
    department = data.get('department', '').strip()
    semester = data.get('semester', '').strip()

    db_manager.execute(
        "UPDATE students SET phone = ?, department = ?, semester = ? WHERE student_id = ?",
        (phone, department, semester, current_user['user_id'])
    )
    return jsonify({"success": True, "message": "Profile updated successfully."}), 200

@student_bp.route('/notifications', methods=['GET'])
@token_required
def get_notifications(current_user):
    notifs = db_manager.query_all(
        "SELECT * FROM notifications WHERE recipient_role = ? AND recipient_id = ? ORDER BY created_at DESC LIMIT 20",
        (current_user['role'], current_user['user_id'])
    )
    return jsonify({"success": True, "notifications": notifs}), 200

@student_bp.route('/notifications/<int:notif_id>/read', methods=['PUT'])
@token_required
def mark_notification_read(current_user, notif_id):
    db_manager.execute("UPDATE notifications SET is_read = 1 WHERE notification_id = ?", (notif_id,))
    return jsonify({"success": True}), 200
