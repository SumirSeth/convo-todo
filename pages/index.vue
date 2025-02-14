<template>
  <div>
    <ChatInterface />
  </div>
</template>

<script setup lang="ts">

definePageMeta({
  middleware: ['todo-cache'],
})


</script>