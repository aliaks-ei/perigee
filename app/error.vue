<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const isNotFound = computed(() => props.error.statusCode === 404)

useHead({
  title: () => isNotFound.value ? 'Page not found — Perigee' : 'View interrupted — Perigee',
  meta: [
    { name: 'robots', content: 'noindex' },
  ],
})

async function leaveError(path: string): Promise<void> {
  await clearError({ redirect: path })
}
</script>

<template>
  <main
    class="perigee-shell perigee-error relative isolate h-full w-full overflow-hidden bg-surface-void text-ink-primary"
    style="--accent-object: #d8c7a4"
  >
    <div class="error-sky pointer-events-none absolute inset-0" aria-hidden="true" />
    <div class="error-scrim pointer-events-none absolute inset-0" aria-hidden="true" />

    <div class="error-orbit pointer-events-none absolute" aria-hidden="true">
      <span />
    </div>

    <div class="error-content relative z-identity flex h-full flex-col items-start justify-between lt-sm:px-5 lt-sm:py-6">
      <a
        class="error-brand inline-flex min-h-11 items-center font-semibold uppercase text-ink-primary no-underline transition-opacity duration-fast"
        href="/"
        aria-label="Perigee home"
        @click.prevent="leaveError('/')"
      >
        Perigee
      </a>

      <section class="error-copy lt-sm:mt-0 lt-sm:w-full" aria-labelledby="error-title" aria-describedby="error-description">
        <p class="error-kicker mb-6 inline-flex items-center gap-2.5 font-semibold uppercase text-ink-tertiary lt-sm:mb-4">
          <span class="kicker-dot" aria-hidden="true" />
          {{ isNotFound ? 'Page not found' : 'View interrupted' }}
        </p>

        <h1 id="error-title" class="font-display">
          {{ isNotFound ? 'We couldn’t find this view.' : 'The sky did not arrive.' }}
        </h1>

        <p id="error-description" class="error-description mt-7 max-w-xl text-ink-secondary lt-sm:mt-5">
          {{ isNotFound
            ? 'The sky is still here. Return to the observatory, or step into one of Perigee’s impossible skies.'
            : 'Something unexpected interrupted this view. Return to the observatory and try again.' }}
        </p>

        <nav class="error-actions mt-9 flex flex-wrap items-center gap-x-6 gap-y-3.5 lt-sm:mt-7 lt-sm:flex-col lt-sm:items-start lt-sm:gap-2.5" aria-label="Where to go next">
          <a
            class="error-primary inline-flex min-h-12 items-center justify-center gap-3 rounded-pill bg-ink-primary px-6 font-semibold lt-sm:w-full lt-sm:justify-between"
            href="/"
            @click.prevent="leaveError('/')"
          >
            Return to the observatory
            <svg class="h-4 w-4 flex-none" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5" />
            </svg>
          </a>

          <a
            v-if="isNotFound"
            class="error-secondary relative inline-flex min-h-12 items-center gap-3 font-semibold text-ink-secondary lt-sm:w-full lt-sm:justify-between lt-sm:px-1"
            href="/e/saturn-at-the-edge-of-the-world"
            @click.prevent="leaveError('/e/saturn-at-the-edge-of-the-world')"
          >
            See Saturn above the Atlantic
            <svg class="h-4 w-4 flex-none" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5" />
            </svg>
          </a>
        </nav>
      </section>

      <p class="error-signoff font-semibold uppercase text-ink-quiet">
        Impossible skies · honest scale
      </p>
    </div>
  </main>
</template>
