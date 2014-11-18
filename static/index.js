var response;

c = { 'node1': { 'code': '', 'title': '' },
      'node2': { 'code': '', 'title': '' } };

function clear_all() {
    $('input#start-node').val('');
    $('input#end-node').val('');
    $('.path').val('');
    $('svg').remove();
}

$(document).ready(function(e) {
    clear_all();
});

// event handler for the query submission
$('input#submit-query').click(function(e) {

	e.preventDefault();
    clear_all();

    var URL = 'http://en.wikipedia.org/w/api.php';
    var queryParams = '?action=query&format=json&redirects&'+
        'prop=pageimages&pithumbsize=100px&pilimit=2';
    var pagesParams = c['node1']['title'] + '|' + c['node2']['title'];

    console.log(pagesParams);

    $.getJSON(
        URL + queryParams + '&titles=' + pagesParams + '&callback=?',
        function(data) {
            
            console.log(data);
            var pageObject = data['query']['pages'];

            var startNode;
            var endNode;

            Object.keys(pageObject).forEach(function(pageKey) {
                var node;
                var page = pageObject[pageKey];
                var title = page['title'];
                var thumbnail = page['thumbnail']['source'];
                $('.path').append('<div class="page"><div class="squareimg">'+
                    '<img src='+thumbnail+'></div>'+
                    '<div class="subtitle">'+title+'</div></div>');
                //iterate through values of keys
                Object.keys(c).forEach(function(node) {
                    if (c[node]['title'] == title) {
                        console.log("match!");
                    }
                });

                // startNode = '<div class="page"><div class="squareimg">'+
                //     '<img src='+thumbnail+'></div>'+
                //     '<div class="subtitle">'+title+'</div></div>';

            });
                
        });

	$.get(
		'/query',
		{'node1': c['node1']['code'], 'node2': c['node2']['code']},
		function(data) {

			response = JSON.parse(data);
			drawGraph(response);
            
            // insert floating heads for the inner path nodes here
            

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

function decodeInput(d, node) {
    c[node]['code'] = d.code.toString();
    c[node]['title'] = d.value;
    return null;
}

// records the values chosen for each field as a global var
$('#start-node').on('typeahead:selected', function (e, d) {
    decodeInput(d, 'node1');
});

$('#end-node').on('typeahead:selected', function (e, d) {
    decodeInput(d, 'node2');
});
