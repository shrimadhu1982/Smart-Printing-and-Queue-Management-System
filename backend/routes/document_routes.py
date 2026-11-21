import os
import uuid
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from pypdf import PdfReader
from config import Config
from database.db import db_manager
from utils.auth import token_required

document_bp = Blueprint('document_bp', __name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

@document_bp.route('/upload', methods=['POST'])
@token_required
def upload_document(current_user):
    # Only students (or admins) upload for orders
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "No file part in the request."}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "message": "No file selected."}), 400

    if not allowed_file(file.filename):
        return jsonify({"success": False, "message": "Invalid file type. Only PDF documents are allowed."}), 400

    original_filename = secure_filename(file.filename)
    if not original_filename:
        original_filename = "document.pdf"

    # Generate unique stored filename
    unique_prefix = uuid.uuid4().hex[:12]
    stored_filename = f"{unique_prefix}_{original_filename}"
    file_path = os.path.join(Config.UPLOAD_FOLDER, stored_filename)

    try:
        file.save(file_path)
        file_size = os.path.getsize(file_path)

        # Validate PDF and extract total page count using pypdf
        try:
            reader = PdfReader(file_path)
            total_pages = len(reader.pages)
            if total_pages < 1:
                total_pages = 1
        except Exception as e:
            # If reading pages fails, fallback to 1 page
            total_pages = 1

        student_id = current_user['user_id']
        result = db_manager.execute(
            """
            INSERT INTO documents (student_id, original_filename, stored_filename, file_path, file_size_bytes, total_pages, mime_type)
            VALUES (?, ?, ?, ?, ?, ?, 'application/pdf')
            """,
            (student_id, original_filename, stored_filename, file_path, file_size, total_pages)
        )

        doc_id = result['lastrowid']

        return jsonify({
            "success": True,
            "message": "File uploaded and verified successfully.",
            "document": {
                "document_id": doc_id,
                "original_filename": original_filename,
                "stored_filename": stored_filename,
                "file_size_bytes": file_size,
                "file_size_formatted": f"{round(file_size / (1024 * 1024), 2)} MB" if file_size > 1024*1024 else f"{round(file_size / 1024, 1)} KB",
                "total_pages": total_pages,
                "download_url": f"/api/documents/{doc_id}/download"
            }
        }), 201

    except Exception as e:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
        return jsonify({"success": False, "message": f"Failed to upload document: {str(e)}"}), 500

@document_bp.route('/<int:doc_id>/download', methods=['GET'])
@token_required
def download_document(current_user, doc_id):
    doc = db_manager.query_one("SELECT * FROM documents WHERE document_id = ?", (doc_id,))
    if not doc:
        return jsonify({"success": False, "message": "Document not found."}), 404

    # Security check: student can only download their own document
    if current_user['role'] == 'student' and doc['student_id'] != current_user['user_id']:
        return jsonify({"success": False, "message": "Unauthorized access to this document."}), 403

    file_path = doc['file_path']
    if not os.path.exists(file_path):
        return jsonify({"success": False, "message": "Document file is missing from server storage."}), 404

    # Inline disposition allows browser PDF preview
    inline = request.args.get('inline', 'true').lower() == 'true'
    return send_file(
        file_path,
        as_attachment=not inline,
        download_name=doc['original_filename'],
        mimetype=doc.get('mime_type', 'application/pdf')
    )

@document_bp.route('/<int:doc_id>', methods=['DELETE'])
@token_required
def delete_document(current_user, doc_id):
    doc = db_manager.query_one("SELECT * FROM documents WHERE document_id = ?", (doc_id,))
    if not doc:
        return jsonify({"success": False, "message": "Document not found."}), 404

    if current_user['role'] == 'student' and doc['student_id'] != current_user['user_id']:
        return jsonify({"success": False, "message": "Unauthorized."}), 403

    # Check if document has associated orders
    has_orders = db_manager.query_one("SELECT order_id FROM print_orders WHERE document_id = ?", (doc_id,))
    if has_orders:
        return jsonify({"success": False, "message": "Cannot delete document with active or recorded printing orders."}), 400

    try:
        if os.path.exists(doc['file_path']):
            os.remove(doc['file_path'])
    except Exception:
        pass

    db_manager.execute("DELETE FROM documents WHERE document_id = ?", (doc_id,))
    return jsonify({"success": True, "message": "Document deleted successfully."}), 200
