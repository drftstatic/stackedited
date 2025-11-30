<template>
  <div class="explorer-node" :class="{'explorer-node--selected': isSelected, 'explorer-node--folder': node.isFolder, 'explorer-node--open': isOpen, 'explorer-node--trash': node.isTrash, 'explorer-node--temp': node.isTemp, 'explorer-node--drag-target': isDragTargetFolder}" @dragover.prevent @dragenter.stop="node.noDrop || setDragTarget(node)" @dragleave.stop="isDragTarget && setDragTarget()" @drop.prevent.stop="onDrop" @contextmenu="onContextMenu">
    <div v-if="isEditing" class="explorer-node__item-editor" :style="{paddingLeft: leftPadding}" draggable="true" @dragstart.stop.prevent>
      <input v-model="editingNodeName" v-focus type="text" class="text-input" @blur="submitEdit()" @keydown.stop @keydown.enter="submitEdit()" @keydown.esc.stop="submitEdit(true)">
    </div>
    <div v-else class="explorer-node__item" :style="{paddingLeft: leftPadding}" draggable="true" @click="select()" @dragstart.stop="setDragSourceId" @dragend.stop="setDragTarget()">
      {{ node.item.name }}
      <icon-provider v-for="location in node.locations" :key="location.id" class="explorer-node__location" :provider-id="location.providerId" />
    </div>
    <div v-if="node.isFolder && isOpen" class="explorer-node__children">
      <explorer-node v-for="node in node.folders" :key="node.item.id" :node="node" :depth="depth + 1" />
      <div v-if="newChild" class="explorer-node__new-child" :class="{'explorer-node__new-child--folder': newChild.isFolder}" :style="{paddingLeft: childLeftPadding}">
        <input v-model.trim="newChildName" v-focus type="text" class="text-input" @blur="submitNewChild()" @keydown.stop @keydown.enter="submitNewChild()" @keydown.esc.stop="submitNewChild(true)">
      </div>
      <explorer-node v-for="node in node.files" :key="node.item.id" :node="node" :depth="depth + 1" />
    </div>
  </div>
</template>

<script>
import { mapMutations, mapActions } from 'vuex';
import workspaceSvc from '../services/workspaceSvc';
import explorerSvc from '../services/explorerSvc';
import store from '../store';
import badgeSvc from '../services/badgeSvc';

export default {
  name: 'ExplorerNode', // Required for recursivity
  props: ['node', 'depth'],
  data: () => ({
    editingValue: '',
  }),
  computed: {
    leftPadding() {
      return `${this.depth * 15}px`;
    },
    childLeftPadding() {
      return `${(this.depth + 1) * 15}px`;
    },
    isSelected() {
      return store.getters['explorer/selectedNode'] === this.node;
    },
    isEditing() {
      return store.getters['explorer/editingNode'] === this.node;
    },
    isDragTarget() {
      return store.getters['explorer/dragTargetNode'] === this.node;
    },
    isDragTargetFolder() {
      return store.getters['explorer/dragTargetNodeFolder'] === this.node;
    },
    isOpen() {
      return store.state.explorer.openNodes[this.node.item.id] || this.node.isRoot;
    },
    newChild() {
      return store.getters['explorer/newChildNodeParent'] === this.node
        && store.state.explorer.newChildNode;
    },
    newChildName: {
      get() {
        return store.state.explorer.newChildNode.item.name;
      },
      set(value) {
        store.commit('explorer/setNewItemName', value);
      },
    },
    editingNodeName: {
      get() {
        return store.getters['explorer/editingNode'].item.name;
      },
      set(value) {
        this.editingValue = value.trim();
      },
    },
  },
  methods: {
    ...mapMutations('explorer', [
      'setEditingId',
    ]),
    ...mapActions('explorer', [
      'setDragTarget',
    ]),
    select(id = this.node.item.id, doOpen = true) {
      const node = store.getters['explorer/nodeMap'][id];
      if (!node) {
        return false;
      }
      store.commit('explorer/setSelectedId', id);
      if (doOpen) {
        // Prevent from freezing the UI while loading the file
        setTimeout(() => {
          if (node.isFolder) {
            store.commit('explorer/toggleOpenNode', id);
          } else if (store.state.file.currentId !== id) {
            store.commit('file/setCurrentId', id);
            badgeSvc.addBadge('switchFile');
          }
        }, 10);
      }
      return true;
    },
    async submitNewChild(cancel) {
      const { newChildNode } = store.state.explorer;
      if (!cancel && !newChildNode.isNil && newChildNode.item.name) {
        try {
          if (newChildNode.isFolder) {
            const item = await workspaceSvc.storeItem(newChildNode.item);
            this.select(item.id);
            badgeSvc.addBadge('createFolder');
          } else {
            const item = await workspaceSvc.createFile(newChildNode.item);
            this.select(item.id);
            badgeSvc.addBadge('createFile');
          }
        } catch (e) {
          // Cancel
        }
      }
      store.commit('explorer/setNewItem', null);
    },
    async submitEdit(cancel) {
      const { item, isFolder } = store.getters['explorer/editingNode'];
      const value = this.editingValue;
      this.setEditingId(null);
      if (!cancel && item.id && value && item.name !== value) {
        try {
          await workspaceSvc.storeItem({
            ...item,
            name: value,
          });
          badgeSvc.addBadge(isFolder ? 'renameFolder' : 'renameFile');
        } catch (e) {
          // Cancel
        }
      }
    },
    setDragSourceId(evt) {
      if (this.node.noDrag) {
        evt.preventDefault();
        return;
      }
      store.commit('explorer/setDragSourceId', this.node.item.id);
      // Fix for Firefox
      // See https://stackoverflow.com/a/3977637/1333165
      evt.dataTransfer.setData('Text', '');
    },
    onDrop() {
      const sourceNode = store.getters['explorer/dragSourceNode'];
      const targetNode = store.getters['explorer/dragTargetNodeFolder'];
      this.setDragTarget();
      if (!sourceNode.isNil
        && !targetNode.isNil
        && sourceNode.item.id !== targetNode.item.id
      ) {
        workspaceSvc.storeItem({
          ...sourceNode.item,
          parentId: targetNode.item.id,
        });
        badgeSvc.addBadge(sourceNode.isFolder ? 'moveFolder' : 'moveFile');
      }
    },
    async onContextMenu(evt) {
      if (this.select(undefined, false)) {
        evt.preventDefault();
        evt.stopPropagation();
        const item = await store.dispatch('contextMenu/open', {
          coordinates: {
            left: evt.clientX,
            top: evt.clientY,
          },
          items: [{
            name: 'New file',
            disabled: !this.node.isFolder || this.node.isTrash,
            perform: () => explorerSvc.newItem(false),
          }, {
            name: 'New folder',
            disabled: !this.node.isFolder || this.node.isTrash || this.node.isTemp,
            perform: () => explorerSvc.newItem(true),
          }, {
            type: 'separator',
          }, {
            name: 'Rename',
            disabled: this.node.isTrash || this.node.isTemp,
            perform: () => this.setEditingId(this.node.item.id),
          }, {
            name: 'Delete',
            perform: () => explorerSvc.deleteItem(),
          }],
        });
        if (item) {
          item.perform();
        }
      }
    },
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

// ═══════════════════════════════════════════════════════════════
// EXPLORER NODE - Tree Items with Fever Dream Hover States
// ═══════════════════════════════════════════════════════════════

$item-font-size: 13px;
$item-height: 24px;
$new-child-height: 28px;

.explorer-node {
  // Subtle transition for all children
  transition: opacity $transition-base;
}

.explorer-node--drag-target {
  background: linear-gradient(
    90deg,
    rgba($fever-teal, 0.15) 0%,
    rgba($fever-purple, 0.1) 100%
  );
  border-radius: $border-radius-base;

  .app--dark & {
    background: linear-gradient(
      90deg,
      rgba($fever-purple, 0.2) 0%,
      rgba($fever-teal, 0.15) 100%
    );
  }
}

.explorer-node__item {
  position: relative;
  cursor: pointer;
  font-family: $font-family-main;
  font-size: $item-font-size;
  font-weight: 400;
  line-height: $item-height;
  height: $item-height;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding-right: 8px;
  margin: 1px 4px;
  border-radius: $border-radius-base;
  transition: all $transition-base;

  // Hover state with fever glow
  &:hover {
    background: rgba($fever-purple, 0.06);
    padding-left: calc(var(--depth-padding, 0px) + 4px) !important;

    .app--dark & {
      background: rgba($fever-teal, 0.08);
    }
  }

  // Selected state
  .explorer-node--selected > & {
    background: linear-gradient(
      90deg,
      rgba($fever-purple, 0.12) 0%,
      rgba($fever-teal, 0.08) 100%
    );
    color: $fever-purple-deep;
    font-weight: 500;

    .app--dark & {
      background: linear-gradient(
        90deg,
        rgba($fever-teal, 0.15) 0%,
        rgba($fever-purple, 0.1) 100%
      );
      color: $fever-teal;
    }

    // Focused tree selected state - more prominent
    .explorer__tree:focus & {
      background: linear-gradient(
        90deg,
        $fever-purple 0%,
        $fever-teal 100%
      );
      color: #fff;
      box-shadow: 0 2px 8px rgba($fever-purple, 0.3);

      .app--dark & {
        background: linear-gradient(
          90deg,
          $fever-teal 0%,
          $fever-purple 100%
        );
        box-shadow: 0 2px 8px rgba($fever-teal, 0.3);
      }
    }
  }

  // Dimmed state when creating new item
  .explorer__tree--new-item & {
    opacity: 0.4;
  }

  // Location badges
  .explorer-node__location {
    float: right;
    width: 16px;
    height: 16px;
    margin: 4px 2px;
    opacity: 0.6;
    transition: opacity $transition-base;

    &:hover {
      opacity: 1;
    }
  }
}

// Trash and temp nodes - ghostly appearance
.explorer-node--trash,
.explorer-node--temp {
  .explorer-node__item {
    color: rgba(0, 0, 0, 0.45);
    font-style: italic;

    .app--dark & {
      color: rgba(255, 255, 255, 0.35);
    }
  }
}

// Folder icons - custom arrows with fever colors
.explorer-node--folder > .explorer-node__item,
.explorer-node--folder > .explorer-node__item-editor,
.explorer-node__new-child--folder {
  &::before {
    content: '';
    position: absolute;
    margin-left: -14px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-left: 5px solid $fever-purple;
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    transition: all $transition-base;

    .app--dark & {
      border-left-color: $fever-teal;
    }
  }
}

// Open folder - rotated arrow
.explorer-node--folder.explorer-node--open > .explorer-node__item,
.explorer-node--folder.explorer-node--open > .explorer-node__item-editor {
  &::before {
    transform: translateY(-50%) rotate(90deg);
    border-left-color: $fever-teal;

    .app--dark & {
      border-left-color: $fever-purple;
    }
  }
}

// Folder names slightly bolder
.explorer-node--folder > .explorer-node__item {
  font-weight: 500;
  letter-spacing: 0.2px;
}

// Input editors
.explorer-node__item-editor,
.explorer-node__new-child {
  padding: 2px 8px;
  margin: 1px 4px;

  .text-input {
    font-family: $font-family-main;
    font-size: $item-font-size;
    padding: 4px 8px;
    height: $new-child-height;
    border: 1px solid rgba($fever-teal, 0.3);
    background: rgba(255, 255, 255, 0.95);
    border-radius: $border-radius-base;
    box-shadow: 0 0 0 3px rgba($fever-teal, 0.1);
    transition: all $transition-base;

    .app--dark & {
      border-color: rgba($fever-purple, 0.4);
      background: rgba($fever-ghost-dark, 0.9);
      box-shadow: 0 0 0 3px rgba($fever-purple, 0.15);
    }

    &:focus {
      border-color: $fever-teal;
      box-shadow: 0 0 0 3px rgba($fever-teal, 0.2), 0 0 12px rgba($fever-teal, 0.1);

      .app--dark & {
        border-color: $fever-purple;
        box-shadow: 0 0 0 3px rgba($fever-purple, 0.25), 0 0 12px rgba($fever-purple, 0.15);
      }
    }
  }
}

// Children container
.explorer-node__children {
  position: relative;

  // Connecting line
  &::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 0;
    bottom: 12px;
    width: 1px;
    background: linear-gradient(
      180deg,
      rgba($fever-purple, 0.15) 0%,
      rgba($fever-teal, 0.1) 100%
    );

    .app--dark & {
      background: linear-gradient(
        180deg,
        rgba($fever-teal, 0.2) 0%,
        rgba($fever-purple, 0.1) 100%
      );
    }
  }
}
</style>
