const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist') && !file.includes('assets')) {
                results = results.concat(walk(file));
            }
        } else {
            results.push(file);
        }
    });
    return results;
}

const files = walk('.');
files.forEach(f => {
    if (!f.endsWith('.tsx') && !f.endsWith('.ts')) return;
    try {
        const content = fs.readFileSync(f, 'utf8');
        const lines = content.split('\n');
        lines.forEach((l, i) => {
            if (l.includes('$')) {
                // Ignore obvious internal IDs and string interpolations that aren't for UI text
                if (l.includes('id:') || l.includes('Date.now()') || l.includes('Math.random()') || l.includes('console.error')) return;
                
                // Let's print out the match
                console.log(f + ':' + (i + 1) + ': ' + l.trim());
            }
        });
    } catch(e) {}
});
