const data = require('@begin/data');
const axios = require("axios");
const cheerio = require('cheerio');

// learn more about HTTP functions here: https://arc.codes/primitives/http
exports.handler = async function http (request) {
  const bodyBuffer = Buffer.from(request.body, 'base64');
  const url = bodyBuffer.toString('utf-8');

  try {
    const html = (await axios.get(url)).data;
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
      if($('.recipe[itemscope]').is('.recipe[itemscope]')) return buildRecipeCard('h2[itemprop="name"]', 'li[itemprop="ingredients"]', '.instructions[itemprop="recipeInstructions"] li')
      if($('.recipe-container').is('.recipe-container')) return buildRecipeCard('h1.content-hed.recipe-hed', '.ingredient-item', '.direction-lists li')
      return {"message": "Could not extract recipe."};
    }
    const recipe = pullRecipeCard();
    if(!recipe.message && recipe.title) {
      // await data.set({table: "recipes", recipe: JSON.stringify(recipe)})
      recipe.triggerBuild = (await triggerBuild()).data;
    }
    return {
      headers: {
        'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
        'content-type': 'application/json; charset=utf8'
      },
      body: JSON.stringify(recipe)
    }
  } catch (error) {
    return {
      headers: {
        'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
        'content-type': 'application/json; charset=utf8'
      },
      body: JSON.stringify({"message": error.message})
    }
  }
}

function triggerBuild() {
  return axios.post('https://api.netlify.com/build_hooks/5ee263de79c262cd695003ea');
}