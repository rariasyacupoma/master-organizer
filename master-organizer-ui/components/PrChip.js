import { computed } from 'vue'
import { envTagsForPr } from './store.js'

export default {
  name: 'PrChip',
  props: { pr: Object },
  setup(props) {
    const envTags = computed(() => envTagsForPr(props.pr))
    const repoShort = computed(() => {
      const r = props.pr.repo
      return r.length > 18 ? r.slice(0, 17) + '…' : r
    })
    return { envTags, repoShort }
  },
  template: `
    <a class="pr-chip" :class="pr.state" :href="pr.url" target="_blank">
      <span class="pr-chip-icon">{{ pr.state === 'merged' ? '✓' : '●' }}</span>
      <span class="pr-chip-repo" :title="pr.repo">{{ repoShort }}</span>
      <span class="pr-chip-num">#{{ pr.number }}</span>
      <span v-if="envTags" class="pr-env-tags">
        <span class="env-tag" :class="envTags.queued.on ? 'queued-on' : 'queued-off'" :title="envTags.queued.title">Queued</span>
        <span class="env-tag" :class="envTags.qa.on     ? 'qa-on'     : 'qa-off'"     :title="envTags.qa.title">QA</span>
        <span class="env-tag" :class="envTags.prod.on   ? 'prod-on'   : 'prod-off'"   :title="envTags.prod.title">Prod</span>
      </span>
    </a>
  `,
}
