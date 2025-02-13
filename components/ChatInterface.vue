<template>
  <div class="flex flex-col h-screen bg-stone-900">
    <!-- Chat Container -->
    <div class="flex flex-col h-full max-w-3xl mx-auto w-full p-4">
      <!-- Messages Area -->
      <div class="flex-1 overflow-y-auto mb-4 space-y-4" ref="messagesContainer">
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
            {{ msg.text }}
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="flex items-center gap-2 bg-stone-800 p-3 rounded-xl">
        <input v-model="userInput" 
               @keyup.enter="sendMessage"
               class="flex-1 bg-stone-700 text-white rounded-lg px-4 py-2.5 focus:outline-none" 
               type="text" 
               placeholder="Type a message..." />
        <button @click="sendMessage"
                class="flex justify-center items-center p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!userInput.trim()">
          <Icon name="material-symbols:send-rounded" class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const messages = ref([
  // Example messages:
  { text: 'Hello! How can I help you?', sender: 'bot' }
])
const userInput = ref('')

const sendMessage = () => {
  if (!userInput.value.trim()) return
  messages.value.push({ text: userInput.value, sender: 'user' })
  // Here, you'll later call your API to process the message.
  userInput.value = ''
}
</script>
