import { serverSupabaseClient } from '#supabase/server'

interface Todo {
  id?: number
  content: string
  completed: boolean
  created_at?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event) // Get request body
  if (!body?.content) {
    return createError({ statusCode: 400, message: "Content is required" })
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client.from('todos').insert([{ content: body.content, completed: body.completed }])

  if (error) {
    return createError({ statusCode: 500, message: error.message })
  }

  return { message: "Todo added!", todo: data }
})
