var node1Code;
var node2Code;
var response;

function clear_all() {
    $('input#start-node').val('');
    $('input#end-node').val('');
    $('svg').remove();
}

$('input#submit-query').click(function(e) {
	e.preventDefault();

  clear_all();

	$.get(
		"/query",
		{'node1': node1Code.toString(), 'node2': node2Code.toString()},
		function(data) {
			console.log("successful query!");
			response = JSON.parse(data);
			drawGraph(response);
		});

});

// the thing that works
// var pageNames = new Bloodhound({
//   datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
//   queryTokenizer: Bloodhound.tokenizers.whitespace,
//   limit: 10,
//   prefetch: {
//     url: 'http://localhost:5000/static/nodes.json',

//     // the json file contains an array of strings, but the Bloodhound
//     // suggestion engine expects JavaScript objects so this converts all of
//     // those strings
//     filter: function(list) {
//       return $.map(list, function(country) {
//         return { name: country };
//       });
//     }
//   }
// });

// experimental
var pageNames = new Bloodhound({
    datumTokenizer: function (d) {
        return Bloodhound.tokenizers.whitespace(d.value);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    remote: {
        url: '/page-names?query=%QUERY',
        filter: function (pageNames) {
            // Map the remote source JSON array to a JavaScript array
            console.log(pageNames);
            return $.map(pageNames.results, function (page) {
                return {
                    value: page.title,
                    code: page.code
                };

            });
        }
    }
});

// kicks off the loading/processing of `local` and `prefetch`
pageNames.initialize();

$('.scrollable-dropdown-menu .typeahead').typeahead(null, {
  name: 'pageNames',
  displayKey: 'value',
  source: pageNames.ttAdapter()
});

$('#start-node').on('typeahead:selected', function (e, d) {
    node1Code = d.code;
});

$('#end-node').on('typeahead:selected', function (e, d) {
    node2Code = d.code;
});




