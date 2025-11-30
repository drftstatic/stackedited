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
.explorer,
.explorer__tree {
  height: 100%;
}

.explorer__tree {
  overflow: auto;

  /* fake element */
  & > .explorer-node > .explorer-node__children > .explorer-node:last-child > .explorer-node__item {
    height: 20px;
    cursor: auto;
  }
}
</style>
