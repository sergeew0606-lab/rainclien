const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  let files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      filelist.push(path.join(dir, file));
    }
  });
  return filelist;
};

const files = walkSync('src');
for (const file of files) {
  if (file.endsWith('.ts') || file.endsWith('.tsx')) {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content.replace(/Excode/g, 'RainDLC');
    newContent = newContent.replace(/excode/g, 'rainclient');
    newContent = newContent.replace(/Лучшая KillAura/g, 'Лучший Aim Assist');
    newContent = newContent.replace(/Best KillAura/g, 'Best Aim Assist');
    
    if (content !== newContent) {
      fs.writeFileSync(file, newContent);
    }
  }
}
