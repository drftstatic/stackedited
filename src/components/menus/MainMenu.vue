<template>
  <div class="side-bar__panel side-bar__panel--menu">
    <div class="side-bar__info">
      <div v-if="loginToken" class="menu-entry menu-entry--info flex flex--row flex--align-center">
        <div class="menu-entry__icon menu-entry__icon--image">
          <user-image :user-id="userId" />
        </div>
        <span>Signed in as <b>{{ loginToken.name }}</b>.</span>
      </div>
      <div v-if="syncToken" class="menu-entry menu-entry--info flex flex--row flex--align-center">
        <div class="menu-entry__icon menu-entry__icon--image">
          <icon-provider :provider-id="currentWorkspace.providerId" />
        </div>
        <span v-if="currentWorkspace.providerId === 'googleDriveAppData'">
          <b>{{ currentWorkspace.name }}</b> synced with your Google Drive app data folder.
        </span>
        <span v-else-if="currentWorkspace.providerId === 'googleDriveWorkspace'">
          <b>{{ currentWorkspace.name }}</b> synced with a <a :href="workspaceLocationUrl" target="_blank">Google Drive folder</a>.
        </span>
        <span v-else-if="currentWorkspace.providerId === 'couchdbWorkspace'">
          <b>{{ currentWorkspace.name }}</b> synced with a <a :href="workspaceLocationUrl" target="_blank">CouchDB database</a>.
        </span>
        <span v-else-if="currentWorkspace.providerId === 'githubWorkspace'">
          <b>{{ currentWorkspace.name }}</b> synced with a <a :href="workspaceLocationUrl" target="_blank">GitHub repo</a>.
        </span>
        <span v-else-if="currentWorkspace.providerId === 'gitlabWorkspace'">
          <b>{{ currentWorkspace.name }}</b> synced with a <a :href="workspaceLocationUrl" target="_blank">GitLab project</a>.
        </span>
      </div>
      <div v-else class="menu-entry menu-entry--info flex flex--row flex--align-center">
        <div class="menu-entry__icon menu-entry__icon--disabled">
          <icon-sync-off />
        </div>
        <span><b>{{ currentWorkspace.name }}</b> not synced.</span>
      </div>
    </div>
    <menu-entry v-if="!loginToken" @click.native="signin">
      <icon-login slot="icon" />
      <div>Sign in with Google</div>
      <span>Sync your main workspace and unlock functionalities.</span>
    </menu-entry>
    <menu-entry @click.native="setPanel('workspaces')">
      <icon-database slot="icon" />
      <div><div v-if="workspaceCount" class="menu-entry__label menu-entry__label--count">{{ workspaceCount }}</div> Workspaces</div>
      <span>Switch to another workspace.</span>
    </menu-entry>
    <hr>
    <menu-entry @click.native="setPanel('sync')">
      <icon-sync slot="icon" />
      <div><div v-if="syncLocationCount" class="menu-entry__label menu-entry__label--count">{{ syncLocationCount }}</div> Synchronize</div>
      <span>Sync your files in the Cloud.</span>
    </menu-entry>
    <menu-entry @click.native="setPanel('publish')">
      <icon-upload slot="icon" />
      <div><div v-if="publishLocationCount" class="menu-entry__label menu-entry__label--count">{{ publishLocationCount }}</div>Publish</div>
      <span>Export your files to the web.</span>
    </menu-entry>
    <menu-entry @click.native="setPanel('history')">
      <icon-history slot="icon" />
      <div>History</div>
      <span>Track and restore file revisions.</span>
    </menu-entry>
    <menu-entry @click.native="fileProperties">
      <icon-view-list slot="icon" />
      <div>File properties</div>
      <span>Add metadata and configure extensions.</span>
    </menu-entry>
    <hr>
    <menu-entry @click.native="setPanel('ai')">
      <icon-message slot="icon" />
      <div>AI Assistant</div>
      <span>Chat with AI to edit and improve your documents.</span>
    </menu-entry>
    <hr>
    <menu-entry @click.native="setPanel('toc')">
      <icon-toc slot="icon" />
      Table of contents
    </menu-entry>
    <menu-entry @click.native="setPanel('help')">
      <icon-help-circle slot="icon" />
      Markdown cheat sheet
    </menu-entry>
    <hr>
    <menu-entry @click.native="setPanel('importExport')">
      <icon-content-save slot="icon" />
      Import/export
    </menu-entry>
    <menu-entry @click.native="print">
      <icon-printer slot="icon" />
      Print
    </menu-entry>
    <hr>
    <menu-entry @click.native="badges">
      <icon-seal slot="icon" />
      <div><div class="menu-entry__label menu-entry__label--count">{{ badgeCount }}/{{ featureCount }}</div> Badges</div>
      <span>List application features and earned badges.</span>
    </menu-entry>
    <menu-entry @click.native="accounts">
      <icon-key slot="icon" />
      <div><div class="menu-entry__label menu-entry__label--count">{{ accountCount }}</div> Accounts</div>
      <span>Manage access to your external accounts.</span>
    </menu-entry>
    <menu-entry @click.native="templates">
      <icon-code-braces slot="icon" />
      <div><div class="menu-entry__label menu-entry__label--count">{{ templateCount }}</div> Templates</div>
      <span>Configure Handlebars templates for your exports.</span>
    </menu-entry>
    <menu-entry @click.native="settings">
      <icon-settings slot="icon" />
      <div>Settings</div>
      <span>Tweak application and keyboard shortcuts.</span>
    </menu-entry>
    <hr>
    <menu-entry @click.native="setPanel('workspaceBackups')">
      <icon-content-save slot="icon" />
      Workspace backups
    </menu-entry>
    <menu-entry @click.native="reset">
      <icon-logout slot="icon" />
      Reset application
    </menu-entry>
    <menu-entry @click.native="about">
      <icon-help-circle slot="icon" />
      About Stackedited
    </menu-entry>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import MenuEntry from './common/MenuEntry';
import providerRegistry from '../../services/providers/common/providerRegistry';
import UserImage from '../UserImage';
import googleHelper from '../../services/providers/helpers/googleHelper';
import syncSvc from '../../services/syncSvc';
import userSvc from '../../services/userSvc';
import store from '../../store';

export default {
  components: {
    MenuEntry,
    UserImage,
  },
  computed: {
    ...mapGetters('workspace', [
      'currentWorkspace',
      'syncToken',
      'loginToken',
    ]),
    userId() {
      return userSvc.getCurrentUserId();
    },
    workspaceLocationUrl() {
      const provider = providerRegistry.providersById[this.currentWorkspace.providerId];
      return provider.getWorkspaceLocationUrl(this.currentWorkspace);
    },
    workspaceCount() {
      return Object.keys(store.getters['workspace/workspacesById']).length;
    },
    syncLocationCount() {
      return Object.keys(store.getters['syncLocation/currentWithWorkspaceSyncLocation']).length;
    },
    publishLocationCount() {
      return Object.keys(store.getters['publishLocation/current']).length;
    },
    templateCount() {
      return Object.keys(store.getters['data/allTemplatesById']).length;
    },
    accountCount() {
      return Object.values(store.getters['data/tokensByType'])
        .reduce((count, tokensBySub) => count + Object.values(tokensBySub).length, 0);
    },
    badgeCount() {
      return store.getters['data/allBadges'].filter((badge) => badge.isEarned).length;
    },
    featureCount() {
      return store.getters['data/allBadges'].length;
    },
  },
  methods: {
    ...mapActions('data', {
      setPanel: 'setSideBarPanel',
    }),
    async signin() {
      try {
        await googleHelper.signin();
        syncSvc.requestSync();
      } catch (e) {
        // Cancel
      }
    },
    async fileProperties() {
      try {
        await store.dispatch('modal/open', 'fileProperties');
      } catch (e) {
        // Cancel
      }
    },
    print() {
      window.print();
    },
    async settings() {
      try {
        await store.dispatch('modal/open', 'settings');
      } catch (e) { /* Cancel */ }
    },
    async templates() {
      try {
        await store.dispatch('modal/open', 'templates');
      } catch (e) { /* Cancel */ }
    },
    async accounts() {
      try {
        await store.dispatch('modal/open', 'accountManagement');
      } catch (e) { /* Cancel */ }
    },
    async badges() {
      try {
        await store.dispatch('modal/open', 'badgeManagement');
      } catch (e) { /* Cancel */ }
    },
    async reset() {
      try {
        await store.dispatch('modal/open', 'reset');
        localStorage.setItem('resetStackEdit', '1');
        window.location.reload();
      } catch (e) { /* Cancel */ }
    },
    about() {
      store.dispatch('modal/open', 'about');
    },
  },
};
</script>
