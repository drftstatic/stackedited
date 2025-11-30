<template>
  <div v-if="config" class="modal" @keydown.esc.stop="onEscape" @keydown.tab="onTab" @focusin="onFocusInOut" @focusout="onFocusInOut">
    <div v-if="!isSponsor" class="modal__sponsor-banner">
      StackEdit is <a class="not-tabbable" target="_blank" href="https://github.com/benweet/stackedit/">open source</a>, please consider
      <a class="not-tabbable" href="javascript:void(0)" @click="sponsor">sponsoring</a> for just $5.
    </div>
    <component :is="currentModalComponent" v-if="currentModalComponent" />
    <modal-inner v-else aria-label="Dialog">
      <div class="modal__content" v-html="simpleModal.contentHtml(config)" />
      <div class="modal__button-bar">
        <button v-if="simpleModal.rejectText" class="button" @click="config.reject()">{{ simpleModal.rejectText }}</button>
        <button v-if="simpleModal.resolveText" class="button button--resolve" @click="config.resolve()">{{ simpleModal.resolveText }}</button>
      </div>
    </modal-inner>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import simpleModals from '../data/simpleModals';
import editorSvc from '../services/editorSvc';
import syncSvc from '../services/syncSvc';
import googleHelper from '../services/providers/helpers/googleHelper';
import store from '../store';

import ModalInner from './modals/common/ModalInner';
import FilePropertiesModal from './modals/FilePropertiesModal';
import SettingsModal from './modals/SettingsModal';
import TemplatesModal from './modals/TemplatesModal';
import AboutModal from './modals/AboutModal';
import HtmlExportModal from './modals/HtmlExportModal';
import PdfExportModal from './modals/PdfExportModal';
import PandocExportModal from './modals/PandocExportModal';
import LinkModal from './modals/LinkModal';
import ImageModal from './modals/ImageModal';
import SyncManagementModal from './modals/SyncManagementModal';
import PublishManagementModal from './modals/PublishManagementModal';
import WorkspaceManagementModal from './modals/WorkspaceManagementModal';
import AccountManagementModal from './modals/AccountManagementModal';
import BadgeManagementModal from './modals/BadgeManagementModal';
import SponsorModal from './modals/SponsorModal';

// Providers
import GooglePhotoModal from './modals/providers/GooglePhotoModal';
import GoogleDriveAccountModal from './modals/providers/GoogleDriveAccountModal';
import GoogleDriveSaveModal from './modals/providers/GoogleDriveSaveModal';
import GoogleDriveWorkspaceModal from './modals/providers/GoogleDriveWorkspaceModal';
import GoogleDrivePublishModal from './modals/providers/GoogleDrivePublishModal';
import DropboxAccountModal from './modals/providers/DropboxAccountModal';
import DropboxSaveModal from './modals/providers/DropboxSaveModal';
import DropboxPublishModal from './modals/providers/DropboxPublishModal';
import GithubAccountModal from './modals/providers/GithubAccountModal';
import GithubOpenModal from './modals/providers/GithubOpenModal';
import GithubSaveModal from './modals/providers/GithubSaveModal';
import GithubWorkspaceModal from './modals/providers/GithubWorkspaceModal';
import GithubPublishModal from './modals/providers/GithubPublishModal';
import GistSyncModal from './modals/providers/GistSyncModal';
import GistPublishModal from './modals/providers/GistPublishModal';
import GitlabAccountModal from './modals/providers/GitlabAccountModal';
import GitlabOpenModal from './modals/providers/GitlabOpenModal';
import GitlabPublishModal from './modals/providers/GitlabPublishModal';
import GitlabSaveModal from './modals/providers/GitlabSaveModal';
import GitlabWorkspaceModal from './modals/providers/GitlabWorkspaceModal';
import WordpressPublishModal from './modals/providers/WordpressPublishModal';
import BloggerPublishModal from './modals/providers/BloggerPublishModal';
import BloggerPagePublishModal from './modals/providers/BloggerPagePublishModal';
import ZendeskAccountModal from './modals/providers/ZendeskAccountModal';
import ZendeskPublishModal from './modals/providers/ZendeskPublishModal';
import CouchdbWorkspaceModal from './modals/providers/CouchdbWorkspaceModal';
import CouchdbCredentialsModal from './modals/providers/CouchdbCredentialsModal';

const getTabbables = (container) => container.querySelectorAll('a[href], button, .textfield, input[type=checkbox]')
  // Filter enabled and visible element
  .cl_filter((el) => !el.disabled && el.offsetParent !== null && !el.classList.contains('not-tabbable'));

export default {
  components: {
    ModalInner,
    FilePropertiesModal,
    SettingsModal,
    TemplatesModal,
    AboutModal,
    HtmlExportModal,
    PdfExportModal,
    PandocExportModal,
    LinkModal,
    ImageModal,
    SyncManagementModal,
    PublishManagementModal,
    WorkspaceManagementModal,
    AccountManagementModal,
    BadgeManagementModal,
    SponsorModal,
    // Providers
    GooglePhotoModal,
    GoogleDriveAccountModal,
    GoogleDriveSaveModal,
    GoogleDriveWorkspaceModal,
    GoogleDrivePublishModal,
    DropboxAccountModal,
    DropboxSaveModal,
    DropboxPublishModal,
    GithubAccountModal,
    GithubOpenModal,
    GithubSaveModal,
    GithubWorkspaceModal,
    GithubPublishModal,
    GistSyncModal,
    GistPublishModal,
    GitlabAccountModal,
    GitlabOpenModal,
    GitlabPublishModal,
    GitlabSaveModal,
    GitlabWorkspaceModal,
    WordpressPublishModal,
    BloggerPublishModal,
    BloggerPagePublishModal,
    ZendeskAccountModal,
    ZendeskPublishModal,
    CouchdbWorkspaceModal,
    CouchdbCredentialsModal,
  },
  computed: {
    ...mapGetters([
      'isSponsor',
    ]),
    ...mapGetters('modal', [
      'config',
    ]),
    currentModalComponent() {
      if (this.config.type) {
        let componentName = this.config.type[0].toUpperCase();
        componentName += this.config.type.slice(1);
        componentName += 'Modal';
        if (this.$options.components[componentName]) {
          return componentName;
        }
      }
      return null;
    },
    simpleModal() {
      return simpleModals[this.config.type] || {};
    },
  },
  mounted() {
    this.$watch(
      () => this.config,
      (isOpen) => {
        if (isOpen) {
          const tabbables = getTabbables(this.$el);
          if (tabbables[0]) {
            tabbables[0].focus();
          }
        }
      },
      { immediate: true },
    );
  },
  methods: {
    async sponsor() {
      try {
        if (!store.getters['workspace/sponsorToken']) {
          // User has to sign in
          await store.dispatch('modal/open', 'signInForSponsorship');
          await googleHelper.signin();
          syncSvc.requestSync();
        }
        if (!store.getters.isSponsor) {
          await store.dispatch('modal/open', 'sponsor');
        }
      } catch (e) { /* cancel */ }
    },
    onEscape() {
      this.config.reject();
      editorSvc.clEditor.focus();
    },
    onTab(evt) {
      const tabbables = getTabbables(this.$el);
      const firstTabbable = tabbables[0];
      const lastTabbable = tabbables[tabbables.length - 1];
      if (evt.shiftKey && firstTabbable === evt.target) {
        evt.preventDefault();
        lastTabbable.focus();
      } else if (!evt.shiftKey && lastTabbable === evt.target) {
        evt.preventDefault();
        firstTabbable.focus();
      }
    },
    onFocusInOut(evt) {
      const { parentNode } = evt.target;
      if (parentNode && parentNode.parentNode) {
        // Focus effect
        if (parentNode.classList.contains('form-entry__field')
          && parentNode.parentNode.classList.contains('form-entry')) {
          parentNode.parentNode.classList.toggle(
            'form-entry--focused',
            evt.type === 'focusin',
          );
        }
      }
    },
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

// ═══════════════════════════════════════════════════════════════
// MODAL - Fever Dream Dialog System
// ═══════════════════════════════════════════════════════════════

.modal {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    ellipse at center,
    rgba($fever-purple, 0.15) 0%,
    rgba($fever-ghost-dark, 0.7) 100%
  );
  overflow: auto;
  animation: modal-backdrop-appear 0.3s ease-out;

  .app--dark & {
    background: radial-gradient(
      ellipse at center,
      rgba($fever-teal, 0.1) 0%,
      rgba(0, 0, 0, 0.85) 100%
    );
  }

  p {
    line-height: 1.6;
  }
}

@keyframes modal-backdrop-appear {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal__sponsor-banner {
  position: fixed;
  z-index: 1;
  width: 100%;
  color: $fever-coral;
  background: linear-gradient(
    90deg,
    rgba($fever-coral, 0.1) 0%,
    rgba($fever-coral, 0.15) 50%,
    rgba($fever-coral, 0.1) 100%
  );
  font-size: 0.9em;
  line-height: 1.4;
  text-align: center;
  padding: 0.5em 1em;
  border-bottom: 1px solid rgba($fever-coral, 0.3);

  a {
    color: $fever-coral-deep;
    font-weight: 600;

    &:hover {
      color: $fever-purple;
    }
  }
}

.modal__inner-1 {
  margin: 0 auto;
  width: 100%;
  min-width: 320px;
  max-width: 500px;
}

.modal__inner-2 {
  margin: 50px 10px 100px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.98) 0%,
    rgba($fever-ghost-lavender, 0.95) 100%
  );
  padding: 40px 40px 35px;
  border-radius: $border-radius-xl;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 60px rgba($fever-purple, 0.15);
  animation: modal-content-appear 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  .app--dark & {
    background: linear-gradient(
      180deg,
      rgba($fever-ghost-dark, 0.98) 0%,
      rgba($fever-ghost-abyss, 0.95) 100%
    );
    box-shadow:
      0 25px 50px -12px rgba(0, 0, 0, 0.5),
      0 0 60px rgba($fever-teal, 0.1);
  }

  // Top accent bar - fever gradient
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 3px;
    width: 100%;
    background: linear-gradient(
      90deg,
      $fever-purple 0%,
      $fever-teal 25%,
      $fever-purple-light 50%,
      $fever-teal-light 75%,
      $fever-purple 100%
    );
    background-size: 200% 100%;
    animation: gradient-shift 4s linear infinite;
  }

  // Bottom accent bar
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    width: 100%;
    background: linear-gradient(
      90deg,
      $fever-teal 0%,
      $fever-purple 25%,
      $fever-teal-light 50%,
      $fever-purple-light 75%,
      $fever-teal 100%
    );
    background-size: 200% 100%;
    animation: gradient-shift 4s linear infinite reverse;
  }
}

@keyframes modal-content-appear {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes gradient-shift {
  0% {
    background-position: 0% 0%;
  }
  100% {
    background-position: 200% 0%;
  }
}

.modal__content > :first-child,
.modal__content > .modal__image:first-child + * {
  margin-top: 0;
}

.modal__image {
  float: left;
  width: 64px;
  height: 64px;
  margin: 1.5em 1.5em 0.5em 0;
  border-radius: $border-radius-lg;
  box-shadow: 0 4px 12px rgba($fever-purple, 0.2);

  & + *::after {
    content: '';
    display: block;
    clear: both;
  }
}

.modal__title {
  font-family: $font-family-display;
  font-weight: 700;
  font-size: 1.6rem;
  line-height: 1.3;
  margin-top: 2rem;
  background: linear-gradient(135deg, $fever-purple-deep 0%, $fever-teal-dark 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  .app--dark & {
    background: linear-gradient(135deg, $fever-teal 0%, $fever-purple-light 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.modal__sub-title {
  opacity: 0.65;
  font-size: 0.8rem;
  margin-bottom: 1.5rem;
  font-style: italic;
}

.modal__error {
  color: $fever-coral;
  font-weight: 500;
}

.modal__info {
  background: linear-gradient(
    135deg,
    rgba($fever-teal, 0.08) 0%,
    rgba($fever-purple, 0.05) 100%
  );
  border: 1px solid rgba($fever-teal, 0.15);
  border-radius: $border-radius-lg;
  margin: 1.2em 0;
  padding: 1em 1.25em;
  font-size: 0.95em;
  line-height: 1.6;

  .app--dark & {
    background: linear-gradient(
      135deg,
      rgba($fever-purple, 0.1) 0%,
      rgba($fever-teal, 0.08) 100%
    );
    border-color: rgba($fever-purple, 0.2);
  }

  pre {
    font-family: $font-family-monospace;
    line-height: 1.5;
  }
}

.modal__info--multiline {
  padding-top: 0.5em;
  padding-bottom: 0.5em;
}

.modal__button-bar {
  margin-top: 2rem;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: 10px;
}

// ───────────────────────────────────────────────────────────────
// FORM ENTRIES - Fever dream form fields
// ───────────────────────────────────────────────────────────────

.form-entry {
  margin: 1.2em 0;
}

.form-entry__label {
  display: block;
  font-family: $font-family-ui;
  font-size: 0.85rem;
  font-weight: 500;
  color: $fever-purple-deep;
  margin-bottom: 0.4em;
  letter-spacing: 0.3px;
  transition: color $transition-base;

  .app--dark & {
    color: $fever-teal;
  }

  .form-entry--focused & {
    color: $fever-teal-dark;

    .app--dark & {
      color: $fever-purple-light;
    }
  }

  .form-entry--error & {
    color: $fever-coral;
  }
}

.form-entry__label-info {
  font-size: 0.75rem;
  font-weight: 400;
  opacity: 0.7;
}

.form-entry__field {
  border: 1px solid rgba($fever-purple, 0.2);
  border-radius: $border-radius-base;
  position: relative;
  overflow: hidden;
  transition: all $transition-base;

  .app--dark & {
    border-color: rgba($fever-teal, 0.25);
  }

  .form-entry--focused & {
    border-color: $fever-teal;
    box-shadow: 0 0 0 3px rgba($fever-teal, 0.15);

    .app--dark & {
      border-color: $fever-purple;
      box-shadow: 0 0 0 3px rgba($fever-purple, 0.2);
    }
  }

  .form-entry--error & {
    border-color: $fever-coral;
    box-shadow: 0 0 0 3px rgba($fever-coral, 0.15);
  }
}

.form-entry__actions {
  text-align: right;
  margin: 0.25em;
}

.form-entry__button {
  width: 38px;
  height: 38px;
  padding: 6px;
  display: inline-block;
  background-color: transparent;
  opacity: 0.7;
  border-radius: $border-radius-base;
  transition: all $transition-base;

  &:active,
  &:focus,
  &:hover {
    opacity: 1;
    background: rgba($fever-purple, 0.1);

    .app--dark & {
      background: rgba($fever-teal, 0.15);
    }
  }
}

.form-entry__radio,
.form-entry__checkbox {
  margin: 0.4em 1em;

  input {
    margin-right: 0.5em;
    accent-color: $fever-teal;

    .app--dark & {
      accent-color: $fever-purple;
    }
  }
}

.form-entry__info {
  font-size: 0.75em;
  opacity: 0.65;
  line-height: 1.5;
  margin: 0.4em 0;
  font-style: italic;
}

// ───────────────────────────────────────────────────────────────
// TABS - Navigation with fever styling
// ───────────────────────────────────────────────────────────────

.tabs {
  border-bottom: 1px solid rgba($fever-purple, 0.15);
  margin: 1em 0 2em;

  .app--dark & {
    border-bottom-color: rgba($fever-teal, 0.2);
  }

  &::after {
    content: '';
    display: block;
    clear: both;
  }
}

.tabs__tab {
  width: 50%;
  float: left;
  text-align: center;
  line-height: 1.4;
  font-weight: 500;
  font-size: 1em;
}

.tabs__tab > a {
  width: 100%;
  text-decoration: none;
  padding: 0.75em 0.5em;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  border-top-left-radius: $border-radius-base;
  border-top-right-radius: $border-radius-base;
  color: $fever-purple;
  transition: all $transition-base;

  .app--dark & {
    color: $fever-teal;
  }

  &:hover,
  &:focus {
    background: rgba($fever-purple, 0.06);

    .app--dark & {
      background: rgba($fever-teal, 0.08);
    }
  }
}

.tabs__tab--active > a {
  border-bottom: 2px solid $fever-teal;
  color: $fever-purple-deep;

  .app--dark & {
    border-bottom-color: $fever-purple;
    color: $fever-teal;
  }
}
</style>
