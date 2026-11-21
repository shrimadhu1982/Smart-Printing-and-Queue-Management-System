from flask import Blueprint, request, jsonify
from database.db import db_manager
from utils.auth import roles_required

staff_bp = Blueprint('staff_bp', __name__)

@staff_bp.route('/dashboard', methods=['GET'])
@roles_required('staff', 'admin')
def get_staff_dashboard(current_user):
    # Orders pending acceptance
    pending_count = db_manager.query_one("SELECT COUNT(*) as count FROM print_orders WHERE status = 'Pending'")['count']
    # Orders accepted & in queue
    accepted_count = db_manager.query_one("SELECT COUNT(*) as count FROM print_orders WHERE status = 'Accepted'")['count']
    # Orders currently printing
    printing_count = db_manager.query_one("SELECT COUNT(*) as count FROM print_orders WHERE status = 'Printing'")['count']
    # Completed orders
    completed_count = db_manager.query_one("SELECT COUNT(*) as count FROM print_orders WHERE status = 'Completed'")['count']
    # Total queue length
    queue_len = db_manager.query_one("SELECT COUNT(*) as count FROM queue")['count']

    # Total pages queued
    pages_queued = db_manager.query_one("""
        SELECT SUM(ps.pages_to_print * ps.copies) as total_pages
        FROM print_orders po
        JOIN print_settings ps ON po.setting_id = ps.setting_id
        WHERE po.status IN ('Pending', 'Accepted', 'Printing')
    """)['total_pages'] or 0

    return jsonify({
        "success": True,
        "staff": current_user,
        "stats": {
            "pending_count": pending_count,
            "accepted_count": accepted_count,
            "printing_count": printing_count,
            "completed_count": completed_count,
            "queue_length": queue_len,
            "pages_queued": pages_queued
        }
    }), 200

@staff_bp.route('/orders', methods=['GET'])
@roles_required('staff', 'admin')
def get_staff_orders(current_user):
    status_filter = request.args.get('status')
    search = request.args.get('search', '').strip()

    sql = """
        SELECT po.*, 
               d.original_filename, d.stored_filename, d.file_path, d.file_size_bytes, d.total_pages as doc_pages,
               ps.color_mode, ps.sides, ps.copies, ps.paper_size, ps.paper_type, ps.orientation, ps.binding_type, ps.page_range, ps.pages_to_print,
               s.full_name as student_name, s.roll_number, s.email as student_email, s.phone as student_phone, s.department,
               st.full_name as staff_name, st.counter_number,
               q.position as queue_position, q.estimated_wait_minutes
        FROM print_orders po
        JOIN documents d ON po.document_id = d.document_id
        JOIN print_settings ps ON po.setting_id = ps.setting_id
        JOIN students s ON po.student_id = s.student_id
        LEFT JOIN staff st ON po.processed_by_staff_id = st.staff_id
        LEFT JOIN queue q ON po.order_id = q.order_id
        WHERE 1=1
    """
    params = []

    if status_filter and status_filter.lower() != 'all':
        sql += " AND po.status = ?"
        params.append(status_filter)

    if search:
        sql += " AND (po.order_code LIKE ? OR d.original_filename LIKE ? OR s.full_name LIKE ? OR s.roll_number LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term])

    # Default sort: Pending & Printing first, then newest
    sql += """
        ORDER BY 
            CASE po.status 
                WHEN 'Printing' THEN 1 
                WHEN 'Accepted' THEN 2 
                WHEN 'Pending' THEN 3 
                WHEN 'Completed' THEN 4
                ELSE 5
            END ASC,
            po.created_at ASC
    """
    orders = db_manager.query_all(sql, params)

    return jsonify({
        "success": True,
        "orders": orders,
        "count": len(orders)
    }), 200
