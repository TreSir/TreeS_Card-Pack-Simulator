/* The editable JSON is loaded by the development page; the offline build embeds it. */
Promise.all(['data/art.json', 'data/catalog.json'].map(async path => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Cannot load ${path}: ${response.status}`);
  return response.json();
})).then(([art, catalog]) => {
  globalThis.ART = art;
  globalThis.CATALOG = catalog;
  const script = document.createElement('script');
  script.src = 'src/app.js';
  document.body.append(script);
}).catch(error => {
  console.error(error);
  document.querySelector('#live').textContent = 'Unable to load card data. Please use the local server or the offline build.';
});
