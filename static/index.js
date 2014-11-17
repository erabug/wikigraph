var node1Code;
var node2Code;
var node1Title;
var node2Title;
var response;

function clear_all() {
    $('input#start-node').val('');
    $('input#end-node').val('');
    $('svg').remove();
}

$(document).ready(function(e) {
    clear_all();
});

// event handler for the query submission
$('input#submit-query').click(function(e) {

	e.preventDefault();
    clear_all();

	$.get(
		'/query',
		{'node1': node1Code.toString(), 'node2': node2Code.toString()},
		function(data) {

			response = JSON.parse(data);
			drawGraph(response);
            var URL = 'http://en.wikipedia.org/w/api.php';
            var queryParams = '?action=query&format=json&redirects&prop=pageimages&pithumbsize=90px&pilimit=2';
            var pagesParams = node1Title + '|' + node2Title;
            console.log(pagesParams);

            $.getJSON(
                URL + queryParams + '&titles=' + pagesParams + '&callback=?',
                function(data) {
                    
                    console.log(data);
                    var pageObject = data['query']['pages'];

                    Object.keys(pageObject).forEach(function(pageKey) {
                        var page = pageObject[pageKey];
                        var title = page['title'];
                        var thumbnail = page['thumbnail']['source'];
                        var pageImage = page['pageimage'];
                        $('.page').append('<div class="squareimg"><img class="circular" src=' + thumbnail + '></div>');
                    });
                        

                });

		});
    
});

// tells typeahead how to handle the user input (e.g. the get request params)
var pageNames = new Bloodhound({
    datumTokenizer: function(d) {
        return Bloodhound.tokenizers.whitespace(d.value);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    limit: 30,
    remote: {
        url: '/page-names?query=%QUERY',
        filter: function(pageNames) {
            // Map the remote source JSON array to a JavaScript array
            return $.map(pageNames.results, function(page) {
                return {
                    value: page.title,
                    code: page.code
                };

            });
        }
    }
});

pageNames.initialize();

// sets up the typeahead on the two input fields
$('.scrollable-dropdown-menu .typeahead').typeahead(null, {
    name: 'pageNames',
    displayKey: 'value',
    source: pageNames.ttAdapter()
});

// records the values chosen for each field as a global var
$('#start-node').on('typeahead:selected', function (e, d) {
    node1Code = d.code;
    node1Title = d.value;
});

$('#end-node').on('typeahead:selected', function (e, d) {
    node2Code = d.code;
    node2Title = d.value;
});
