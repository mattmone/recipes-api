const data = require('@begin/data');
const begin = require('@architect/functions'); // Reads & writes session data
const puppeteer = require('puppeteer')

// learn more about HTTP functions here: https://arc.codes/primitives/http
exports.handler = async function http (request) {
  const session = await begin.http.session.read(request);
  const bodyBuffer = Buffer.from(request.body, 'base64');
  const url = bodyBuffer.toString('utf-8');

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  
  const recipe = await page.evaluate(() => {
    function extractContent(nodes) {
      return Array.from(nodes).map(n => n.textContent.trim()).filter(n => n)
    }
    function buildRecipeCard(titleSelector, ingredientSelector, directionSelector) {
      return {
        title: document.querySelector(titleSelector).textContent,
        ingredients: extractContent(document.querySelectorAll(ingredientSelector)),
        directions: extractContent(document.querySelectorAll(directionSelector))
      }
    }
    function pullRecipeCard() {
      if(document.querySelector('.easyrecipe')) return buildRecipeCard('.ERSName', '.ingredient', '.instruction');
      if(location.host.match(/allrecipes.com/)) return buildRecipeCard("#recipe-main-content", ".recipe-ingred_txt", '.recipe-directions__list--item')
      if(location.host.match(/pamperedchef.com/)) return buildRecipeCard("#recipeName", "#rpIngredients li", '#rpDirections li')
      if(document.querySelector('.wprm-recipe-container')) return buildRecipeCard('.wprm-recipe-name', '.wprm-recipe-ingredient', '.wprm-recipe-instruction')
      return {"message": "Could not extract recipe."};
    }
    return JSON.stringify(pullRecipeCard());
  });
  data.set({table: "recipes", recipe})
  await browser.close();
  return {
    headers: {
      'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
      'content-type': 'text/html; charset=utf8'
    },
    body: recipe
  }
}