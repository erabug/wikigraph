var response;

CODES = { 'node1': { 'code': '', 'title': '' },
          'node2': { 'code': '', 'title': '' } };

var imageURLs = [];

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

function clear_all() {
    $('input#start-node').val('');
    $('input#end-node').val('');
    $('.path').html('');
    $('svg').remove();
}

function initImageURL(data) {

    var pageObject = data['query']['pages'];
    var htmlSnippets = {};

    Object.keys(pageObject).forEach(function(pageKey) {

        var page = pageObject[pageKey];
        var title = page['title'];

        var thumbnail;
        if ('thumbnail' in page) { // if wikipedia query returned a thumbnail
            thumbnail = page['thumbnail']['source'];
        } else { thumbnail = '../static/images/cat.jpg'; } // else returns grumpycat

        // two different ways to define node, based on whether it's an init query
        // var node;
        // if (innerNodes === null) {
        //     if (title == CODES['node1']['title']) { node = 0; } else { node = 1; }
        // } else { node = innerNodes.indexOf(title); }

        if (title == CODES['node1']['title']) { node = 0; } else { node = 1; }

        html = makeHTMLSnippet(node, thumbnail, title);
        htmlSnippets[node] = html;
        
        imageURLs[node] = {'title': title, 'thumbnail': thumbnail};

    });
    console.log('image urls:', imageURLs);
    return htmlSnippets;
}

function pathImageURL(data, innerNodes) {

    var pageObject = data['query']['pages'];

    Object.keys(pageObject).forEach(function(pageKey) {

        var page = pageObject[pageKey];
        var title = page['title'];

        var thumbnail;
        if ('thumbnail' in page) { // if wikipedia query returned a thumbnail
            thumbnail = page['thumbnail']['source'];
        } else { thumbnail = '../static/images/cat.jpg'; } // else returns grumpycat

        node = innerNodes.indexOf(title)+1;
        
        imageURLs[node] = {'title': title, 'thumbnail': thumbnail};

    });
    console.log('image urls:', imageURLs);
    // return htmlSnippets;
    
}

function makeHTMLSnippet(node, thumbnail, title) {
    html = '<div class="page" id="page'+node.toString()+'">'+
       '<div class="squareimg"><img src='+thumbnail+'></div>'+
       '<div class="page-title">'+title+'</div></div>';
    return html;
}

function makeQueryURL(numPages, pagesParams) {
    var queryURL = 'http://en.wikipedia.org/w/api.php' +
                   '?action=query&format=json&redirects&prop=pageimages&' +
                   'pithumbsize=100px&pilimit=' + numPages + '&titles=' +
                   pagesParams + '&callback=?';
    return queryURL;
}

function decodeInput(d, node) {
    CODES[node]['code'] = d.code.toString();
    CODES[node]['title'] = d.value;
}

$(document).ready(function(e) {
    clear_all();
});

// event handler for the query submission
$('input#submit-query').click(function(e) {

	e.preventDefault();
    clear_all();

    var pagesParams = CODES['node1']['title'] + '|' + CODES['node2']['title'];
    var queryURL = makeQueryURL(numPages=2, pagesParams);
    console.log('USER INPUT:', pagesParams);

    $.getJSON(
        queryURL,
        function(data) {

            var htmlSnippets = initImageURL(data);
            var path = $('.path');
            // for each item in the sorted list, append its html to the path div
            Object.keys(htmlSnippets).forEach(function(node) {
                path.append(htmlSnippets[node]);
            });

            // insert a load animation gif in between the two floating heads
            $('#page0').after('<div class="page arrow loading" id="arrow1"></div>');
                
        });

	$.get(
		'/query',
		{'node1': CODES['node1']['code'], 'node2': CODES['node2']['code']},
		function(data) {

			response = JSON.parse(data); // decode the JSON
            $('.arrow').removeClass('loading'); // change arrow img

            console.log('RETURNED PATH:', response['path']);
            // // remove the start and end nodes from innerNodes
            var innerNodes = response['path'].slice(1, -1);

            if (0 < innerNodes.length) { // if there are intermediary nodes

                var numPages = innerNodes.length;
                //move the last node to the end of imageURLs array
                imageURLs[response['path'].length - 1] = imageURLs[1];
                delete imageURLs[1];

                var pagesParams;
                if (numPages > 1) {
                    pagesParams = innerNodes.join('|');
                } else { pagesParams = innerNodes; }

                var queryURL = makeQueryURL(numPages, pagesParams);

                $.getJSON(
                    queryURL,
                    function(data) {
                        pathImageURL(data, innerNodes); //updates imageURLs
                    });
            }

            drawGraph(response['results']); // graph the results

		});
    
});


// sets up the typeahead on the two input fields
$('.scrollable-dropdown-menu .typeahead').typeahead(null, {
    name: 'pageNames',
    displayKey: 'value',
    source: pageNames.ttAdapter()
});

// records the values chosen for each field as a global var
$('#start-node').on('typeahead:selected typeahead:autocompleted', function (e, d) {
    decodeInput(d, 'node1');
});

$('#end-node').on('typeahead:selected typeahead:autocompleted', function (e, d) {
    decodeInput(d, 'node2');
});