import resend
from config import settings
from services import dashboard_service
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.user import User

async def send_weekly_digest(db: AsyncSession, user: User):
    """Generate and send a weekly financial digest email to the user."""
    if not settings.RESEND_API_KEY:
        print("Resend API key not configured")
        return False

    resend.api_key = settings.RESEND_API_KEY

    try:
        summary_obj = await dashboard_service.get_dashboard_summary(db, user.id)
        summary = summary_obj.model_dump()
        
        # Build HTML content
        html_content = f"""
        <html>
            <body style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #0ea5e9;">Your Weekly Financial Digest</h1>
                <p>Hello! Here's a quick look at your spending for this month.</p>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                    <h2 style="margin-top: 0;">₹{summary['month_total']:,}</h2>
                    <p style="color: #64748b; font-size: 14px;">Total spent this month</p>
                </div>
                
                <h3>Recent Alerts</h3>
                <ul>
                    {"".join([f"<li>{alert}</li>" for alert in summary['alerts']]) if summary['alerts'] else "<li>No alerts this week! You're on track.</li>"}
                </ul>
                
                <h3>Top Categories</h3>
                {"".join([f"<p><b>{item['category']}</b>: ₹{item['amount']:,} ({item['percentage']}%)</p>" for item in summary['category_breakdown'][:3]])}
                
                <br/>
                <a href="http://localhost:5175" style="background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Open AI CFO</a>
                
                <p style="font-size: 12px; color: #94a3b8; margin-top: 40px;">
                    You are receiving this because you're an AI Finance Advisor user. 
                    To unsubscribe, update your settings in the app.
                </p>
            </body>
        </html>
        """

        params = {
            "from": "AI CFO <onboarding@resend.dev>",
            "to": [user.email],
            "subject": "Your Weekly Financial Performance",
            "html": html_content,
        }

        resend.Emails.send(params)
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


async def trigger_all_weekly_digests(db: AsyncSession):
    """Trigger emails for all users who have notifications enabled."""
    stmt = select(User).where(User.email_notifications == True)
    result = await db.execute(stmt)
    users = result.scalars().all()
    count = 0
    for user in users:
        if await send_weekly_digest(db, user):
            count += 1
    return count
