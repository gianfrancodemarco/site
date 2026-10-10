document.addEventListener("DOMContentLoaded", () => {
  const motionOk = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
  const cards = document.querySelectorAll(".home-posts .post-card");
  if (!cards.length || !motionOk) {
    return;
  }

  cards.forEach((el, index) => {
    el.classList.add("reveal-on-scroll");
    el.style.transitionDelay = `${Math.min(index * 80, 320)}ms`;
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      cards.forEach((el) => el.classList.add("is-visible"));
    });
  });
});
