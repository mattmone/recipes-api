@app
begin-app

@http
get /
get /recipes
post /recipe

@tables
recipes
  recipe *String
