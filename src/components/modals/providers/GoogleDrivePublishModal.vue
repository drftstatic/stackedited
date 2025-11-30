<template>
  <modal-inner aria-label="Publish to Google Drive">
    <div class="modal__content">
      <div class="modal__image">
        <icon-provider provider-id="googleDrive" />
      </div>
      <p>Publish <b>{{ currentFileName }}</b> to your <b>Google Drive</b> account.</p>
      <form-entry label="Folder ID" info="optional">
        <input slot="field" v-model.trim="folderId" class="textfield" type="text" @keydown.enter="resolve()">
        <div class="form-entry__info">
          If not supplied, the file will be created in your Drive root folder.
        </div>
        <div class="form-entry__actions">
          <a href="javascript:void(0)" @click="openFolder">Choose folder</a>
        </div>
      </form-entry>
      <form-entry label="Existing file ID" info="optional">
        <input slot="field" v-model.trim="fileId" class="textfield" type="text" @keydown.enter="resolve()">
        <div class="form-entry__info">
          This will overwrite the file on the server.
        </div>
      </form-entry>
      <div class="form-entry">
        <div class="form-entry__radio">
          <label>
            <input v-model="format" type="radio" value="markdown"> Export Markdown
          </label>
        </div>
        <div class="form-entry__radio">
          <label>
            <input v-model="format" type="radio" value="html"> Export HTML
          </label>
        </div>
      </div>
      <form-entry v-if="format === 'html'" label="Template">
        <select slot="field" v-model="selectedTemplate" class="textfield" @keydown.enter="resolve()">
          <option v-for="(template, id) in allTemplatesById" :key="id" :value="id">
            {{ template.name }}
          </option>
        </select>
        <div class="form-entry__actions">
          <a href="javascript:void(0)" @click="configureTemplates">Configure templates</a>
        </div>
      </form-entry>
      <div class="modal__info">
        <b>ProTip:</b> You can provide a value for <code>title</code> in the <a href="javascript:void(0)" @click="openFileProperties">file properties</a>.
      </div>
    </div>
    <div class="modal__button-bar">
      <button class="button" @click="config.reject()">Cancel</button>
      <button class="button button--resolve" @click="resolve()">Ok</button>
    </div>
  </modal-inner>
</template>

<script>
import googleHelper from '../../../services/providers/helpers/googleHelper';
import googleDriveProvider from '../../../services/providers/googleDriveProvider';
import modalTemplate from '../common/modalTemplate';
import store from '../../../store';

export default modalTemplate({
  data: () => ({
    fileId: '',
  }),
  computedLocalSettings: {
    folderId: 'googleDriveFolderId',
    selectedTemplate: 'googleDrivePublishTemplate',
    format: 'googleDrivePublishFormat',
  },
  methods: {
    openFolder() {
      return store.dispatch(
        'modal/hideUntil',
        googleHelper.openPicker(this.config.token, 'folder')
          .then((folders) => {
            if (folders[0]) {
              store.dispatch('data/patchLocalSettings', {
                googleDriveFolderId: folders[0].id,
              });
            }
          }),
      );
    },
    resolve() {
      // Return new location
      const location = googleDriveProvider.makeLocation(this.config.token, this.fileId);
      if (this.format === 'html') {
        location.templateId = this.selectedTemplate;
      }
      this.config.resolve(location);
    },
  },
});
</script>
