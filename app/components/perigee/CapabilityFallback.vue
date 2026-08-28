<script setup lang="ts">
defineProps<{ kind: 'webgl2' | 'asset' }>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <section class="capability-fallback" role="alert">
    <p class="fallback-kicker">
      <span class="kicker-dot" aria-hidden="true" />
      Perigee
    </p>
    <h1>{{ kind === 'webgl2' ? 'This sky needs WebGL 2.' : 'The sky did not arrive.' }}</h1>
    <p class="fallback-body">
      {{ kind === 'webgl2'
        ? 'Open Perigee in a current desktop browser with hardware acceleration enabled.'
        : 'A required visual asset could not be loaded. Your selections are still here.' }}
    </p>
    <button v-if="kind === 'asset'" type="button" @click="emit('retry')">Retry</button>
  </section>
</template>
