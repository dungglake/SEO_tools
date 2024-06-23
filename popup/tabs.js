export function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
  
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
  
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
  
        // Scroll to the top of the tab content
        document.getElementById(tab.dataset.tab).scrollTop = 0;
      });
    });
  }
  