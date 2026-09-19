const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../src/content/doctors');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const clean = (obj) => {
        for (const key in obj) {
            if (obj[key] === null) {
                delete obj[key];
            } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                clean(obj[key]);
            }
        }
    };

    clean(data);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
});

console.log(`Cleaned ${files.length} files.`);
