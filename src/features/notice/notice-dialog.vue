<script setup lang="ts">
defineComponentJson({})

withDefaults(defineProps<{
  visible?: boolean
  title?: string
  content?: string
}>(), {
  visible: false,
  title: '',
  content: '',
})

const emit = defineEmits<{
  confirm: []
  close: []
}>()
</script>

<template>
  <t-dialog
    :visible="visible"
    :title="title"
    :content="content"
    confirm-btn="知道了"
    close-on-overlay-click
    @confirm="emit('confirm')"
    @close="emit('close')"
  />
</template>
