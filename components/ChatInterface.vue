<template>
  <div class="flex flex-col h-svh bg-stone-900">
    <!-- Chat Container -->
    <div class="flex flex-col h-full max-w-3xl mx-auto w-full p-4">
      <!-- Messages Area -->
      <div class="flex-1 overflow-y-auto mb-4 space-y-4 " ref="messagesContainer">
        <div v-for="(msg, index) in messages" 
             :key="index"
             class="flex"
             :class="msg.sender === 'user' ? 'justify-end' : 'justify-start'">
          <div :class="[
            'max-w-[80%] px-4 py-2 rounded-2xl',
            msg.sender === 'user' 
              ? 'bg-teal-700 text-white rounded-br-sm' 
              : 'bg-stone-700 text-gray-100 rounded-bl-sm'
          ]">
            <div v-html="renderMarkdown(msg.text)" class="prose prose-invert text-white" />
          </div>
        </div>
        <Icon v-if="isLoading" name="eos-icons:three-dots-loading" class="w-10 h-10 text-white"/>
      </div>

      <!-- Input Area -->
      <div class="flex items-center gap-2 bg-stone-800 p-6 rounded-xl">
        <input v-model="userInput" 
               @keyup.enter="sendMessage"
               class="flex-1 bg-stone-700 text-white rounded-lg px-4 py-2.5 focus:outline-none" 
               type="text" 
               placeholder="Type a message..." />
        <button @click="sendMessage"
                class="flex justify-center items-center p-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!userInput.trim()">
          <Icon name="material-symbols:send-rounded" class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { render } from 'vue'

const {renderMarkdown} = useUseMarkdown()
// const prompt = "when is the blogs section coming out?";
// const result = await model.generateContent(prompt);
const isLoading = ref(false)
const messagesContainer = ref(null)
const messages = ref([
  // Example messages:
  { text: 'Hello! How can I help you?', sender: 'bot' }
])
const userInput = ref('')
watch(() => messages.value, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}, { deep: true })


const sendMessage = async() => {
  if (!userInput.value.trim()) return
  messages.value.push({ text: userInput.value, sender: 'user' })
  const userText = userInput.value.trim()
  userInput.value = ''
  isLoading.value = true
  try {

    const response = await $fetch('/api/decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText })
    })

    const { crud, message } = await response

    if (!crud) {
      messages.value.push({ text: message, sender: 'bot' })
      return
    } else {
      const response2 = await $fetch('/api/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message })
    })

    const { apiResponse, action, parameters, complimentaryMessage, raw } = await response2

    let stringTodoList = ''
    if (action === 'list_todos') {
      stringTodoList = apiResponse.todos.map(todo => `- ${todo.content}`).join('\n') || ""
      const { todos } = apiResponse
    }
    const m = complimentaryMessage +"\n" + stringTodoList || 'No response received'
    
    messages.value.push({ text: m, sender: 'bot' })
      return
    }
    
  } catch (error) {
    console.error('Error sending message:', error)
    messages.value.push({ text: `Error sending message. Error: ${error.message}`, sender: 'bot' })
  } finally {
    isLoading.value = false
  }

}
</script>
<style>
::-webkit-scrollbar {
  width: 0px;
}

</style>