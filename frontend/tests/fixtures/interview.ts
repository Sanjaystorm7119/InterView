export const MOCK_INTERVIEW_ID = 'mock-interview-abc123'

export const MOCK_INTERVIEW = {
  id: 1,
  interview_id: MOCK_INTERVIEW_ID,
  job_position: 'Senior Frontend Developer',
  company_name: 'TechCorp',
  duration: '30',
  type: '["Technical", "Behavioral"]',
  question_list: [
    { question: 'Tell me about your React experience', type: 'Technical' },
    { question: 'Describe a challenging project you worked on', type: 'Behavioral' },
  ],
  company_details: 'TechCorp builds innovative web products.',
  company_summary: 'TechCorp is an innovative technology company focused on building great products.',
  created_at: '2024-01-15T10:00:00Z',
}

export const MOCK_QUESTIONS_RESPONSE = {
  content: JSON.stringify({
    interviewQuestions: [
      { question: 'Tell me about your React experience', type: 'Technical' },
      { question: 'Describe a challenging project you worked on', type: 'Behavioral' },
      { question: 'How do you handle state management in large applications?', type: 'Technical' },
    ],
  }),
}

export const MOCK_FEEDBACK_LIST = [
  {
    id: 1,
    interview_id: MOCK_INTERVIEW_ID,
    user_email: 'candidate@example.com',
    user_name: 'Jane Doe',
    feedback: {
      feedback: {
        rating: {
          technicalSkills: 8,
          communicationSkills: 7,
          problemSolving: 8,
          experience: 7,
          OverallRating: 8,
        },
        summary: ['Strong technical skills', 'Good communication'],
        Recommendation: 'recommended',
        RecommendationMessage: 'Strong candidate with solid React skills',
      },
    },
    transcript: '[]',
    call_id: 'call-test-id',
    created_at: '2024-01-16T10:00:00Z',
  },
]

export const MOCK_FEEDBACK_AI_RESPONSE = {
  content: JSON.stringify({
    feedback: {
      rating: {
        technicalSkills: 8,
        communicationSkills: 7,
        problemSolving: 8,
        experience: 7,
        OverallRating: 8,
      },
      summary: ['Strong technical skills', 'Good communication'],
      Recommendation: 'recommended',
      RecommendationMessage: 'Strong candidate',
    },
  }),
}
