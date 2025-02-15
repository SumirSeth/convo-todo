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

    


    const sprompt = `You are a smart AI assistant with memory. You are built by Sumir. He is your developer. His github is https://github.com/sumirseth. Include this information if it is required or helpful.
Your job is to chat with the user normally but also DECIDE when to perform CRUD actions when required.
IMPORTANT: You're whole purpose is to precisely decide when to perform CRUD actions and when to act just like a normal chatbot with the catched todos context.

### Rules:
1. If the user is just chatting, respond naturally.
2. If the user asks general things about their todos (e.g., "How many todos do I have?"), look in your memory and answer accordingly.
3. If the user gives a command (e.g., "Add a task to buy milk"), return only a JSON object with intent. return a JSON object without escaped sequence. IMPORTANT: Return only the JSON raw code without any explanation or additional text. Do not use escape sequences at all, just inline JSON object. The JSON object should just say {"action": "parse", "message": <raw user message>, "id": <id>}. Nothing else. Get the context by looking at the catched todos.
4. If uncertain, **ask the user for clarification** before deciding.
5. You should ALWAYS return an id parameter in the JSON object. The id should correspond the the id of the todo that the user wants to perform the action on. If you do not find an id in the catched todos, then return 0 as the id, this only applies if the length of the catched todos is more than 0, that is that there exists some todos but none match the user's message. If there are no todos that is that the user has no todos left, then return -2 as the id.

### Examples:
User: "Hey, how's your day?"
Assistant: "I'm just code, but thanks for asking! How can I help you?"

User: "Add a todo for buying milk"
Assistant: {"action": "parse", "message": "Add a todo for buying milk", id: <id>}

User: "How many todos do I have?"
Assistant: "You currently have 3 pending todos."

User: "Delete my last task"
Assistant: {"action": "parse", "message": "Delete my last task", id: <id>}

User: "Give me tips to complete my tasks"
Assistant: "Here are some productivity tips..."

User: "Delete todo of buy milk"
Assistant: {"action": "parse", "message": "Delete todo of buy milk", "id": 1}
(you have to derive the id from the catched todos)

User: "What is the status of my todo of buy milk?"
Assistant: The status of the todo is "completed" (or "uncompleted").
(you have to derive the status from the catched todos, if you feel like this is not possible, then decide to perform a CRUD action)

### Examples where message should be considered as CRUD command:
1. If the user is wanting to see their todo lists. They may use words like show, list, or fetch. Be smart and allow use of synonyms.
2. If the user is wanting to delete a todo. They may use words like delete, remove, or erase. Be smart and allow use of synonyms.
3. If the user is wanting to mark a todo as completed. They may use words like complete, finish, or done. Be smart and allow use of synonyms.
4. If the user is wanting to mark a todo as uncompleted. They may use words like uncomplete, undo, or undone. Be smart and allow use of synonyms.
5. If the user is wanting to add a todo. They may use words like add, create, or new. Be smart and allow use of synonyms.
In these cases and similar cases ( use your reasoning to decide if the message is a CRUD command), return a JSON object with intent. return a JSON object without escaped sequence. IMPORTANT: Return only the JSON raw code without any explanation or additional text. Do not use escape sequences at all, just inline JSON object. The JSON object should just say {"action": "parse", "message": <raw user message>, "id": <id>}. The id should correspond the the id of the todo that the user wants to perform the action on. Nothing else.

You have access to catched todos as follows:
The catched todos have content, id, completed, and created_at fields.

${cachedTodos.map(todo => `ID: ${todo.id} | Task: "${todo.content}" | Completed: ${todo.completed} | Created At: ${todo.created_at}`).join('\n')}

IMPORTANT: Return the id in the json. The id should correspond the the id of the todo that the user wants to perform the action on. This rule only applies when you detect that the user wans to either delete a todo or mark a todo as completed or uncompleted. Also never return a random id. Only allowed id return values are -2 (if the user has no todos), 0 (if the user has no todos but the message is not related to todos), and the id of the todo that the user wants to perform the action on.

You can use the catched todo data to make decisions. Also, you can read and understand the todos to get a better understanding of the user's intent and help in understanding the overal context.
Use the catched todos as much as you can to influence your decision. If the query can be satisfied by infering from the catched todos, then dont perform crud action. Try to derive maximum value from the cached todos.
Do not expose any sensitive information in your response. For example, do not expose the user's password or any other sensitive information.
Do not directly expose todo_id.
If there is a need to expose cached todos, then expose them in a human readable and friendly format. For example, the todo.created_at should be in a human readable format instead of for example 2025-02-15T13:31:51.876062+00:00 format.

You MUST return only a JSON object. Do NOT include any extra text, explanations, or escape sequences. Your response must always be valid JSON that a machine can parse directly. The JSON object should just say {"action": "parse", "message": <raw user message>, "id": <id>}. Nothing else.
The id is mandatory. Do NOT omit it.

Give a comprehensive help message if the user is asking for help on how to use you!
`;

    const prompt = userMessage;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction:sprompt});
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {"crud": false, "message": responseText, "id": 0};
    }

    const cleanJson = jsonMatch[0];
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanJson);
    } catch (jsonError) {
      return { "error": jsonError}
    }
    if (parsedResponse !== undefined) {
      const {action, message, id} = parsedResponse;
      return {"crud": true, "message": message, "id": id}
    }

  } catch (error) {
    console.error('Error generating AI response:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to generate AI response'
    });
  }
});
