/* Modern Gaming Interface JavaScript */
(function() {
  console.log('[app] initializing modern interface...');

  // Tab switching functionality
  function initTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');

        // Remove active class from all nav items and tab contents
        navItems.forEach(nav => nav.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Add active class to clicked nav item and corresponding tab content
        item.classList.add('active');
        const targetContent = document.querySelector(`.tab-content[data-tab="${targetTab}"]`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  }

  // Sub-tab switching functionality
  function initSubTabs() {
    const subTabs = document.querySelectorAll('.sub-tab');
    const subContents = document.querySelectorAll('.sub-content');

    subTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const parentSection = tab.closest('.content-section');
        const targetSubTab = tab.getAttribute('data-subtab');

        // Remove active class from sibling sub-tabs and sub-contents
        const siblingTabs = parentSection.querySelectorAll('.sub-tab');
        const siblingContents = parentSection.querySelectorAll('.sub-content');

        siblingTabs.forEach(sibling => sibling.classList.remove('active'));
        siblingContents.forEach(content => content.classList.remove('active'));

        // Add active class to clicked sub-tab and corresponding content
        tab.classList.add('active');
        const targetContent = parentSection.querySelector(`.sub-content[data-subtab="${targetSubTab}"]`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  }

  // Slider functionality
  function initSliders() {
    const sliders = document.querySelectorAll('.slider');

    sliders.forEach(slider => {
      const valueDisplay = slider.parentNode.querySelector('.slider-value');
      if (valueDisplay) {
        valueDisplay.textContent = slider.value;

        slider.addEventListener('input', () => {
          valueDisplay.textContent = slider.value;
        });
      }

      // Add hover effects
      slider.addEventListener('mouseenter', () => {
        slider.style.background = 'rgba(79, 156, 249, 0.2)';
      });

      slider.addEventListener('mouseleave', () => {
        slider.style.background = 'var(--bg-tertiary)';
      });
    });
  }

  // Dropdown functionality
  function initDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');

    dropdowns.forEach(dropdown => {
      dropdown.addEventListener('click', (e) => {
        e.preventDefault();
        console.log(`[dropdown] ${dropdown.value} selected`);
      });

      dropdown.addEventListener('change', () => {
        console.log(`[dropdown] changed to: ${dropdown.value}`);
      });
    });
  }

  // Button click handlers
  function initButtons() {
    // Config action buttons
    const saveBtn = document.querySelector('.config-actions .btn-primary');
    const loadBtn = document.querySelector('.config-actions .btn-secondary');
    const openFolderBtn = document.querySelector('.config-actions .btn-secondary:last-child');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        console.log('[config] save clicked');
        // Add save logic here
      });
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        console.log('[config] load clicked');
        // Add load logic here
      });
    }

    if (openFolderBtn) {
      openFolderBtn.addEventListener('click', () => {
        console.log('[config] open folder clicked');
        // Add folder opening logic here
      });
    }
  }

  // Color picker functionality
  function initColorPickers() {
    const colorPickers = document.querySelectorAll('.color-picker');

    colorPickers.forEach(picker => {
      picker.addEventListener('change', () => {
        console.log(`[color] changed to: ${picker.value}`);
        // Apply color changes here
      });
    });
  }

  // Initialize all functionality when DOM is ready
  function init() {
    console.log('[app] DOM ready, initializing components...');

    initTabs();
    initSubTabs();
    initSliders();
    initDropdowns();
    initButtons();
    initColorPickers();

    console.log('[app] all components initialized');
  }

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Debug function
  window.debugApp = function() {
    console.log('[app] debug info:');
    console.log('- nav items:', document.querySelectorAll('.nav-item').length);
    console.log('- tab contents:', document.querySelectorAll('.tab-content').length);
    console.log('- sliders:', document.querySelectorAll('.slider').length);
    console.log('- dropdowns:', document.querySelectorAll('.dropdown').length);
  };

  console.log('[app] script loaded');
})();
