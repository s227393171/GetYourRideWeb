// Lightweight admin enhancements: keyboard accessibility and progressive enhancements
(function(){
    function makeFocusableCards(){
        const cards = document.querySelectorAll('.action-card, .metric-card, .dash-stat-card');
        cards.forEach(c=>{
            // Only modify if not already focusable
            if(!c.hasAttribute('tabindex')){
                c.setAttribute('tabindex','0');
                c.setAttribute('role','button');
            }

            // support Enter/Space to activate click
            c.addEventListener('keydown', function(e){
                if(e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar'){
                    e.preventDefault();
                    c.click();
                }
            });
        });
    }

    function addAriaLandmarks(){
        const sidebar = document.querySelector('.sidebar');
        if(sidebar && !sidebar.hasAttribute('role')){
            sidebar.setAttribute('role','navigation');
            sidebar.setAttribute('aria-label','Admin navigation');
        }
        const main = document.querySelector('.main-content');
        if(main && !main.hasAttribute('role')){
            main.setAttribute('role','main');
            main.setAttribute('aria-label','Main content');
        }
    }

    function init(){
        addAriaLandmarks();
        makeFocusableCards();

        // Observe DOM for dynamically added action-card elements
        const observer = new MutationObserver(function(mutations){
            makeFocusableCards();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
