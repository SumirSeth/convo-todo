import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) {
    return createError({ statusCode: 400, message: "Todo ID is required" })
  }

  const client = await serverSupabaseClient(event)
  const { data, error } = await client.from('todos').update({ completed: false }).eq('id', id)

  if (error) {
    return createError({ statusCode: 500, message: error.message })
  }

  return { message: "Todo marked as uncompleted!", todo: data }
})
