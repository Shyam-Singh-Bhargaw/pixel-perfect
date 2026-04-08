export const SPACED_REP_INTERVALS = [1, 4, 7, 14, 30, 60];

export const STUDY_TOPICS = ['ML', 'DL', 'Python', 'SQL', 'Excel', 'Interview Prep', 'Statistics', 'DSA'] as const;

export const STUDY_TARGETS: Record<string, number> = {
  ML: 10, DL: 10, Python: 8, SQL: 6, Excel: 4, 'Interview Prep': 8, Statistics: 6, DSA: 6,
};

export const TOPIC_COLORS: Record<string, string> = {
  ML: 'bg-primary', DL: 'bg-info', Python: 'bg-success', SQL: 'bg-warning',
  Excel: 'bg-destructive', 'Interview Prep': 'bg-primary', Statistics: 'bg-info',
  DSA: 'bg-accent', General: 'bg-muted-foreground',
};

export const SCHEDULE_SLOT_COLORS: Record<string, string> = {
  'Sleep': 'bg-muted/30 text-muted-foreground',
  'Wake up & freshen': 'bg-info/10 text-info border-info/20',
  'Revision (spaced repetition)': 'bg-warning/10 text-warning border-warning/20',
  'Breakfast': 'bg-success/10 text-success border-success/20',
  'Deep study block (ML / DL / Python / SQL / Excel)': 'bg-primary/10 text-primary border-primary/20',
  'Lunch & rest': 'bg-success/10 text-success border-success/20',
  'Interview preparation (mock questions, behavioural, system design)': 'bg-accent/20 text-accent border-accent/40',
  'Job applications & follow-ups': 'bg-info/10 text-info border-info/20',
  'Networking (LinkedIn, Twitter, offline)': 'bg-primary/10 text-primary border-primary/20',
  'Dinner & rest': 'bg-success/10 text-success border-success/20',
  'Python / DSA / LeetCode': 'bg-destructive/10 text-destructive border-destructive/20',
};

export const NORMAL_SCHEDULE = [
  { time: '12:30–6:00 AM', label: 'Sleep', hours: [0, 1, 2, 3, 4, 5] },
  { time: '6:00–7:00 AM', label: 'Wake up & freshen', hours: [6] },
  { time: '7:00–9:00 AM', label: 'Revision (spaced repetition)', hours: [7, 8] },
  { time: '9:00–9:30 AM', label: 'Breakfast', hours: [9] },
  { time: '9:30 AM–2:00 PM', label: 'Deep study block (ML / DL / Python / SQL / Excel)', hours: [10, 11, 12, 13] },
  { time: '2:00–3:00 PM', label: 'Lunch & rest', hours: [14] },
  { time: '3:00–5:00 PM', label: 'Interview preparation (mock questions, behavioural, system design)', hours: [15, 16] },
  { time: '5:00–6:00 PM', label: 'Job applications & follow-ups', hours: [17] },
  { time: '6:00–9:00 PM', label: 'Networking (LinkedIn, Twitter, offline)', hours: [18, 19, 20] },
  { time: '9:00–10:00 PM', label: 'Dinner & rest', hours: [21] },
  { time: '10:00 PM–12:30 AM', label: 'Python / DSA / LeetCode', hours: [22, 23] },
];

export const INTERVIEW_SCHEDULE = [
  { time: '6:00 AM', label: 'Wake up', hours: [6] },
  { time: '7:00–9:00 AM', label: 'Light revision (key concepts only)', hours: [7, 8] },
  { time: '9:00–11:00 AM', label: 'Mock answers (STAR method practice)', hours: [9, 10] },
  { time: '11:00 AM–1:00 PM', label: 'Relax, light reading', hours: [11, 12] },
  { time: '1:00 PM', label: 'Travel & prepare (arrive 30 min early)', hours: [13] },
  { time: '3:00 PM', label: '🎯 INTERVIEW', hours: [15] },
  { time: '6:00 PM', label: 'Debrief — write reflection notes', hours: [18] },
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
