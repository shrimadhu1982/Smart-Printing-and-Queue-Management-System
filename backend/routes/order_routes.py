import time
import random
from flask import Blueprint, request, jsonify
from database.db import db_manager
from utils.auth import token_required, roles_required
from utils.pricing import compute_order_cost

order_bp = Blueprint('order_bp', __name__)

def generate_order_code():
    timestamp = int(time.time()) % 100000
    rand = random.randint(100, 999)
    return f"ORD-{timestamp}{rand}"

@order_bp.route('/calculate-cost', methods=['POST'])
@token_required
def calculate_quote(current_user):
    """
    Returns live dynamic price quote based on user preferences and document
    """
    data = request.get_json() or {}
    doc_id = data.get('document_id')
    settings = data.get('settings', {})

    if not doc_id:
        return jsonify({"success": False, "message": "Document ID is required."}), 400

    doc = db_manager.query_one("SELECT total_pages FROM documents WHERE document_id = ?", (doc_id,))
    if not doc:
        return jsonify({"success": False, "message": "Document not found."}), 404

    breakdown = compute_order_cost(settings, doc['total_pages'])
    return jsonify({
        "success": True,
        "pricing_breakdown": breakdown
    }), 200

@order_bp.route('', methods=['POST'])
@token_required
def create_order(current_user):
    data = request.get_json() or {}
    document_id = data.get('document_id')
    settings_data = data.get('settings', {})
    special_instructions = data.get('special_instructions', '').strip()

    if not document_id:
        return jsonify({"success": False, "message": "Document is required to place an order."}), 400

    # Verify document belongs to student
    doc = db_manager.query_one("SELECT * FROM documents WHERE document_id = ?", (document_id,))
    if not doc:
        return jsonify({"success": False, "message": "Selected document not found."}), 404

    if current_user['role'] == 'student' and doc['student_id'] != current_user['user_id']:
        return jsonify({"success": False, "message": "Unauthorized document."}), 403

    # Backend cost calculation (do not trust client price)
    breakdown = compute_order_cost(settings_data, doc['total_pages'])

    # 1. Insert into print_settings
    res_set = db_manager.execute(
        """
        INSERT INTO print_settings 
        (color_mode, sides, copies, paper_size, paper_type, orientation, page_range, binding_type, pages_to_print)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            breakdown['color_mode'],
            breakdown['sides'],
            breakdown['copies'],
            breakdown['paper_size'],
            breakdown['paper_type'],
            settings_data.get('orientation', 'portrait'),
            settings_data.get('page_range', 'all'),
            breakdown['binding_type'],
            breakdown['pages_to_print']
        )
    )
    setting_id = res_set['lastrowid']

    # 2. Insert into print_orders
    order_code = generate_order_code()
    res_order = db_manager.execute(
        """
        INSERT INTO print_orders
        (order_code, student_id, document_id, setting_id, total_pages_billed, 
         base_price_per_page, color_surcharge, paper_surcharge, binding_price, 
         total_price, status, special_instructions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
        """,
        (
            order_code,
            current_user['user_id'],
            document_id,
            setting_id,
            breakdown['total_pages_billed'],
            breakdown['base_price_per_page'],
            breakdown['color_surcharge'],
            breakdown['paper_surcharge'],
            breakdown['binding_price'],
            breakdown['total_price'],
            special_instructions
        )
    )
    order_id = res_order['lastrowid']

    # 3. Recalculate queue positions
    db_manager.recalculate_queue_positions()

    # 4. Fetch the assigned queue entry
    q_entry = db_manager.query_one("SELECT position, estimated_wait_minutes FROM queue WHERE order_id = ?", (order_id,))

    # 5. Create notification for student
    db_manager.execute(
        """
        INSERT INTO notifications (recipient_role, recipient_id, order_id, title, message)
        VALUES ('student', ?, ?, 'Order Placed Successfully', ?)
        """,
        (
            current_user['user_id'],
            order_id,
            f"Your order {order_code} for '{doc['original_filename']}' was placed. Queue position: #{q_entry.get('position', 1) if q_entry else 1}."
        )
    )

    return jsonify({
        "success": True,
        "message": "Order placed successfully!",
        "order": {
            "order_id": order_id,
            "order_code": order_code,
            "total_price": breakdown['total_price'],
            "status": "Pending",
            "queue_position": q_entry.get('position', 1) if q_entry else 1,
            "estimated_wait_minutes": q_entry.get('estimated_wait_minutes', 5) if q_entry else 5,
            "breakdown": breakdown
        }
    }), 201

@order_bp.route('', methods=['GET'])
@token_required
def get_orders(current_user):
    status_filter = request.args.get('status')
    search = request.args.get('search', '').strip()

    sql = """
        SELECT po.*, d.original_filename, d.total_pages as doc_pages, d.file_size_bytes,
               ps.color_mode, ps.sides, ps.copies, ps.paper_size, ps.paper_type, ps.orientation, ps.binding_type, ps.page_range,
               s.full_name as student_name, s.roll_number, s.email as student_email, s.department,
               q.position as queue_position, q.estimated_wait_minutes
        FROM print_orders po
        JOIN documents d ON po.document_id = d.document_id
        JOIN print_settings ps ON po.setting_id = ps.setting_id
        JOIN students s ON po.student_id = s.student_id
        LEFT JOIN queue q ON po.order_id = q.order_id
        WHERE 1=1
    """
    params = []

    # If student, show only their orders
    if current_user['role'] == 'student':
        sql += " AND po.student_id = ?"
        params.append(current_user['user_id'])

    if status_filter and status_filter.lower() != 'all':
        sql += " AND po.status = ?"
        params.append(status_filter)

    if search:
        sql += " AND (po.order_code LIKE ? OR d.original_filename LIKE ? OR s.full_name LIKE ? OR s.roll_number LIKE ?)"
        like_term = f"%{search}%"
        params.extend([like_term, like_term, like_term, like_term])

    sql += " ORDER BY po.created_at DESC"
    orders = db_manager.query_all(sql, params)

    return jsonify({
        "success": True,
        "orders": orders,
        "count": len(orders)
    }), 200

@order_bp.route('/<int:order_id>', methods=['GET'])
@token_required
def get_order_by_id(current_user, order_id):
    order = db_manager.query_one("""
        SELECT po.*, d.original_filename, d.total_pages as doc_pages, d.file_size_bytes, d.file_path,
               ps.color_mode, ps.sides, ps.copies, ps.paper_size, ps.paper_type, ps.orientation, ps.binding_type, ps.page_range, ps.pages_to_print,
               s.full_name as student_name, s.roll_number, s.email as student_email, s.department, s.phone as student_phone,
               st.full_name as staff_name, st.counter_number,
               q.position as queue_position, q.estimated_wait_minutes
        FROM print_orders po
        JOIN documents d ON po.document_id = d.document_id
        JOIN print_settings ps ON po.setting_id = ps.setting_id
        JOIN students s ON po.student_id = s.student_id
        LEFT JOIN staff st ON po.processed_by_staff_id = st.staff_id
        LEFT JOIN queue q ON po.order_id = q.order_id
        WHERE po.order_id = ?
    """, (order_id,))

    if not order:
        return jsonify({"success": False, "message": "Order not found."}), 404

    if current_user['role'] == 'student' and order['student_id'] != current_user['user_id']:
        return jsonify({"success": False, "message": "Unauthorized access to order."}), 403

    return jsonify({
        "success": True,
        "order": order
    }), 200

@order_bp.route('/queue', methods=['GET'])
def get_public_queue():
    """
    Returns public/campus live queue status board
    """
    queue_orders = db_manager.query_all("""
        SELECT q.queue_id, q.position, q.estimated_wait_minutes,
               po.order_id, po.order_code, po.status, po.created_at, po.total_price,
               d.original_filename, ps.copies, ps.color_mode, ps.sides, ps.paper_size,
               s.full_name as student_name, s.department, s.roll_number
        FROM queue q
        JOIN print_orders po ON q.order_id = po.order_id
        JOIN documents d ON po.document_id = d.document_id
        JOIN print_settings ps ON po.setting_id = ps.setting_id
        JOIN students s ON po.student_id = s.student_id
        ORDER BY q.position ASC
    """)

    return jsonify({
        "success": True,
        "queue": queue_orders,
        "total_in_queue": len(queue_orders)
    }), 200

@order_bp.route('/<int:order_id>/status', methods=['PUT'])
@token_required
def update_order_status(current_user, order_id):
    # Only staff and admin can change status to Accepted, Printing, Completed, Rejected
    # Student can only Cancel if Pending
    order = db_manager.query_one("SELECT * FROM print_orders WHERE order_id = ?", (order_id,))
    if not order:
        return jsonify({"success": False, "message": "Order not found."}), 404

    data = request.get_json() or {}
    new_status = data.get('status')
    rejection_reason = data.get('rejection_reason')

    valid_statuses = ['Pending', 'Accepted', 'Printing', 'Completed', 'Rejected', 'Cancelled']
    if new_status not in valid_statuses:
        return jsonify({"success": False, "message": f"Invalid status: {new_status}"}), 400

    # Authorization logic
    if current_user['role'] == 'student':
        if order['student_id'] != current_user['user_id']:
            return jsonify({"success": False, "message": "Unauthorized."}), 403
        if new_status != 'Cancelled':
            return jsonify({"success": False, "message": "Students can only cancel orders."}), 403
        if order['status'] != 'Pending':
            return jsonify({"success": False, "message": "Only pending orders can be cancelled."}), 400

    # Staff or Admin processing
    staff_id = current_user['user_id'] if current_user['role'] == 'staff' else order.get('processed_by_staff_id')

    if new_status == 'Completed':
        db_manager.execute(
            """
            UPDATE print_orders 
            SET status = ?, processed_by_staff_id = ?, completed_at = CURRENT_TIMESTAMP, rejection_reason = NULL
            WHERE order_id = ?
            """,
            (new_status, staff_id, order_id)
        )
    elif new_status == 'Rejected':
        db_manager.execute(
            """
            UPDATE print_orders 
            SET status = ?, processed_by_staff_id = ?, rejection_reason = ?
            WHERE order_id = ?
            """,
            (new_status, staff_id, rejection_reason or 'Order rejected by print staff', order_id)
        )
    else:
        db_manager.execute(
            """
            UPDATE print_orders 
            SET status = ?, processed_by_staff_id = ?
            WHERE order_id = ?
            """,
            (new_status, staff_id, order_id)
        )

    # Recalculate queue positions
    db_manager.recalculate_queue_positions()

    # Create notification for student
    notif_msg = f"Your order {order['order_code']} status changed to '{new_status}'."
    if new_status == 'Completed':
        notif_msg = f"🎉 Your print order {order['order_code']} is ready! Please collect it from the counter."
    elif new_status == 'Rejected':
        notif_msg = f"❌ Your order {order['order_code']} was rejected. Reason: {rejection_reason or 'Unspecified'}."

    db_manager.execute(
        """
        INSERT INTO notifications (recipient_role, recipient_id, order_id, title, message)
        VALUES ('student', ?, ?, ?, ?)
        """,
        (order['student_id'], order_id, f"Order {new_status}", notif_msg)
    )

    return jsonify({
        "success": True,
        "message": f"Order status updated to {new_status} successfully.",
        "status": new_status
    }), 200

@order_bp.route('/<int:order_id>', methods=['DELETE'])
@token_required
def cancel_or_delete_order(current_user, order_id):
    order = db_manager.query_one("SELECT * FROM print_orders WHERE order_id = ?", (order_id,))
    if not order:
        return jsonify({"success": False, "message": "Order not found."}), 404

    if current_user['role'] == 'student':
        if order['student_id'] != current_user['user_id']:
            return jsonify({"success": False, "message": "Unauthorized."}), 403
        if order['status'] != 'Pending':
            return jsonify({"success": False, "message": "You can only cancel pending orders."}), 400

        db_manager.execute("UPDATE print_orders SET status = 'Cancelled' WHERE order_id = ?", (order_id,))
        db_manager.recalculate_queue_positions()
        return jsonify({"success": True, "message": "Order cancelled successfully."}), 200

    # Admins can permanently delete or cancel
    if current_user['role'] == 'admin':
        db_manager.execute("DELETE FROM print_orders WHERE order_id = ?", (order_id,))
        db_manager.recalculate_queue_positions()
        return jsonify({"success": True, "message": "Order removed from system."}), 200

    return jsonify({"success": False, "message": "Unauthorized."}), 403
