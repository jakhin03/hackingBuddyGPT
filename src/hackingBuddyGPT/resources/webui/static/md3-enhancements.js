/* Enhanced Material Design 3 interactions for hackingBuddyGPT */

(function() {
    'use strict';

    // Add ripple effect to interactive elements
    function createRipple(event) {
        const button = event.currentTarget;
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - button.offsetLeft - radius}px`;
        circle.style.top = `${event.clientY - button.offsetTop - radius}px`;
        circle.classList.add('ripple');

        const ripple = button.getElementsByClassName('ripple')[0];
        if (ripple) {
            ripple.remove();
        }

        button.appendChild(circle);
    }

    // Initialize ripple effects
    function initRippleEffects() {
        const style = document.createElement('style');
        style.textContent = `
            .nav-toggle, .icon-button, .run-list-entry {
                position: relative;
                overflow: hidden;
            }

            .ripple {
                position: absolute;
                border-radius: 50%;
                background-color: rgba(255, 255, 255, 0.15);
                transform: scale(0);
                animation: ripple-animation 0.4s linear;
                pointer-events: none;
            }

            @keyframes ripple-animation {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        // Add ripple to buttons
        document.querySelectorAll('.nav-toggle, .icon-button').forEach(button => {
            button.addEventListener('click', createRipple);
        });

        // Add ripple to run list entries
        document.addEventListener('click', (event) => {
            if (event.target.closest('.run-list-entry')) {
                createRipple.call(event.target.closest('.run-list-entry'), event);
            }
        });
    }

    // Enhanced card expansion
    function initCardExpansion() {
        document.addEventListener('click', (event) => {
            const cardHeader = event.target.closest('.card-header');
            if (cardHeader) {
                const card = cardHeader.parentElement;
                card.classList.toggle('expanded');
                
                // Smooth scroll to card if expanding
                if (card.classList.contains('expanded')) {
                    setTimeout(() => {
                        card.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'nearest' 
                        });
                    }, 100);
                }
            }
        });
    }

    // Enhanced navigation drawer
    function initNavigationDrawer() {
        const drawer = document.getElementById('sidebar');
        const overlay = document.createElement('div');
        overlay.className = 'drawer-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 150;
            opacity: 0;
            visibility: hidden;
            transition: opacity var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard),
                        visibility var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
        `;
        
        document.body.appendChild(overlay);

        // Show/hide overlay on mobile
        function updateOverlay() {
            if (window.innerWidth <= 768) {
                if (drawer.classList.contains('active')) {
                    overlay.style.opacity = '1';
                    overlay.style.visibility = 'visible';
                } else {
                    overlay.style.opacity = '0';
                    overlay.style.visibility = 'hidden';
                }
            } else {
                overlay.style.opacity = '0';
                overlay.style.visibility = 'hidden';
            }
        }

        // Close drawer when clicking overlay
        overlay.addEventListener('click', () => {
            drawer.classList.remove('active');
            updateOverlay();
        });

        // Update overlay when drawer state changes
        const observer = new MutationObserver(() => {
            updateOverlay();
        });
        
        observer.observe(drawer, { attributes: true, attributeFilter: ['class'] });
        
        // Update on window resize
        window.addEventListener('resize', updateOverlay);
    }

    // Enhanced scroll behavior
    function initScrollBehavior() {
        const topAppBar = document.querySelector('.top-app-bar');
        const contentArea = document.querySelector('.content-area');
        let lastScrollTop = 0;
        let isScrolling = false;

        contentArea.addEventListener('scroll', () => {
            if (!isScrolling) {
                window.requestAnimationFrame(() => {
                    const scrollTop = contentArea.scrollTop;
                    
                    // Add elevation to app bar when scrolled
                    if (scrollTop > 0) {
                        topAppBar.style.boxShadow = 'var(--md-sys-elevation-level2)';
                    } else {
                        topAppBar.style.boxShadow = 'var(--md-sys-elevation-level1)';
                    }

                    lastScrollTop = scrollTop;
                    isScrolling = false;
                });
            }
            isScrolling = true;
        });
    }

    // Enhanced theme switching (for future dark mode toggle)
    function initThemeSystem() {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        
        function updateTheme(isDark) {
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        }

        // Listen for system theme changes
        prefersDark.addEventListener('change', (e) => {
            updateTheme(e.matches);
        });

        // Initialize theme
        updateTheme(prefersDark.matches);
    }

    // Enhanced message animations
    function initMessageAnimations() {
        // Add intersection observer for fade-in animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '20px'
        });

        // Observe new messages as they're added
        const messagesContainer = document.querySelector('.messages-grid');
        if (messagesContainer) {
            const mutationObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE && 
                            (node.classList.contains('message') || node.classList.contains('section'))) {
                            observer.observe(node);
                        }
                    });
                });
            });

            mutationObserver.observe(messagesContainer, { childList: true });
        }
    }

    // Initialize all enhancements when DOM is loaded
    function init() {
        initRippleEffects();
        initCardExpansion();
        initNavigationDrawer();
        initScrollBehavior();
        initThemeSystem();
        initMessageAnimations();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
