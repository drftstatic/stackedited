import pagedownButtons from '../data/pagedownButtons';

let buttonCount = 2; // 2 for undo/redo
let spacerCount = 0;
pagedownButtons.forEach((button) => {
  if (button.method) {
    buttonCount += 1;
  } else {
    spacerCount += 1;
  }
});

const minPadding = 25;
const editorTopPadding = 10;
const navigationBarEditButtonsWidth = (34 * buttonCount) + (8 * spacerCount); // buttons + spacers
const navigationBarLeftButtonWidth = 38 + 4 + 12;
const navigationBarRightButtonWidth = 38 + 8;
const navigationBarSpinnerWidth = 24 + 8 + 5; // 5 for left margin
const navigationBarLocationWidth = 20;
const navigationBarSyncPublishButtonsWidth = 34 + 10;
const navigationBarTitleMargin = 8;
const maxTitleMaxWidth = 800;
const minTitleMaxWidth = 200;

const defaultConstants = {
  editorMinWidth: 320,
  defaultExplorerWidth: 260,
  gutterWidth: 250,
  defaultSideBarWidth: 280,
  navigationBarHeight: 44,
  buttonBarWidth: 26,
  statusBarHeight: 20,
  // Constraints for resizable panels
  sideBarMinWidth: 200,
  sideBarMaxWidth: 600,
  explorerMinWidth: 180,
  explorerMaxWidth: 500,
  // AI Chat panel constraints for collaborative mode
  aiChatMinWidth: 300,
  aiChatMaxWidth: 0.7, // Max 70% of available width
  defaultAiChatSplitRatio: 0.5, // 50/50 split
};

// Dynamic constants getter that uses user preferences or defaults
const getConstants = (layoutSettings) => ({
  ...defaultConstants,
  sideBarWidth: layoutSettings?.sideBarWidth || defaultConstants.defaultSideBarWidth,
  explorerWidth: layoutSettings?.explorerWidth || defaultConstants.defaultExplorerWidth,
  aiChatSplitRatio: layoutSettings?.aiChatSplitRatio || defaultConstants.defaultAiChatSplitRatio,
});

// Legacy static reference (used in some places)
const constants = {
  ...defaultConstants,
  sideBarWidth: defaultConstants.defaultSideBarWidth,
  explorerWidth: defaultConstants.defaultExplorerWidth,
};

function computeStyles(state, getters, layoutSettings = getters['data/layoutSettings'], styles = {
  showNavigationBar: layoutSettings.showNavigationBar
    || !layoutSettings.showEditor
    || state.content.revisionContent
    || state.light,
  showStatusBar: layoutSettings.showStatusBar,
  showEditor: layoutSettings.showEditor,
  showSidePreview: layoutSettings.showSidePreview && layoutSettings.showEditor,
  showPreview: layoutSettings.showSidePreview || !layoutSettings.showEditor,
  showSideBar: layoutSettings.showSideBar && !state.light && !layoutSettings.collaborativeMode,
  showExplorer: layoutSettings.showExplorer && !state.light,
  showAiChat: layoutSettings.collaborativeMode && !state.light, // AI chat panel in collaborative mode
  collaborativeMode: layoutSettings.collaborativeMode,
  layoutOverflow: false,
  hideLocations: state.light,
}) {
  // Get dynamic constants based on user preferences
  const dynConstants = getConstants(layoutSettings);

  styles.innerHeight = state.layout.bodyHeight;
  if (styles.showNavigationBar) {
    styles.innerHeight -= dynConstants.navigationBarHeight;
  }
  if (styles.showStatusBar) {
    styles.innerHeight -= dynConstants.statusBarHeight;
  }

  // Calculate available width
  let totalAvailableWidth = state.layout.bodyWidth;
  if (styles.showExplorer) {
    totalAvailableWidth -= dynConstants.explorerWidth;
  }

  // In collaborative mode, split between editor and AI chat
  if (styles.showAiChat) {
    const splitRatio = dynConstants.aiChatSplitRatio;
    styles.aiChatWidth = Math.floor(totalAvailableWidth * splitRatio);
    // Enforce min width
    styles.aiChatWidth = Math.max(styles.aiChatWidth, dynConstants.aiChatMinWidth);
    // Enforce max width (70% of available)
    const maxWidth = Math.floor(totalAvailableWidth * dynConstants.aiChatMaxWidth);
    styles.aiChatWidth = Math.min(styles.aiChatWidth, maxWidth);
    // Editor gets the rest
    styles.innerWidth = totalAvailableWidth - styles.aiChatWidth;
  } else {
    styles.innerWidth = totalAvailableWidth;
    styles.aiChatWidth = 0;
    if (styles.showSideBar) {
      styles.innerWidth -= dynConstants.sideBarWidth;
    }
  }

  if (styles.innerWidth < dynConstants.editorMinWidth
    + dynConstants.gutterWidth + dynConstants.buttonBarWidth
  ) {
    styles.layoutOverflow = true;
  }

  let doublePanelWidth = styles.innerWidth - dynConstants.buttonBarWidth;
  // No commenting for temp files
  const showGutter = !getters['file/isCurrentTemp'] && !!getters['discussion/currentDiscussion'];
  if (showGutter) {
    doublePanelWidth -= dynConstants.gutterWidth;
  }
  if (doublePanelWidth < dynConstants.editorMinWidth) {
    doublePanelWidth = dynConstants.editorMinWidth;
  }

  if (styles.showSidePreview && doublePanelWidth / 2 < dynConstants.editorMinWidth) {
    styles.showSidePreview = false;
    styles.showPreview = false;
    styles.layoutOverflow = false;
    return computeStyles(state, getters, layoutSettings, styles);
  }

  const computedSettings = getters['data/computedSettings'];
  styles.fontSize = 18;
  styles.textWidth = 990;
  if (doublePanelWidth < 1120) {
    styles.fontSize -= 1;
    styles.textWidth = 910;
  }
  if (doublePanelWidth < 1040) {
    styles.textWidth = 830;
  }
  styles.textWidth *= computedSettings.maxWidthFactor;
  if (doublePanelWidth < styles.textWidth) {
    styles.textWidth = doublePanelWidth;
  }
  if (styles.textWidth < 640) {
    styles.fontSize -= 1;
  }
  styles.fontSize *= computedSettings.fontSizeFactor;

  const bottomPadding = Math.floor(styles.innerHeight / 2);
  const panelWidth = Math.floor(doublePanelWidth / 2);
  styles.previewWidth = styles.showSidePreview
    ? panelWidth
    : doublePanelWidth;
  const previewRightPadding = Math
    .max(Math.floor((styles.previewWidth - styles.textWidth) / 2), minPadding);
  if (!styles.showSidePreview) {
    styles.previewWidth += dynConstants.buttonBarWidth;
  }
  styles.previewGutterWidth = showGutter && !layoutSettings.showEditor
    ? dynConstants.gutterWidth
    : 0;
  const previewLeftPadding = previewRightPadding + styles.previewGutterWidth;
  styles.previewGutterLeft = previewLeftPadding - minPadding;
  styles.previewPadding = `${editorTopPadding}px ${previewRightPadding}px ${bottomPadding}px ${previewLeftPadding}px`;
  styles.editorWidth = styles.showSidePreview
    ? panelWidth
    : doublePanelWidth;
  const editorRightPadding = Math
    .max(Math.floor((styles.editorWidth - styles.textWidth) / 2), minPadding);
  styles.editorGutterWidth = showGutter && layoutSettings.showEditor
    ? dynConstants.gutterWidth
    : 0;
  const editorLeftPadding = editorRightPadding + styles.editorGutterWidth;
  styles.editorGutterLeft = editorLeftPadding - minPadding;
  styles.editorPadding = `${editorTopPadding}px ${editorRightPadding}px ${bottomPadding}px ${editorLeftPadding}px`;

  styles.titleMaxWidth = styles.innerWidth
    - navigationBarLeftButtonWidth
    - navigationBarRightButtonWidth
    - navigationBarSpinnerWidth;
  if (styles.showEditor) {
    const syncLocations = getters['syncLocation/current'];
    const publishLocations = getters['publishLocation/current'];
    styles.titleMaxWidth -= navigationBarEditButtonsWidth
      + (navigationBarLocationWidth * (syncLocations.length + publishLocations.length))
      + (navigationBarSyncPublishButtonsWidth * 2)
      + navigationBarTitleMargin;
    if (styles.titleMaxWidth + navigationBarEditButtonsWidth < minTitleMaxWidth) {
      styles.hideLocations = true;
    }
  }
  styles.titleMaxWidth = Math
    .max(minTitleMaxWidth, Math
      .min(maxTitleMaxWidth, styles.titleMaxWidth));
  return styles;
}

export default {
  namespaced: true,
  state: {
    canUndo: false,
    canRedo: false,
    bodyWidth: 0,
    bodyHeight: 0,
  },
  mutations: {
    setCanUndo: (state, value) => {
      state.canUndo = value;
    },
    setCanRedo: (state, value) => {
      state.canRedo = value;
    },
    updateBodySize: (state) => {
      state.bodyWidth = document.body.clientWidth;
      state.bodyHeight = document.body.clientHeight;
    },
  },
  getters: {
    constants: (state, getters, rootState, rootGetters) => {
      const layoutSettings = rootGetters['data/layoutSettings'];
      return getConstants(layoutSettings);
    },
    styles: (state, getters, rootState, rootGetters) => computeStyles(rootState, rootGetters),
  },
  actions: {
    updateBodySize({ commit, dispatch, rootGetters }) {
      commit('updateBodySize');
      // Make sure both explorer and side bar are not open if body width is small
      const layoutSettings = rootGetters['data/layoutSettings'];
      dispatch('data/toggleExplorer', layoutSettings.showExplorer, { root: true });
    },
  },
};
