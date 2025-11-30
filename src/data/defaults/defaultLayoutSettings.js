export default () => ({
  showNavigationBar: true,
  showEditor: true,
  showSidePreview: false, // Disabled by default in collaborative mode
  showStatusBar: true,
  showSideBar: false, // Sidebar hidden in collaborative mode
  showExplorer: false,
  scrollSync: true,
  focusMode: false,
  findCaseSensitive: false,
  findUseRegexp: false,
  sideBarPanel: 'menu',
  welcomeTourFinished: false,
  // Resizable panel widths (null means use default)
  sideBarWidth: null,
  explorerWidth: null,
  // Collaborative mode - 50/50 split with AI chat
  collaborativeMode: true, // Default to collaborative mode
  aiChatWidth: null, // null = 50%, or percentage/pixels
  aiChatSplitRatio: 0.5, // 50% split by default
});
