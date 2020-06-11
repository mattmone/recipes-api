const data = require('@begin/data');
const https = require('https');
const cheerio = require('cheerio');

function getHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let html = '';
      response.on('data', (chunk) => {
        html += chunk
      });
      response.on('end', () => {
        resolve(html);
      })
    }).on('error', (error) => {
      reject(error);
    })
  })
}

// learn more about HTTP functions here: https://arc.codes/primitives/http
exports.handler = async function http (request) {
  const bodyBuffer = Buffer.from(request.body, 'base64');
  const url = bodyBuffer.toString('utf-8');

  const html = await getHtml(url);
  const $ = cheerio.load(html)

  const extractContent = (nodes) => {
    return Array.from(nodes.map((i, n) => $(n).text().trim())).filter((n) => n)
  }
  const buildRecipeCard = (titleSelector, ingredientSelector, directionSelector) => {
    return {
      title: $(titleSelector).text(),
      ingredients: extractContent($(ingredientSelector)),
      directions: extractContent($(directionSelector))
    }
  }
  const pullRecipeCard = () => {
    if($('.easyrecipe').is('.easyrecipe')) return buildRecipeCard('.ERSName', '.ingredient', '.instruction');
    if(url.match(/allrecipes.com/)) return buildRecipeCard("#recipe-main-content", ".recipe-ingred_txt", '.recipe-directions__list--item')
    if(url.match(/pamperedchef.com/)) return buildRecipeCard("#recipeName", "#rpIngredients li", '#rpDirections li')
    if($('.wprm-recipe-container').is('.wprm-recipe-container')) return buildRecipeCard('.wprm-recipe-name', '.wprm-recipe-ingredient', '.wprm-recipe-instruction')
    return {"message": "Could not extract recipe."};
  }
  const recipe = pullRecipeCard();
  if(!recipe.message) {
    await data.set({table: "recipes", recipe: JSON.stringify(recipe)})
    triggerBuild();
  }
  return {
    headers: {
      'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
      'content-type': 'text/html; charset=utf8'
    },
    body: html
  }
}

function triggerBuild() {
  const request = https.request({
    hostname: 'api.netlify.com',
    port: 443,
    path: '/build_hooks/5ee263de79c262cd695003ea',
    method: 'POST'
  }, response => {
    console.log('build triggered');
  });
  request.end();
}