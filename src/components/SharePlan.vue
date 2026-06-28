<script setup lang="ts">
/**
 * Co-parent share sheet. Builds a local share link (plan encoded in the URL
 * hash) and offers a QR code, copy-link, and the native share sheet. No data
 * leaves the device until the parent actually sends the link.
 */
import { computed, ref } from 'vue'
import qrcode from 'qrcode-generator'
import { buildSharedPlan, buildShareUrl } from '../services/share'
import { notify } from '../store'
import Icon from './Icon.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const plan = computed(() => (props.open ? buildSharedPlan() : { v: 1, kids: [] }))
const url = computed(() => (props.open ? buildShareUrl(plan.value) : ''))
const hasPlan = computed(() => plan.value.kids.length > 0)

const qrSvg = computed(() => {
  if (!props.open || !hasPlan.value) return ''
  const qr = qrcode(0, 'M')
  qr.addData(url.value)
  qr.make()
  return qr.createSvgTag({ cellSize: 4, margin: 1, scalable: true })
})

const copied = ref(false)
async function copy() {
  try {
    await navigator.clipboard.writeText(url.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    notify("Couldn't copy — try the share button instead.")
  }
}

const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share
async function nativeShare() {
  try {
    await navigator.share({
      title: 'Our holiday plan',
      text: 'Here are the holiday activities I saved for the kids.',
      url: url.value
    })
  } catch {
    /* user cancelled — ignore */
  }
}
</script>

<template>
  <Transition name="sheet">
    <div v-if="open" class="modal-overlay" @click.self="emit('close')">
      <section class="sheet" role="dialog" aria-modal="true" aria-label="Share plan">
        <div class="sheet-bar">
          <span class="sheet-grip" />
          <button class="install-x sheet-close" aria-label="Close" @click="emit('close')">✕</button>
        </div>
        <div class="sheet-body">
          <h2 class="detail-title">Share with a co-parent</h2>

          <template v-if="hasPlan">
            <p class="detail-desc">
              Scan the code or send the link. They can import the whole plan to their own device —
              nothing is stored online.
            </p>

            <div class="qr-wrap" v-html="qrSvg" />

            <div class="detail-actions">
              <button class="primary-btn" @click="copy">
                <Icon name="check" v-if="copied" :size="16" />
                <Icon name="share" v-else :size="16" />
                {{ copied ? 'Link copied' : 'Copy link' }}
              </button>
              <button v-if="canNativeShare" class="primary-btn alt" @click="nativeShare">
                <Icon name="share" :size="16" /> Share…
              </button>
            </div>
          </template>

          <p v-else class="hint">Save some activities first, then you can share the plan.</p>
        </div>
      </section>
    </div>
  </Transition>
</template>
