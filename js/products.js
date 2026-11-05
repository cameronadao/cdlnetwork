
/* =========================================
   CDL NETWORK — PRODUCT DATA ENGINE
========================================= */

const CDL_DATA_PATHS = {
    categories: "/data/categories.json",
    niches: "/data/niches.json",
    productTypes: "/data/product-types.json",
    products: "/data/products.json"
};

/* =========================================
   LOAD JSON DATA
========================================= */

async function loadJSON(path) {
    const response = await fetch(path);

    if (!response.ok) {
        throw new Error(`Unable to load ${path}: ${response.status}`);
    }

    return response.json();
}

/* =========================================
   VALIDATE UNIQUE IDS
========================================= */

function validateUniqueIds(items, label) {
    const ids = items.map(item => item.id);
    const uniqueIds = new Set(ids);

    if (ids.length !== uniqueIds.size) {
        throw new Error(`Duplicate ID detected in ${label}.`);
    }
}

/* =========================================
   VALIDATE CATALOG DATA
========================================= */

function validateCatalogData(data) {

    const {
        categories,
        niches,
        productTypes,
        products
    } = data;

    // Validate unique IDs

    validateUniqueIds(categories, "categories");
    validateUniqueIds(niches, "niches");
    validateUniqueIds(products, "products");

    // Validate category references

    const categoryIds = new Set(
        categories.map(category => category.id)
    );

    niches.forEach(niche => {
        if (!categoryIds.has(niche.categoryId)) {
            throw new Error(
                `Unknown category "${niche.categoryId}" in niche "${niche.id}".`
            );
        }
    });

    // Validate product families and types

    const familyIds = new Set(
        productTypes.map(family => family.id)
    );

    const productTypeIds = new Set();

    productTypes.forEach(family => {

        family.types.forEach(type => {

            if (productTypeIds.has(type.id)) {
                throw new Error(
                    `Duplicate product type ID: "${type.id}".`
                );
            }

            productTypeIds.add(type.id);

        });

    });

    // Validate product references

    products.forEach(product => {

        const category = categories.find(
            item => item.id === product.category
        );

        if (!category) {
            throw new Error(
                `Unknown category in product "${product.id}".`
            );
        }

        const niche = niches.find(
            item => item.id === product.niche
        );

        if (!niche) {
            throw new Error(
                `Unknown niche in product "${product.id}".`
            );
        }

        if (niche.categoryId !== product.category) {
            throw new Error(
                `Category mismatch in product "${product.id}".`
            );
        }

        const family = productTypes.find(
            item => item.id === product.productFamily
        );

        if (!family || !familyIds.has(product.productFamily)) {
            throw new Error(
                `Unknown product family in "${product.id}".`
            );
        }

        const typeExists = family.types.some(
            type => type.id === product.productType
        );

        if (!typeExists) {
            throw new Error(
                `Invalid product type or family in "${product.id}".`
            );
        }

        if (typeof product.isFree !== "boolean") {
            throw new Error(
                `Invalid isFree value in "${product.id}".`
            );
        }

        if (typeof product.price !== "number" || product.price < 0) {
            throw new Error(
                `Invalid price in "${product.id}".`
            );
        }

        if (product.isFree && product.price !== 0) {
            throw new Error(
                `Free product "${product.id}" must have a price of 0.`
            );
        }

    });

    return true;
}

/* =========================================
   INITIALIZE CATALOG
========================================= */

async function initializeCatalog() {

    try {

        const [
            categories,
            niches,
            productTypes,
            products
        ] = await Promise.all([

            loadJSON(CDL_DATA_PATHS.categories),
            loadJSON(CDL_DATA_PATHS.niches),
            loadJSON(CDL_DATA_PATHS.productTypes),
            loadJSON(CDL_DATA_PATHS.products)

        ]);

        const data = {
            categories,
            niches,
            productTypes,
            products
        };

        validateCatalogData(data);

        window.CDL_CATALOG = data;

        console.log("CDL Network catalog loaded successfully.");

        console.log({
            categories: categories.length,
            niches: niches.length,
            productFamilies: productTypes.length,
            productTypes: productTypes.reduce(
                (total, family) => total + family.types.length,
                0
            ),
            products: products.length
        });

        document.dispatchEvent(
            new CustomEvent("cdlCatalogReady", {
                detail: data
            })
        );

        return data;

    } catch (error) {

        console.error("CDL Catalog Error:", error);

        document.dispatchEvent(
            new CustomEvent("cdlCatalogError", {
                detail: error
            })
        );

        throw error;
    }
}

/* =========================================
   START
========================================= */

initializeCatalog();
