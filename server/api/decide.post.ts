import { defineEventHandler, readBody, createError } from 'h3';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const apiKey = config.public.geminiApiKey
    // const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const body = await readBody(event);
    const userMessage = body?.message || '';
    const cachedTodos = body?.cachedTodos || [];

    if (!userMessage) {
      throw new Error('Message is required');
    }

    


    const sprompt = `You are a smart AI assistant with memory. 
Your job is to chat with the user normally but also DECIDE when to perform CRUD actions when required.

### Rules:
1. If the user is just chatting, respond naturally.
2. If the user asks general things about their todos (e.g., "How many todos do I have?"), look in your memory and answer accordingly.
3. If the user gives a command (e.g., "Add a task to buy milk"), return only a JSON object with intent. return a JSON object without escaped sequence. IMPORTANT: Return only the JSON raw code without any explanation or additional text. Do not use escape sequences at all, just inline JSON object. The JSON object should just say {"action": "parse", "message": <raw user message>}. Nothing else.
4. If uncertain, **ask the user for clarification** before deciding.

### Examples:
User: "Hey, how's your day?"
Assistant: "I'm just code, but thanks for asking! How can I help you?"

User: "Add a todo for buying milk"
Assistant: {"action": "parse", "message": "Add a todo for buying milk" }

User: "How many todos do I have?"
Assistant: "You currently have 3 pending todos."

User: "Delete my last task"
Assistant: {"action": "parse", "message": "Delete my last task"}

User: "Give me tips to complete my tasks"
Assistant: "Here are some productivity tips..."

### Examples where message should be considered as CRUD command:
1. If the user is wanting to see their todo lists. They may use words like show, list, or fetch. Be smart and allow use of synonyms.
2. If the user is wanting to delete a todo. They may use words like delete, remove, or erase. Be smart and allow use of synonyms.
3. If the user is wanting to mark a todo as completed. They may use words like complete, finish, or done. Be smart and allow use of synonyms.
4. If the user is wanting to mark a todo as uncompleted. They may use words like uncomplete, undo, or undone. Be smart and allow use of synonyms.
5. If the user is wanting to add a todo. They may use words like add, create, or new. Be smart and allow use of synonyms.
In these cases and similar cases ( use your reasoning to decide if the message is a CRUD command), return a JSON object with intent. return a JSON object without escaped sequence. IMPORTANT: Return only the JSON raw code without any explanation or additional text. Do not use escape sequences at all, just inline JSON object. The JSON object should just say {"action": "parse", "message": <raw user message>}. Nothing else.

You have access to catched todos as follows:

${cachedTodos.map(todo => `- ${todo.content}`).join('\n')}

You can use the catched todo data to make decisions. Also, you can read and understand the todos to get a better understanding of the user's intent and help in understanding the overal context.

`;

    const prompt = userMessage;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction:sprompt});
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {"crud": false, "message": responseText};
    }

    const cleanJson = jsonMatch[0];
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanJson);
    } catch (jsonError) {
      return { "error": jsonError}
    }
    if (parsedResponse !== undefined) {
      const {action, message} = parsedResponse;
      return {"crud": true, "message": message}
    }

  } catch (error) {
    console.error('Error generating AI response:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to generate AI response'
    });
  }
});
