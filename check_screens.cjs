const fetch = require('node-fetch');

async function checkScreens() {
  const res = await fetch('http://localhost:5001/api/screens');
  const data = await res.json();
  console.log("Total screens:", data.length || (data.screens && data.screens.length));
  
  const screens = Array.isArray(data) ? data : data.screens;
  const multiScreens = screens.filter(s => s.isMultiScreen);
  console.log("Multi screens:", multiScreens.length);
  if (multiScreens.length > 0) {
    console.log("First multi screen:", multiScreens[0].name, multiScreens[0].isMultiScreen, multiScreens[0].numberOfScreens);
  }
}

checkScreens().catch(console.error);
