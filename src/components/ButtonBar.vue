<template>
  <div class="button-bar">
    <div class="button-bar__inner button-bar__inner--top">
      <button v-if="!light" v-title="'Toggle navigation bar'" class="button-bar__button button-bar__button--navigation-bar-toggler button" :class="{ 'button-bar__button--on': layoutSettings.showNavigationBar }" @click="toggleNavigationBar()">
        <icon-navigation-bar />
      </button>
      <button v-title="'Toggle side preview'" class="button-bar__button button-bar__button--side-preview-toggler button" :class="{ 'button-bar__button--on': layoutSettings.showSidePreview }" tour-step-anchor="editor" @click="toggleSidePreview()">
        <icon-side-preview />
      </button>
      <button v-title="'Reader mode'" class="button-bar__button button-bar__button--editor-toggler button" @click="toggleEditor(false)">
        <icon-eye />
      </button>
    </div>
    <div class="button-bar__inner button-bar__inner--bottom">
      <button v-title="'Toggle focus mode'" class="button-bar__button button-bar__button--focus-mode-toggler button" :class="{ 'button-bar__button--on': layoutSettings.focusMode }" @click="toggleFocusMode()">
        <icon-target />
      </button>
      <button v-title="'Toggle scroll sync'" class="button-bar__button button-bar__button--scroll-sync-toggler button" :class="{ 'button-bar__button--on': layoutSettings.scrollSync }" @click="toggleScrollSync()">
        <icon-scroll-sync />
      </button>
      <button v-title="'Toggle status bar'" class="button-bar__button button-bar__button--status-bar-toggler button" :class="{ 'button-bar__button--on': layoutSettings.showStatusBar }" @click="toggleStatusBar()">
        <icon-status-bar />
      </button>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';

export default {
  computed: {
    ...mapState([
      'light',
    ]),
    ...mapGetters('data', [
      'layoutSettings',
    ]),
  },
  methods: mapActions('data', [
    'toggleNavigationBar',
    'toggleEditor',
    'toggleSidePreview',
    'toggleStatusBar',
    'toggleFocusMode',
    'toggleScrollSync',
  ]),
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

.button-bar {
  position: absolute;
  width: 100%;
  height: 100%;
}

.button-bar__inner {
  position: absolute;
}

.button-bar__inner--bottom {
  bottom: 0;
}

.button-bar__button {
  color: rgba(0, 0, 0, 0.2);
  display: block;
  width: 26px;
  height: 26px;
  padding: 2px;
  margin: 3px 0;

  .app--dark & {
    color: rgba(255, 255, 255, 0.15);
  }

  &:active,
  &:focus,
  &:hover {
    color: rgba(0, 0, 0, 0.2);

    .app--dark & {
      color: rgba(255, 255, 255, 0.15);
      background-color: $navbar-hover-background;
    }
  }
}

.button-bar__button--on {
  color: rgba(0, 0, 0, 0.4);

  .app--dark & {
    color: rgba(255, 255, 255, 0.4);
  }

  &:active,
  &:focus,
  &:hover {
    color: rgba(0, 0, 0, 0.4);

    .app--dark & {
      color: rgba(255, 255, 255, 0.4);
    }
  }
}
</style>
