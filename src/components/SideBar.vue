<template>
  <div class="side-bar flex flex--column">
    <div class="side-title flex flex--row">
      <button v-if="panel !== 'menu'" v-title="'Main menu'" class="side-title__button button" @click="setPanel('menu')">
        <icon-dots-horizontal />
      </button>
      <div class="side-title__title">
        {{ panelName }}
      </div>
      <button v-title="'Close side bar'" class="side-title__button button" @click="toggleSideBar(false)">
        <icon-close />
      </button>
    </div>
    <div class="side-bar__inner">
      <main-menu v-if="panel === 'menu'" />
      <workspaces-menu v-else-if="panel === 'workspaces'" />
      <sync-menu v-else-if="panel === 'sync'" />
      <publish-menu v-else-if="panel === 'publish'" />
      <history-menu v-else-if="panel === 'history'" />
      <export-menu v-else-if="panel === 'export'" />
      <import-export-menu v-else-if="panel === 'importExport'" />
      <workspace-backup-menu v-else-if="panel === 'workspaceBackups'" />
      <ai-chat v-else-if="panel === 'ai'" />
      <div v-else-if="panel === 'help'" class="side-bar__panel side-bar__panel--help">
        <pre class="markdown-highlighting" v-html="markdownSample" />
      </div>
      <div class="side-bar__panel side-bar__panel--toc" :class="{'side-bar__panel--hidden': panel !== 'toc'}">
        <toc />
      </div>
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex';
import Toc from './Toc';
import MainMenu from './menus/MainMenu';
import WorkspacesMenu from './menus/WorkspacesMenu';
import SyncMenu from './menus/SyncMenu';
import PublishMenu from './menus/PublishMenu';
import HistoryMenu from './menus/HistoryMenu';
import ImportExportMenu from './menus/ImportExportMenu';
import WorkspaceBackupMenu from './menus/WorkspaceBackupMenu';
import AiChat from './AiChat';
import markdownSample from '../data/markdownSample.md';
import markdownConversionSvc from '../services/markdownConversionSvc';
import store from '../store';

const panelNames = {
  menu: 'Menu',
  workspaces: 'Workspaces',
  help: 'Markdown cheat sheet',
  toc: 'Table of contents',
  sync: 'Synchronize',
  publish: 'Publish',
  history: 'File history',
  importExport: 'Import/export',
  workspaceBackups: 'Workspace backups',
  ai: 'AI Assistant',
};

export default {
  components: {
    Toc,
    MainMenu,
    WorkspacesMenu,
    SyncMenu,
    PublishMenu,
    HistoryMenu,
    ImportExportMenu,
    WorkspaceBackupMenu,
    AiChat,
  },
  data: () => ({
    markdownSample: markdownConversionSvc.highlight(markdownSample),
  }),
  computed: {
    panel() {
      if (store.state.light) {
        return null; // No menu in light mode
      }
      const result = store.getters['data/layoutSettings'].sideBarPanel;
      return panelNames[result] ? result : 'menu';
    },
    panelName() {
      return panelNames[this.panel];
    },
  },
  methods: {
    ...mapActions('data', [
      'toggleSideBar',
    ]),
    ...mapActions('data', {
      setPanel: 'setSideBarPanel',
    }),
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

// ═══════════════════════════════════════════════════════════════
// SIDEBAR - Controlled Drift Panel System
// ═══════════════════════════════════════════════════════════════

.side-bar {
  overflow: hidden;
  height: 100%;
  background: linear-gradient(
    180deg,
    rgba($fever-purple, 0.02) 0%,
    transparent 30%,
    rgba($fever-teal, 0.02) 100%
  );
  position: relative;

  .app--dark & {
    background: linear-gradient(
      180deg,
      rgba($fever-teal, 0.03) 0%,
      transparent 30%,
      rgba($fever-purple, 0.03) 100%
    );
  }

  // Subtle left border accent
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(
      180deg,
      $fever-purple 0%,
      $fever-teal 50%,
      transparent 100%
    );
    opacity: 0.4;

    .app--dark & {
      background: linear-gradient(
        180deg,
        $fever-teal 0%,
        $fever-purple 50%,
        transparent 100%
      );
      opacity: 0.5;
    }
  }

  hr {
    margin: 10px 40px;
    display: none;
    border: none;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba($fever-purple, 0.3),
      rgba($fever-teal, 0.3),
      transparent
    );

    .app--dark & {
      background: linear-gradient(
        90deg,
        transparent,
        rgba($fever-teal, 0.3),
        rgba($fever-purple, 0.3),
        transparent
      );
    }
  }

  * + hr {
    display: block;
  }

  hr + hr {
    display: none;
  }

  .textfield {
    font-size: 14px;
    height: 26px;
  }
}

.side-bar__inner {
  position: relative;
  height: 100%;
}

.side-bar__panel {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: auto;

  &::after {
    content: '';
    display: block;
    height: 40px;
  }
}

.side-bar__panel--hidden {
  left: 1000px;
}

.side-bar__panel--menu {
  padding: 10px;
}

.side-bar__panel--help {
  padding: 0 10px 0 20px;

  pre {
    font-family: $font-family-monospace;
    font-size: 0.85em;
    font-variant-ligatures: no-common-ligatures;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
    word-wrap: break-word;
  }

  .code,
  .img,
  .imgref,
  .cl-toc {
    background-color: rgba($fever-purple, 0.08);
    border-radius: 3px;
    padding: 1px 4px;

    .app--dark & {
      background-color: rgba($fever-teal, 0.12);
    }
  }
}

.side-bar__info {
  padding: 12px;
  margin: -10px -10px 10px;
  background: linear-gradient(
    135deg,
    rgba($fever-teal, 0.08) 0%,
    rgba($fever-purple, 0.06) 100%
  );
  border-bottom: 1px solid rgba($fever-purple, 0.1);
  font-size: 0.95em;
  position: relative;

  .app--dark & {
    background: linear-gradient(
      135deg,
      rgba($fever-purple, 0.1) 0%,
      rgba($fever-teal, 0.08) 100%
    );
    border-bottom-color: rgba($fever-teal, 0.1);
  }

  // Info accent icon area
  &::before {
    content: 'ℹ';
    position: absolute;
    left: 12px;
    top: 12px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: $fever-teal;
    background: rgba($fever-teal, 0.15);
    border-radius: 50%;

    .app--dark & {
      color: $fever-purple-light;
      background: rgba($fever-purple, 0.2);
    }
  }

  p {
    margin: 10px 15px 10px 35px;
    font-size: 0.85rem;
    opacity: 0.75;
    line-height: 1.4;
    color: $fever-purple-deep;

    .app--dark & {
      color: rgba(255, 255, 255, 0.75);
    }
  }
}

// ───────────────────────────────────────────────────────────────
// TOC Panel - Table of Contents styling
// ───────────────────────────────────────────────────────────────

.side-bar__panel--toc {
  .toc__item {
    padding: 6px 12px;
    cursor: pointer;
    border-radius: $border-radius-base;
    transition: all $transition-base;
    margin: 2px 8px;

    &:hover {
      background: rgba($fever-purple, 0.08);
      transform: translateX(4px);

      .app--dark & {
        background: rgba($fever-teal, 0.1);
      }
    }
  }
}
</style>
