export const SPACED_REP_INTERVALS = [1, 4, 7, 14, 30, 60];

export const STUDY_TOPICS = ['ML', 'DL', 'Python', 'SQL', 'Excel', 'Interview Prep', 'Statistics'] as const;

export const STUDY_TARGETS: Record<string, number> = {
  ML: 10, DL: 10, Python: 8, SQL: 6, Excel: 4, 'Interview Prep': 8, Statistics: 6,
};

export const TOPIC_COLORS: Record<string, string> = {
  ML: 'bg-primary', DL: 'bg-info', Python: 'bg-success', SQL: 'bg-warning',
  Excel: 'bg-destructive', 'Interview Prep': 'bg-primary', Statistics: 'bg-info', General: 'bg-muted-foreground',
};

export const NORMAL_SCHEDULE = [
  { time: '6:00 AM', label: 'Wake up & freshen' },
  { time: '7:00–9:00 AM', label: 'Revision (spaced repetition items)' },
  { time: '9:00–9:30 AM', label: 'Breakfast' },
  { time: '9:30 AM–2:00 PM', label: 'Deep study block (ML/DL/Python/SQL/Excel)' },
  { time: '2:00–3:00 PM', label: 'Lunch & rest' },
  { time: '3:00–6:00 PM', label: 'Job applications & follow-ups' },
  { time: '6:00–9:00 PM', label: 'Networking (LinkedIn, Twitter, offline)' },
  { time: '9:00–10:00 PM', label: 'Dinner & rest' },
  { time: '10:00 PM–12:30 AM', label: 'Coding / reading / LeetCode' },
];

export const INTERVIEW_SCHEDULE = [
  { time: '6:00 AM', label: 'Wake up' },
  { time: '7:00–9:00 AM', label: 'Light revision (key concepts only)' },
  { time: '9:00–11:00 AM', label: 'Mock answers (STAR method practice)' },
  { time: '11:00 AM–1:00 PM', label: 'Relax, light reading' },
  { time: '1:00 PM', label: 'Travel & prepare (arrive 30 min early)' },
  { time: '3:00 PM', label: '🎯 INTERVIEW' },
  { time: '6:00 PM', label: 'Debrief — write reflection notes' },
];

export const WEEKLY_FOCUS: Record<number, string[]> = {
  1: ['ML', 'Statistics'],
  2: ['ML', 'Statistics'],
  3: ['DL', 'Python'],
  4: ['DL', 'Python'],
  5: ['SQL', 'Excel'],
  6: ['Interview Prep', 'Mock'],
  0: ['Revision only (light day)'],
};

export const STUDY_PLAN_TOPICS: Record<string, string[]> = {
  ML: ['Linear Regression', 'Logistic Regression', 'Decision Trees', 'Random Forest', 'SVM', 'K-Means', 'PCA', 'Gradient Boosting', 'Naive Bayes', 'Ensemble Methods'],
  DL: ['Neural Networks Basics', 'CNNs', 'RNNs & LSTMs', 'Transformers', 'Attention Mechanism', 'GANs', 'Autoencoders', 'Transfer Learning', 'LLMs', 'Fine-tuning'],
  Python: ['Data Structures', 'OOP', 'Decorators & Generators', 'NumPy', 'Pandas', 'Matplotlib/Seaborn', 'Scikit-learn', 'PyTorch basics', 'FastAPI', 'Testing'],
  SQL: ['Joins', 'Subqueries', 'Window Functions', 'CTEs', 'Indexing', 'Query Optimization', 'Aggregations', 'Stored Procedures'],
  Statistics: ['Probability', 'Distributions', 'Hypothesis Testing', 'Bayes Theorem', 'A/B Testing', 'Confidence Intervals', 'Correlation vs Causation', 'Sampling Methods'],
  'Interview Prep': ['STAR Method', 'System Design for ML', 'ML Case Studies', 'Behavioral Questions', 'Salary Negotiation', 'Portfolio Presentation'],
};

export const AI_SYSTEM_PROMPT = `You are PrepOS AI Coach — an expert Senior SDE + AI/ML Interview Coach and mind coach for Shyam, who is preparing for AI/ML Engineer and Data Scientist roles. You have deep expertise in:
- Machine Learning (all algorithms, math, intuition)
- Deep Learning (CNNs, RNNs, Transformers, LLMs)
- Python, Pandas, NumPy, Scikit-learn, PyTorch
- SQL (advanced queries, optimization, window functions)
- Statistics and Probability
- System Design for ML
- LeetCode / coding interview patterns
- Behavioral interviews (STAR method)
- LinkedIn and networking strategies

Your role is to:
1. Explain concepts clearly with intuition first, then math, then code
2. Give Shyam mock interview Q&A on demand
3. Suggest what to study next based on what he tells you
4. Use memory tricks, analogies, and real-world examples
5. Be his daily mind coach — motivate him, track his energy, adjust advice based on mood
6. When he says a concept name, always explain: What is it → Why it matters → How it works → Code example → Interview gotcha question

Always be concise, direct, and energetic. No fluff. Treat him like a smart student who just needs the right guidance.`;
