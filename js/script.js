
/* =========================================
   CDL NETWORK — JAVASCRIPT
========================================= */


window.CDL_PROMOTION_PRICING = Object.freeze({
    startsAt: new Date("2026-11-27T00:00:00+01:00").getTime(),
    endsAt: new Date("2026-12-01T00:00:00+01:00").getTime(),
    isActive() {
        const now = Date.now();
        return now >= this.startsAt && now < this.endsAt;
    },
    discountedAmount(amount) {
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0 || !this.isActive()) return value;
        return Math.round(value * 50) / 100;
    }
});

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

    navMenu.querySelectorAll("a, [data-contact-modal-open]").forEach(link => {
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

/* ========================================
   FAQ ACCORDION
======================================== */

document.addEventListener("DOMContentLoaded", () => {
    const faqItems = document.querySelectorAll(".faq-item");

    faqItems.forEach((item) => {
        const button = item.querySelector(".faq-question");
        const answer = item.querySelector(".faq-answer");

        if (!button || !answer) return;

        button.addEventListener("click", () => {
            const isCurrentlyOpen =
                button.getAttribute("aria-expanded") === "true";

            // Close all FAQ items
            faqItems.forEach((otherItem) => {
                const otherButton =
                    otherItem.querySelector(".faq-question");
                const otherAnswer =
                    otherItem.querySelector(".faq-answer");

                otherItem.classList.remove("is-open");
                otherButton.setAttribute("aria-expanded", "false");
                otherAnswer.hidden = true;
            });

            // Open the selected item if it was previously closed
            if (!isCurrentlyOpen) {
                item.classList.add("is-open");
                button.setAttribute("aria-expanded", "true");
                answer.hidden = false;
            }
        });
    });
});

/* ========================================
   BLACK FRIDAY + CYBER MONDAY COUNTDOWN
======================================== */

document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector(".header");
    if (!header || document.querySelector(".store-promo-banner")) return;

    const saleStartsAt = new Date("2026-11-27T00:00:00+01:00").getTime();
    const saleEndsAt = new Date("2026-12-01T00:00:00+01:00").getTime();
    const translate = (text) => window.CDL_I18N ? window.CDL_I18N.t(text) : text;
    const banner = document.createElement("aside");

    banner.className = "store-promo-banner";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", translate("Black Friday and Cyber Monday offer"));
    banner.innerHTML = `
        <div class="store-promo-inner">
            <div class="store-promo-copy">
                <p class="store-promo-event">Black Friday + Cyber Monday</p>
                <p class="store-promo-discount" data-promo-discount></p>
                <p class="store-promo-dates" data-promo-dates></p>
            </div>
            <div class="store-promo-timer" role="timer" aria-live="off">
                <span class="store-promo-timer-label" data-promo-label></span>
                <div class="store-promo-units">
                    <span><strong data-promo-days>00</strong><small data-promo-days-label></small></span>
                    <span><strong data-promo-hours>00</strong><small data-promo-hours-label></small></span>
                    <span><strong data-promo-minutes>00</strong><small data-promo-minutes-label></small></span>
                    <span><strong data-promo-seconds>00</strong><small data-promo-seconds-label></small></span>
                </div>
            </div>
        </div>`;

    header.insertAdjacentElement("afterend", banner);

    const pad = (value) => String(value).padStart(2, "0");
    let intervalId;

    function updateCountdown() {
        const now = Date.now();
        if (now >= saleEndsAt) {
            banner.remove();
            window.clearInterval(intervalId);
            return;
        }

        const saleIsActive = now >= saleStartsAt;
        const secondsRemaining = Math.max(0, Math.floor(((saleIsActive ? saleEndsAt : saleStartsAt) - now) / 1000));
        const days = Math.floor(secondsRemaining / 86400);
        const hours = Math.floor((secondsRemaining % 86400) / 3600);
        const minutes = Math.floor((secondsRemaining % 3600) / 60);
        const seconds = secondsRemaining % 60;

        banner.setAttribute("aria-label", translate("Black Friday and Cyber Monday offer"));
        banner.querySelector("[data-promo-discount]").textContent = translate("50% off the entire store");
        banner.querySelector("[data-promo-dates]").textContent = translate("Nov 27, 2026, 00:00 – Dec 1, 2026, 00:00 (Paris time)");
        banner.querySelector("[data-promo-label]").textContent = translate(saleIsActive ? "Ends in" : "Starts in");
        banner.querySelector("[data-promo-days]").textContent = pad(days);
        banner.querySelector("[data-promo-hours]").textContent = pad(hours);
        banner.querySelector("[data-promo-minutes]").textContent = pad(minutes);
        banner.querySelector("[data-promo-seconds]").textContent = pad(seconds);
        banner.querySelector("[data-promo-days-label]").textContent = translate("days");
        banner.querySelector("[data-promo-hours-label]").textContent = translate("hours");
        banner.querySelector("[data-promo-minutes-label]").textContent = translate("minutes");
        banner.querySelector("[data-promo-seconds-label]").textContent = translate("seconds");
    }

    document.addEventListener("cdl:languagechange", updateCountdown);
    updateCountdown();
    if (banner.isConnected) intervalId = window.setInterval(updateCountdown, 1000);
});

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-swipe-carousel]").forEach((carousel) => {
        let startX = 0;
        let startScrollLeft = 0;
        let isPointerDown = false;
        let didDrag = false;

        carousel.addEventListener("pointerdown", (event) => {
            if (event.pointerType !== "mouse" || event.button !== 0) return;
            startX = event.clientX;
            startScrollLeft = carousel.scrollLeft;
            isPointerDown = true;
            didDrag = false;
        });

        carousel.addEventListener("pointermove", (event) => {
            if (!isPointerDown) return;
            const distance = startX - event.clientX;
            if (Math.abs(distance) > 5) {
                didDrag = true;
                carousel.classList.add("is-dragging");
                carousel.scrollLeft = startScrollLeft + distance;
            }
        });

        const finishDrag = () => {
            isPointerDown = false;
            carousel.classList.remove("is-dragging");
            window.setTimeout(() => { didDrag = false; }, 0);
        };

        window.addEventListener("pointerup", finishDrag);
        window.addEventListener("pointercancel", finishDrag);

        carousel.addEventListener("click", (event) => {
            if (!didDrag) return;
            event.preventDefault();
            event.stopPropagation();
            didDrag = false;
        }, true);
    });
});
