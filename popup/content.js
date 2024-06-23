export function fetchContentData(currentTabUrl, sendMessage) {
    let action;
    if (currentTabUrl.includes('wp-admin/post-new.php')) {
      action = 'getContentOverviewFromCreate';
    } else if (currentTabUrl.includes('wp-admin/post.php') && currentTabUrl.includes('&action=edit')) {
      action = 'getContentOverviewFromEdit';
    } else {
      action = 'getContentOverview';
    }
  
    sendMessage({ action }, (overviewResponse) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        return;
      }
      if (overviewResponse && !overviewResponse.error) {
        displayOverview(overviewResponse, action);
      } else {
        console.error('Error in content overview response:', overviewResponse ? overviewResponse.error : 'No response');
      }
    });
  
    sendMessage({ action: 'getImagesAndLinks' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        return;
      }
      if (response && !response.error) {
        displayData(response.images, response.links, response.overview);
      } else {
        console.error('Error in images and links response:', response ? response.error : 'No response');
      }
    });
  
    fetchAndDisplayHeadings(); // Call to fetch and display headings
  }
  