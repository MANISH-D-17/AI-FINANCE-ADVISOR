# Machine Learning Metrics & Performance

The AI Finance Advisor uses several ML models to provide smart insights. This document outlines how we track their performance.

## 1. Auto-Categorizer (Naive Bayes)

This model predicts the category of an expense based on its description.

### Performance Tracking
We track two key metrics after every retraining:
- **Accuracy**: The percentage of test transactions where the predicted category matches the actual category.
- **F1 Score**: The harmonic mean of precision and recall, providing a better measure for imbalanced classes (common in transaction data).

### Monitoring ML Quality
The `model_metrics` table stores historical performance snapshots. You can view the current model health on the **Dashboard** under the "ML Model Performance" card.

### Retraining Workflow
1. **User Feedback**: When a user corrects a category in the UI, we store it in the `category_feedback` table.
2. **Nightly Pipeline**: Every day at midnight, the system:
   - Fetches all original training data + new user feedback.
   - Retrains the `MultinomialNB` model.
   - Evaluates the new model against a held-out test set.
   - Saves the new model weights and performance metrics.

---

## 2. Anomaly Detection (Isolation Forest)

We use an unsupervised `IsolationForest` model to flag unusual spending.

### Thresholds
- **Confidence Score**: The model outputs a score between 0 and 1.
- **Anomaly Flag**: Transactions with a score > 0.8 are flagged for user review.
- **Context**: The model is trained on the user's last 100 transactions, ensuring it adapts to shifting spending habits over time.

---

## 3. Financial Health Scoring

The health score (0-100) is a rule-based weighted algorithm:
- **Savings Rate (40%)**: Ratio of savings to income.
- **Fixed Cost Ratio (30%)**: Percentage of income spent on "Essentials".
- **Discretionary Spending (30%)**: Control over "Wants" categories.

---

## Latest Model Update (2026-04-20)
**Status**: 🚀 Enhanced "Elite Edition" Training Complete

### Improvements
- **Expanded Scope**: Now supports 10 distinct categories, including **Income**, **Investments**, and **Transfers**.
- **Data Augmentation**: Trained on 950+ real transactions extracted from HDFC, Canara, and Axis bank statements.
- **Sharper NLP**: Upgraded to character-level n-gram TF-IDF for 100% precision on common Indian UPI and banking patterns.
- **Active Learning**: Model metrics are now synchronized with user statements for hyper-personalized predictions.
