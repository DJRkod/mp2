// GitHub Pages has no server-side routing. It serves 404.html for any path it
// does not know, so a copy of the app there lets React Router render direct
// links such as /mp2/artwork/27992.
import { copyFileSync } from 'node:fs'

copyFileSync('dist/index.html', 'dist/404.html')
console.log('dist/404.html written')
