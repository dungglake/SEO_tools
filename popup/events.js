export function setupEventListeners() {
    document.getElementById('grid-select').addEventListener('change', function() {
      updateGridLayout(this.value);
    });
  
    const toggleImageViewButton = document.getElementById('toggle-image-view');
    const imageViewContainer = document.getElementById('image-view-container');
  
    toggleImageViewButton.addEventListener('click', () => {
      if (imageViewContainer.style.display === 'none') {
        imageViewContainer.style.display = 'block';
        toggleImageViewButton.textContent = 'Collapse';
      } else {
        imageViewContainer.style.display = 'none';
        toggleImageViewButton.textContent = 'Expand';
      }
    });
  
    document.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (event) => {
        const anchorText = link.textContent.trim();
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'highlightAnchor', anchorText }, (response) => {
            // Log the response from content script
          });
        });
      });
    });
  
    const resetButton = document.getElementById('reset-highlights');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'resetHighlights' });
        });
      });
    }
  
    const toggleDetailsButton = document.getElementById('toggle-details-button');
    const detailsContainer = document.getElementById('details-container');
  
    toggleDetailsButton.addEventListener('click', () => {
      if (detailsContainer.style.display === 'none') {
        detailsContainer.style.display = 'block';
        toggleDetailsButton.textContent = 'Hide details';
      } else {
        detailsContainer.style.display = 'none';
        toggleDetailsButton.textContent = 'More details';
      }
    });
  }
  