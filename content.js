function modifyLinks() {
    try {
      console.log('WebClass Link Modifier: modifying links');

      const links = document.querySelectorAll('a');
      

      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        

        if (link.classList.contains('showLoginButton')) {
          console.log('WebClass Link Modifier: found login button', link);

          const originalOnclick = link.getAttribute('onclick');
          link.removeAttribute('onclick');
          

          link.addEventListener('click', function(e) {
            console.log('WebClass Link Modifier: login button clicked');
            e.preventDefault();
            e.stopPropagation();

            let url = "/webclass/login.php?auth_mode=SAML" + window.location.search;
            if (originalOnclick && originalOnclick.includes('ENGLISH')) {
              url += '&language=ENGLISH';
            }

            console.log('WebClass Link Modifier: redirecting to', url);
            window.location.href = url;
            return false;
          }, true);
          continue;
        }

        if (link.getAttribute('target') === '_blank' || link.getAttribute('target') === '_new') {
          link.removeAttribute('target');
        }
        

        if (link.getAttribute('onclick') && 
            (link.getAttribute('onclick').includes('window.open') || 
             link.getAttribute('onclick').includes('open(') ||
             link.getAttribute('onclick').includes('_blank'))) {
          

          const originalOnclick = link.getAttribute('onclick');
          const originalHref = link.getAttribute('href');
          

          link.removeAttribute('onclick');
          

          link.addEventListener('click', function(e) {

            e.preventDefault();
            e.stopPropagation();
            

            let url = originalHref;

            if (originalOnclick) {
              const urlMatch = originalOnclick.match(/(?:window\.open|open)\(['"]([^'"]+)['"]/);
              if (urlMatch && urlMatch[1]) {
                url = urlMatch[1];
              }
            }
            

            if (url) {
              window.location.href = url;
            }
            return false;
          }, true);
        }
      }
    } catch (error) {
      console.error('Error in modifyLinks:', error);
    }
  }
  

  function modifyForms() {
    try {
      const forms = document.querySelectorAll('form');
      
      for (let i = 0; i < forms.length; i++) {
        const form = forms[i];

        if (form.getAttribute('target') === '_blank') {
          form.removeAttribute('target');
        }
      }
    } catch (error) {
      console.error('Error in modifyForms:', error);
    }
  }
  

  function overrideGlobalFunctions() {
    try {
      console.log('WebClass Link Modifier: overriding global functions');
      

      const originalWindowOpen = window.open;
      

      window.open = function(url, name, specs) {
        try {
          console.log('WebClass Link Modifier: intercepted window.open call for URL:', url);
          

          if (!url || url === 'null' || url === 'about:blank') {
            console.log('WebClass Link Modifier: null or blank URL, not redirecting');
            return null;
          }
          

          console.log('WebClass Link Modifier: redirecting current window to:', url);
          window.location.href = url;
          

          return null;
        } catch (error) {
          console.error('Error in window.open override:', error);

          return originalWindowOpen.apply(this, arguments);
        }
      };
      

      if (typeof window.openWebClassWindow === 'function') {
        console.log('WebClass Link Modifier: detected openWebClassWindow function, overriding it');
        

        const originalOpenWebClassWindow = window.openWebClassWindow;
        

        window.openWebClassWindow = function(url) {
          console.log('WebClass Link Modifier: intercepted openWebClassWindow call with URL:', url);
          

          window.location.href = url;
          

          return window;
        };
      } else {
        console.log('WebClass Link Modifier: openWebClassWindow function not found');
      }
      

      if (typeof window.callWebClass === 'function') {
        console.log('WebClass Link Modifier: detected callWebClass function, overriding it');
        

        const originalCallWebClass = window.callWebClass;
        

        window.callWebClass = function(lang) {
          console.log('WebClass Link Modifier: intercepted callWebClass call with language:', lang);
          

          var url = "/webclass/login.php?auth_mode=SAML" + window.location.search;
          if(lang == 'ENGLISH') {
            url += '&language=ENGLISH';
          }
          

          console.log('WebClass Link Modifier: redirecting to:', url);
          window.location.href = url;
          

          return false;
        };
      } else {
        console.log('WebClass Link Modifier: callWebClass function not found');
      }
      

      if (typeof window.callSmartphoneWebClass === 'function') {
        console.log('WebClass Link Modifier: detected callSmartphoneWebClass function, overriding it');
        
 
        const originalCallSmartphoneWebClass = window.callSmartphoneWebClass;
        
        window.callSmartphoneWebClass = function(lang) {
          console.log('WebClass Link Modifier: intercepted callSmartphoneWebClass call with language:', lang);
          

          var url = "/webclass/login.php" + window.location.search;
          if(window.location.search === '') {
            url += '?';
          } else {
            url += '&';
          }
          url += 'mbl=1';
          if(lang == 'ENGLISH') {
            url += '&language=ENGLISH';
          }
          

          window.location.href = url;
          

          return false;
        };
      } else {
        console.log('WebClass Link Modifier: callSmartphoneWebClass function not found');
      }
    } catch (error) {
      console.error('Error in overrideGlobalFunctions:', error);
    }
  }
  

  function init() {
    try {
      console.log('WebClass Link Modifier: initializing extension');
      

      overrideGlobalFunctions();
      

      if (document.body) {
        console.log('WebClass Link Modifier: document.body is available, modifying page');
        modifyLinks();
        modifyForms();
        setupObserver();
      } else {
        console.log('WebClass Link Modifier: document.body is not yet available, waiting');

        setTimeout(init, 10);
      }
    } catch (error) {
      console.error('Error in init function:', error);

      setTimeout(init, 100);
    }
  }
  

  function setupObserver() {
    try {
      console.log('WebClass Link Modifier: setting up mutation observer');
      
      const observer = new MutationObserver(function(mutations) {
        try {
          let shouldUpdate = false;
          for (let i = 0; i < mutations.length; i++) {
            if (mutations[i].addedNodes.length) {
              shouldUpdate = true;
              break;
            }
          }
          
          if (shouldUpdate) {
            console.log('WebClass Link Modifier: DOM changes detected, updating links');
            modifyLinks();
            modifyForms();
          }
        } catch (error) {
          console.error('Error in observer callback:', error);
        }
      });
  

      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        console.log('WebClass Link Modifier: observer attached to document.body');
      } else {
        console.log('WebClass Link Modifier: document.body not available for observer');
      }
    } catch (error) {
      console.error('Error setting up observer:', error);
    }
  }
  

  console.log('WebClass Link Modifier: extension loaded, starting initialization');
  init();
  

  document.onreadystatechange = function() {
    console.log('WebClass Link Modifier: readyState changed to', document.readyState);
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      modifyLinks();
      modifyForms();
      setupObserver();
    }
  };
  

  document.addEventListener('DOMContentLoaded', function() {
    try {
      console.log('WebClass Link Modifier: DOMContentLoaded event fired');
      modifyLinks();
      modifyForms();
      setupObserver();
    } catch (error) {
      console.error('Error in DOMContentLoaded handler:', error);
    }
  });
  

  window.addEventListener('load', function() {
    try {
      console.log('WebClass Link Modifier: Window load event fired');
      modifyLinks();
      modifyForms();
    } catch (error) {
      console.error('Error in window.onload handler:', error);
    }
  });
  

  try {
    const originalWindowOpen = window.open;
    window.open = function(url, name, specs) {
      try {

        window.location.href = url;
      } catch (error) {
        console.error('Error in window.open override:', error);

        return originalWindowOpen.apply(this, arguments);
      }
      return null; 
    };
  } catch (error) {
    console.error('Error overriding window.open:', error);
  }