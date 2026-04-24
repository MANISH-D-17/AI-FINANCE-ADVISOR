from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO
from sqlalchemy.ext.asyncio import AsyncSession
from services import dashboard_service, expense_service

async def generate_monthly_report_pdf(db: AsyncSession, user_id: str):
    """Generate a monthly financial report PDF."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph("AI Finance Advisor - Monthly Report", styles['Title']))
    elements.append(Spacer(1, 12))

    summary = await dashboard_service.get_dashboard_summary(db, user_id)
    # Convert DashboardSummary model to dict for logic below
    summary_dict = summary.model_dump()
    
    # Key Metrics
    elements.append(Paragraph(f"Monthly Spending Summary", styles['Heading2']))
    month_total = float(summary_dict.get('month_total', 0))
    elements.append(Paragraph(f"Total Amount Spent: <b>₹{month_total:,.2f}</b>", styles['Normal']))
    elements.append(Spacer(1, 12))

    # Top Categories Table
    elements.append(Paragraph("Top Spending Categories", styles['Heading3']))
    cat_data = [["Category", "Amount (₹)", "Percentage"]]
    for item in summary_dict.get('category_breakdown', [])[:5]:
        total = float(item.get('total', 0))
        percentage = item.get('percentage', 0)
        cat_data.append([item.get('category', 'Other'), f"{total:,.2f}", f"{percentage}%"])
    
    cat_table = Table(cat_data)
    cat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.dodgerblue),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.aliceblue),
        ('GRID', (0, 0), (-1, -1), 1, colors.gray)
    ]))
    elements.append(cat_table)
    elements.append(Spacer(1, 24))

    # Recent Transactions Table
    elements.append(Paragraph("Recent Transactions", styles['Heading3']))
    expenses = await expense_service.get_expenses(db, user_id)
    tx_data = [["Date", "Description", "Category", "Amount (₹)"]]
    for e in expenses[:15]:
        amount = float(e.amount)
        tx_data.append([str(e.date), (e.description[:30] + '..') if e.description and len(e.description) > 30 else (e.description or '-'), e.category, f"{amount:,.2f}"])
    
    tx_table = Table(tx_data)
    tx_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.navy),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('FONTSIZE', (0, 0), (-1, -1), 9)
    ]))
    elements.append(tx_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer
