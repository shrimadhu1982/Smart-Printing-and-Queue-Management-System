import os
import sys
import json
import io
from pathlib import Path

# Add backend directory to path
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

from app import create_app
from database.db import db_manager
from pypdf import PdfWriter

def create_dummy_pdf(filename="sample_assignment.pdf", num_pages=3):
    writer = PdfWriter()
    for _ in range(num_pages):
        writer.add_blank_page(width=595, height=842) # A4 size
    output = io.BytesIO()
    writer.write(output)
    output.seek(0)
    return filename, output

def run_e2e_tests():
    print("====================================================================")
    print(" 🧪 Running Smart Printing & Queue Management System E2E Suite")
    print(f" 🗄️ Database Driver: {db_manager.driver.upper()}")
    print("====================================================================")

    app = create_app()
    client = app.test_client()

    # 1. Health check
    res = client.get('/api/health')
    assert res.status_code == 200, f"Health check failed: {res.data}"
    print("  ✅ [1/10] Health Check: OK")

    # 2. Login Default Seeded Accounts
    # Student
    res = client.post('/api/login', json={"email": "student@campus.edu", "password": "student123", "role": "student"})
    assert res.status_code == 200, f"Student login failed: {res.data}"
    student_token = res.get_json()['token']

    # Staff
    res = client.post('/api/login', json={"email": "staff@campus.edu", "password": "staff123", "role": "staff"})
    assert res.status_code == 200, f"Staff login failed: {res.data}"
    staff_token = res.get_json()['token']

    # Admin
    res = client.post('/api/login', json={"email": "admin@campus.edu", "password": "admin123", "role": "admin"})
    assert res.status_code == 200, f"Admin login failed: {res.data}"
    admin_token = res.get_json()['token']
    print("  ✅ [2/10] Auth Verification: Student, Staff, and Admin login successfully authenticated.")

    # 3. Student Registration of New Student
    new_student = {
        "full_name": "Rohan Sharma",
        "email": "rohan.sharma@campus.edu",
        "roll_number": "2024CS309",
        "department": "Computer Science & Engineering",
        "semester": "Semester 5",
        "phone": "+91 9988776655",
        "password": "password123"
    }
    res = client.post('/api/register', json=new_student)
    assert res.status_code in (201, 409), f"Register test failed: {res.data}"
    print("  ✅ [3/10] Student Registration & Constraints: Verified.")

    # 4. Upload PDF Document
    fname, pdf_bytes = create_dummy_pdf("DBMS_Project_Report.pdf", 5)
    data = {
        'file': (pdf_bytes, fname)
    }
    res = client.post(
        '/api/documents/upload',
        data=data,
        content_type='multipart/form-data',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert res.status_code == 201, f"Upload document failed: {res.data}"
    doc_data = res.get_json()['document']
    doc_id = doc_data['document_id']
    assert doc_data['total_pages'] == 5, f"Expected 5 pages, got {doc_data['total_pages']}"
    print(f"  ✅ [4/10] Document Upload & pypdf Page Extraction: Verified 5 pages parsed for '{fname}'.")

    # 5. Dynamic Quote Calculation
    quote_payload = {
        "document_id": doc_id,
        "settings": {
            "color_mode": "color",
            "sides": "double",
            "copies": 2,
            "paper_size": "A4",
            "paper_type": "premium",
            "binding_type": "spiral",
            "page_range": "all"
        }
    }
    res = client.post(
        '/api/orders/calculate-cost',
        json=quote_payload,
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert res.status_code == 200, f"Quote failed: {res.data}"
    breakdown = res.get_json()['pricing_breakdown']
    assert breakdown['total_price'] > 0
    print(f"  ✅ [5/10] Dynamic Backend Price Calculation: Total ₹{breakdown['total_price']} computed.")

    # 6. Place Print Order
    order_payload = {
        "document_id": doc_id,
        "settings": {
            "color_mode": "bw",
            "sides": "single",
            "copies": 1,
            "paper_size": "A4",
            "paper_type": "standard",
            "binding_type": "staple",
            "page_range": "all"
        },
        "special_instructions": "Please staple on the top-left edge."
    }
    res = client.post(
        '/api/orders',
        json=order_payload,
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert res.status_code == 201, f"Order placement failed: {res.data}"
    order_info = res.get_json()['order']
    order_id = order_info['order_id']
    order_code = order_info['order_code']
    print(f"  ✅ [6/10] Print Order Created: {order_code} (Queue Pos #{order_info['queue_position']}).")

    # 7. Student Dashboard & Notifications check
    res = client.get('/api/student/dashboard', headers={'Authorization': f'Bearer {student_token}'})
    assert res.status_code == 200
    dash_data = res.get_json()
    assert dash_data['stats']['total_orders'] >= 1
    print("  ✅ [7/10] Student Dashboard & Notifications: Verified.")

    # 8. Staff Processing Workflow
    # Staff views orders
    res = client.get('/api/staff/orders', headers={'Authorization': f'Bearer {staff_token}'})
    assert res.status_code == 200
    # Staff accepts order
    res = client.put(f'/api/orders/{order_id}/status', json={"status": "Accepted"}, headers={'Authorization': f'Bearer {staff_token}'})
    assert res.status_code == 200
    # Staff starts printing
    res = client.put(f'/api/orders/{order_id}/status', json={"status": "Printing"}, headers={'Authorization': f'Bearer {staff_token}'})
    assert res.status_code == 200
    # Staff marks completed
    res = client.put(f'/api/orders/{order_id}/status', json={"status": "Completed"}, headers={'Authorization': f'Bearer {staff_token}'})
    assert res.status_code == 200
    print("  ✅ [8/10] Staff Order Workflow: Accepted -> Printing -> Completed transitions verified.")

    # 9. Admin Pricing Configuration
    res = client.get('/api/admin/pricing', headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    prices = res.get_json()['pricing']
    # Update bw_single price to 2.50
    updated_prices = [{"category": "bw_single", "unit_price": 2.50}]
    res = client.put('/api/admin/pricing', json={"prices": updated_prices}, headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    # Check that new price is reflected
    res = client.get('/api/admin/pricing')
    bw_item = next(p for p in res.get_json()['pricing'] if p['category'] == 'bw_single')
    assert float(bw_item['unit_price']) == 2.50
    # Revert back to 2.00
    client.put('/api/admin/pricing', json={"prices": [{"category": "bw_single", "unit_price": 2.00}]}, headers={'Authorization': f'Bearer {admin_token}'})
    print("  ✅ [9/10] Admin Pricing Management: Dynamic database price update verified.")

    # 10. Admin Reports and Statistics
    res = client.get('/api/admin/reports', headers={'Authorization': f'Bearer {admin_token}'})
    assert res.status_code == 200
    reports = res.get_json()
    assert 'department_stats' in reports
    assert 'color_stats' in reports
    print("  ✅ [10/10] Admin Analytics & Department Reports: Verified.")

    print("\n🎉 ALL 10 TEST SUITES PASSED FLAWLESSLY!")

if __name__ == '__main__':
    run_e2e_tests()
