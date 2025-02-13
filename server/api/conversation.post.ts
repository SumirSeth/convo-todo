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

    if (!userMessage) {
      throw new Error('Message is required');
    }

    const prompt = `You are an API intent parser. Return a JSON object without escaped quotes.
IMPORTANT: Return ONLY raw JSON with no additional text or explanation.
Format:
{"action": "add_todo", "parameters": {"task": "buy milk"}}

Valid actions:
- add_todo
- delete_todo
- list_todos

Parse this user input: "${userMessage}"`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
    
    const {action, parameters} = parsedResponse;

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
      
      default:
        return { error: "Invalid action", raw: responseText };
    }


    return {"apiResponse": apiResponse, "raw": responseText};

  } catch (error) {
    console.error('Error generating AI response:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to generate AI response'
    });
  }
});
