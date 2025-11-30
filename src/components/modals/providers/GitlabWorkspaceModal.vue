<template>
  <modal-inner aria-label="Synchronize with GitLab">
    <div class="modal__content">
      <div class="modal__image">
        <icon-provider provider-id="gitlab" />
      </div>
      <p>Create a workspace synced with a <b>GitLab</b> project folder.</p>
      <form-entry label="Project URL" error="projectUrl">
        <input slot="field" v-model.trim="projectUrl" class="textfield" type="text" @keydown.enter="resolve()">
        <div class="form-entry__info">
          <b>Example:</b> {{ config.token.serverUrl }}/path/to/project
        </div>
      </form-entry>
      <form-entry label="Folder path" info="optional">
        <input slot="field" v-model.trim="path" class="textfield" type="text" @keydown.enter="resolve()">
        <div class="form-entry__info">
          If not supplied, the root folder will be used.
        </div>
      </form-entry>
      <form-entry label="Branch" info="optional">
        <input slot="field" v-model.trim="branch" class="textfield" type="text" @keydown.enter="resolve()">
        <div class="form-entry__info">
          If not supplied, the <code>master</code> branch will be used.
        </div>
      </form-entry>
    </div>
    <div class="modal__button-bar">
      <button class="button" @click="config.reject()">Cancel</button>
      <button class="button button--resolve" @click="resolve()">Ok</button>
    </div>
  </modal-inner>
</template>

<script>
import utils from '../../../services/utils';
import modalTemplate from '../common/modalTemplate';

export default modalTemplate({
  data: () => ({
    branch: '',
    path: '',
  }),
  computedLocalSettings: {
    projectUrl: 'gitlabWorkspaceProjectUrl',
  },
  methods: {
    resolve() {
      const projectPath = utils.parseGitlabProjectPath(this.projectUrl);
      if (!projectPath) {
        this.setError('projectUrl');
      } else {
        const path = this.path && this.path.replace(/^\//, '');
        const url = utils.addQueryParams('app', {
          providerId: 'gitlabWorkspace',
          serverUrl: this.config.token.serverUrl,
          projectPath,
          branch: this.branch || 'master',
          path: path || undefined,
          sub: this.config.token.sub,
        }, true);
        this.config.resolve();
        window.open(url);
      }
    },
  },
});
</script>
