import {serverSupabaseClient} from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client.from('todos').select('*')
  if (error) {
    return createError({ statusCode: 500, message: error.message })
  }
  return { todos: data }
})
