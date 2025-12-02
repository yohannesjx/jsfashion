import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 50 }, // Ramp up to 50 users
        { duration: '1m', target: 50 },  // Stay at 50 users
        { duration: '30s', target: 0 },  // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    },
};

// Use http://localhost:8080 if running with --network="host"
// Use http://host.docker.internal:8080 if running on Mac/Windows Docker Desktop
const BASE_URL = __ENV.API_URL || 'http://localhost:8080';

export default function () {
    // 1. List Products (Home Page)
    let res = http.get(`${BASE_URL}/api/v1/products?limit=20&offset=0`);

    check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500
    });

    if (res.status === 200) {
        let products;
        try {
            products = res.json();
        } catch (e) {
            // failed to parse
        }

        if (products && Array.isArray(products) && products.length > 0) {
            const randomProduct = products[Math.floor(Math.random() * products.length)];

            // 2. Get Product Details (PDP)
            let productRes = http.get(`${BASE_URL}/api/v1/products/${randomProduct.id}`);
            check(productRes, { 'status is 200': (r) => r.status === 200 });

            // 3. Get Related Products
            let relatedRes = http.get(`${BASE_URL}/api/v1/products/${randomProduct.id}/related`);
            check(relatedRes, { 'status is 200': (r) => r.status === 200 });
        }
    }

    // 4. Search
    let searchRes = http.get(`${BASE_URL}/api/v1/products?search=shirt`);
    check(searchRes, { 'status is 200': (r) => r.status === 200 });

    sleep(1);
}
