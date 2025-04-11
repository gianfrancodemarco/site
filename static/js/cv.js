document.addEventListener('DOMContentLoaded', function () {
    const timelineItems = document.querySelectorAll('.container-timeline');

    // Function to check if an element is in viewport
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.8 &&
            rect.bottom >= 0
        );
    }

    // Function to handle scroll events
    function handleScroll() {
        timelineItems.forEach(item => {
            if (isInViewport(item)) {
                item.classList.add('visible');
            }
        });
    }

    // Initial check for elements in viewport
    handleScroll();

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
}); 