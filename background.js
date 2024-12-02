chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: getContentOverview
  }, (results) => {
    if (results && results[0] && results[0].result) {
      const overviewData = results[0].result;
      // Handle the overview data
    }
  });
});
