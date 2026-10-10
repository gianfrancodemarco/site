document.addEventListener("DOMContentLoaded", () => {
  initSectionReveal();
  initHomePostReveal();
  initReadingProgress();
  initTerminalHero();
  initGridParallax();
  initHeadingAnchors();
  initCodeCopyButtons();
  initSeriesSticky();
});

function motionOk() {
  return window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
}

function initSectionReveal() {
  const sections = document.querySelectorAll(".reveal-section");
  if (!sections.length) {
    return;
  }

  if (document.querySelector(".home-intro")) {
    initHomeBootSequence(sections);
    return;
  }

  if (!motionOk() || !("IntersectionObserver" in window)) {
    sections.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
  );

  sections.forEach((el, index) => {
    el.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
    observer.observe(el);
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      el.classList.add("is-visible");
    }
  });
}

function initHomeBootSequence(sections) {
  const ordered = [...sections];
  if (!motionOk()) {
    ordered.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  ordered.forEach((el) => {
    el.classList.remove("is-visible");
    el.classList.add("boot-wait");
  });

  let index = 0;
  const revealNext = () => {
    if (index >= ordered.length) {
      return;
    }
    const el = ordered[index];
    el.classList.remove("boot-wait");
    el.classList.add("is-visible");
    index += 1;
    window.setTimeout(revealNext, 130);
  };

  window.setTimeout(revealNext, 180);
}

function initHomePostReveal() {
  const cards = document.querySelectorAll(".home-posts .post-card");
  if (!cards.length || !motionOk()) {
    if (cards.length) {
      cards.forEach((el) => el.classList.add("is-visible"));
    }
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

function initTerminalHero() {
  const terminal = document.querySelector(".home-terminal");
  const textEl = document.querySelector("[data-terminal-text]");
  if (!terminal || !textEl) {
    return;
  }

  const commands = [
    "python --version",
    "dagster dev",
    "dbt run",
    'psql -c "SELECT 1"',
    "docker ps",
    "kubectl get pods",
    "aws sts get-caller-identity",
    "ollama list",
    "hugo server -D",
    "grep -R LLM content/posts/",
    "ls tags/databases/",
  ];
  let commandIndex = 0;
  let charIndex = 0;
  let deleting = false;

  const tick = () => {
    if (!motionOk()) {
      textEl.textContent = commands[0];
      return;
    }

    const current = commands[commandIndex];
    if (!deleting) {
      charIndex += 1;
      textEl.textContent = current.slice(0, charIndex);
      if (charIndex >= current.length) {
        deleting = true;
        window.setTimeout(tick, 1400);
        return;
      }
      window.setTimeout(tick, 45);
      return;
    }

    charIndex -= 1;
    textEl.textContent = current.slice(0, charIndex);
    if (charIndex <= 0) {
      deleting = false;
      commandIndex = (commandIndex + 1) % commands.length;
      window.setTimeout(tick, 280);
      return;
    }
    window.setTimeout(tick, 22);
  };

  tick();

  terminal.addEventListener("click", () => {
    const target = document.querySelector(terminal.getAttribute("data-terminal-scroll") || "#toolbox");
    target?.scrollIntoView({ behavior: motionOk() ? "smooth" : "auto", block: "start" });
  });
}

function initGridParallax() {
  const main = document.querySelector("main#content");
  if (!main || !motionOk()) {
    return;
  }

  main.classList.add("grid-parallax");

  const update = () => {
    const offset = Math.min(12, window.scrollY * 0.04);
    main.style.backgroundPosition = `center ${offset}px`;
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
}

function initHeadingAnchors() {
  const content = document.querySelector(".post-content");
  if (!content) {
    return;
  }

  content.querySelectorAll("h2, h3, h4").forEach((heading) => {
    if (heading.querySelector(".heading-anchor")) {
      return;
    }
    if (!heading.id) {
      heading.id =
        heading.textContent
          ?.trim()
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-") || `section-${Math.random().toString(36).slice(2, 8)}`;
    }
    const link = document.createElement("a");
    link.className = "heading-anchor";
    link.href = `#${heading.id}`;
    link.setAttribute("aria-label", `Link to section: ${heading.textContent?.trim() || "section"}`);
    link.textContent = "#";
    heading.prepend(link);
  });
}

function initCodeCopyButtons() {
  document.querySelectorAll(".post-content pre").forEach((pre) => {
    const code = pre.querySelector("code");
    if (!code || pre.querySelector(".code-copy-btn")) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy-btn";
    button.textContent = "Copy";
    button.addEventListener("click", async () => {
      const text = code.innerText || code.textContent || "";
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "OK";
        button.classList.add("is-copied");
        window.setTimeout(() => {
          button.textContent = "Copy";
          button.classList.remove("is-copied");
        }, 1600);
      } catch {
        button.textContent = "Err";
        window.setTimeout(() => {
          button.textContent = "Copy";
        }, 1600);
      }
    });
    pre.appendChild(button);
  });
}

function initSeriesSticky() {
  const bar = document.querySelector("[data-series-sticky]");
  const seriesIndex = document.querySelector(".series-index");
  const header = document.querySelector(".post-header-section");
  if (!bar || !seriesIndex || !header) {
    return;
  }

  bar.removeAttribute("hidden");

  const show = () => {
    const pastHeader = header.getBoundingClientRect().bottom < 56;
    bar.classList.toggle("is-visible", pastHeader);
  };

  show();
  window.addEventListener("scroll", show, { passive: true });
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
