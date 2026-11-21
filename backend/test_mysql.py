import mysql.connector
from getpass import getpass

try:
    password = getpass("Enter MySQL application password: ")

    conn = mysql.connector.connect(
        host="127.0.0.1",
        port=3306,
        user="smartprint_app",
        password=password,
        database="smart_printing_db"
    )

    print("\nSUCCESS: MySQL connected!")

    cursor = conn.cursor()
    cursor.execute("SHOW TABLES")

    print("\nTables in database:")
    for table in cursor.fetchall():
        print(table[0])

    cursor.close()
    conn.close()

except mysql.connector.Error as error:
    print("\nConnection failed:", error)
