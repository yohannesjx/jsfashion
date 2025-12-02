import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '1m', target: 200 }, // Ramp up to 200 users over 1 minute
        { duration: '2m', target: 200 }, // Stay at 200 users for 2 minutes
        { duration: '1m', target: 0 },   // Ramp down over 1 minute
    ],
    thresholds: {
        http_req_duration: ['p(95)<1000'], // Relaxed threshold: 95% of requests under 1s
        http_req_failed: ['rate<0.01'],    // Error rate must be under 1%
    },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8080';

export default function () {
    // 1. List Products
    let res = http.get(`${BASE_URL}/api/v1/products?limit=20&offset=0`, { tags: { name: 'ListProducts' } });

    check(res, {
        'ListProducts 200': (r) => r.status === 200,
    });

    if (res.status === 200) {
        let products;
        try {
            products = res.json();
        } catch (e) { }

        if (products && Array.isArray(products) && products.length > 0) {
            const randomProduct = products[Math.floor(Math.random() * products.length)];

            // 2. Get Product Details
            let productRes = http.get(`${BASE_URL}/api/v1/products/${randomProduct.id}`, { tags: { name: 'GetProduct' } });
            check(productRes, { 'GetProduct 200': (r) => r.status === 200 });

            // 3. Get Related Products
            let relatedRes = http.get(`${BASE_URL}/api/v1/products/${randomProduct.id}/related`, { tags: { name: 'GetRelated' } });
            check(relatedRes, { 'GetRelated 200': (r) => r.status === 200 });
        }
    }

    // 4. Search
    let searchRes = http.get(`${BASE_URL}/api/v1/products?search=shirt`, { tags: { name: 'Search' } });
    check(searchRes, { 'Search 200': (r) => r.status === 200 });

    sleep(1);
}
