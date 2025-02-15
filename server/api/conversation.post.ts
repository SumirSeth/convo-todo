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
    const id = body?.id || 0;

    if (!userMessage) {
      throw new Error('Message is required');
    }

    const sprompt = `You are an API intent parser. Return a JSON object without escaped quotes.
IMPORTANT: Return ONLY raw JSON with no additional text or explanation.
Format:
{"action": "add_todo", "parameters": {"task": "buy milk", id: <id>}, complimentaryMessage: "<complimentary message>"}

Valid actions:
- add_todo
- delete_todo
- mark_todo_completed
- mark_todo_uncompleted
- list_todos

Give empty id if you did not get any id from the user.

Include a short but sweet and polite complimentary message as well in the response coresponding to the action.
For example, if the user asks "What are my todos?", the complimentary message could be "Here are your todos..." or "Here are your tasks...". or "There you go, your todos..." something like this to make the response more personalized. Replace "..." with whatever you find suitable. Make it more personalised and less robotic like. Add some fun to it. Same with other actions as well. Also if the action is list_todo and id is -2, it means that the user has no todos, then return a complimentary message corresponding to that.

`

    const prompt = `Parse this user input: "${userMessage} with id ${id}"`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction: sprompt });
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { error: "No valid JSON found", raw: responseText };
    }

    const cleanJson = jsonMatch[0];
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanJson);

    } catch (jsonError) {
      console.log('Raw response:', responseText);
      console.log('Cleaned JSON:', cleanJson);
      return { error: "Failed to parse JSON", raw: responseText, jsonError: jsonError };
    }
    
    const {action, parameters, complimentaryMessage} = parsedResponse;

    let apiResponse;
    switch (action) {
      case 'add_todo':
        apiResponse = await $fetch('/api/todos', {
          method: "POST",
          body: { content: parameters.task, completed: false }
        })

        break;
      case 'delete_todo':
        apiResponse = await $fetch(`/api/todos/${parameters.id}`, {method: 'DELETE'})
        break;
      case 'list_todos':
        apiResponse = await $fetch('/api/todos', {method: 'GET'})
        break;

      case 'mark_todo_completed':
        apiResponse = await $fetch(`/api/todos/true/${parameters.id}`, {method: 'PATCH'})
        break;

      case 'mark_todo_uncompleted':
        apiResponse = await $fetch(`/api/todos/false/${parameters.id}`, {method: 'PATCH'})
        break;
      
      default:
        return { error: "Invalid action", raw: responseText };
    }


    return {"apiResponse": apiResponse, "action": action, "parameters": parameters, "complimentaryMessage": complimentaryMessage, "raw": responseText};

  } catch (error) {
    console.error('Error generating AI response:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to generate AI response'
    });
  }
});
