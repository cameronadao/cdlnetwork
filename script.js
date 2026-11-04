
/* =========================================
   CDL NETWORK — JAVASCRIPT
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================
       1. MOBILE NAVIGATION
    ===================================== */

    const menuToggle = document.querySelector("#menu-toggle");
    const menuLinks = document.querySelectorAll(".nav-menu a");

    // Close menu when a navigation link is clicked
    menuLinks.forEach(link => {
        link.addEventListener("click", () => {
            if (menuToggle) {
                menuToggle.checked = false;
            }
        });
    });

    // Close menu with Escape key
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && menuToggle) {
            menuToggle.checked = false;
        }
    });


    /* =====================================
       2. SCROLL REVEAL ANIMATIONS
    ===================================== */

    const revealElements = document.querySelectorAll(`
        .intro-content,
        .section-heading,
        .expertise-card,
        .product-item,
        .service-row,
        .portfolio-item,
        .resources-content,
        .about-grid,
        .contact-content
    `);

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!reduceMotion && "IntersectionObserver" in window) {

        revealElements.forEach(element => {
            element.classList.add("reveal");
        });

        const revealObserver = new IntersectionObserver(
            (entries, observer) => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add("is-visible");

                        observer.unobserve(entry.target);
                    }

                });

            },
            {
                threshold: 0.12,
                rootMargin: "0px 0px -40px 0px"
            }
        );

        revealElements.forEach(element => {
            revealObserver.observe(element);
        });

    }


    /* =====================================
       3. HEADER SCROLL EFFECT
    ===================================== */

    const header = document.querySelector(".header");

    function updateHeader() {

        if (!header) return;

        if (window.scrollY > 50) {
            header.classList.add("header-scrolled");
        } else {
            header.classList.remove("header-scrolled");
        }

    }

    window.addEventListener("scroll", updateHeader, {
        passive: true
    });

    updateHeader();


    /* =====================================
       4. SCROLL PROGRESS BAR
    ===================================== */

    const progressBar = document.querySelector(
        ".scroll-progress-bar"
    );

    function updateProgressBar() {

        if (!progressBar) return;

        const scrollableHeight =
            document.documentElement.scrollHeight -
            window.innerHeight;

        const progress = scrollableHeight > 0
            ? (window.scrollY / scrollableHeight) * 100
            : 0;

        progressBar.style.width = `${progress}%`;

    }

    window.addEventListener("scroll", updateProgressBar, {
        passive: true
    });

    updateProgressBar();


    /* =====================================
       5. BACK TO TOP BUTTON
    ===================================== */

    const backToTop = document.querySelector(".back-to-top");

    function updateBackToTop() {

        if (!backToTop) return;

        if (window.scrollY > 500) {
            backToTop.classList.add("visible");
        } else {
            backToTop.classList.remove("visible");
        }

    }

    if (backToTop) {

        backToTop.addEventListener("click", () => {

            window.scrollTo({
                top: 0,
                behavior: reduceMotion ? "instant" : "smooth"
            });

        });

        window.addEventListener("scroll", updateBackToTop, {
            passive: true
        });

        updateBackToTop();

    }


    /* =====================================
       6. CURRENT YEAR IN FOOTER
    ===================================== */

    const currentYear = document.querySelector("#current-year");

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }


    /* =====================================
       7. ACTIVE NAVIGATION LINK
    ===================================== */

    const sections = document.querySelectorAll(
        "main section[id]"
    );

    const navItems = document.querySelectorAll(
        ".nav-menu .nav-link"
    );

    if ("IntersectionObserver" in window) {

        const sectionObserver = new IntersectionObserver(
            entries => {

                entries.forEach(entry => {

                    if (!entry.isIntersecting) return;

                    const currentId = entry.target.id;

                    navItems.forEach(link => {

                        const isActive =
                            link.getAttribute("href") === `#${currentId}`;

                        link.classList.toggle("active", isActive);

                    });

                });

            },
            {
                rootMargin: "-35% 0px -55% 0px"
            }
        );

        sections.forEach(section => {
            sectionObserver.observe(section);
        });

    }


    /* =====================================
       8. PRODUCT CARD INTERACTIONS
    ===================================== */

    const productCards = document.querySelectorAll(
        ".product-item"
    );

    productCards.forEach(card => {

        const image = card.querySelector(".product-image");

        if (!image) return;

        card.addEventListener("mouseenter", () => {
            card.classList.add("product-active");
        });

        card.addEventListener("mouseleave", () => {
            card.classList.remove("product-active");
        });

    });


    /* =====================================
       9. DYNAMIC COPYRIGHT
    ===================================== */

    const copyright = document.querySelector(
        ".copyright-year"
    );

    if (copyright) {
        copyright.textContent = new Date().getFullYear();
    }


    /* =====================================
       10. SMOOTH ANCHOR NAVIGATION
    ===================================== */

    const anchorLinks = document.querySelectorAll(
        'a[href^="#"]'
    );

    anchorLinks.forEach(link => {

        link.addEventListener("click", event => {

            const targetId = link.getAttribute("href");

            if (!targetId || targetId === "#") return;

            const target = document.querySelector(targetId);

            if (!target) return;

            event.preventDefault();

            target.scrollIntoView({
                behavior: reduceMotion ? "instant" : "smooth",
                block: "start"
            });

        });

    });


    console.log("CDL Network — Website initialized successfully.");

});



/* =========================================
   CDL NETWORK — SCROLL REVEAL
========================================= */

document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {

    const elements = document.querySelectorAll(
        ".reveal, .reveal-left, .reveal-right"
    );

    // Respect accessibility preferences
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        elements.forEach(element => {
            element.classList.add("is-visible");
        });
        return;
    }

    // Browser compatibility fallback
    if (!("IntersectionObserver" in window)) {
        elements.forEach(element => {
            element.classList.add("is-visible");
        });
        return;
    }

    const observer = new IntersectionObserver((entries, observer) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add("is-visible");

                observer.unobserve(entry.target);

            }

        });

    }, {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px"
    });

    elements.forEach(element => {
        observer.observe(element);
    });

});


/* =========================================
   CDL NETWORK — MOBILE NAVIGATION
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const menuButton = document.querySelector("#menu-toggle");
    const navMenu = document.querySelector("#primary-navigation");
    const dropdown = document.querySelector(".nav-dropdown");
    const dropdownButton = document.querySelector(".dropdown-toggle");

    if (!menuButton || !navMenu || !dropdown || !dropdownButton) {
        return;
    }

    const isMobile = () => window.innerWidth <= 900;

    function closeDropdown() {
        dropdown.classList.remove("is-open");
        dropdownButton.setAttribute("aria-expanded", "false");
    }

    function closeMenu() {
        navMenu.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation menu");
        document.body.classList.remove("menu-open");
        closeDropdown();
    }

    function toggleMenu() {
        const isOpen = navMenu.classList.toggle("is-open");

        menuButton.setAttribute("aria-expanded", String(isOpen));
        menuButton.setAttribute(
            "aria-label",
            isOpen ? "Close navigation menu" : "Open navigation menu"
        );

        document.body.classList.toggle("menu-open", isOpen);

        if (!isOpen) {
            closeDropdown();
        }
    }

    menuButton.addEventListener("click", toggleMenu);

    dropdownButton.addEventListener("click", () => {
        const isOpen = dropdown.classList.toggle("is-open");

        dropdownButton.setAttribute("aria-expanded", String(isOpen));
    });

    navMenu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            if (isMobile()) {
                closeMenu();
            }
        });
    });

    document.addEventListener("click", event => {
        if (
            isMobile() &&
            navMenu.classList.contains("is-open") &&
            !navMenu.contains(event.target) &&
            !menuButton.contains(event.target)
        ) {
            closeMenu();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMenu();
            menuButton.focus();
        }
    });

    window.addEventListener("resize", () => {
        if (!isMobile()) {
            closeMenu();
        }
    });

});

