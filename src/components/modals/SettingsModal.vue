<template>
  <modal-inner class="modal__inner-1--settings" aria-label="Settings">
    <div class="modal__content">
      <div class="tabs flex flex--row">
        <tab :active="tab === 'custom'" @click="tab = 'custom'">
          Custom settings
        </tab>
        <tab :active="tab === 'default'" @click="tab = 'default'">
          Default settings
        </tab>
      </div>
      <div v-if="tab === 'custom'" class="form-entry" role="tabpanel" aria-label="Custom settings">
        <label class="form-entry__label">YAML</label>
        <div class="form-entry__field form-entry__field--code-editor">
          <code-editor key="custom-settings" lang="yaml" :value="customSettings" @changed="setCustomSettings" />
        </div>
      </div>
      <div v-else-if="tab === 'default'" class="form-entry" role="tabpanel" aria-label="Default settings">
        <label class="form-entry__label">YAML</label>
        <div class="form-entry__field form-entry__field--code-editor">
          <code-editor key="default-settings" lang="yaml" :value="defaultSettings" disabled="true" />
        </div>
      </div>
      <div class="modal__error modal__error--settings">{{ error }}</div>
    </div>
    <div class="modal__button-bar">
      <button class="button" @click="config.reject()">Cancel</button>
      <button class="button button--resolve" @click="resolve">Ok</button>
    </div>
  </modal-inner>
</template>

<script>
import yaml from 'js-yaml';
import { mapGetters } from 'vuex';
import ModalInner from './common/ModalInner';
import Tab from './common/Tab';
import CodeEditor from '../CodeEditor';
import defaultSettings from '../../data/defaults/defaultSettings.yml';
import store from '../../store';
import badgeSvc from '../../services/badgeSvc';

const emptySettings = `# Add your custom settings here to override the
# default settings.
`;

export default {
  components: {
    ModalInner,
    Tab,
    CodeEditor,
  },
  data: () => ({
    tab: 'custom',
    defaultSettings,
    customSettings: null,
    error: null,
  }),
  computed: {
    ...mapGetters('modal', [
      'config',
    ]),
    strippedCustomSettings() {
      return this.customSettings === emptySettings ? '\n' : this.customSettings.replace(/\t/g, '  ');
    },
  },
  created() {
    const settings = store.getters['data/settings'];
    this.setCustomSettings(settings === '\n' ? emptySettings : settings);
  },
  methods: {
    setCustomSettings(value) {
      this.customSettings = value;
      try {
        yaml.load(this.strippedCustomSettings);
        this.error = null;
      } catch (e) {
        this.error = e.message;
      }
    },
    async resolve() {
      if (!this.error) {
        const settings = this.strippedCustomSettings;
        await store.dispatch('data/setSettings', settings);
        const customSettings = yaml.load(settings);
        if (customSettings.shortcuts) {
          badgeSvc.addBadge('changeShortcuts');
        }
        const computedSettings = store.getters['data/computedSettings'];
        const customSettingsCount = Object
          .keys(customSettings)
          .filter((key) => key !== 'shortcuts' && computedSettings[key])
          .length;
        if (customSettingsCount) {
          badgeSvc.addBadge('changeSettings');
        }
        this.config.resolve(settings);
      }
    },
  },
};
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.modal__inner-1.modal__inner-1--settings {
  max-width: 560px;
}

.modal__error--settings {
  white-space: pre-wrap;
  font-family: $font-family-monospace;
  font-size: $font-size-monospace;
}
</style>
