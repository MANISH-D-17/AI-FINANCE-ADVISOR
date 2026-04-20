from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO
from sqlalchemy.orm import Session
from services import dashboard_service, expense_service

def generate_monthly_report_pdf(db: Session, user_id: str):
    """Generate a monthly financial report PDF."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph("AI Finance Advisor - Monthly Report", styles['Title']))
    elements.append(Spacer(1, 12))

    summary = dashboard_service.get_summary(db, user_id)
    
    # Key Metrics
    elements.append(Paragraph(f"Monthly Spending Summary", styles['Heading2']))
    elements.append(Paragraph(f"Total Amount Spent: <b>₹{summary['month_total']:,}</b>", styles['Normal']))
    elements.append(Spacer(1, 12))

    # Top Categories Table
    elements.append(Paragraph("Top Spending Categories", styles['Heading3']))
    cat_data = [["Category", "Amount (₹)", "Percentage"]]
    for item in summary['category_breakdown'][:5]:
        cat_data.append([item['category'], f"{item['amount']:,}", f"{item['percentage']}%"])
    
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
    expenses = expense_service.get_expenses(db, user_id)
    tx_data = [["Date", "Description", "Category", "Amount (₹)"]]
    for e in expenses[:15]:
        tx_data.append([str(e.date), (e.description[:30] + '..') if e.description and len(e.description) > 30 else (e.description or '-'), e.category, f"{e.amount:,.2f}"])
    
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
