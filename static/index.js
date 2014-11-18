var response;

c = { 'node1': { 'code': '', 'title': '' },
      'node2': { 'code': '', 'title': '' } };

function clear_all() {
    $('input#start-node').val('');
    $('input#end-node').val('');
    $('.path').html('');
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
    var queryParams = '?action=query&format=json&redirects&'+ // what does redirects do here?
        'prop=pageimages&pithumbsize=100px&pilimit=2';
    var pagesParams = c['node1']['title'] + '|' + c['node2']['title'];

    console.log(pagesParams);

    $.getJSON(
        URL + queryParams + '&titles=' + pagesParams + '&callback=?',
        function(data) {
            
            // console.log(data);
            var pageObject = data['query']['pages'];

            var htmlSnippets = { '1': '', '2': '' };

            Object.keys(pageObject).forEach(function(pageKey) {

                var page = pageObject[pageKey];
                var title = page['title'];
                var thumbnail = page['thumbnail']['source'];

                // this code works, but loses the order of input
                // $('.path').append('<div class="page"><div class="squareimg">'+
                //     '<img src='+thumbnail+'></div>'+
                //     '<div class="subtitle">'+title+'</div></div>');

                var node;
                //find the node that matches my title, add it and page html as an object
                if (title == c['node1']['title']) { node = 1; } else { node = 2; }

                //create a snippet of HTML
                html = '<div class="page" id="page'+node.toString()+'">'+
                       '<div class="squareimg"><img src='+thumbnail+'></div>'+
                       '<div class="page-title">'+title+'</div></div>';

                htmlSnippets[node] = html;

            });

            var path = $('.path');
            // for each item in the sorted list, append its html to the path div
            Object.keys(htmlSnippets).forEach(function(node) {
                path.append(htmlSnippets[node]);
            });

            // insert a load animation gif in between the two floating heads
            $('#page1').after('<div class="page arrow loading"></div>');
                
        });

	$.get(
		'/query',
		{'node1': c['node1']['code'], 'node2': c['node2']['code']},
		function(data) {

			response = JSON.parse(data);
			drawGraph(response);
            // $('.arrow').html('<img src="static/arrow.png" width=80px>');
            $('.arrow').removeClass('loading');
            
            // insert floating heads for the inner path nodes here
            // $('#page1').append(x)
            // need to get the graph db codes for the paths first
            // I think that data should be returned in addition to response
            // e.g. response = { 'path': [0, 2, 4], 'results': ... }
            
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
}

// records the values chosen for each field as a global var
$('#start-node').on('typeahead:selected', function (e, d) {
    decodeInput(d, 'node1');
});

$('#end-node').on('typeahead:selected', function (e, d) {
    decodeInput(d, 'node2');
});
