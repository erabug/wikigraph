var response;

$('input#submit-query').click(function(e) {
	e.preventDefault();

	var start = $('input#start-node');
	var end = $('input#end-node');

	var node1 = start.val();
	var node2 = end.val();

	start.val('');
	end.val('');
	$('svg').remove();

	$.get(
		"/query",
		{'node1': node1, 'node2': node2},
		function(data) {
			console.log("successful query!");
			response = JSON.parse(data);
			drawGraph(response);
		});

});

var pageNames = new Bloodhound({
  datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
  queryTokenizer: Bloodhound.tokenizers.whitespace,
  limit: 10,
  prefetch: {
    // url points to a json file that contains an array of country names, see
    // https://github.com/twitter/typeahead.js/blob/gh-pages/data/countries.json
    // url: '../data/countries.json',
    url: 'http://localhost:5000/static/nodes.json',

    // the json file contains an array of strings, but the Bloodhound
    // suggestion engine expects JavaScript objects so this converts all of
    // those strings
    filter: function(list) {
      return $.map(list, function(country) { return { name: country }; });
    }
  }
});

// kicks off the loading/processing of `local` and `prefetch`
pageNames.initialize();

// // passing in `null` for the `options` arguments will result in the default
// // options being used
// $('#prefetch .typeahead').typeahead(null, {
//   name: 'pageNames',
//   displayKey: 'name',
//   // `ttAdapter` wraps the suggestion engine in an adapter that
//   // is compatible with the typeahead jQuery plugin
//   source: pageNames.ttAdapter()
// });

$('.scrollable-dropdown-menu .typeahead').typeahead(null, {
  name: 'pageNames',
  displayKey: 'name',
  source: pageNames.ttAdapter()
});

// var bestPictures = new Bloodhound({
//   datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
//   queryTokenizer: Bloodhound.tokenizers.whitespace,
//   // prefetch: '../data/films/post_1960.json',
//   // prefetch: 'http://localhost:5000/static/tinynodes.json',
//   // remote: '../data/films/queries/%QUERY.json'
//   remote: 'http://localhost:5000/static/nodes.json'
// });
 
// bestPictures.initialize();
 
// $('#prefetch .typeahead').typeahead(null, {
//   name: 'best-pictures',
//   displayKey: 'value',
//   source: bestPictures.ttAdapter()
// });