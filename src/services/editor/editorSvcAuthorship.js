import DiffMatchPatch from 'diff-match-patch';
import store from '../../store';
import EditorClassApplier from '../../components/common/EditorClassApplier';

const diffMatchPatch = new DiffMatchPatch();
let authorshipAppliers = [];

export default {
    initAuthorship(clEditor) {
        // Listen for content changes to record human edits
        clEditor.on('contentChanged', (newText) => {
            const currentContent = store.getters['content/current'];
            const oldText = currentContent ? currentContent.text : '';

            // If text is identical, no edit (or it's just a re-render)
            if (newText === oldText) return;

            // Calculate diffs to find what changed
            const diffs = diffMatchPatch.diff_main(oldText, newText);
            diffMatchPatch.diff_cleanupSemantic(diffs);

            let currentIndex = 0;

            diffs.forEach(([type, text]) => {
                if (type === 0) {
                    // Equality - just advance index
                    currentIndex += text.length;
                } else if (type === 1) {
                    // Insertion
                    store.dispatch('authorship/recordHumanEdit', {
                        start: currentIndex,
                        end: currentIndex,
                        newText: text,
                    });
                    currentIndex += text.length;
                } else if (type === -1) {
                    // Deletion
                    store.dispatch('authorship/recordHumanEdit', {
                        start: currentIndex,
                        end: currentIndex + text.length,
                        newText: '',
                    });
                    // Don't advance index for deletion (it's gone from newText)
                }
            });
        });

        // Initialize highlighters
        this.initAuthorshipHighlighters();
    },

    initAuthorshipHighlighters() {
        // Watch for authorship changes or visibility toggle
        store.watch(
            (state, getters) => ({
                authorship: getters['authorship/getFileAuthorship'](store.getters['file/current']?.id),
                show: getters['authorship/isShowingAuthorship'],
            }),
            ({ authorship, show }) => {
                // Clear existing appliers
                authorshipAppliers.forEach(applier => applier.stop());
                authorshipAppliers = [];

                if (!show || !authorship || !authorship.ranges) return;

                // Create new appliers for each range
                authorship.ranges.forEach(range => {
                    // Skip human ranges if we only want to highlight AI (optional, but usually we highlight everything or just AI)
                    // The user wants "Who said what", so highlight everything.
                    // But maybe we don't highlight 'human' to reduce noise? 
                    // The AuthorshipOverlay.vue has a legend for 'human', so we probably should highlight it or at least support it.
                    // However, highlighting everything might be overwhelming.
                    // Let's stick to the request: "Who said what not showing".

                    // We need a unique class for each range or author?
                    // We can reuse classes like `authorship-highlight--claude`.

                    const applier = new EditorClassApplier(
                        [`authorship-highlight`, `authorship-highlight--${range.author}`],
                        () => ({ start: range.start, end: range.end }),
                        { authorshipRange: true } // metadata
                    );

                    authorshipAppliers.push(applier);
                });
            },
            { deep: true }
        );
    }
};
