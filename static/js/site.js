document.addEventListener("DOMContentLoaded", () => {
  initHomePostReveal();
  initReadingProgress();
});

function initHomePostReveal() {
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
}

function initReadingProgress() {
  const bar = document.querySelector(".reading-progress");
  const content = document.querySelector(".post-content");
  if (!bar || !content) {
    return;
  }

  const update = () => {
    const contentTop = content.offsetTop;
    const contentHeight = content.offsetHeight;
    const viewport = window.innerHeight;
    const scrollY = window.scrollY;
    const start = contentTop - viewport * 0.25;
    const end = contentTop + contentHeight - viewport * 0.5;
    const range = Math.max(1, end - start);
    const progress = Math.min(100, Math.max(0, ((scrollY - start) / range) * 100));

    bar.style.width = `${progress}%`;
    bar.setAttribute("aria-valuenow", String(Math.round(progress)));
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
}
