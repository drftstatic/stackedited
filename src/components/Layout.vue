<template>
  <div class="layout" :class="{'layout--revision': revisionContent, 'layout--resizing': isResizing, 'layout--collaborative': styles.collaborativeMode}">
    <div class="layout__panel flex flex--row" :class="{'flex--end': styles.showSideBar || styles.showAiChat}">
      <div v-show="styles.showExplorer" class="layout__panel layout__panel--explorer" :aria-hidden="!styles.showExplorer" :style="{width: styles.layoutOverflow ? '100%' : constants.explorerWidth + 'px'}">
        <explorer />
        <div
          class="resize-handle resize-handle--explorer"
          @mousedown="startResize('explorer', $event)"
        />
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
      <!-- AI Chat Panel (Collaborative Mode) -->
      <div v-show="styles.showAiChat" class="layout__panel layout__panel--ai-chat" :style="{width: styles.layoutOverflow ? '100%' : styles.aiChatWidth + 'px'}">
        <div
          class="resize-handle resize-handle--ai-chat"
          @mousedown="startResize('aiChat', $event)"
        />
        <ai-chat />
      </div>
      <!-- Sidebar (non-collaborative mode) -->
      <div v-show="styles.showSideBar" class="layout__panel layout__panel--side-bar" :style="{width: styles.layoutOverflow ? '100%' : constants.sideBarWidth + 'px'}">
        <div
          class="resize-handle resize-handle--sidebar"
          @mousedown="startResize('sidebar', $event)"
        />
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
import AiChat from './AiChat';
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
    AiChat,
  },
  data: () => ({
    isResizing: false,
    resizeTarget: null,
    resizeStartX: 0,
    resizeStartWidth: 0,
  }),
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
    ...mapActions('data', [
      'patchLayoutSettings',
    ]),
    saveSelection: () => editorSvc.saveSelection(true),
    startResize(target, event) {
      event.preventDefault();
      this.isResizing = true;
      this.resizeTarget = target;
      this.resizeStartX = event.clientX;

      if (target === 'sidebar') {
        this.resizeStartWidth = this.constants.sideBarWidth;
      } else if (target === 'explorer') {
        this.resizeStartWidth = this.constants.explorerWidth;
      } else if (target === 'aiChat') {
        this.resizeStartWidth = this.styles.aiChatWidth;
        this.totalWidth = document.body.clientWidth - (this.styles.showExplorer ? this.constants.explorerWidth : 0);
      }

      document.addEventListener('mousemove', this.handleResize);
      document.addEventListener('mouseup', this.stopResize);
    },
    handleResize(event) {
      if (!this.isResizing) return;

      const deltaX = event.clientX - this.resizeStartX;
      let newWidth;

      if (this.resizeTarget === 'sidebar') {
        // Sidebar is on the right, dragging left increases width
        newWidth = this.resizeStartWidth - deltaX;
        newWidth = Math.max(this.constants.sideBarMinWidth, Math.min(this.constants.sideBarMaxWidth, newWidth));
        this.patchLayoutSettings({ sideBarWidth: newWidth });
      } else if (this.resizeTarget === 'explorer') {
        // Explorer is on the left, dragging right increases width
        newWidth = this.resizeStartWidth + deltaX;
        newWidth = Math.max(this.constants.explorerMinWidth, Math.min(this.constants.explorerMaxWidth, newWidth));
        this.patchLayoutSettings({ explorerWidth: newWidth });
      } else if (this.resizeTarget === 'aiChat') {
        // AI Chat is on the right, dragging left increases width
        newWidth = this.resizeStartWidth - deltaX;
        // Enforce constraints
        newWidth = Math.max(this.constants.aiChatMinWidth, newWidth);
        const maxWidth = Math.floor(this.totalWidth * this.constants.aiChatMaxWidth);
        newWidth = Math.min(maxWidth, newWidth);
        // Convert to split ratio
        const newRatio = newWidth / this.totalWidth;
        this.patchLayoutSettings({ aiChatSplitRatio: newRatio });
      }
    },
    stopResize() {
      this.isResizing = false;
      this.resizeTarget = null;
      document.removeEventListener('mousemove', this.handleResize);
      document.removeEventListener('mouseup', this.stopResize);
    },
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

// AI Chat Panel (Collaborative Mode)
.layout__panel--ai-chat {
  background-color: $editor-background-light;
  border-left: 1px solid rgba($fever-purple, 0.15);

  .app--dark & {
    background-color: $editor-background-dark;
    border-left-color: rgba($fever-teal, 0.15);
  }
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

// ───────────────────────────────────────────────────────────────
// RESIZE HANDLES - Drag to resize panels
// ───────────────────────────────────────────────────────────────

.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 100;
  transition: background-color $transition-fast;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 40px;
    background: rgba($fever-purple, 0.3);
    border-radius: 1px;
    opacity: 0;
    transition: opacity $transition-base;
  }

  &:hover {
    background: linear-gradient(
      180deg,
      rgba($fever-purple, 0.1) 0%,
      rgba($fever-teal, 0.15) 50%,
      rgba($fever-purple, 0.1) 100%
    );

    &::before {
      opacity: 1;
    }
  }

  &:active {
    background: linear-gradient(
      180deg,
      rgba($fever-purple, 0.2) 0%,
      rgba($fever-teal, 0.25) 50%,
      rgba($fever-purple, 0.2) 100%
    );
  }

  .app--dark & {
    &::before {
      background: rgba($fever-teal, 0.4);
    }

    &:hover {
      background: linear-gradient(
        180deg,
        rgba($fever-teal, 0.1) 0%,
        rgba($fever-purple, 0.15) 50%,
        rgba($fever-teal, 0.1) 100%
      );
    }

    &:active {
      background: linear-gradient(
        180deg,
        rgba($fever-teal, 0.2) 0%,
        rgba($fever-purple, 0.25) 50%,
        rgba($fever-teal, 0.2) 100%
      );
    }
  }
}

.resize-handle--explorer {
  right: -3px;

  &::before {
    right: 2px;
  }
}

.resize-handle--sidebar {
  left: -3px;

  &::before {
    left: 2px;
  }
}

.resize-handle--ai-chat {
  left: -3px;

  &::before {
    left: 2px;
  }
}

// Prevent text selection while resizing
.layout--resizing {
  user-select: none;
  cursor: col-resize;

  * {
    cursor: col-resize !important;
  }
}
</style>
