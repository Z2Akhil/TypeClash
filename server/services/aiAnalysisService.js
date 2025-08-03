const { ChatOpenAI } = require("@langchain/openai");
require("dotenv").config();

const model = new ChatOpenAI({
  modelName: "llama3-70b-8192",
  temperature: 0.7,
  configuration: {
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1", // This tells Langchain to use Groq
  },
});


async function getTypingAnalysis(stats) {
const prompt = `
You are a professional typing coach.

Analyze the following typing stats and provide:
- A short praise sentence based on the user's strengths.
- Then, list **2–3 specific improvement tips** as **bullet points** (use dashes or markdown format).
- Tailor tips to performance: speed, accuracy, errors, etc.
- Be friendly, professional, and concise.

Stats:
- Words Per Minute (WPM): ${stats.wpm}
- Accuracy: ${stats.accuracy}%
- Errors: ${stats.errors}
- Difficulty Level: ${stats.difficulty}
- Time Taken: ${stats.timeTaken} seconds

Respond in this format:

**Great job!** [Short praise]

**Here are your improvement tips:**
- Tip 1
- Tip 2
- Tip 3 (optional)
`;

  try {
    const response = await model.invoke([{ role: "user", content: prompt }]);
    return response.content;
  } catch (err) {
    console.error("Groq AI error:", err);
    return "Sorry, we couldn't generate an analysis at the moment.";
  }
}

module.exports = { getTypingAnalysis };
