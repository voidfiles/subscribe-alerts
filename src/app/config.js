require.config({
  // make components more sensible
  // expose jquery 
  paths: {
    "components": "components",
    "jquery": "components/jquery/jquery",
    "purl": "components/purl/purl",
    "shim": {
        "purl": ["jquery"]
    }
  }
});





