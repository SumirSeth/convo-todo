export default defineNuxtRouteMiddleware(async (to, from) => {
    // const event = useRequestEvent()
    // if (!event) return
    // const client = await serverSupabaseClient(event)
    // const { data, error } = client.from('todos').select('*')
    const todoCache = useState<any[]>('todoCache', () => [])
    if (todoCache.value.length === 0) {
        const response = await $fetch<{ todos: any[] }>('/api/todos', {method: 'GET'})
        const data = response.todos
        if (data) {
            todoCache.value = data
        }
    }
    
})
