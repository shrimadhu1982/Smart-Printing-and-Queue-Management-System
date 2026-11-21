import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database.db import db_manager

from routes.auth_routes import auth_bp
from routes.student_routes import student_bp
from routes.document_routes import document_bp
from routes.order_routes import order_bp
from routes.staff_routes import staff_bp
from routes.admin_routes import admin_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(student_bp, url_prefix='/api/student')
    app.register_blueprint(document_bp, url_prefix='/api/documents')
    app.register_blueprint(order_bp, url_prefix='/api/orders')
    app.register_blueprint(staff_bp, url_prefix='/api/staff')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    # Health and Info endpoint
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({
            "status": "healthy",
            "service": "Smart Printing & Queue Management System API",
            "database": {
                "driver": db_manager.driver,
                "mysql_host": Config.DB_HOST,
                "mysql_db": Config.DB_NAME
            },
            "version": "1.0.0"
        }), 200

    # Error Handlers
    @app.errorhandler(413)
    def file_too_large(e):
        return jsonify({
            "success": False,
            "message": f"File is too large. Maximum allowed size is {Config.MAX_CONTENT_LENGTH // (1024*1024)} MB."
        }), 413

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "message": "API endpoint not found."}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"success": False, "message": "An internal server error occurred."}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    print("====================================================================")
    print("  🚀 Smart Printing & Queue Management System Backend Starting")
    print(f"  📍 Host: http://127.0.0.1:{Config.PORT}")
    print(f"  🗄️ Database Driver: {db_manager.driver.upper()}")
    print("====================================================================")
    app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)
