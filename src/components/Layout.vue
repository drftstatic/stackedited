<template>
  <div class="layout" :class="{'layout--revision': revisionContent}">
    <div class="layout__panel flex flex--row" :class="{'flex--end': styles.showSideBar}">
      <div v-show="styles.showExplorer" class="layout__panel layout__panel--explorer" :aria-hidden="!styles.showExplorer" :style="{width: styles.layoutOverflow ? '100%' : constants.explorerWidth + 'px'}">
        <explorer />
      </div>
      <div class="layout__panel flex flex--column" tour-step-anchor="welcome,end" :style="{width: styles.innerWidth + 'px'}">
        <div v-show="styles.showNavigationBar" class="layout__panel layout__panel--navigation-bar" :style="{height: constants.navigationBarHeight + 'px'}">
          <navigation-bar />
        </div>
        <div class="layout__panel flex flex--row" :style="{height: styles.innerHeight + 'px'}">
          <div v-show="styles.showEditor" class="layout__panel layout__panel--editor" :style="{width: (styles.editorWidth + styles.editorGutterWidth) + 'px', fontSize: styles.fontSize + 'px'}">
            <div class="gutter" :style="{left: styles.editorGutterLeft + 'px'}">
              <div v-if="styles.editorGutterWidth" class="gutter__background" :style="{width: styles.editorGutterWidth + 'px'}" />
            </div>
            <editor />
            <div class="gutter" :style="{left: styles.editorGutterLeft + 'px'}">
              <sticky-comment v-if="styles.editorGutterWidth && stickyComment === 'top'" />
              <current-discussion v-if="styles.editorGutterWidth" />
            </div>
          </div>
          <div v-show="styles.showEditor" class="layout__panel layout__panel--button-bar" :style="{width: constants.buttonBarWidth + 'px'}">
            <button-bar />
          </div>
          <div v-show="styles.showPreview" class="layout__panel layout__panel--preview" :style="{width: (styles.previewWidth + styles.previewGutterWidth) + 'px', fontSize: styles.fontSize + 'px'}">
            <div class="gutter" :style="{left: styles.previewGutterLeft + 'px'}">
              <div v-if="styles.previewGutterWidth" class="gutter__background" :style="{width: styles.previewGutterWidth + 'px'}" />
            </div>
            <preview />
            <div class="gutter" :style="{left: styles.previewGutterLeft + 'px'}">
              <sticky-comment v-if="styles.previewGutterWidth && stickyComment === 'top'" />
              <current-discussion v-if="styles.previewGutterWidth" />
            </div>
          </div>
          <div v-if="showFindReplace" class="layout__panel layout__panel--find-replace">
            <find-replace />
          </div>
        </div>
        <div v-show="styles.showStatusBar" class="layout__panel layout__panel--status-bar" :style="{height: constants.statusBarHeight + 'px'}">
          <status-bar />
        </div>
      </div>
      <div v-show="styles.showSideBar" class="layout__panel layout__panel--side-bar" :style="{width: styles.layoutOverflow ? '100%' : constants.sideBarWidth + 'px'}">
        <side-bar />
      </div>
    </div>
    <tour v-if="!light && !layoutSettings.welcomeTourFinished" />
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import NavigationBar from './NavigationBar';
import ButtonBar from './ButtonBar';
import StatusBar from './StatusBar';
import Explorer from './Explorer';
import SideBar from './SideBar';
import Editor from './Editor';
import Preview from './Preview';
import Tour from './Tour';
import StickyComment from './gutters/StickyComment';
import CurrentDiscussion from './gutters/CurrentDiscussion';
import FindReplace from './FindReplace';
import editorSvc from '../services/editorSvc';
import markdownConversionSvc from '../services/markdownConversionSvc';
import store from '../store';

export default {
  components: {
    NavigationBar,
    ButtonBar,
    StatusBar,
    Explorer,
    SideBar,
    Editor,
    Preview,
    Tour,
    StickyComment,
    CurrentDiscussion,
    FindReplace,
  },
  computed: {
    ...mapState([
      'light',
    ]),
    ...mapState('content', [
      'revisionContent',
    ]),
    ...mapState('discussion', [
      'stickyComment',
    ]),
    ...mapGetters('layout', [
      'constants',
      'styles',
    ]),
    ...mapGetters('data', [
      'layoutSettings',
    ]),
    showFindReplace() {
      return !!store.state.findReplace.type;
    },
  },
  methods: {
    ...mapActions('layout', [
      'updateBodySize',
    ]),
    saveSelection: () => editorSvc.saveSelection(true),
  },
  created() {
    markdownConversionSvc.init(); // Needs to be inited before mount
    this.updateBodySize();
    window.addEventListener('resize', this.updateBodySize);
    window.addEventListener('keyup', this.saveSelection);
    window.addEventListener('mouseup', this.saveSelection);
    window.addEventListener('focusin', this.saveSelection);
    window.addEventListener('contextmenu', this.saveSelection);
  },
  mounted() {
    const editorElt = this.$el.querySelector('.editor__inner');
    const previewElt = this.$el.querySelector('.preview__inner-2');
    const tocElt = this.$el.querySelector('.toc__inner');
    editorSvc.init(editorElt, previewElt, tocElt);

    // Focus on the editor every time reader mode is disabled
    const focus = () => {
      if (this.styles.showEditor) {
        editorSvc.clEditor.focus();
      }
    };
    setTimeout(focus, 100);
    this.$watch(() => this.styles.showEditor, focus);
  },
  destroyed() {
    window.removeEventListener('resize', this.updateStyle);
    window.removeEventListener('keyup', this.saveSelection);
    window.removeEventListener('mouseup', this.saveSelection);
    window.removeEventListener('focusin', this.saveSelection);
    window.removeEventListener('contextmenu', this.saveSelection);
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

.layout {
  position: absolute;
  width: 100%;
  height: 100%;
}

.layout__panel {
  position: relative;
  width: 100%;
  height: 100%;
  flex: none;
  overflow: hidden;
}

.layout__panel--navigation-bar {
  background-color: $navbar-bg;
}

.layout__panel--status-bar {
  background-color: #007acc;
}

.layout__panel--editor {
  background-color: $editor-background-light;

  .app--dark & {
    background-color: $editor-background-dark;
  }

  .gutter__background,
  .comment-list__current-discussion,
  .sticky-comment,
  .current-discussion {
    background-color: mix(#000, $editor-background-light, 6.7%);

    .app--dark & {
      background-color: mix(#fff, $editor-background-dark, 6.7%);
    }
  }
}

$preview-background-light: #f3f3f3;
$preview-background-dark: #252525;

.layout__panel--preview,
.layout__panel--button-bar {
  background-color: $preview-background-light;

  .app--dark & {
    background-color: $preview-background-dark;
  }
}

.layout__panel--preview {
  .gutter__background,
  .comment-list__current-discussion,
  .sticky-comment,
  .current-discussion {
    background-color: mix(#000, $preview-background-light, 6.7%);
  }
}

.layout__panel--explorer,
.layout__panel--side-bar {
  background-color: #ddd;
}

.layout__panel--find-replace {
  background-color: #e6e6e6;
  position: absolute;
  left: 0;
  bottom: 0;
  width: 300px;
  height: auto;
  border-top-right-radius: $border-radius-base;
}
</style>
