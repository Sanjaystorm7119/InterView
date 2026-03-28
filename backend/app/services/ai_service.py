from openai import OpenAI
from app.config import get_settings

settings = get_settings()


def get_openrouter_client() -> OpenAI:
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.OPENROUTER_API_KEY,
    )


def sanitize(text: str, max_len: int) -> str:
    return str(text or "").replace("\0", "")[:max_len]


# ── Prompt templates ──

QUESTIONS_PROMPT = """You are an expert AI interviewer. Generate **{duration}** diverse questions in JSON format based on the following inputs:

- Job Title: {jobTitle}
- Description: {jobDescription}
- Interview Type: {type}
- Company: {companyDetails}

**Output Format (JSON only):**
interviewQuestions = [
  {{ question: "", type: "Technical | Behavioral | Experience | Problem Solving | Leadership" }}
]

**Important:**
- Return exactly {duration} questions (1 per minute)
- No answers or explanations
- Ensure variety: conceptual, practical, debugging, best practices, etc.
- Return only valid JSON
"""

FEEDBACK_PROMPT = """{conversation}

If the interview is < 60 seconds, return this:
{{
  "feedback": {{
    "rating": {{
      "technicalSkills": 1,
      "communicationSkills": 1,
      "problemSolving": 1,
      "experience": 1,
      "OverallRating": 1
    }},
    "summary": [
      "Insufficient technical information.",
      "Communication could not be assessed.",
      "Problem-solving was not discussed.",
      "Experience was not discussed.",
      "overall rating: 1"
    ],
    "Recommendation": "not recommended",
    "RecommendationMessage": "too little information to progress"
  }}
}}

Otherwise, analyze the conversation and return:

{{
  "feedback": {{
    "rating": {{
      "technicalSkills": <1-10>,
      "communicationSkills": <1-10>,
      "problemSolving": <1-10>,
      "experience": <1-10>,
      "OverallRating": <1-10>
    }},
    "summary": [
      "<Technical summary>",
      "<Behavioral summary>",
      "<Problem-solving summary>",
      "<Experience summary>",
      "overall rating: <rounded value>"
    ],
    "Recommendation": "<recommended | not recommended>",
    "RecommendationMessage": "<short lowercase reason>"
  }}
}}
"""

COMPANY_SUMMARY_PROMPT = """Based on the following job details, create a concise company summary that would be suitable for introducing the company to a candidate during an interview:

Job Position: {jobPosition}
Job Description: {jobDescription}
Company Details: {companyDetails}

Please create a professional, engaging summary that:

1. Highlights the company's key strengths and values
2. Mentions the role and its importance
3. Creates a positive first impression
4. Is conversational and welcoming
5. Keeps it concise — 3 paragraphs, each with a maximum of 3 sentences
6. Write the summary in a naturally paced style for spoken delivery. Instead of using SSML tags like <break>, use a variety of sentence structures and punctuation to create natural pauses. For example:
  - Use short sentences to simulate brief pauses.
  - Use commas and conjunctions to create natural rhythm.
  - Use paragraph breaks to indicate longer pauses.
  - End paragraphs with a sentence that gives a natural closing tone.
7. Convert any symbols, percentages, or numbers into word format. For example, "$1.8 trillion" should be written as "one point eight trillion dollars", and "75%" as "seventy five percent".

Use a warm, conversational, and human tone. Avoid technical jargon. Do not include any markup or SSML tags.

Return only the summary text. Do not include any other formatting or explanations."""

DOCUMENT_EXTRACT_PROMPT = """Extract the following information from this document and return ONLY valid JSON with no markdown fences or extra text:
{
  "company_name": "The company name only (short, e.g. 'Acme Corp')",
  "company_details": "Company background, mission, culture, and any other company information found in the document",
  "job_position": "The job title or position being advertised",
  "job_description": "All job requirements, responsibilities, and qualifications"
}
If a field cannot be determined from the document, use an empty string for that field."""

RESUME_EXTRACT_PROMPT = """Extract the following information from this resume and return ONLY valid JSON with no markdown fences or extra text:
{
  "candidate_name": "Full name of the candidate",
  "candidate_email": "Email address of the candidate (or empty string if not found)",
  "skills": ["skill1", "skill2"],
  "experience_summary": "Brief 2-3 sentence summary of work experience",
  "education": "Highest education level, degree, and field of study",
  "years_of_experience": "Estimated years of professional experience as a number string (e.g. '3', '7', '12'). Use the lower bound if a range.",
  "current_role": "Current or most recent job title (e.g. 'Senior Frontend Developer', or empty string if not found)",
  "location": "City and country or state from the resume (e.g. 'San Francisco, CA' or empty string if not found)",
  "degree": "Highest academic degree type only — one of: Bachelor's, Master's, PhD, Associate's, High School, or empty string if not found",
  "college": "Name of the university or college for the highest degree (or empty string if not found)"
}
If a field cannot be determined from the document, use an empty string or empty array."""

MATCH_PROMPT = """You are a senior recruiter. Compare the candidate resume against the job description and return ONLY valid JSON with no markdown fences or extra text.

## Candidate Resume
Name: {candidate_name}
Skills: {skills}
Experience: {experience_summary}
Education: {education}
Years of Experience: {years_of_experience}

## Job Description
Role: {role_title}
Requirements: {requirements}

## Output Format
Return JSON exactly like this:
{{
  "confidence_score": <0-100 overall match percentage>,
  "skills_score": <0-100 skills match percentage>,
  "experience_score": <0-100 experience match percentage>,
  "semantic_score": <0-100 semantic/contextual fit percentage>,
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": ["skill3", "skill4"],
  "summary": "2-3 sentence explanation of the match"
}}
"""
