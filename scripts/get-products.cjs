const https = require('https');

const APPWRITE_ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';
const APPWRITE_PROJECT = '69a4a8c0000576de77cf';
const APPWRITE_API_KEY = 'standard_88b1054c18d18b4c44d90ebbafd82c8e5d8b8567130968e61a25bcf0e5c34b2ca286292e7fcd379479d414ead6e0e2f2572ce999c818b09b902153209ba17730376823ee88ef46311a95960452740e3d908cbe60decc074df3927ee56915f487b6283c28a047f48f651e66e79ee9524f39285705a91ea8febc430863a861acb2';
const DATABASE_ID = 'food-factory-pos';
const PRODUCTS_COLLECTION = 'products';

function fetchAppwrite(path) {
    return new Promise((resolve, reject) => {
        const url = `${APPWRITE_ENDPOINT}${path}`;
        const parsedUrl = new URL(url);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Appwrite-Project': APPWRITE_PROJECT,
                'X-Appwrite-Key': APPWRITE_API_KEY
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

async function getProducts() {
    try {
        console.log('Fetching products from Appwrite...');
        
        const data = await fetchAppwrite(
            `/databases/${DATABASE_ID}/collections/${PRODUCTS_COLLECTION}/documents?queries[]=limit(100)`
        );
        
        console.log(`Found ${data.documents?.length || 0} products`);
        console.log(JSON.stringify(data, null, 2));
        
    } catch (e) {
        console.error('Error:', e.message);
    }
}

getProducts();
