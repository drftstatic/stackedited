// Add this to browser console to debug task creation
console.log('Task Store State:', window.$store?.state?.tasks);
console.log('All Tasks:', window.$store?.getters['tasks/allTasks']);
console.log('Filtered Tasks:', window.$store?.getters['tasks/filteredTasks']);
console.log('Filters:', window.$store?.state?.tasks?.filters);
