<template>
  <div class="explorer flex flex--column">
    <div class="side-title flex flex--row flex--space-between">
      <div class="flex flex--row">
        <button v-title="'New file'" class="side-title__button side-title__button--new-file button" @click="newItem()">
          <icon-file-plus />
        </button>
        <button v-title="'New folder'" class="side-title__button side-title__button--new-folder button" @click="newItem(true)">
          <icon-folder-plus />
        </button>
        <button v-title="'Delete'" class="side-title__button side-title__button--delete button" @click="deleteItem()">
          <icon-delete />
        </button>
        <button v-title="'Rename'" class="side-title__button side-title__button--rename button" @click="editItem()">
          <icon-pen />
        </button>
      </div>
      <button v-title="'Close explorer'" class="side-title__button side-title__button--close button" @click="toggleExplorer(false)">
        <icon-close />
      </button>
    </div>
    <div v-if="!light" class="explorer__tree" :class="{'explorer__tree--new-item': !newChildNode.isNil}" tabindex="0" @keydown.delete="deleteItem()">
      <explorer-node :node="rootNode" :depth="0" />
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import ExplorerNode from './ExplorerNode';
import explorerSvc from '../services/explorerSvc';
import store from '../store';

export default {
  components: {
    ExplorerNode,
  },
  computed: {
    ...mapState([
      'light',
    ]),
    ...mapState('explorer', [
      'newChildNode',
    ]),
    ...mapGetters('explorer', [
      'rootNode',
      'selectedNode',
    ]),
  },
  methods: {
    ...mapActions('data', [
      'toggleExplorer',
    ]),
    newItem: (isFolder) => explorerSvc.newItem(isFolder),
    deleteItem: () => explorerSvc.deleteItem(),
    editItem() {
      const node = this.selectedNode;
      if (!node.isTrash && !node.isTemp) {
        store.commit('explorer/setEditingId', node.item.id);
      }
    },
  },
  created() {
    this.$watch(
      () => store.getters['file/current'].id,
      (currentFileId) => {
        store.commit('explorer/setSelectedId', currentFileId);
        store.dispatch('explorer/openNode', currentFileId);
      },
      {
        immediate: true,
      },
    );
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

// ═══════════════════════════════════════════════════════════════
// EXPLORER - File Tree with Controlled Drift
// ═══════════════════════════════════════════════════════════════

.explorer {
  height: 100%;
  background: linear-gradient(
    180deg,
    rgba($fever-purple, 0.015) 0%,
    transparent 50%,
    rgba($fever-teal, 0.02) 100%
  );
  position: relative;

  .app--dark & {
    background: linear-gradient(
      180deg,
      rgba($fever-teal, 0.02) 0%,
      transparent 50%,
      rgba($fever-purple, 0.02) 100%
    );
  }

  // Right edge accent line
  &::after {
    content: '';
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 1px;
    background: linear-gradient(
      180deg,
      rgba($fever-purple, 0.2) 0%,
      rgba($fever-teal, 0.15) 50%,
      transparent 100%
    );

    .app--dark & {
      background: linear-gradient(
        180deg,
        rgba($fever-teal, 0.25) 0%,
        rgba($fever-purple, 0.2) 50%,
        transparent 100%
      );
    }
  }
}

.explorer__tree {
  height: 100%;
  overflow: auto;
  padding: 4px 0;

  // Focus state with subtle glow
  &:focus {
    outline: none;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      box-shadow: inset 0 0 20px rgba($fever-teal, 0.05);

      .app--dark & {
        box-shadow: inset 0 0 20px rgba($fever-purple, 0.08);
      }
    }
  }

  /* fake element for scroll padding */
  & > .explorer-node > .explorer-node__children > .explorer-node:last-child > .explorer-node__item {
    height: 20px;
    cursor: auto;
  }
}

// New item mode visual feedback
.explorer__tree--new-item {
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba($fever-teal, 0.03) 0%,
      transparent 100%
    );
    pointer-events: none;
    animation: new-item-pulse 1.5s ease-in-out infinite;

    .app--dark & {
      background: linear-gradient(
        180deg,
        rgba($fever-purple, 0.05) 0%,
        transparent 100%
      );
    }
  }
}

@keyframes new-item-pulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}
</style>
