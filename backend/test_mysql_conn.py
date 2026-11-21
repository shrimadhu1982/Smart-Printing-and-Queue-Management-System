import pymysql

passwords_to_try = ['', 'root', 'admin', 'password', '1234', '123456', '12345678', 'root123']
connected = False

for pw in passwords_to_try:
    try:
        conn = pymysql.connect(host='localhost', port=3306, user='root', password=pw, database='smart_printing_db')
        print(f"SUCCESS with password: '{pw}'")
        with conn.cursor() as cur:
            cur.execute("SHOW TABLES;")
            tables = [row[0] for row in cur.fetchall()]
            print("Tables found in smart_printing_db:", tables)
        conn.close()
        connected = True
        break
    except Exception as e:
        print(f"Failed with password '{pw}': {e}")

if not connected:
    print("Could not connect with common passwords.")

