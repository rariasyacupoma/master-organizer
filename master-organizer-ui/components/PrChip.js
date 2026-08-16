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
      <span class="pr-chip-sep">·</span>
      <span class="pr-chip-num">#{{ pr.number }}</span>
      <span v-if="pr.state === 'merged' && pr.version" class="pr-chip-version">{{ pr.version }}</span>
      <span class="pr-env-tags">
        <span class="env-tag" :class="envTags ? (envTags.queued.on ? 'queued-on' : 'queued-off') : 'queued-off'" :title="envTags ? envTags.queued.title : ''">Queued</span>
        <span class="env-tag" :class="envTags ? (envTags.qa.on     ? 'qa-on'     : 'qa-off')     : 'qa-off'"     :title="envTags ? envTags.qa.title    : ''">QA</span>
        <span class="env-tag" :class="envTags ? (envTags.prod.on   ? 'prod-on'   : 'prod-off')   : 'prod-off'"   :title="envTags ? envTags.prod.title  : ''">Prod</span>
      </span>
    </a>
  `,
}
