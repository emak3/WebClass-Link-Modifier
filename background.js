try {
    chrome.webNavigation.onCompleted.addListener(function(details) {
      try {

        if (details.frameId === 0) {

          chrome.scripting.executeScript({
            target: { tabId: details.tabId },
            files: ['content.js']
          }).catch(function(error) {
            console.error('Error executing script:', error);
          });
        }
      } catch (error) {
        console.error('Error in onCompleted listener:', error);
      }
    }, {

      url: [
        { hostContains: '.salesio-sp.ac.jp' },
        { hostContains: '.microsoft.com' }
      ]
    });
  } catch (error) {
    console.error('Error setting up onCompleted listener:', error);
  }
  
  try {
    chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
      try {

        if (details.url.includes('salesio-sp.ac.jp') || details.url.includes('microsoft.com')) {
          console.log('Navigation detected: ' + details.url);
        }
      } catch (error) {
        console.error('Error in onBeforeNavigate handler:', error);
      }
    });
  } catch (error) {
    console.error('Error setting up onBeforeNavigate listener:', error);
  }