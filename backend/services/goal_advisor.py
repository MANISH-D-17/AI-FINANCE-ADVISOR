from decimal import Decimal
from datetime import date, datetime
from typing import Optional

def generate_goal_tip(current_amount: Decimal, target_amount: Decimal, deadline: Optional[date] = None):
    """Generate a simple progress-based tip for a savings goal."""
    if target_amount <= 0: return "Set a target greater than 0 to get tips!"
    
    progress_pct = (current_amount / target_amount) * 100
    remaining = target_amount - current_amount
    
    if progress_pct >= 100:
        return "Goal reached! Amazing job! Consider starting a new goal or reinvesting this amount."
    
    if deadline:
        days_left = (deadline - date.today()).days
        if days_left > 0:
            daily_needed = remaining / Decimal(days_left)
            return f"You're {progress_pct:.1f}% there. You need to save approx ₹{daily_needed:.2f} per day to reach this goal by {deadline}."
        else:
            return f"Deadline passed! You're {progress_pct:.1f}% there. Consider extending the deadline or increasing contributions."
    
    if progress_pct < 20:
        return "Every great journey starts with a single step. Try an automatic transfer to keep the momentum going!"
    elif progress_pct < 50:
        return "You're almost halfway there! Keep it up. Review your 'Other' expenses to find more savings."
    else:
        return "You're in the home stretch! Over 50% completed. You've got this!"
