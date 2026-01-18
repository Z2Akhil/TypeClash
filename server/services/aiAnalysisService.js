const { ChatOpenAI } = require("@langchain/openai");
require("dotenv").config();

const model = new ChatOpenAI({
  modelName: "llama-3.3-70b-versatile",
  temperature: 0.7,
  configuration: {
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1", // This tells Langchain to use Groq
  },
});


async function getTypingAnalysis(stats) {
  const prompt = `
You are an expert typing coach with years of experience helping typists improve their speed and accuracy.

## User's Typing Performance:
- **Speed**: ${stats.wpm} WPM (Words Per Minute)
- **Accuracy**: ${stats.accuracy}%
- **Errors Made**: ${stats.errors}
- **Test Duration**: ${stats.timeTaken} seconds
- **Difficulty Level**: ${stats.difficulty}

## Your Task:
Analyze these stats and provide personalized feedback.

### Guidelines:
1. **Start with brief encouragement** (1 sentence) that acknowledges their specific achievement (e.g., if accuracy is high, praise that; if speed is good, mention that).

2. **Provide 2-3 actionable tips** tailored to their weak points:
   - If WPM < 30: Focus on touch typing basics, home row positioning
   - If WPM 30-50: Suggest rhythm practice, reducing pauses between words
   - If WPM 50-70: Recommend advanced techniques like word chunking
   - If WPM > 70: Fine-tuning tips for expert performance
   - If Accuracy < 90%: Emphasize slowing down, focusing on problem keys
   - If Errors > 10: Suggest specific practice for commonly missed characters
   - For "hard" difficulty: Tips for handling punctuation and special characters

3. **Keep it concise** - each tip should be 1-2 sentences max.

## Response Format:
🎯 [One sentence of personalized encouragement]

**Tips to level up:**
- 💡 [Tip 1 - most important based on their stats]
- 💡 [Tip 2 - secondary improvement area]
- 💡 [Tip 3 - optional, only if there's a clear third area to improve]
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
