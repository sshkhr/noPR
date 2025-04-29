// GitHub PR Issue Filter Content Script

// Keep track of the current URL to detect changes
let lastUrl = location.href;
let observerActive = false;

// Initialize extension immediately when the script loads
initExtension();

// Main initialization function
function initExtension() {
  console.log("noPR Extension initialized, monitoring for GitHub issues pages");
  
  // Immediately check if we're on an issues page
  checkCurrentPage();
  
  // Set up URL change detection - check both location and popstate events
  window.addEventListener('popstate', checkCurrentPage);
  window.addEventListener('hashchange', checkCurrentPage);
  
  // Also use MutationObserver to detect changes in the DOM that might indicate navigation
  setupNavigationObserver();
  
  // Add specific listeners for GitHub's Turbo navigation system
  document.addEventListener('turbo:load', checkCurrentPage);
  document.addEventListener('turbo:render', checkCurrentPage);
  document.addEventListener('pjax:end', checkCurrentPage);
}

// Set up a MutationObserver to watch for navigation changes
function setupNavigationObserver() {
  if (observerActive) return;
  
  console.log("Setting up navigation observer");
  observerActive = true;
  
  // Watch for changes to the URL
  setInterval(() => {
    if (lastUrl !== location.href) {
      console.log("URL changed from", lastUrl, "to", location.href);
      lastUrl = location.href;
      checkCurrentPage();
    }
  }, 500);
  
  // Watch for relevant content container changes
  const contentObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && 
          (mutation.target.id === 'repo-content-pjax-container' || 
           mutation.target.id === 'repo-content-turbo-frame')) {
        console.log("Content container changed:", mutation.target.id);
        checkCurrentPage();
        break;
      }
    }
  });
  
  contentObserver.observe(document.body, { childList: true, subtree: true });
}

// Check if the current page is a GitHub issues list
function checkCurrentPage() {
  console.log("Checking current page:", location.href);
  
  if (isIssuesListPage()) {
    console.log("✅ Issues page detected, initializing filter UI");
    setTimeout(initFilterUI, 500);  // Delay to ensure GitHub's UI is fully loaded
  } else {
    console.log("❌ Not an issues page, removing any existing filter UI");
    removeExistingFilterUI();
  }
}

// Check if we're on a GitHub issues list page (not an individual issue)
function isIssuesListPage() {
  // Check for repositories issues list URLs
  const isIssuesUrl = window.location.pathname.match(/\/[^\/]+\/[^\/]+\/issues\/?(?!\d+)(?!\w+\/)/);
  
  // Also check for specific elements that are unique to the issues list page
  const hasIssuesList = document.querySelector('div.js-navigation-container.js-active-navigation-container') !== null;
  const hasIssuesToolbar = document.querySelector('[role="toolbar"]') !== null;
  
  // Look for issues turbo-frame
  const hasTurboFrame = document.querySelector('turbo-frame[src*="/issues"]') !== null;
  
  const result = isIssuesUrl || (hasIssuesList && hasIssuesToolbar) || hasTurboFrame;
  if (result) {
    console.log("Issues page detected via:", 
                isIssuesUrl ? "URL pattern" : 
                (hasIssuesList && hasIssuesToolbar) ? "Issues container" : 
                "Turbo frame");
  }
  return result;
}

// Initialize the filter UI
function initFilterUI() {
  removeExistingFilterUI();  // First remove any existing UI to prevent duplicates
  
  // Find GitHub's toolbar where our filter will be placed
  const toolbar = document.querySelector('[role="toolbar"]');
  if (!toolbar) {
    console.log("Toolbar not found, will retry later");
    setTimeout(initFilterUI, 500);  // Retry if toolbar isn't found
    return;
  }
  
  console.log("Toolbar found, injecting filter dropdown");
  injectFilterDropdown(toolbar);
}

// Remove any existing filter UI elements to prevent duplicates
function removeExistingFilterUI() {
  const existingDropdowns = document.querySelectorAll('[data-action-bar-item="pr-filter"]');
  if (existingDropdowns.length > 0) {
    console.log(`Removing ${existingDropdowns.length} existing filter dropdowns`);
    existingDropdowns.forEach(dropdown => dropdown.remove());
  }
}

// Add the filter dropdown UI to the toolbar
function injectFilterDropdown(toolbar) {
  // Create container to match GitHub's style
  const dropdownContainer = document.createElement('div');
  dropdownContainer.className = 'VisibleItem-module__Box_0--wJA9C';
  dropdownContainer.dataset.actionBarItem = 'pr-filter';
  
  try {
    // Add the HTML template
    dropdownContainer.innerHTML = getTemplateHTML();
    
    // Add CSS styles directly
    addStyles();
    
    // Add event listeners
    const button = dropdownContainer.querySelector('.pr-filter-button');
    const menu = dropdownContainer.querySelector('.pr-filter-menu');
    const menuItems = dropdownContainer.querySelectorAll('.pr-filter-menu-item');
    
    // Toggle dropdown menu
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const isVisible = menu.style.display === 'block';
      menu.style.display = isVisible ? 'none' : 'block';
      button.setAttribute('aria-expanded', !isVisible);
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', () => {
      menu.style.display = 'none';
      button.setAttribute('aria-expanded', 'false');
    });
    
    // Handle menu item selection
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        const filterType = item.dataset.filter;
        applyFilter(filterType);
      });
    });
    
    // Find visible items container and prepend our dropdown at the beginning
    const visibleItems = toolbar.querySelector('.VisibleItems-module__Box_1--_dgKR');
    if (visibleItems) {
      visibleItems.prepend(dropdownContainer);
    } else {
      // Fallback if the structure is different
      toolbar.prepend(dropdownContainer);
    }
    
    // Update the dropdown state based on current URL
    updateDropdownState();
    
    console.log("Successfully added PR filter dropdown");
  } catch (error) {
    console.error('Failed to add PR filter dropdown:', error);
  }
}

// Add CSS styles for the dropdown
function addStyles() {
  if (document.querySelector('#pr-filter-css')) return;
  
  const styleElement = document.createElement('style');
  styleElement.id = 'pr-filter-css';
  styleElement.textContent = `
    .pr-filter-menu {
      display: none;
      position: absolute;
      z-index: 100;
      background-color: var(--color-canvas-overlay, white);
      border: 1px solid var(--color-border-default, #d0d7de);
      border-radius: 6px;
      box-shadow: var(--color-shadow-medium, 0 8px 24px rgba(140,149,159,0.2));
      width: 220px;
      margin-top: 4px;
      padding: 2px 0;
    }
    
    .pr-filter-menu-item:hover {
      background-color: var(--color-neutral-subtle, #f6f8fa);
    }
    
    .pr-filter-menu-item span {
      padding: 4px 8px;
      display: flex;
      align-items: center;
      cursor: pointer;
      white-space: nowrap;
    }
    
    .pr-filter-menu-item[data-filter="with-pr"] span {
      color: var(--color-success-fg, #2da44e);
    }
    
    .pr-filter-menu-item[data-filter="without-pr"] span {
      color: var(--color-danger-fg, #cf222e);
    }
    
    .pr-filter-menu-item span svg {
      margin-right: 4px;
      min-width: 16px;
    }
    
    .pr-filter-menu-item .menu-text {
      flex-grow: 1;
    }
    
    .pr-filter-menu-item .check-icon {
      visibility: hidden;
      margin-left: 4px;
    }
  `;
  document.head.appendChild(styleElement);
}

// Apply the selected filter
function applyFilter(filterType) {
  const url = new URL(window.location.href);
  const searchParams = url.searchParams;
  let query = searchParams.get('q') || '';
  
  // Clean up existing filters
  query = query
    .replace(/(\s|^)linked:pr(\s|$)/g, ' ')
    .replace(/(\s|^)-linked:pr(\s|$)/g, ' ')
    .trim();
  
  // Apply new filter based on selection
  if (filterType === 'with-pr') {
    query = query ? `${query} linked:pr` : 'linked:pr';
  } else if (filterType === 'without-pr') {
    query = query ? `${query} -linked:pr` : '-linked:pr';
  }
  // For 'none', we just removed the existing filters above
  
  // Update URL
  searchParams.set('q', query);
  url.search = searchParams.toString();
  
  // Navigate to new URL
  window.location.href = url.toString();
}

// Update dropdown appearance based on current filter
function updateDropdownState() {
  const button = document.querySelector('.pr-filter-button');
  const menu = document.querySelector('.pr-filter-menu');
  if (!button || !menu) return;
  
  // Get current query parameters
  const url = new URL(window.location.href);
  const query = url.searchParams.get('q') || '';
  
  // Reset previous state
  button.style.backgroundColor = '';
  button.style.color = '';
  
  // Hide all checkmarks
  const checkIcons = menu.querySelectorAll('.check-icon');
  checkIcons.forEach(icon => {
    icon.style.visibility = 'hidden';
  });
  
  let currentFilter = 'none';
  
  // Apply styling based on current filter
  if (query.includes('linked:pr') && !query.includes('-linked:pr')) {
    // With PR filter active
    button.style.backgroundColor = 'var(--color-success-subtle, rgba(31, 136, 61, 0.15))';
    button.style.color = 'var(--color-success-fg, #2da44e)';
    button.title = 'Showing issues with PRs';
    currentFilter = 'with-pr';
  } else if (query.includes('-linked:pr')) {
    // Without PR filter active
    button.style.backgroundColor = 'var(--color-danger-subtle, rgba(207, 34, 46, 0.15))';
    button.style.color = 'var(--color-danger-fg, #cf222e)';
    button.title = 'Showing issues without PRs';
    currentFilter = 'without-pr';
  } else {
    // No filter
    button.title = 'Filter by PR status';
  }
  
  // Show checkmark for current filter
  const currentMenuItem = menu.querySelector(`.pr-filter-menu-item[data-filter="${currentFilter}"]`);
  if (currentMenuItem) {
    const checkIcon = currentMenuItem.querySelector('.check-icon');
    if (checkIcon) {
      checkIcon.style.visibility = 'visible';
    }
  }
}

// HTML template for the dropdown
function getTemplateHTML() {
  return `
  <div class="pr-filter-dropdown">
    <button type="button" class="Box-sc-g0xbh4-0 fAOVzk prc-Button-ButtonBase-c50BI pr-filter-button" 
            data-size="medium" data-variant="invisible" aria-label="Filter by PR status" aria-haspopup="true" aria-expanded="false">
      <span data-component="buttonContent" class="Box-sc-g0xbh4-0 gUkoLg prc-Button-ButtonContent-HKbr-">
        <svg aria-hidden="true" focusable="false" class="octicon octicon-git-pull-request" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align: text-bottom;">
          <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"></path>
        </svg>
        <span data-component="trailingVisual" class="prc-Button-Visual-2epfX prc-Button-VisualWrap-Db-eB">
          <svg aria-hidden="true" focusable="false" class="octicon octicon-triangle-down" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align: text-bottom;">
            <path d="m4.427 7.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z"></path>
          </svg>
        </span>
      </span>
    </button>
    
    <div class="pr-filter-menu">
      <div class="pr-filter-menu-item" data-filter="none">
        <span style="white-space: nowrap;">
          <svg aria-hidden="true" focusable="false" class="octicon octicon-git-pull-request" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align: text-bottom;">
            <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"></path>
          </svg>
          <span style="flex-grow: 1;">No Filter</span>
          <span class="check-icon">✓</span>
        </span>
      </div>
      <div class="pr-filter-menu-item" data-filter="with-pr">
        <span style="white-space: nowrap; color: var(--color-success-fg, #2da44e);">
          <svg aria-hidden="true" focusable="false" class="octicon octicon-git-pull-request" viewBox="0 0 16 16" width="16" height="16" fill="var(--color-success-fg, #2da44e)" display="inline-block" overflow="visible" style="vertical-align: text-bottom;">
            <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"></path>
          </svg>
          <span style="flex-grow: 1;">Issues with Linked PR</span>
          <span class="check-icon">✓</span>
        </span>
      </div>
      <div class="pr-filter-menu-item" data-filter="without-pr">
        <span style="white-space: nowrap; color: var(--color-danger-fg, #cf222e);">
          <svg aria-hidden="true" focusable="false" class="octicon octicon-git-pull-request" viewBox="0 0 16 16" width="16" height="16" fill="var(--color-danger-fg, #cf222e)" display="inline-block" overflow="visible" style="vertical-align: text-bottom;">
            <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"></path>
          </svg>
          <span style="flex-grow: 1;">Issues w/o Linked PR</span>
          <span class="check-icon">✓</span>
        </span>
      </div>
    </div>
  </div>`;
}