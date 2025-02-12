import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) {
    return createError({ statusCode: 400, message: "Todo ID is required" })
  }

  const client = await serverSupabaseClient(event)
  const { error } = await client.from('todos').delete().eq('id', id)

  if (error) {
    return createError({ statusCode: 500, message: error.message })
  }

  return { message: "Todo deleted!" }
})
