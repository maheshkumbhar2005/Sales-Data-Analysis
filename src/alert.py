import sqlite3
import smtplib
from email.message import EmailMessage
import os
from pathlib import Path

DEFAULT_DATABASE_PATH = Path(__file__).resolve().parent.parent / "output" / "sales.db"

def check_anomalies_and_alert(database_path: Path = DEFAULT_DATABASE_PATH) -> dict:
    conn = None
    try:
        if not Path(database_path).exists():
            return {"triggered": False, "reason": "Database does not exist"}
        conn = sqlite3.connect(database_path)
        cursor = conn.cursor()
        # Query monthly sales to find drops
        cursor.execute("""
            SELECT month, revenue
            FROM (
                SELECT strftime('%Y-%m', sale_date) AS month, SUM(total_sales) AS revenue
                FROM sales GROUP BY month
            ) ORDER BY month DESC LIMIT 2
        """)
        rows = cursor.fetchall()
        
        if len(rows) < 2:
            print("Not enough data for alerts.")
            return {"triggered": False, "reason": "Insufficient historical data"}

        current_month, current_rev = rows[0]
        prev_month, prev_rev = rows[1]
        
        # Calculate drop
        if prev_rev > 0:
            growth = ((current_rev - prev_rev) / prev_rev) * 100
        else:
            growth = 0
            
        print(f"Current Month: {current_month} Revenue: ${current_rev:,.2f}")
        print(f"Previous Month: {prev_month} Revenue: ${prev_rev:,.2f}")
        print(f"Growth: {growth:.2f}%")
        
        if growth <= -20: # 20% drop alert
            send_email_alert(
                subject=f"URGENT: Sales dropped by {abs(growth):.1f}% in {current_month}",
                body=f"Revenue for {current_month} is ${current_rev:,.2f}, which is a {abs(growth):.1f}% drop compared to {prev_month} (${prev_rev:,.2f}).\nPlease check the dashboard."
            )
            return {"triggered": True, "growth": growth, "current_month": current_month, "prev_month": prev_month}
        else:
            print("Sales are looking stable. No alerts triggered.")
            return {"triggered": False, "growth": growth, "current_month": current_month, "prev_month": prev_month}
            
    except Exception as e:
        print(f"Error running alerts: {e}")
        return {"triggered": False, "error": str(e)}
    finally:
        if conn is not None:
            conn.close()

def send_email_alert(subject, body):
    sender = os.environ.get("ALERT_EMAIL_SENDER", "alerts@salesdashboard.local")
    recipient = os.environ.get("ALERT_EMAIL_RECIPIENT", "admin@salesdashboard.local")
    smtp_server = os.environ.get("SMTP_SERVER", "")
    smtp_port = os.environ.get("SMTP_PORT", "587")
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")

    msg = EmailMessage()
    msg.set_content(body)
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = recipient

    print(f"--- EMAIL ALERT DISPATCHED ---")
    print(f"To: {recipient}")
    print(f"Subject: {subject}")
    print(f"Body:\n{body}")
    print("------------------------------")

    if smtp_server:
        try:
            with smtplib.SMTP(smtp_server, int(smtp_port)) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            print("Email sent successfully via SMTP.")
        except Exception as e:
            print(f"Failed to send email via SMTP: {e}")
    else:
        print("(SMTP Server not configured. This is a dry-run log.)")

if __name__ == "__main__":
    check_anomalies_and_alert()
