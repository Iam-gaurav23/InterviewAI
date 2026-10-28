import fs from "fs"
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { askAi } from "../services/openRouter.service.js";
import User from "../models/user.model.js";
import Interview from "../models/interview.model.js";


export const analyzeResume = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ message: "Resume required" });
    }

    const filepath = req.file.path

    const fileBuffer = await fs.promises.readFile(filepath)
    const uint8Array = new Uint8Array(fileBuffer)

    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

    let resumeText = "";

    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();

      const pageText = content.items.map(item => item.str).join(" ");
      resumeText += pageText + "\n";
    }


    resumeText = resumeText
      .replace(/\s+/g, " ")
      .trim();


    const messages = [
      {
        role: "system",
        content: `
Extract structured data from resume.

Return strictly JSON:

{
  "role": "string",
  "experience": "string",
  "projects": ["project1", "project2"],
  "skills": ["skill1", "skill2"]
}
`
      },
      {
        role: "user",
        content: resumeText
      }
    ];


    const aiResponse = await askAi(messages)

    const parsed = JSON.parse(aiResponse);

    fs.unlinkSync(filepath)


    res.json({
      role: parsed.role,
      experience: parsed.experience,
      projects: parsed.projects,
      skills: parsed.skills,
      resumeText
    });

  } catch (error) {
    console.error(error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({ message: error.message });
  }
};



export const generateQuestion = async (req, res) => {
  try {

    let {
      role,
      experience,
      mode,
      resumeText,
      projects,
      skills
    } = req.body;

    role = role?.trim();
    experience = experience?.trim();
    mode = mode?.trim();

    if (!role || !experience || !mode) {
      return res.status(400).json({
        message: "Role, Experience and Mode are required."
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    if (user.credits < 50) {
      return res.status(400).json({
        message: "Not enough credits. Minimum 50 required."
      });
    }

    const projectText =
      Array.isArray(projects) && projects.length
        ? projects.join(", ")
        : "None";

    const skillsText =
      Array.isArray(skills) && skills.length
        ? skills.join(", ")
        : "None";

    const safeResume =
      resumeText?.trim() || "None";


    // =========================================================
    // CANDIDATE INFORMATION
    // =========================================================

    const userPrompt = `
Candidate Information:

Role:
${role}

Experience:
${experience}

Interview Mode:
${mode}

Projects:
${projectText}

Skills:
${skillsText}

Resume:
${safeResume}
`;


    if (!userPrompt.trim()) {
      return res.status(400).json({
        message: "Prompt content is empty."
      });
    }


    // =========================================================
    // INTERVIEW QUESTION GENERATION
    // =========================================================

    const messages = [

      {
        role: "system",

        content: `
You are a professional human interviewer.

You are interviewing a real candidate for a ${role} position.

Your job is to conduct a realistic interview based primarily on
the candidate's resume, projects, skills, experience and selected
interview mode.

IMPORTANT:

Generate EXACTLY 10 interview questions.

Return ONLY valid JSON.

Do NOT return:
- Markdown
- Code fences
- Explanations
- Answers
- Feedback
- Safety classifications
- Metadata
- Labels
- Extra text


RETURN EXACTLY THIS FORMAT:

{
  "questions": [
    "Question 1",
    "Question 2",
    "Question 3",
    "Question 4",
    "Question 5",
    "Question 6",
    "Question 7",
    "Question 8",
    "Question 9",
    "Question 10"
  ]
}


=========================================================
VERY IMPORTANT: RESUME-BASED INTERVIEW
=========================================================

At least 7 of the 10 questions MUST be directly based on
information found in the candidate's resume.

Use specific:

- Projects
- Technologies
- Programming languages
- Frameworks
- Databases
- AI/ML technologies
- APIs
- Authentication systems
- Internship/work experience
- Achievements
- Certifications
- Other technical skills mentioned in the resume


Do NOT ask generic questions when the resume contains
relevant information that can be used instead.


For example:

If the resume says the candidate built a MERN application,
ask about that application.

If the resume says the candidate implemented JWT authentication,
ask how JWT authentication was implemented.

If the resume says the candidate used MongoDB,
ask about how MongoDB was used in the project.

If the resume says the candidate used React,
ask about the actual React implementation.

If the resume mentions an AI/RAG project,
ask about the actual AI/RAG architecture and implementation.


=========================================================
QUESTION DISTRIBUTION
=========================================================

Question 1:
Start with the candidate's background or a project mentioned
in the resume.

Question 2:
Ask a specific question about one of the candidate's projects.

Question 3:
Ask about the candidate's implementation of a technology
mentioned in the resume.

Question 4:
Ask a deeper technical question about a project.

Question 5:
Ask about backend/API/database implementation mentioned
in the resume.

Question 6:
Ask about frontend implementation or architecture mentioned
in the resume.

Question 7:
Ask about authentication, security, APIs, deployment,
database or another relevant technical topic found in the resume.

Question 8:
Ask a practical scenario related to one of the candidate's
projects or technologies.

Question 9:
Ask a deeper follow-up question that tests whether the
candidate actually understands something they claimed on
their resume.

Question 10:
Ask the most difficult technical question based on the
candidate's actual resume/projects.


=========================================================
INTERVIEW STYLE
=========================================================

The questions should feel like a real interviewer is talking
to the candidate.

Questions should be:

- Natural
- Conversational
- Specific
- Technical
- Relevant to the candidate
- Based on their actual resume
- Appropriate for their experience level

Do NOT ask questions that assume technologies not mentioned
in the candidate's resume unless they are fundamental to
the role.

Do NOT repeatedly ask definitions.

Prefer questions such as:

"How did you implement JWT authentication in your project?"

"What problem were you trying to solve with this project?"

"Why did you choose MongoDB for this application?"

"How does data flow from your React frontend to your Node.js backend?"

"How did you handle errors in your API?"

"What would happen if your application received 10,000 requests?"

"What was the most difficult technical problem you faced?"

"What would you improve in this project?"

These are examples only.

Generate questions specifically from the candidate's resume.


=========================================================
DIFFICULTY
=========================================================

Question 1 → Easy
Question 2 → Easy
Question 3 → Easy/Medium
Question 4 → Medium
Question 5 → Medium
Question 6 → Medium
Question 7 → Medium/Hard
Question 8 → Hard
Question 9 → Hard
Question 10 → Hard


=========================================================
STRICT RULES
=========================================================

1. EXACTLY 10 questions.
2. Every item must be a real interview question.
3. Every item must be a string.
4. At least 7 questions must directly reference information
   from the candidate's resume/projects/skills.
5. Do not invent projects that are not in the resume.
6. Do not invent technologies that are not in the resume.
7. Do not ask generic questions when resume information
   can be used.
8. Do not include answers.
9. Do not include feedback.
10. Do not include safety text.
11. Do not include "User Safety: safe".
12. Do not include question numbers.
13. Do not include extra text outside JSON.
14. Return valid JSON only.
`
      },


      {
        role: "user",

        content: userPrompt

      }

    ];


    // =========================================================
    // CALL AI
    // =========================================================

    const aiResponse = await askAi(messages);


    if (!aiResponse || !aiResponse.trim()) {

      return res.status(500).json({
        message: "AI returned empty response."
      });

    }


    // =========================================================
    // DEBUG
    // =========================================================

    console.log("\n====================================");
    console.log("RAW AI QUESTION RESPONSE:");
    console.log(aiResponse);
    console.log("====================================\n");


    // =========================================================
    // CLEAN RESPONSE
    // =========================================================

    let cleanedResponse = aiResponse.trim();

    cleanedResponse = cleanedResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();


    // =========================================================
    // PARSE JSON
    // =========================================================

    let parsedResponse;

    try {

      parsedResponse = JSON.parse(cleanedResponse);

    } catch (error) {

      console.log(
        "JSON PARSE ERROR:",
        error.message
      );

      return res.status(500).json({
        message: "AI returned an invalid question format."
      });

    }


    // =========================================================
    // GET QUESTIONS
    // =========================================================

    const questionsArray =
      parsedResponse.questions;


    // =========================================================
    // VALIDATE ARRAY
    // =========================================================

    if (!Array.isArray(questionsArray)) {

      return res.status(500).json({
        message:
          "AI response does not contain a questions array."
      });

    }


    // =========================================================
    // EXACTLY 10 QUESTIONS
    // =========================================================

    if (questionsArray.length !== 10) {

      console.log(
        `AI generated ${questionsArray.length} questions instead of 10.`
      );

      return res.status(500).json({
        message:
          `AI generated ${questionsArray.length} questions instead of exactly 10.`
      });

    }


    // =========================================================
    // VALIDATE EACH QUESTION
    // =========================================================

    const invalidQuestion =
      questionsArray.some(
        question =>
          typeof question !== "string" ||
          question.trim().length === 0
      );


    if (invalidQuestion) {

      return res.status(500).json({
        message:
          "AI generated an invalid question."
      });

    }


    // =========================================================
    // CLEAN QUESTIONS
    // =========================================================

    const finalQuestions =
      questionsArray.map(question =>
        question.trim()
      );


    // =========================================================
    // DEDUCT CREDITS
    // =========================================================

    user.credits -= 50;

    await user.save();


    // =========================================================
    // CREATE INTERVIEW
    // =========================================================

    const interview =
      await Interview.create({

        userId: user._id,

        role,

        experience,

        mode,

        resumeText: safeResume,

        questions: finalQuestions.map(
          (question, index) => ({

            question,

            difficulty: [
              "easy",
              "easy",
              "easy",
              "medium",
              "medium",
              "medium",
              "medium",
              "hard",
              "hard",
              "hard"
            ][index],

            timeLimit: [
              60,
              60,
              60,
              90,
              90,
              90,
              90,
              120,
              120,
              120
            ][index]

          })
        )

      });


    // =========================================================
    // SEND RESPONSE
    // =========================================================

    return res.json({

      interviewId:
        interview._id,

      creditsLeft:
        user.credits,

      userName:
        user.name,

      questions:
        interview.questions

    });


  } catch (error) {

    console.error(
      "GENERATE QUESTION ERROR:",
      error
    );

    return res.status(500).json({
      message:
        `failed to create interview ${error}`
    });

  }
};




export const submitAnswer = async (req, res) => {

  try {

    const {
      interviewId,
      questionIndex,
      answer,
      timeTaken
    } = req.body


    const interview = await Interview.findById(interviewId)

    const question = interview.questions[questionIndex]


    // ============================================================
    // NO ANSWER
    // ============================================================

    if (!answer) {

      question.score = 0;

      question.feedback = "You did not submit an answer.";

      question.answer = "";


      await interview.save();


      return res.json({
        feedback: question.feedback
      });

    }


    // ============================================================
    // TIME EXCEEDED
    // ============================================================

    if (timeTaken > question.timeLimit) {

      question.score = 0;

      question.feedback =
        "Time limit exceeded. Answer not evaluated.";

      question.answer = answer;


      await interview.save();


      return res.json({
        feedback: question.feedback
      });

    }


    // ============================================================
    // AI EVALUATION
    // ============================================================

    const messages = [

      {
        role: "system",

        content: `
You are a professional human interviewer evaluating a candidate's answer in a real interview.

Evaluate naturally and fairly, like a real person would.

Score the answer in these areas (0 to 10):

1. Confidence – Does the answer sound clear, confident, and well-presented?
2. Communication – Is the language simple, clear, and easy to understand?
3. Correctness – Is the answer accurate, relevant, and complete?

Rules:
- Be realistic and unbiased.
- Do not give random high scores.
- If the answer is weak, score low.
- If the answer is strong and detailed, score high.
- Consider clarity, structure, and relevance.

Calculate:

finalScore = average of confidence, communication, and correctness
rounded to nearest whole number.

Feedback Rules:
- Write natural human feedback.
- 10 to 15 words only.
- Sound like real interview feedback.
- Can suggest improvement if needed.
- Do NOT repeat the question.
- Do NOT explain scoring.
- Keep tone professional and honest.

Return ONLY valid JSON in this format:

{
  "confidence": number,
  "communication": number,
  "correctness": number,
  "finalScore": number,
  "feedback": "short human feedback"
}
`
      },

      {
        role: "user",

        content: `
Question: ${question.question}

Answer: ${answer}
`
      }

    ];


    const aiResponse = await askAi(messages)


    const parsed = JSON.parse(aiResponse);


    question.answer = answer;

    question.confidence = parsed.confidence;

    question.communication = parsed.communication;

    question.correctness = parsed.correctness;

    question.score = parsed.finalScore;

    question.feedback = parsed.feedback;


    await interview.save();


    return res.status(200).json({
      feedback: parsed.feedback
    })


  } catch (error) {

    return res.status(500).json({
      message: `failed to submit answer ${error}`
    })

  }

}




export const finishInterview = async (req, res) => {

  try {

    const {
      interviewId
    } = req.body


    const interview = await Interview.findById(interviewId)


    if (!interview) {

      return res.status(400).json({
        message: "failed to find Interview"
      })

    }


    const totalQuestions = interview.questions.length;


    let totalScore = 0;

    let totalConfidence = 0;

    let totalCommunication = 0;

    let totalCorrectness = 0;


    interview.questions.forEach((q) => {

      totalScore += q.score || 0;

      totalConfidence += q.confidence || 0;

      totalCommunication += q.communication || 0;

      totalCorrectness += q.correctness || 0;

    });


    const finalScore = totalQuestions
      ? totalScore / totalQuestions
      : 0;


    const avgConfidence = totalQuestions
      ? totalConfidence / totalQuestions
      : 0;


    const avgCommunication = totalQuestions
      ? totalCommunication / totalQuestions
      : 0;


    const avgCorrectness = totalQuestions
      ? totalCorrectness / totalQuestions
      : 0;


    interview.finalScore = finalScore;

    interview.status = "completed";


    await interview.save();


    return res.status(200).json({

      finalScore: Number(finalScore.toFixed(1)),

      confidence: Number(avgConfidence.toFixed(1)),

      communication: Number(avgCommunication.toFixed(1)),

      correctness: Number(avgCorrectness.toFixed(1)),

      questionWiseScore: interview.questions.map((q) => ({

        question: q.question,

        score: q.score || 0,

        feedback: q.feedback || "",

        confidence: q.confidence || 0,

        communication: q.communication || 0,

        correctness: q.correctness || 0,

      })),

    })


  } catch (error) {

    return res.status(500).json({
      message: `failed to finish Interview ${error}`
    })

  }

}




export const getMyInterviews = async (req, res) => {

  try {

    const interviews = await Interview.find({
      userId: req.userId
    })

      .sort({
        createdAt: -1
      })

      .select(
        "role experience mode finalScore status createdAt"
      );


    return res.status(200).json(interviews)


  } catch (error) {

    return res.status(500).json({
      message: `failed to find currentUser Interview ${error}`
    })

  }

}




export const getInterviewReport = async (req, res) => {

  try {

    const interview = await Interview.findById(
      req.params.id
    )


    if (!interview) {

      return res.status(404).json({
        message: "Interview not found"
      });

    }


    const totalQuestions = interview.questions.length;


    let totalConfidence = 0;

    let totalCommunication = 0;

    let totalCorrectness = 0;


    interview.questions.forEach((q) => {

      totalConfidence += q.confidence || 0;

      totalCommunication += q.communication || 0;

      totalCorrectness += q.correctness || 0;

    });


    const avgConfidence = totalQuestions
      ? totalConfidence / totalQuestions
      : 0;


    const avgCommunication = totalQuestions
      ? totalCommunication / totalQuestions
      : 0;


    const avgCorrectness = totalQuestions
      ? totalCorrectness / totalQuestions
      : 0;


    return res.json({

      finalScore: interview.finalScore,

      confidence: Number(
        avgConfidence.toFixed(1)
      ),

      communication: Number(
        avgCommunication.toFixed(1)
      ),

      correctness: Number(
        avgCorrectness.toFixed(1)
      ),

      questionWiseScore: interview.questions

    });


  } catch (error) {

    return res.status(500).json({
      message: `failed to find currentUser Interview report ${error}`
    })

  }

}