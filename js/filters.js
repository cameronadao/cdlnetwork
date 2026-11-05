
/* =========================================
   CDL NETWORK — CATALOG FILTERS
========================================= */

document.addEventListener("cdlCatalogReady", function (event) {

    const catalog = event.detail;

    const categoryFilter = document.getElementById("category-filter");
    const nicheFilter = document.getElementById("niche-filter");
    const typeFilter = document.getElementById("type-filter");
    const searchInput = document.getElementById("product-search");
    const resetButton = document.getElementById("reset-filters");
    const productsGrid = document.getElementById("products-grid");
    const resultsCount = document.getElementById("results-count");

    if (
        !categoryFilter ||
        !nicheFilter ||
        !typeFilter ||
        !searchInput ||
        !resetButton ||
        !productsGrid ||
        !resultsCount
    ) {
        console.error("CDL filters: required HTML elements are missing.");
        return;
    }

    /* =====================================
       POPULATE CATEGORY FILTER
    ===================================== */

    catalog.categories
        .sort((a, b) => a.order - b.order)
        .forEach(category => {

            const option = document.createElement("option");

            option.value = category.id;
            option.textContent = category.name;

            categoryFilter.appendChild(option);

        });

    /* =====================================
       POPULATE NICHE FILTER
    ===================================== */

    function populateNiches() {

        const selectedCategory = categoryFilter.value;

        nicheFilter.innerHTML =
            '<option value="">All Niches</option>';

        const availableNiches = catalog.niches
            .filter(niche => {
                return !selectedCategory ||
                    niche.categoryId === selectedCategory;
            })
            .sort((a, b) => a.order - b.order);

        availableNiches.forEach(niche => {

            const option = document.createElement("option");

            option.value = niche.id;
            option.textContent = niche.name;

            nicheFilter.appendChild(option);

        });

    }

    /* =====================================
       POPULATE PRODUCT TYPE FILTER
    ===================================== */

    function populateProductTypes() {

        const families = [...catalog.productTypes]
            .sort((a, b) => a.order - b.order);

        families.forEach(family => {

            const group = document.createElement("optgroup");

            group.label = family.name;

            family.types.forEach(type => {

                const option = document.createElement("option");

                option.value = type.id;
                option.textContent = type.name;

                group.appendChild(option);

            });

            typeFilter.appendChild(group);

        });

    }

    /* =====================================
       FILTER PRODUCTS
    ===================================== */

    function getFilteredProducts() {

        const selectedCategory = categoryFilter.value;
        const selectedNiche = nicheFilter.value;
        const selectedType = typeFilter.value;
        const searchTerm = searchInput.value
            .trim()
            .toLowerCase();

        return catalog.products.filter(product => {

            const matchesCategory =
                !selectedCategory ||
                product.category === selectedCategory;

            const matchesNiche =
                !selectedNiche ||
                product.niche === selectedNiche;

            const matchesType =
                !selectedType ||
                product.productType === selectedType;

            const searchableContent = [
                product.name,
                product.description,
                product.id
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !searchTerm ||
                searchableContent.includes(searchTerm);

            return (
                matchesCategory &&
                matchesNiche &&
                matchesType &&
                matchesSearch
            );

        });

    }

    /* =====================================
       RENDER PRODUCTS
    ===================================== */

    function renderProducts() {

        const filteredProducts = getFilteredProducts();

        productsGrid.innerHTML = "";

        resultsCount.textContent =
            `${filteredProducts.length} products found`;

        if (filteredProducts.length === 0) {

            const message = document.createElement("p");

            message.className = "catalog-message";
            message.textContent = catalog.products.length === 0
                ? "Our digital collection is coming soon. Check back shortly."
                : "No products match your filters. Try adjusting your selection.";

            productsGrid.appendChild(message);

            return;
        }

        filteredProducts.forEach(product => {

            const card = document.createElement("article");

            card.className = "product-card";

            const image = document.createElement("img");

            image.src = product.cover;
            image.alt = product.name;
            image.loading = "lazy";

            const title = document.createElement("h3");

            title.textContent = product.name;

            const description = document.createElement("p");

            description.textContent = product.description || "";

            const price = document.createElement("p");

            price.className = "product-price";

            price.textContent = product.isFree
                ? "Free"
                : `${product.price.toFixed(2)} ${product.currency || "USD"}`;

            const link = document.createElement("a");

            link.href = `/product.html?id=${encodeURIComponent(product.id)}`;
            link.textContent = "View Product";

            card.append(image, title, description, price, link);

            productsGrid.appendChild(card);

        });

    }

    /* =====================================
       EVENT LISTENERS
    ===================================== */

    categoryFilter.addEventListener("change", function () {

        populateNiches();
        renderProducts();

    });

    nicheFilter.addEventListener("change", renderProducts);
    typeFilter.addEventListener("change", renderProducts);
    searchInput.addEventListener("input", renderProducts);

    resetButton.addEventListener("click", function () {

        categoryFilter.value = "";
        nicheFilter.value = "";
        typeFilter.value = "";
        searchInput.value = "";

        populateNiches();
        renderProducts();

    });

    /* =====================================
       INITIALIZE FILTERS
    ===================================== */

    populateNiches();
    populateProductTypes();
    renderProducts();

    console.log("CDL Network filters initialized.");

});
