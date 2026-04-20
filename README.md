# AI Personal Finance Advisor (Elite Edition) 🚀

A production-grade, full-stack AI financial companion that doesn't just track expenses, but thinks, acts, and predicts.

## 🌟 Elite Features

- **🏦 Bank Statement CSV Import**: Robust heuristic-based parser for SBI, HDFC, ICICI, and Axis bank statements.
- **🤖 Agentic AI Advisor**: powered by LangChain & Gemini. Can fetch live data, compute scores, and set budgets.
- **📈 ML Performance Metrics**: Continuous evaluation of the Auto-Categorizer model with accuracy and F1 score tracking.
- **🔄 Auto-Retraining Pipeline**: The model learns from your manual corrections and retrains nightly.
- **🚨 Anomaly Detection**: ML-driven outlier detection (Isolation Forest) flags unusual spending patterns.
- **🎯 Savings Goal Tracker**: Set milestones and get AI-driven progress tips.
- **🚀 Ultra-Fast Performance**: Redis (Upstash) caching layer reduces backend latency for dashboards.
- **📧 Weekly Email Digests**: Automated financial performance reports sent via Resend.
- **📄 PDF Export**: Professional monthly financial reports with detailed charts and tables.

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Recharts, LangGraph.
- **Backend**: FastAPI (Python 3.9+), SQLAlchemy, APScheduler.
- **Database**: SQLite (Local Dev) / Supabase PostgreSQL (Prod).
- **AI/ML**: Google Gemini 2.0 Flash, Scikit-Learn (Isolation Forest & Naive Bayes).
- **External Services**: Resend (Email), Upstash (Redis).

## 🚀 Getting Started

1. **Backend**:
   ```bash
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 📊 Model Accuracy
See [METRICS.md](./METRICS.md) for details on the ML model's performance and retraining methodology.
# AI-FINANCE-ADVISOR
