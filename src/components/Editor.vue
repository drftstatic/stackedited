<template>
  <div class="editor">
    <pre class="editor__inner markdown-highlighting" :style="{padding: styles.editorPadding}" :class="{monospaced: computedSettings.editor.monospacedFontOnly}" />
    <div class="gutter" :style="{left: styles.editorGutterLeft + 'px'}">
      <comment-list v-if="styles.editorGutterWidth" />
      <editor-new-discussion-button v-if="!isCurrentTemp" />
    </div>
    <authorship-overlay />
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import CommentList from './gutters/CommentList';
import EditorNewDiscussionButton from './gutters/EditorNewDiscussionButton';
import AuthorshipOverlay from './AuthorshipOverlay';
import store from '../store';

export default {
  components: {
    CommentList,
    EditorNewDiscussionButton,
    AuthorshipOverlay,
  },
  computed: {
    ...mapGetters('file', [
      'isCurrentTemp',
    ]),
    ...mapGetters('layout', [
      'styles',
    ]),
    ...mapGetters('data', [
      'computedSettings',
    ]),
  },
  mounted() {
    const editorElt = this.$el.querySelector('.editor__inner');
    const onDiscussionEvt = (cb) => (evt) => {
      let elt = evt.target;
      while (elt && elt !== editorElt) {
        if (elt.discussionId) {
          cb(elt.discussionId);
          return;
        }
        elt = elt.parentNode;
      }
    };

    const classToggler = (toggle) => (discussionId) => {
      editorElt.getElementsByClassName(`discussion-editor-highlighting--${discussionId}`)
        .cl_each((elt) => elt.classList.toggle('discussion-editor-highlighting--hover', toggle));
      document.getElementsByClassName(`comment--discussion-${discussionId}`)
        .cl_each((elt) => elt.classList.toggle('comment--hover', toggle));
    };

    editorElt.addEventListener('mouseover', onDiscussionEvt(classToggler(true)));
    editorElt.addEventListener('mouseout', onDiscussionEvt(classToggler(false)));
    editorElt.addEventListener('click', onDiscussionEvt((discussionId) => {
      store.commit('discussion/setCurrentDiscussionId', discussionId);
    }));

    this.$watch(
      () => store.state.discussion.currentDiscussionId,
      (discussionId, oldDiscussionId) => {
        if (oldDiscussionId) {
          editorElt.querySelectorAll(`.discussion-editor-highlighting--${oldDiscussionId}`)
            .cl_each((elt) => elt.classList.remove('discussion-editor-highlighting--selected'));
        }
        if (discussionId) {
          editorElt.querySelectorAll(`.discussion-editor-highlighting--${discussionId}`)
            .cl_each((elt) => elt.classList.add('discussion-editor-highlighting--selected'));
        }
      },
    );
  },
};
</script>

<style lang="scss">
@import '../styles/variables.scss';

.editor {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: auto;
}

.editor__inner {
  margin: 0;
  font-family: $font-family-main;
  font-variant-ligatures: no-common-ligatures;
  white-space: pre-wrap;
  word-break: break-word;
  word-wrap: break-word;

  * {
    line-height: $line-height-base;
  }

  .cledit-section {
    font-family: inherit;
  }

  .hide {
    display: none;
  }

  &.monospaced {
    font-family: $font-family-monospace !important;
    font-size: $font-size-monospace !important;

    * {
      font-size: inherit !important;
    }
  }
}

// ───────────────────────────────────────────────────────────────
// AUTHORSHIP HIGHLIGHTS
// ───────────────────────────────────────────────────────────────

.authorship-highlight {
  border-bottom: 2px solid transparent;
  transition: all $transition-base;
  
  &:hover {
    opacity: 0.8;
  }
}

.authorship-highlight--human {
  // Human edits are usually default, maybe just a subtle underline or nothing
  // border-bottom-color: rgba($body-color-light, 0.1);
  opacity: 1;
}

.authorship-highlight--claude {
  background-color: rgba($fever-amber, 0.1);
  border-bottom-color: $fever-amber;
}

.authorship-highlight--gemini {
  background-color: rgba($fever-blue, 0.1);
  border-bottom-color: $fever-blue;
}

.authorship-highlight--openai { // GPT
  background-color: rgba($fever-lime, 0.1);
  border-bottom-color: $fever-lime;
}

.authorship-highlight--cursor { // Grok
  background-color: rgba($fever-purple, 0.1);
  border-bottom-color: $fever-purple;
}

.authorship-highlight--composer {
  background-color: rgba($fever-teal, 0.1);
  border-bottom-color: $fever-teal;
}

.authorship-highlight--zai {
  background-color: rgba($fever-indigo, 0.1);
  border-bottom-color: $fever-indigo;
}
</style>
